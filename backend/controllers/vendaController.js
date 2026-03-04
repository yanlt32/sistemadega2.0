const { db } = require('../models/database');

const vendaController = {
    // Criar nova venda
    criar: (req, res) => {
        const { itens, forma_pagamento, observacao } = req.body;
        const usuario_id = req.usuario.id;

        console.log('Recebendo venda:', { itens, forma_pagamento, usuario_id });

        if (!itens || itens.length === 0) {
            return res.status(400).json({ error: 'Selecione pelo menos um produto' });
        }

        let total = 0;
        let lucro = 0;
        let erros = [];

        // Buscar produtos para calcular totais e verificar estoque
        const produtosPromises = itens.map(item => {
            return new Promise((resolve, reject) => {
                db.get('SELECT * FROM produtos WHERE id = ?', [item.produto_id], (err, produto) => {
                    if (err) reject(err);
                    else resolve({ item, produto });
                });
            });
        });

        Promise.all(produtosPromises)
            .then(resultados => {
                // Verificar estoque e calcular totais
                for (const { item, produto } of resultados) {
                    if (!produto) {
                        erros.push(`Produto ID ${item.produto_id} não encontrado`);
                        continue;
                    }

                    if (produto.quantidade < item.quantidade) {
                        erros.push(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.quantidade}`);
                        continue;
                    }

                    total += produto.preco_venda * item.quantidade;
                    lucro += (produto.preco_venda - produto.preco_custo) * item.quantidade;
                }

                if (erros.length > 0) {
                    return res.status(400).json({ erros });
                }

                // Iniciar transação
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    // Inserir venda
                    db.run(
                        `INSERT INTO vendas (total, lucro, forma_pagamento, usuario_id, status, observacao) 
                         VALUES (?, ?, ?, ?, 'concluida', ?)`,
                        [total, lucro, forma_pagamento, usuario_id, observacao || null],
                        function(err) {
                            if (err) {
                                console.error('Erro ao inserir venda:', err);
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }

                            const venda_id = this.lastID;
                            console.log('Venda criada com ID:', venda_id);

                            let itensInseridos = 0;

                            // Inserir itens e atualizar estoque
                            resultados.forEach(({ item, produto }, index) => {
                                db.run(
                                    `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, preco_custo_unitario) 
                                     VALUES (?, ?, ?, ?, ?)`,
                                    [venda_id, item.produto_id, item.quantidade, produto.preco_venda, produto.preco_custo],
                                    function(err) {
                                        if (err) {
                                            console.error('Erro ao inserir item:', err);
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: err.message });
                                        }

                                        db.run(
                                            'UPDATE produtos SET quantidade = quantidade - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                            [item.quantidade, item.produto_id],
                                            function(err) {
                                                if (err) {
                                                    console.error('Erro ao atualizar estoque:', err);
                                                    db.run('ROLLBACK');
                                                    return;
                                                }

                                                db.run(
                                                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao, usuario_id) 
                                                     VALUES (?, 'saida', ?, ?, ?)`,
                                                    [item.produto_id, item.quantidade, `Venda #${venda_id}`, usuario_id]
                                                );

                                                itensInseridos++;
                                                if (itensInseridos === itens.length) {
                                                    db.run('COMMIT');
                                                    res.json({ 
                                                        id: venda_id, 
                                                        message: 'Venda finalizada com sucesso',
                                                        total,
                                                        lucro
                                                    });
                                                }
                                            }
                                        );
                                    }
                                );
                            });
                        }
                    );
                });
            })
            .catch(err => {
                console.error('Erro ao processar venda:', err);
                res.status(500).json({ error: err.message });
            });
    },

    // Listar todas as vendas
    listar: (req, res) => {
        const { data_inicio, data_fim, pagina = 1, limite = 20 } = req.query;
        const offset = (pagina - 1) * limite;
        
        let query = `
            SELECT v.*, u.nome as usuario_nome,
                   (SELECT COUNT(*) FROM itens_venda WHERE venda_id = v.id) as total_itens
            FROM vendas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE 1=1
        `;
        let params = [];
        let countParams = [];

        if (data_inicio && data_fim) {
            query += ' AND DATE(data_venda) BETWEEN DATE(?) AND DATE(?)';
            params.push(data_inicio, data_fim);
        }

        // Query para contar total
        let countQuery = 'SELECT COUNT(*) as total FROM vendas WHERE 1=1';
        if (data_inicio && data_fim) {
            countQuery += ' AND DATE(data_venda) BETWEEN DATE(?) AND DATE(?)';
            countParams.push(data_inicio, data_fim);
        }

        query += ' ORDER BY data_venda DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limite), parseInt(offset));

        db.all(query, params, (err, vendas) => {
            if (err) {
                console.error('Erro ao listar vendas:', err);
                return res.status(500).json({ error: err.message });
            }

            db.get(countQuery, countParams, (err, total) => {
                if (err) {
                    console.error('Erro ao contar vendas:', err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    vendas: vendas || [],
                    total: total?.total || 0,
                    pagina: parseInt(pagina),
                    totalPaginas: Math.ceil((total?.total || 0) / limite)
                });
            });
        });
    },

    // Buscar venda por ID
    buscarPorId: (req, res) => {
        const { id } = req.params;

        db.get(
            `SELECT v.*, u.nome as usuario_nome 
             FROM vendas v
             LEFT JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.id = ?`,
            [id],
            (err, venda) => {
                if (err) {
                    console.error('Erro ao buscar venda:', err);
                    return res.status(500).json({ error: err.message });
                }

                if (!venda) {
                    return res.status(404).json({ error: 'Venda não encontrada' });
                }

                // Buscar itens da venda
                db.all(
                    `SELECT iv.*, p.nome as produto_nome, p.preco_venda
                     FROM itens_venda iv
                     JOIN produtos p ON iv.produto_id = p.id
                     WHERE iv.venda_id = ?`,
                    [id],
                    (err, itens) => {
                        if (err) {
                            console.error('Erro ao buscar itens:', err);
                            return res.status(500).json({ error: err.message });
                        }

                        venda.itens = itens || [];
                        res.json(venda);
                    }
                );
            }
        );
    },

    // Atualizar venda (apenas observação e status)
    atualizar: (req, res) => {
        const { id } = req.params;
        const { observacao, status } = req.body;

        db.run(
            'UPDATE vendas SET observacao = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [observacao, status, id],
            function(err) {
                if (err) {
                    console.error('Erro ao atualizar venda:', err);
                    return res.status(500).json({ error: err.message });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Venda não encontrada' });
                }

                res.json({ message: 'Venda atualizada com sucesso' });
            }
        );
    },

    // Excluir venda (e restaurar estoque)
    excluir: (req, res) => {
        const { id } = req.params;

        // Primeiro, buscar itens da venda para restaurar estoque
        db.all('SELECT * FROM itens_venda WHERE venda_id = ?', [id], (err, itens) => {
            if (err) {
                console.error('Erro ao buscar itens da venda:', err);
                return res.status(500).json({ error: err.message });
            }

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Restaurar estoque dos produtos
                itens.forEach(item => {
                    db.run(
                        'UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?',
                        [item.quantidade, item.produto_id]
                    );

                    db.run(
                        `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, observacao, usuario_id) 
                         VALUES (?, 'entrada', ?, ?, ?)`,
                        [item.produto_id, item.quantidade, `Estorno venda #${id}`, req.usuario.id]
                    );
                });

                // Excluir itens da venda
                db.run('DELETE FROM itens_venda WHERE venda_id = ?', [id]);

                // Excluir venda
                db.run('DELETE FROM vendas WHERE id = ?', [id], function(err) {
                    if (err) {
                        console.error('Erro ao excluir venda:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    db.run('COMMIT');
                    res.json({ message: 'Venda excluída com sucesso', itensRestaurados: itens.length });
                });
            });
        });
    },

    // Cancelar venda (marcar como cancelada sem restaurar estoque)
    cancelar: (req, res) => {
        const { id } = req.params;
        const { motivo } = req.body;

        db.run(
            "UPDATE vendas SET status = 'cancelada', observacao = ? WHERE id = ?",
            [motivo || 'Venda cancelada', id],
            function(err) {
                if (err) {
                    console.error('Erro ao cancelar venda:', err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({ message: 'Venda cancelada com sucesso' });
            }
        );
    }
};

module.exports = vendaController;