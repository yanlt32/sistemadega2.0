const { db } = require('../models/database');

const produtoController = {
    // Listar produtos com paginação
    listarProdutos: (req, res) => {
        try {
            const { page = 1, limit = 10, categoria, busca } = req.query;
            const offset = (page - 1) * limit;
            
            let query = `
                SELECT p.*, 
                       c.nome as categoria_nome,
                       t.nome as tipo_nome
                FROM produtos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN tipos t ON p.tipo_id = t.id
                WHERE 1=1
            `;
            let params = [];

            if (categoria && categoria !== 'todas' && categoria !== 'todos') {
                query += ' AND p.categoria_id = ?';
                params.push(categoria);
            }

            if (busca) {
                query += ' AND p.nome LIKE ?';
                params.push(`%${busca}%`);
            }

            query += ' ORDER BY p.nome LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const produtos = db.prepare(query).all(...params);

            // Contar total para paginação
            let countQuery = 'SELECT COUNT(*) as total FROM produtos WHERE 1=1';
            let countParams = [];

            if (categoria && categoria !== 'todas' && categoria !== 'todos') {
                countQuery += ' AND categoria_id = ?';
                countParams.push(categoria);
            }

            if (busca) {
                countQuery += ' AND nome LIKE ?';
                countParams.push(`%${busca}%`);
            }

            const count = db.prepare(countQuery).get(...countParams);

            res.json({
                produtos: produtos || [],
                total: count ? count.total : 0,
                page: parseInt(page),
                totalPages: Math.ceil((count ? count.total : 0) / limit)
            });
        } catch (error) {
            console.error('Erro ao listar produtos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar produto por ID
    buscarPorId: (req, res) => {
        try {
            const { id } = req.params;
            
            const produto = db.prepare(`
                SELECT p.*, 
                       c.nome as categoria_nome,
                       t.nome as tipo_nome
                FROM produtos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN tipos t ON p.tipo_id = t.id
                WHERE p.id = ?
            `).get(id);
            
            if (!produto) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            res.json(produto);
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar novo produto
    criarProduto: (req, res) => {
        try {
            const { nome, categoria_id, tipo_id, preco_custo, preco_venda, quantidade, codigo_barras, unidade_medida } = req.body;

            console.log('Dados recebidos:', req.body);

            if (!nome || !categoria_id || !tipo_id || !preco_custo || !preco_venda) {
                return res.status(400).json({ 
                    error: 'Todos os campos são obrigatórios',
                    received: req.body 
                });
            }

            // Iniciar transação
            const transaction = db.transaction(() => {
                const result = db.prepare(`
                    INSERT INTO produtos (nome, categoria_id, tipo_id, preco_custo, preco_venda, quantidade, codigo_barras, unidade_medida) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    nome, 
                    categoria_id, 
                    tipo_id, 
                    preco_custo, 
                    preco_venda, 
                    quantidade || 0,
                    codigo_barras || null,
                    unidade_medida || 'unidade'
                );

                // Registrar movimentação inicial se quantidade > 0
                if (quantidade > 0) {
                    db.prepare(`
                        INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao) 
                        VALUES (?, 'entrada', ?, 'Estoque inicial')
                    `).run(result.lastInsertRowid, quantidade);
                }

                return result.lastInsertRowid;
            });

            const produtoId = transaction();

            console.log('Produto criado com ID:', produtoId);

            res.json({ 
                id: produtoId, 
                message: 'Produto criado com sucesso' 
            });
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar produto
    atualizarProduto: (req, res) => {
        try {
            const { id } = req.params;
            const { nome, categoria_id, tipo_id, preco_custo, preco_venda, codigo_barras, unidade_medida } = req.body;

            const result = db.prepare(`
                UPDATE produtos 
                SET nome = ?, categoria_id = ?, tipo_id = ?, 
                    preco_custo = ?, preco_venda = ?, 
                    codigo_barras = ?, unidade_medida = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(nome, categoria_id, tipo_id, preco_custo, preco_venda, codigo_barras, unidade_medida, id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            res.json({ message: 'Produto atualizado com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar estoque do produto
    atualizarEstoque: (req, res) => {
        try {
            const { id } = req.params;
            const { quantidade, tipo, observacao } = req.body;

            const produto = db.prepare('SELECT quantidade FROM produtos WHERE id = ?').get(id);
            
            if (!produto) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            let novaQuantidade;
            if (tipo === 'entrada') {
                novaQuantidade = produto.quantidade + quantidade;
            } else if (tipo === 'saida') {
                novaQuantidade = produto.quantidade - quantidade;
            } else {
                novaQuantidade = quantidade;
            }

            if (novaQuantidade < 0) {
                return res.status(400).json({ error: 'Estoque não pode ficar negativo' });
            }

            const transaction = db.transaction(() => {
                db.prepare(`
                    UPDATE produtos SET quantidade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                `).run(novaQuantidade, id);

                db.prepare(`
                    INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao) 
                    VALUES (?, ?, ?, ?)
                `).run(id, tipo, quantidade, observacao || 'Ajuste de estoque');
            });

            transaction();

            if (req.io) {
                req.io.emit('estoque:atualizado', { tipo: 'produto', id, novaQuantidade });
            }

            res.json({ 
                message: 'Estoque atualizado com sucesso',
                novaQuantidade 
            });
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Excluir produto (com verificação detalhada)
    excluirProduto: (req, res) => {
        try {
            const { id } = req.params;
            
            console.log('Tentando excluir produto ID:', id);

            // 1. Verificar vendas
            const vendas = db.prepare(`
                SELECT COUNT(*) as count, 
                       GROUP_CONCAT(DISTINCT venda_id) as venda_ids
                FROM itens_venda 
                WHERE produto_id = ?
            `).get(id);
            
            if (vendas.count > 0) {
                console.log(`Produto possui ${vendas.count} vendas vinculadas. IDs: ${vendas.venda_ids}`);
                return res.status(400).json({ 
                    error: 'Não é possível excluir produto com vendas vinculadas',
                    message: `Este produto foi vendido ${vendas.count} vezes. Para excluí-lo, primeiro cancele as vendas relacionadas.`,
                    quantidade: vendas.count,
                    venda_ids: vendas.venda_ids,
                    tipo: 'vendas'
                });
            }

            // 2. Verificar doses
            const doses = db.prepare(`
                SELECT COUNT(*) as count, 
                       GROUP_CONCAT(id) as dose_ids,
                       GROUP_CONCAT(nome) as dose_nomes
                FROM doses 
                WHERE produto_id = ?
            `).get(id);
            
            if (doses.count > 0) {
                console.log(`Produto possui ${doses.count} doses vinculadas. IDs: ${doses.dose_ids}`);
                return res.status(400).json({ 
                    error: 'Não é possível excluir produto com doses vinculadas',
                    message: `Este produto possui ${doses.count} dose(s) vinculada(s): ${doses.dose_nomes}. Exclua as doses primeiro.`,
                    quantidade: doses.count,
                    doses: doses.dose_ids,
                    tipo: 'doses'
                });
            }

            // 3. Verificar combos
            const combos = db.prepare(`
                SELECT COUNT(*) as count, 
                       GROUP_CONCAT(combo_id) as combo_ids
                FROM itens_combo 
                WHERE produto_id = ?
            `).get(id);
            
            if (combos.count > 0) {
                console.log(`Produto está em ${combos.count} combos. IDs: ${combos.combo_ids}`);
                return res.status(400).json({ 
                    error: 'Não é possível excluir produto com combos vinculados',
                    message: `Este produto está em ${combos.count} combo(s). Remova-o dos combos primeiro.`,
                    quantidade: combos.count,
                    combo_ids: combos.combo_ids,
                    tipo: 'combos'
                });
            }

            // 4. Verificar movimentações de estoque
            const movimentacoes = db.prepare(`
                SELECT COUNT(*) as count 
                FROM movimentacoes_estoque 
                WHERE produto_id = ?
            `).get(id);
            
            if (movimentacoes.count > 0) {
                console.log(`Produto possui ${movimentacoes.count} movimentações de estoque`);
                return res.status(400).json({ 
                    error: 'Produto possui histórico de movimentações',
                    message: `Este produto tem ${movimentacoes.count} movimentações de estoque. Deseja excluir mesmo assim?`,
                    quantidade: movimentacoes.count,
                    tipo: 'movimentacoes',
                    podeForcar: true
                });
            }

            // 5. Se não houver dependências, excluir
            const result = db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            console.log('Produto excluído com sucesso:', id);
            
            if (req.io) {
                req.io.emit('produto:excluido', { id });
            }
            
            res.json({ message: 'Produto excluído com sucesso' });
            
        } catch (error) {
            console.error('Erro detalhado ao excluir produto:', error);
            
            if (error.message.includes('FOREIGN KEY')) {
                return res.status(400).json({ 
                    error: 'Não foi possível excluir o produto',
                    message: 'Este produto possui dependências em outras tabelas. Verifique vendas, doses, combos e movimentações.',
                    detalhes: error.message
                });
            }
            
            res.status(500).json({ error: error.message });
        }
    },

    // Forçar exclusão de produto (remove TODAS as dependências) - VERSÃO COM REMOÇÃO COMPLETA
    forcarExclusaoProduto: (req, res) => {
        try {
            const { id } = req.params;
            const { confirmar } = req.body;
            
            if (!confirmar) {
                return res.status(400).json({ error: 'Confirmação necessária para forçar exclusão' });
            }
            
            // Verificar se é admin
            const user = db.prepare('SELECT role FROM usuarios WHERE id = ?').get(req.usuario.id);
            if (user?.role !== 'admin') {
                return res.status(403).json({ error: 'Apenas administradores podem forçar exclusão' });
            }
            
            console.log('=========================================');
            console.log('🚨 FORÇANDO EXCLUSÃO DO PRODUTO ID:', id);
            console.log('=========================================');
            
            // Listar todas as dependências antes de remover
            const antes = {
                itens_venda: db.prepare('SELECT COUNT(*) as count FROM itens_venda WHERE produto_id = ?').get(id).count,
                doses: db.prepare('SELECT COUNT(*) as count FROM doses WHERE produto_id = ?').get(id).count,
                itens_combo: db.prepare('SELECT COUNT(*) as count FROM itens_combo WHERE produto_id = ?').get(id).count,
                movimentacoes: db.prepare('SELECT COUNT(*) as count FROM movimentacoes_estoque WHERE produto_id = ?').get(id).count
            };
            
            console.log('📊 DEPENDÊNCIAS ENCONTRADAS:');
            console.log('   - itens_venda:', antes.itens_venda);
            console.log('   - doses:', antes.doses);
            console.log('   - itens_combo:', antes.itens_combo);
            console.log('   - movimentacoes_estoque:', antes.movimentacoes);
            
            const transaction = db.transaction(() => {
                let registrosRemovidos = 0;
                
                // 1. Remover itens de venda
                if (antes.itens_venda > 0) {
                    const result = db.prepare('DELETE FROM itens_venda WHERE produto_id = ?').run(id);
                    registrosRemovidos += result.changes;
                    console.log(`   ✅ Removidos ${result.changes} itens de venda`);
                }
                
                // 2. Remover doses
                if (antes.doses > 0) {
                    const result = db.prepare('DELETE FROM doses WHERE produto_id = ?').run(id);
                    registrosRemovidos += result.changes;
                    console.log(`   ✅ Removidas ${result.changes} doses`);
                }
                
                // 3. Remover itens de combo
                if (antes.itens_combo > 0) {
                    const result = db.prepare('DELETE FROM itens_combo WHERE produto_id = ?').run(id);
                    registrosRemovidos += result.changes;
                    console.log(`   ✅ Removidos ${result.changes} itens de combo`);
                }
                
                // 4. Remover movimentações de estoque (AGORA DELETA TAMBÉM)
                if (antes.movimentacoes > 0) {
                    const result = db.prepare('DELETE FROM movimentacoes_estoque WHERE produto_id = ?').run(id);
                    registrosRemovidos += result.changes;
                    console.log(`   ✅ Removidas ${result.changes} movimentações de estoque`);
                }
                
                // 5. Finalmente excluir o produto
                const result = db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
                registrosRemovidos += result.changes;
                console.log(`   ✅ Produto excluído`);
                
                return registrosRemovidos;
            });
            
            const totalRemovidos = transaction();
            
            console.log('=========================================');
            console.log(`✅ EXCLUSÃO FORÇADA CONCLUÍDA!`);
            console.log(`   Total de registros removidos: ${totalRemovidos}`);
            console.log('=========================================');
            
            if (totalRemovidos === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            if (req.io) {
                req.io.emit('produto:excluido', { id, forcado: true, registrosRemovidos: totalRemovidos });
            }
            
            res.json({ 
                message: 'Produto excluído com sucesso (dependências removidas)',
                forcado: true,
                registrosRemovidos: totalRemovidos
            });
            
        } catch (error) {
            console.error('❌ ERRO AO FORÇAR EXCLUSÃO:');
            console.error('   Mensagem:', error.message);
            console.error('   Stack:', error.stack);
            res.status(500).json({ error: error.message });
        }
    },

    // Listar produtos com estoque baixo
    estoqueBaixo: (req, res) => {
        try {
            const produtos = db.prepare(`
                SELECT * FROM produtos 
                WHERE quantidade < 5 
                ORDER BY quantidade
            `).all();
            
            res.json(produtos || []);
        } catch (error) {
            console.error('Erro ao buscar estoque baixo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar produtos por categoria
    buscarPorCategoria: (req, res) => {
        try {
            const { categoriaId } = req.params;
            
            const produtos = db.prepare(`
                SELECT p.*, c.nome as categoria_nome, t.nome as tipo_nome
                FROM produtos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN tipos t ON p.tipo_id = t.id
                WHERE p.categoria_id = ?
                ORDER BY p.nome
            `).all(categoriaId);
            
            res.json(produtos || []);
        } catch (error) {
            console.error('Erro ao buscar produtos por categoria:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar produtos por tipo
    buscarPorTipo: (req, res) => {
        try {
            const { tipoId } = req.params;
            
            const produtos = db.prepare(`
                SELECT p.*, c.nome as categoria_nome, t.nome as tipo_nome
                FROM produtos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN tipos t ON p.tipo_id = t.id
                WHERE p.tipo_id = ?
                ORDER BY p.nome
            `).all(tipoId);
            
            res.json(produtos || []);
        } catch (error) {
            console.error('Erro ao buscar produtos por tipo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar produtos por nome (autocomplete)
    buscarPorNome: (req, res) => {
        try {
            const { termo } = req.query;
            
            if (!termo || termo.length < 2) {
                return res.json([]);
            }
            
            const produtos = db.prepare(`
                SELECT p.id, p.nome, p.preco_venda, p.quantidade,
                       c.nome as categoria_nome
                FROM produtos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.nome LIKE ? AND p.quantidade > 0
                ORDER BY p.nome
                LIMIT 10
            `).all(`%${termo}%`);
            
            res.json(produtos || []);
        } catch (error) {
            console.error('Erro ao buscar produtos por nome:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar histórico de movimentações de um produto
    historicoMovimentacoes: (req, res) => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;
            
            const movimentacoes = db.prepare(`
                SELECT m.*, u.nome as usuario_nome
                FROM movimentacoes_estoque m
                LEFT JOIN usuarios u ON m.usuario_id = u.id
                WHERE m.produto_id = ?
                ORDER BY m.data_movimentacao DESC
                LIMIT ? OFFSET ?
            `).all(id, parseInt(limit), parseInt(offset));
            
            const count = db.prepare(`
                SELECT COUNT(*) as total FROM movimentacoes_estoque WHERE produto_id = ?
            `).get(id);
            
            res.json({
                movimentacoes: movimentacoes || [],
                total: count?.total || 0,
                page: parseInt(page),
                totalPages: Math.ceil((count?.total || 0) / limit)
            });
        } catch (error) {
            console.error('Erro ao buscar histórico de movimentações:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = produtoController;