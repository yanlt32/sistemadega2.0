const { db } = require('../models/database');

const vendaController = {
    // Criar nova venda
    criar: (req, res) => {
        try {
            // PRIMEIRO: VERIFICAR SE CAIXA ESTÁ ABERTO
            const caixa = db.prepare("SELECT * FROM caixa WHERE status = 'aberto'").get();
            
            // Se caixa estiver fechado, NÃO PERMITE A VENDA
            if (!caixa) {
                return res.status(400).json({ 
                    error: 'Caixa fechado',
                    message: '❌ O caixa está fechado. Não é possível realizar vendas.',
                    code: 'CAIXA_FECHADO'
                });
            }

            // CONTINUAR COM A VENDA (caixa OK)
            const { itens, forma_pagamento, observacao } = req.body;
            const usuario_id = req.usuario.id;

            console.log('Recebendo venda:', { itens, forma_pagamento, usuario_id });

            if (!itens || itens.length === 0) {
                return res.status(400).json({ error: 'Selecione pelo menos um produto' });
            }

            if (!forma_pagamento) {
                return res.status(400).json({ error: 'Selecione uma forma de pagamento' });
            }

            let total = 0;
            let lucro = 0;
            let erros = [];

            // Buscar todos os produtos
            const produtos = [];
            for (const item of itens) {
                const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(item.produto_id);
                if (!produto) {
                    erros.push(`Produto ID ${item.produto_id} não encontrado`);
                } else if (produto.quantidade < item.quantidade) {
                    erros.push(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.quantidade}`);
                } else {
                    produtos.push({ item, produto });
                    total += produto.preco_venda * item.quantidade;
                    lucro += (produto.preco_venda - produto.preco_custo) * item.quantidade;
                }
            }

            if (erros.length > 0) {
                return res.status(400).json({ erros });
            }

            // Iniciar transação
            const transaction = db.transaction(() => {
                // Inserir venda
                const vendaResult = db.prepare(`
                    INSERT INTO vendas (total, lucro, forma_pagamento, usuario_id, status, observacao) 
                    VALUES (?, ?, ?, ?, 'concluida', ?)
                `).run(total, lucro, forma_pagamento, usuario_id, observacao || null);

                const venda_id = vendaResult.lastInsertRowid;
                console.log('Venda criada com ID:', venda_id);

                // Inserir itens e atualizar estoque
                for (const { item, produto } of produtos) {
                    db.prepare(`
                        INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, preco_custo_unitario) 
                        VALUES (?, ?, ?, ?, ?)
                    `).run(venda_id, item.produto_id, item.quantidade, produto.preco_venda, produto.preco_custo);

                    db.prepare(`
                        UPDATE produtos SET quantidade = quantidade - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                    `).run(item.quantidade, item.produto_id);

                    db.prepare(`
                        INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao, usuario_id) 
                        VALUES (?, 'saida', ?, ?, ?)
                    `).run(item.produto_id, item.quantidade, `Venda #${venda_id}`, usuario_id);
                }

                return venda_id;
            });

            const venda_id = transaction();

            if (req.io) {
                req.io.emit('venda:realizada', { 
                    id: venda_id, 
                    total,
                    lucro,
                    mensagem: `💰 Venda de R$ ${total.toFixed(2)} realizada!`
                });
            }

            res.json({ 
                id: venda_id, 
                message: 'Venda finalizada com sucesso',
                total,
                lucro
            });
        } catch (error) {
            console.error('Erro ao processar venda:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Listar vendas
    listar: (req, res) => {
        try {
            const { data_inicio, data_fim, pagina = 1, limite = 20 } = req.query;
            const offset = (pagina - 1) * limite;
            
            let query = `
                SELECT v.*, 
                       u.nome as usuario_nome,
                       (SELECT COUNT(*) FROM itens_venda WHERE venda_id = v.id) as total_itens
                FROM vendas v
                LEFT JOIN usuarios u ON v.usuario_id = u.id
                WHERE 1=1
            `;
            let params = [];

            if (data_inicio && data_fim) {
                query += ' AND DATE(v.data_venda) BETWEEN DATE(?) AND DATE(?)';
                params.push(data_inicio, data_fim);
            }

            query += ' ORDER BY v.data_venda DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limite), parseInt(offset));

            const vendas = db.prepare(query).all(...params);

            // Contar total para paginação
            let countQuery = 'SELECT COUNT(*) as total FROM vendas WHERE 1=1';
            let countParams = [];

            if (data_inicio && data_fim) {
                countQuery += ' AND DATE(data_venda) BETWEEN DATE(?) AND DATE(?)';
                countParams.push(data_inicio, data_fim);
            }

            const total = db.prepare(countQuery).get(...countParams);

            res.json({
                vendas: vendas || [],
                total: total?.total || 0,
                pagina: parseInt(pagina),
                totalPaginas: Math.ceil((total?.total || 0) / limite)
            });
        } catch (error) {
            console.error('Erro ao listar vendas:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar venda por ID
    buscarPorId: (req, res) => {
        try {
            const { id } = req.params;

            const venda = db.prepare(`
                SELECT v.*, u.nome as usuario_nome
                FROM vendas v
                LEFT JOIN usuarios u ON v.usuario_id = u.id
                WHERE v.id = ?
            `).get(id);

            if (!venda) {
                return res.status(404).json({ error: 'Venda não encontrada' });
            }

            const itens = db.prepare(`
                SELECT iv.*, p.nome as produto_nome
                FROM itens_venda iv
                JOIN produtos p ON iv.produto_id = p.id
                WHERE iv.venda_id = ?
            `).all(id);

            venda.itens = itens || [];
            res.json(venda);
        } catch (error) {
            console.error('Erro ao buscar venda:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Excluir venda (com verificação de permissão)
    excluir: (req, res) => {
        try {
            const { id } = req.params;
            const usuario_id = req.usuario.id;

            // Verificar se usuário é admin
            const user = db.prepare('SELECT role FROM usuarios WHERE id = ?').get(usuario_id);

            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'Apenas administradores podem excluir vendas' });
            }

            // Buscar itens da venda para restaurar estoque
            const itens = db.prepare('SELECT * FROM itens_venda WHERE venda_id = ?').all(id);

            if (itens.length === 0) {
                return res.status(404).json({ error: 'Venda não encontrada' });
            }

            // Iniciar transação
            const transaction = db.transaction(() => {
                // Restaurar estoque
                for (const item of itens) {
                    db.prepare('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?')
                        .run(item.quantidade, item.produto_id);

                    db.prepare(`
                        INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao, usuario_id) 
                        VALUES (?, 'entrada', ?, ?, ?)
                    `).run(item.produto_id, item.quantidade, `Estorno venda #${id}`, usuario_id);
                }

                // Excluir itens e venda
                db.prepare('DELETE FROM itens_venda WHERE venda_id = ?').run(id);
                db.prepare('DELETE FROM vendas WHERE id = ?').run(id);
            });

            transaction();

            if (req.io) {
                req.io.emit('venda:excluida', { 
                    id,
                    mensagem: `🗑️ Venda #${id} excluída!`
                });
            }

            res.json({ 
                message: 'Venda excluída com sucesso',
                itensRestaurados: itens.length 
            });
        } catch (error) {
            console.error('Erro ao excluir venda:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = vendaController;