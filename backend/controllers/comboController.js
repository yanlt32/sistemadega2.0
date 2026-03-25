const { db } = require('../models/database');

const comboController = {
    // Listar todos os combos
    listar: (req, res) => {
        try {
            const combos = db.prepare(`
                SELECT c.*, 
                       COUNT(ic.id) as total_itens
                FROM combos c
                LEFT JOIN itens_combo ic ON c.id = ic.combo_id
                GROUP BY c.id
                ORDER BY c.nome
            `).all();
            
            res.json(combos || []);
        } catch (error) {
            console.error('Erro ao listar combos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar combo por ID com itens
    buscarPorId: (req, res) => {
        try {
            const { id } = req.params;
            
            const combo = db.prepare('SELECT * FROM combos WHERE id = ?').get(id);
            
            if (!combo) {
                return res.status(404).json({ error: 'Combo não encontrado' });
            }

            const itens = db.prepare(`
                SELECT ic.*, 
                       p.nome as produto_nome,
                       d.nome as dose_nome
                FROM itens_combo ic
                LEFT JOIN produtos p ON ic.produto_id = p.id
                LEFT JOIN doses d ON ic.dose_id = d.id
                WHERE ic.combo_id = ?
            `).all(id);
            
            combo.itens = itens || [];
            res.json(combo);
        } catch (error) {
            console.error('Erro ao buscar combo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar novo combo
    criar: (req, res) => {
        try {
            const { nome, descricao, preco_custo, preco_venda, itens } = req.body;

            if (!nome || !preco_custo || !preco_venda) {
                return res.status(400).json({ error: 'Nome, preço custo e preço venda são obrigatórios' });
            }

            // Iniciar transação
            const transaction = db.transaction(() => {
                // Inserir combo
                const result = db.prepare(`
                    INSERT INTO combos (nome, descricao, preco_custo, preco_venda) 
                    VALUES (?, ?, ?, ?)
                `).run(nome, descricao || null, preco_custo, preco_venda);

                const combo_id = result.lastInsertRowid;

                // Inserir itens
                if (itens && itens.length > 0) {
                    const insertItem = db.prepare(`
                        INSERT INTO itens_combo (combo_id, produto_id, dose_id, quantidade) 
                        VALUES (?, ?, ?, ?)
                    `);
                    
                    for (const item of itens) {
                        insertItem.run(combo_id, item.produto_id || null, item.dose_id || null, item.quantidade);
                    }
                }

                return combo_id;
            });

            const combo_id = transaction();

            if (req.io) {
                req.io.emit('combo:criado', { id: combo_id, nome });
            }
            
            res.json({ id: combo_id, message: 'Combo criado com sucesso' });
        } catch (error) {
            console.error('Erro ao criar combo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar combo
    atualizar: (req, res) => {
        try {
            const { id } = req.params;
            const { nome, descricao, preco_custo, preco_venda, itens } = req.body;

            // Iniciar transação
            const transaction = db.transaction(() => {
                // Atualizar combo
                const result = db.prepare(`
                    UPDATE combos 
                    SET nome = ?, descricao = ?, preco_custo = ?, preco_venda = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(nome, descricao, preco_custo, preco_venda, id);
                
                if (result.changes === 0) {
                    throw new Error('Combo não encontrado');
                }

                // Remover itens antigos
                db.prepare('DELETE FROM itens_combo WHERE combo_id = ?').run(id);

                // Inserir novos itens
                if (itens && itens.length > 0) {
                    const insertItem = db.prepare(`
                        INSERT INTO itens_combo (combo_id, produto_id, dose_id, quantidade) 
                        VALUES (?, ?, ?, ?)
                    `);
                    
                    for (const item of itens) {
                        insertItem.run(id, item.produto_id || null, item.dose_id || null, item.quantidade);
                    }
                }
            });

            transaction();

            if (req.io) {
                req.io.emit('combo:atualizado', { id });
            }
            
            res.json({ message: 'Combo atualizado com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar combo:', error);
            if (error.message === 'Combo não encontrado') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    },

    // Excluir combo
    excluir: (req, res) => {
        try {
            const { id } = req.params;

            const result = db.prepare('DELETE FROM combos WHERE id = ?').run(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Combo não encontrado' });
            }
            
            if (req.io) {
                req.io.emit('combo:excluido', { id });
            }
            
            res.json({ message: 'Combo excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir combo:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = comboController;