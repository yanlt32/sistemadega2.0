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

            console.log('Dados recebidos:', req.body); // Debug

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

            console.log('Produto criado com ID:', produtoId); // Debug

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
                novaQuantidade = quantidade; // Ajuste manual
            }

            if (novaQuantidade < 0) {
                return res.status(400).json({ error: 'Estoque não pode ficar negativo' });
            }

            // Iniciar transação
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

    // Excluir produto
    excluirProduto: (req, res) => {
        try {
            const { id } = req.params;

            // Verificar se existem vendas vinculadas a este produto
            const vendas = db.prepare('SELECT COUNT(*) as count FROM itens_venda WHERE produto_id = ?').get(id);
            
            if (vendas.count > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível excluir produto com vendas vinculadas',
                    quantidade: vendas.count 
                });
            }

            // Verificar se existem doses vinculadas
            const doses = db.prepare('SELECT COUNT(*) as count FROM doses WHERE produto_id = ?').get(id);
            
            if (doses.count > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível excluir produto com doses vinculadas',
                    quantidade: doses.count 
                });
            }

            const result = db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            if (req.io) {
                req.io.emit('produto:excluido', { id });
            }
            
            res.json({ message: 'Produto excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
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