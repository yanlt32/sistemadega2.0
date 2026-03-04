const { db } = require('../models/database');

exports.criarVenda = (req, res) => {
    const { itens, forma_pagamento } = req.body;
    const usuario_id = req.usuario.id;

    if (!itens || itens.length === 0) {
        return res.status(400).json({ error: 'Selecione pelo menos um produto' });
    }

    let total = 0;
    let lucro = 0;
    let erros = [];

    // Verificar estoque e calcular totais
    const processarItens = async () => {
        for (const item of itens) {
            try {
                const produto = await new Promise((resolve, reject) => {
                    db.get('SELECT * FROM produtos WHERE id = ?', [item.produto_id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (!produto) {
                    erros.push(`Produto ID ${item.produto_id} não encontrado`);
                    continue;
                }

                if (produto.quantidade < item.quantidade) {
                    erros.push(`Estoque insuficiente para ${produto.nome}`);
                    continue;
                }

                total += produto.preco_venda * item.quantidade;
                lucro += (produto.preco_venda - produto.preco_custo) * item.quantidade;
            } catch (error) {
                erros.push(error.message);
            }
        }

        if (erros.length > 0) {
            return res.status(400).json({ erros });
        }

        // Iniciar transação
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Inserir venda
            db.run(
                `INSERT INTO vendas (total, lucro, forma_pagamento, usuario_id) 
                 VALUES (?, ?, ?, ?)`,
                [total, lucro, forma_pagamento, usuario_id],
                function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    const venda_id = this.lastID;

                    // Inserir itens e atualizar estoque
                    itens.forEach(item => {
                        db.get('SELECT * FROM produtos WHERE id = ?', [item.produto_id], (err, produto) => {
                            db.run(
                                `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, preco_custo_unitario) 
                                 VALUES (?, ?, ?, ?, ?)`,
                                [venda_id, item.produto_id, item.quantidade, produto.preco_venda, produto.preco_custo]
                            );

                            db.run(
                                'UPDATE produtos SET quantidade = quantidade - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                [item.quantidade, item.produto_id]
                            );

                            db.run(
                                `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao) 
                                 VALUES (?, ?, ?, ?)`,
                                [item.produto_id, 'saida', item.quantidade, `Venda #${venda_id}`]
                            );
                        });
                    });

                    db.run('COMMIT');
                    res.json({ 
                        id: venda_id, 
                        message: 'Venda finalizada com sucesso',
                        total,
                        lucro
                    });
                }
            );
        });
    };

    processarItens();
};

exports.listarVendas = (req, res) => {
    const { data_inicio, data_fim } = req.query;
    let query = `
        SELECT v.*, u.nome as usuario_nome 
        FROM vendas v
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        WHERE 1=1
    `;
    let params = [];

    if (data_inicio && data_fim) {
        query += ' AND DATE(data_venda) BETWEEN DATE(?) AND DATE(?)';
        params.push(data_inicio, data_fim);
    }

    query += ' ORDER BY data_venda DESC';

    db.all(query, params, (err, vendas) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Buscar itens de cada venda
        const promises = vendas.map(venda => {
            return new Promise((resolve, reject) => {
                db.all(
                    `SELECT iv.*, p.nome as produto_nome 
                     FROM itens_venda iv
                     JOIN produtos p ON iv.produto_id = p.id
                     WHERE iv.venda_id = ?`,
                    [venda.id],
                    (err, itens) => {
                        if (err) reject(err);
                        venda.itens = itens;
                        resolve();
                    }
                );
            });
        });

        Promise.all(promises)
            .then(() => res.json(vendas))
            .catch(err => res.status(500).json({ error: err.message }));
    });
};