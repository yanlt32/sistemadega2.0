const { db } = require('../models/database');

const doseController = {
    // Listar todas as doses
    listar: (req, res) => {
        try {
            const doses = db.prepare(`
                SELECT d.*, p.nome as produto_nome 
                FROM doses d
                LEFT JOIN produtos p ON d.produto_id = p.id
                ORDER BY d.nome
            `).all();
            
            res.json(doses || []);
        } catch (error) {
            console.error('Erro ao listar doses:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar dose por ID
    buscarPorId: (req, res) => {
        try {
            const { id } = req.params;
            
            const dose = db.prepare(`
                SELECT d.*, p.nome as produto_nome 
                FROM doses d
                LEFT JOIN produtos p ON d.produto_id = p.id
                WHERE d.id = ?
            `).get(id);
            
            if (!dose) {
                return res.status(404).json({ error: 'Dose não encontrada' });
            }
            res.json(dose);
        } catch (error) {
            console.error('Erro ao buscar dose:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar nova dose
    criar: (req, res) => {
        try {
            const { produto_id, nome, volume_ml, preco_custo, preco_venda, quantidade_estoque } = req.body;

            if (!nome || !preco_custo || !preco_venda) {
                return res.status(400).json({ error: 'Nome, preço custo e preço venda são obrigatórios' });
            }

            // Iniciar transação
            const transaction = db.transaction(() => {
                const result = db.prepare(`
                    INSERT INTO doses (produto_id, nome, volume_ml, preco_custo, preco_venda, quantidade_estoque) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(produto_id || null, nome, volume_ml || null, preco_custo, preco_venda, quantidade_estoque || 0);

                // Registrar movimentação
                if (quantidade_estoque > 0) {
                    db.prepare(`
                        INSERT INTO movimentacoes_estoque (dose_id, tipo, quantidade, observacao) 
                        VALUES (?, 'entrada', ?, 'Estoque inicial')
                    `).run(result.lastInsertRowid, quantidade_estoque);
                }

                return result.lastInsertRowid;
            });

            const id = transaction();

            // Emitir evento
            if (req.io) {
                req.io.emit('dose:criada', { id, nome });
            }

            res.json({ id, message: 'Dose criada com sucesso' });
        } catch (error) {
            console.error('Erro ao criar dose:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar dose
    atualizar: (req, res) => {
        try {
            const { id } = req.params;
            const { produto_id, nome, volume_ml, preco_custo, preco_venda } = req.body;

            const result = db.prepare(`
                UPDATE doses 
                SET produto_id = ?, nome = ?, volume_ml = ?, preco_custo = ?, preco_venda = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(produto_id, nome, volume_ml, preco_custo, preco_venda, id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Dose não encontrada' });
            }
            
            res.json({ message: 'Dose atualizada com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar dose:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar estoque da dose
    atualizarEstoque: (req, res) => {
        try {
            const { id } = req.params;
            const { quantidade, tipo, observacao } = req.body;

            const dose = db.prepare('SELECT quantidade_estoque FROM doses WHERE id = ?').get(id);
            
            if (!dose) {
                return res.status(404).json({ error: 'Dose não encontrada' });
            }

            let novaQuantidade;
            if (tipo === 'entrada') {
                novaQuantidade = dose.quantidade_estoque + quantidade;
            } else if (tipo === 'saida') {
                novaQuantidade = dose.quantidade_estoque - quantidade;
            } else {
                novaQuantidade = quantidade;
            }

            if (novaQuantidade < 0) {
                return res.status(400).json({ error: 'Estoque não pode ficar negativo' });
            }

            // Iniciar transação
            const transaction = db.transaction(() => {
                db.prepare(`
                    UPDATE doses SET quantidade_estoque = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                `).run(novaQuantidade, id);

                db.prepare(`
                    INSERT INTO movimentacoes_estoque (dose_id, tipo, quantidade, observacao) 
                    VALUES (?, ?, ?, ?)
                `).run(id, tipo, quantidade, observacao || 'Ajuste de estoque');
            });

            transaction();

            if (req.io) {
                req.io.emit('estoque:atualizado', { tipo: 'dose', id });
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

    // Excluir dose
    excluir: (req, res) => {
        try {
            const { id } = req.params;

            const result = db.prepare('DELETE FROM doses WHERE id = ?').run(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Dose não encontrada' });
            }
            
            if (req.io) {
                req.io.emit('dose:excluida', { id });
            }
            
            res.json({ message: 'Dose excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir dose:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = doseController;