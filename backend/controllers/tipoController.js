const { db } = require('../models/database');

const tipoController = {
    // Listar todos os tipos
    listar: (req, res) => {
        try {
            const tipos = db.prepare(`
                SELECT t.*, c.nome as categoria_nome 
                FROM tipos t
                LEFT JOIN categorias c ON t.categoria_id = c.id
                ORDER BY t.nome
            `).all();
            res.json(tipos);
        } catch (error) {
            console.error('Erro ao listar tipos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar tipos por categoria
    porCategoria: (req, res) => {
        try {
            const { categoriaId } = req.params;
            const tipos = db.prepare(`
                SELECT t.*, c.nome as categoria_nome 
                FROM tipos t
                LEFT JOIN categorias c ON t.categoria_id = c.id
                WHERE t.categoria_id = ?
                ORDER BY t.nome
            `).all(categoriaId);
            res.json(tipos);
        } catch (error) {
            console.error('Erro ao buscar tipos por categoria:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar novo tipo
    criar: (req, res) => {
        try {
            const { nome, categoria_id } = req.body;
            
            if (!nome || !categoria_id) {
                return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
            }

            const result = db.prepare(
                'INSERT INTO tipos (nome, categoria_id) VALUES (?, ?)'
            ).run(nome, categoria_id);
            
            res.json({ id: result.lastInsertRowid, message: 'Tipo criado com sucesso' });
        } catch (error) {
            console.error('Erro ao criar tipo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar tipo
    atualizar: (req, res) => {
        try {
            const { id } = req.params;
            const { nome, categoria_id } = req.body;

            const result = db.prepare(
                'UPDATE tipos SET nome = ?, categoria_id = ? WHERE id = ?'
            ).run(nome, categoria_id, id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Tipo não encontrado' });
            }
            
            res.json({ message: 'Tipo atualizado com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar tipo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Excluir tipo
    excluir: (req, res) => {
        try {
            const { id } = req.params;

            // Verificar se existem produtos usando este tipo
            const result = db.prepare('SELECT COUNT(*) as count FROM produtos WHERE tipo_id = ?').get(id);

            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível excluir tipo com produtos vinculados',
                    quantidade: result.count 
                });
            }

            const deleteResult = db.prepare('DELETE FROM tipos WHERE id = ?').run(id);
            
            if (deleteResult.changes === 0) {
                return res.status(404).json({ error: 'Tipo não encontrado' });
            }
            
            res.json({ message: 'Tipo excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir tipo:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = tipoController;