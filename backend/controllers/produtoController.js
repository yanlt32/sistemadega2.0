const { db } = require('../models/database');

exports.listarProdutos = (req, res) => {
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

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Erro ao listar produtos:', err);
            return res.status(500).json({ error: err.message });
        }

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

        db.get(countQuery, countParams, (err, count) => {
            if (err) {
                console.error('Erro ao contar produtos:', err);
                return res.status(500).json({ error: err.message });
            }

            res.json({
                produtos: rows || [],
                total: count ? count.total : 0,
                page: parseInt(page),
                totalPages: Math.ceil((count ? count.total : 0) / limit)
            });
        });
    });
};

exports.criarProduto = (req, res) => {
    const { nome, categoria_id, tipo_id, preco_custo, preco_venda, quantidade } = req.body;

    console.log('Dados recebidos:', req.body); // Debug

    if (!nome || !categoria_id || !tipo_id || !preco_custo || !preco_venda) {
        return res.status(400).json({ 
            error: 'Todos os campos são obrigatórios',
            received: req.body 
        });
    }

    db.run(
        `INSERT INTO produtos (nome, categoria_id, tipo_id, preco_custo, preco_venda, quantidade) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nome, categoria_id, tipo_id, preco_custo, preco_venda, quantidade || 0],
        function(err) {
            if (err) {
                console.error('Erro ao criar produto:', err);
                return res.status(500).json({ error: err.message });
            }

            // Registrar movimentação inicial se quantidade > 0
            if (quantidade > 0) {
                db.run(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao) 
                     VALUES (?, ?, ?, ?)`,
                    [this.lastID, 'entrada', quantidade, 'Estoque inicial']
                );
            }

            console.log('Produto criado com ID:', this.lastID); // Debug

            res.json({ 
                id: this.lastID, 
                message: 'Produto criado com sucesso' 
            });
        }
    );
};

exports.atualizarProduto = (req, res) => {
    const { id } = req.params;
    const { nome, categoria_id, tipo_id, preco_custo, preco_venda } = req.body;

    db.run(
        `UPDATE produtos 
         SET nome = ?, categoria_id = ?, tipo_id = ?, preco_custo = ?, preco_venda = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nome, categoria_id, tipo_id, preco_custo, preco_venda, id],
        function(err) {
            if (err) {
                console.error('Erro ao atualizar produto:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Produto atualizado com sucesso' });
        }
    );
};

exports.atualizarEstoque = (req, res) => {
    const { id } = req.params;
    const { quantidade, tipo, observacao } = req.body;

    db.get('SELECT quantidade FROM produtos WHERE id = ?', [id], (err, produto) => {
        if (err) {
            console.error('Erro ao buscar produto:', err);
            return res.status(500).json({ error: err.message });
        }
        
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

        db.run(
            'UPDATE produtos SET quantidade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [novaQuantidade, id],
            function(err) {
                if (err) {
                    console.error('Erro ao atualizar estoque:', err);
                    return res.status(500).json({ error: err.message });
                }

                db.run(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao) 
                     VALUES (?, ?, ?, ?)`,
                    [id, tipo, quantidade, observacao || 'Ajuste de estoque']
                );

                res.json({ 
                    message: 'Estoque atualizado com sucesso',
                    novaQuantidade 
                });
            }
        );
    });
};

exports.excluirProduto = (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM produtos WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Erro ao excluir produto:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Produto excluído com sucesso' });
    });
};

exports.estoqueBaixo = (req, res) => {
    db.all('SELECT * FROM produtos WHERE quantidade < 5 ORDER BY quantidade', (err, rows) => {
        if (err) {
            console.error('Erro ao buscar estoque baixo:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
};