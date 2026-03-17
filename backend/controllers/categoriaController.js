const { db } = require('../models/database');

const categoriaController = {
    // Listar todas as categorias
    listar: (req, res) => {
        db.all(`
            SELECT c.*, 
                   COUNT(p.id) as total_produtos
            FROM categorias c
            LEFT JOIN produtos p ON c.id = p.categoria_id
            GROUP BY c.id
            ORDER BY c.nome
        `, [], (err, rows) => {
            if (err) {
                console.error('Erro ao listar categorias:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        });
    },

    // Buscar categoria por ID
    buscarPorId: (req, res) => {
        const { id } = req.params;
        
        db.get('SELECT * FROM categorias WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Erro ao buscar categoria:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Categoria não encontrada' });
            }
            res.json(row);
        });
    },

    // Criar nova categoria
    criar: (req, res) => {
        const { nome, tipo, cor } = req.body;
        
        // VALIDAÇÃO MAIS FLEXÍVEL - qualquer tipo é permitido
        if (!nome || !tipo) {
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }

        // Normalizar o tipo (remover acentos, espaços, etc)
        const tipoNormalizado = tipo.toLowerCase().trim();

        db.run(
            'INSERT INTO categorias (nome, tipo, cor) VALUES (?, ?, ?)',
            [nome, tipoNormalizado, cor || '#c4a747'],
            function(err) {
                if (err) {
                    console.error('Erro ao criar categoria:', err);
                    return res.status(500).json({ error: err.message });
                }

                // Emitir evento
                if (req.io) {
                    req.io.emit('categoria:criada', { 
                        id: this.lastID, 
                        nome,
                        mensagem: `🏷️ Categoria "${nome}" criada!`
                    });
                }

                res.json({ 
                    id: this.lastID, 
                    message: 'Categoria criada com sucesso' 
                });
            }
        );
    },

    // Atualizar categoria
    atualizar: (req, res) => {
        const { id } = req.params;
        const { nome, tipo, cor } = req.body;

        if (!nome || !tipo) {
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }

        const tipoNormalizado = tipo.toLowerCase().trim();

        db.run(
            'UPDATE categorias SET nome = ?, tipo = ?, cor = ? WHERE id = ?',
            [nome, tipoNormalizado, cor, id],
            function(err) {
                if (err) {
                    console.error('Erro ao atualizar categoria:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Categoria não encontrada' });
                }

                if (req.io) {
                    req.io.emit('categoria:atualizada', { 
                        id, 
                        nome,
                        mensagem: `✏️ Categoria "${nome}" atualizada!`
                    });
                }

                res.json({ message: 'Categoria atualizada com sucesso' });
            }
        );
    },

    // Excluir categoria
    excluir: (req, res) => {
        const { id } = req.params;

        // Verificar se existem produtos usando esta categoria
        db.get('SELECT COUNT(*) as count FROM produtos WHERE categoria_id = ?', [id], (err, result) => {
            if (err) {
                console.error('Erro ao verificar produtos:', err);
                return res.status(500).json({ error: err.message });
            }

            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível excluir categoria com produtos vinculados',
                    quantidade: result.count 
                });
            }

            db.run('DELETE FROM categorias WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Erro ao excluir categoria:', err);
                    return res.status(500).json({ error: err.message });
                }

                if (req.io) {
                    req.io.emit('categoria:excluida', { 
                        id,
                        mensagem: `🗑️ Categoria excluída!`
                    });
                }

                res.json({ message: 'Categoria excluída com sucesso' });
            });
        });
    },

    // Listar tipos disponíveis (baseado nas categorias existentes)
    listarTipos: (req, res) => {
        db.all('SELECT DISTINCT tipo FROM categorias ORDER BY tipo', [], (err, rows) => {
            if (err) {
                console.error('Erro ao listar tipos:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows.map(r => r.tipo));
        });
    }
};

module.exports = categoriaController;