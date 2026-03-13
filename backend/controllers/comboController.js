const { db } = require('../models/database');

const comboController = {
    // Listar todos os combos
    listar: (req, res) => {
        db.all(`
            SELECT c.*, 
                   COUNT(ic.id) as total_itens
            FROM combos c
            LEFT JOIN itens_combo ic ON c.id = ic.combo_id
            GROUP BY c.id
            ORDER BY c.nome
        `, [], (err, rows) => {
            if (err) {
                console.error('Erro ao listar combos:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        });
    },

    // Buscar combo por ID com itens
    buscarPorId: (req, res) => {
        const { id } = req.params;
        
        db.get('SELECT * FROM combos WHERE id = ?', [id], (err, combo) => {
            if (err) {
                console.error('Erro ao buscar combo:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!combo) {
                return res.status(404).json({ error: 'Combo não encontrado' });
            }

            db.all(`
                SELECT ic.*, 
                       p.nome as produto_nome,
                       d.nome as dose_nome
                FROM itens_combo ic
                LEFT JOIN produtos p ON ic.produto_id = p.id
                LEFT JOIN doses d ON ic.dose_id = d.id
                WHERE ic.combo_id = ?
            `, [id], (err, itens) => {
                if (err) {
                    console.error('Erro ao buscar itens do combo:', err);
                    return res.status(500).json({ error: err.message });
                }
                combo.itens = itens || [];
                res.json(combo);
            });
        });
    },

    // Criar novo combo
    criar: (req, res) => {
        const { nome, descricao, preco_custo, preco_venda, itens } = req.body;

        if (!nome || !preco_custo || !preco_venda) {
            return res.status(400).json({ error: 'Nome, preço custo e preço venda são obrigatórios' });
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                `INSERT INTO combos (nome, descricao, preco_custo, preco_venda) 
                 VALUES (?, ?, ?, ?)`,
                [nome, descricao || null, preco_custo, preco_venda],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar combo:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    const combo_id = this.lastID;

                    if (itens && itens.length > 0) {
                        let itensInseridos = 0;
                        
                        itens.forEach(item => {
                            db.run(
                                `INSERT INTO itens_combo (combo_id, produto_id, dose_id, quantidade) 
                                 VALUES (?, ?, ?, ?)`,
                                [combo_id, item.produto_id || null, item.dose_id || null, item.quantidade],
                                function(err) {
                                    if (err) {
                                        console.error('Erro ao inserir item do combo:', err);
                                        db.run('ROLLBACK');
                                        return;
                                    }

                                    itensInseridos++;
                                    if (itensInseridos === itens.length) {
                                        db.run('COMMIT');
                                        req.io.emit('combo:criado', { id: combo_id, nome });
                                        res.json({ id: combo_id, message: 'Combo criado com sucesso' });
                                    }
                                }
                            );
                        });
                    } else {
                        db.run('COMMIT');
                        req.io.emit('combo:criado', { id: combo_id, nome });
                        res.json({ id: combo_id, message: 'Combo criado com sucesso' });
                    }
                }
            );
        });
    },

    // Atualizar combo
    atualizar: (req, res) => {
        const { id } = req.params;
        const { nome, descricao, preco_custo, preco_venda, itens } = req.body;

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                `UPDATE combos 
                 SET nome = ?, descricao = ?, preco_custo = ?, preco_venda = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [nome, descricao, preco_custo, preco_venda, id],
                function(err) {
                    if (err) {
                        console.error('Erro ao atualizar combo:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    // Remover itens antigos
                    db.run('DELETE FROM itens_combo WHERE combo_id = ?', [id], (err) => {
                        if (err) {
                            console.error('Erro ao remover itens antigos:', err);
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }

                        if (itens && itens.length > 0) {
                            let itensInseridos = 0;
                            
                            itens.forEach(item => {
                                db.run(
                                    `INSERT INTO itens_combo (combo_id, produto_id, dose_id, quantidade) 
                                     VALUES (?, ?, ?, ?)`,
                                    [id, item.produto_id || null, item.dose_id || null, item.quantidade],
                                    function(err) {
                                        if (err) {
                                            console.error('Erro ao inserir item do combo:', err);
                                            db.run('ROLLBACK');
                                            return;
                                        }

                                        itensInseridos++;
                                        if (itensInseridos === itens.length) {
                                            db.run('COMMIT');
                                            req.io.emit('combo:atualizado', { id });
                                            res.json({ message: 'Combo atualizado com sucesso' });
                                        }
                                    }
                                );
                            });
                        } else {
                            db.run('COMMIT');
                            req.io.emit('combo:atualizado', { id });
                            res.json({ message: 'Combo atualizado com sucesso' });
                        }
                    });
                }
            );
        });
    },

    // Excluir combo
    excluir: (req, res) => {
        const { id } = req.params;

        db.run('DELETE FROM combos WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Erro ao excluir combo:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Combo não encontrado' });
            }
            
            req.io.emit('combo:excluido', { id });
            
            res.json({ message: 'Combo excluído com sucesso' });
        });
    }
};

module.exports = comboController;