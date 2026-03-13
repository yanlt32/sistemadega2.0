const { db } = require('../models/database');

const doseController = {
    // Listar todas as doses
    listar: (req, res) => {
        db.all(`
            SELECT d.*, p.nome as produto_nome 
            FROM doses d
            LEFT JOIN produtos p ON d.produto_id = p.id
            ORDER BY d.nome
        `, [], (err, rows) => {
            if (err) {
                console.error('Erro ao listar doses:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        });
    },

    // Buscar dose por ID
    buscarPorId: (req, res) => {
        const { id } = req.params;
        
        db.get(`
            SELECT d.*, p.nome as produto_nome 
            FROM doses d
            LEFT JOIN produtos p ON d.produto_id = p.id
            WHERE d.id = ?
        `, [id], (err, row) => {
            if (err) {
                console.error('Erro ao buscar dose:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Dose não encontrada' });
            }
            res.json(row);
        });
    },

    // Criar nova dose
    criar: (req, res) => {
        const { produto_id, nome, volume_ml, preco_custo, preco_venda, quantidade_estoque } = req.body;

        if (!nome || !preco_custo || !preco_venda) {
            return res.status(400).json({ error: 'Nome, preço custo e preço venda são obrigatórios' });
        }

        db.run(
            `INSERT INTO doses (produto_id, nome, volume_ml, preco_custo, preco_venda, quantidade_estoque) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [produto_id || null, nome, volume_ml || null, preco_custo, preco_venda, quantidade_estoque || 0],
            function(err) {
                if (err) {
                    console.error('Erro ao criar dose:', err);
                    return res.status(500).json({ error: err.message });
                }

                // Registrar movimentação
                if (quantidade_estoque > 0) {
                    db.run(
                        `INSERT INTO movimentacoes_estoque (dose_id, tipo, quantidade, observacao) 
                         VALUES (?, 'entrada', ?, 'Estoque inicial')`,
                        [this.lastID, quantidade_estoque]
                    );
                }

                // Emitir evento
                req.io.emit('dose:criada', { id: this.lastID, nome });

                res.json({ id: this.lastID, message: 'Dose criada com sucesso' });
            }
        );
    },

    // Atualizar dose
    atualizar: (req, res) => {
        const { id } = req.params;
        const { produto_id, nome, volume_ml, preco_custo, preco_venda } = req.body;

        db.run(
            `UPDATE doses 
             SET produto_id = ?, nome = ?, volume_ml = ?, preco_custo = ?, preco_venda = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [produto_id, nome, volume_ml, preco_custo, preco_venda, id],
            function(err) {
                if (err) {
                    console.error('Erro ao atualizar dose:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Dose não encontrada' });
                }
                res.json({ message: 'Dose atualizada com sucesso' });
            }
        );
    },

    // Atualizar estoque da dose
    atualizarEstoque: (req, res) => {
        const { id } = req.params;
        const { quantidade, tipo, observacao } = req.body;

        db.get('SELECT quantidade_estoque FROM doses WHERE id = ?', [id], (err, dose) => {
            if (err) {
                console.error('Erro ao buscar dose:', err);
                return res.status(500).json({ error: err.message });
            }
            
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

            db.run(
                'UPDATE doses SET quantidade_estoque = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [novaQuantidade, id],
                function(err) {
                    if (err) {
                        console.error('Erro ao atualizar estoque:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    db.run(
                        `INSERT INTO movimentacoes_estoque (dose_id, tipo, quantidade, observacao) 
                         VALUES (?, ?, ?, ?)`,
                        [id, tipo, quantidade, observacao || 'Ajuste de estoque']
                    );

                    req.io.emit('estoque:atualizado', { tipo: 'dose', id });

                    res.json({ 
                        message: 'Estoque atualizado com sucesso',
                        novaQuantidade 
                    });
                }
            );
        });
    },

    // Excluir dose
    excluir: (req, res) => {
        const { id } = req.params;

        db.run('DELETE FROM doses WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Erro ao excluir dose:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Dose não encontrada' });
            }
            
            req.io.emit('dose:excluida', { id });
            
            res.json({ message: 'Dose excluída com sucesso' });
        });
    }
};

module.exports = doseController;