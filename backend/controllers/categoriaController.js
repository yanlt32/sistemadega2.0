const { db } = require('../models/database');

const categoriaController = {
    // Listar todas as categorias
    listar: (req, res) => {
        try {
            const categorias = db.prepare(`
                SELECT c.*, 
                       COUNT(p.id) as total_produtos
                FROM categorias c
                LEFT JOIN produtos p ON c.id = p.categoria_id
                GROUP BY c.id
                ORDER BY c.nome
            `).all();
            
            res.json(categorias || []);
        } catch (error) {
            console.error('Erro ao listar categorias:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar categoria por ID
    buscarPorId: (req, res) => {
        try {
            const { id } = req.params;
            
            const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
            
            if (!categoria) {
                return res.status(404).json({ error: 'Categoria não encontrada' });
            }
            res.json(categoria);
        } catch (error) {
            console.error('Erro ao buscar categoria:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar nova categoria
    criar: (req, res) => {
        try {
            const { nome, tipo, cor } = req.body;
            
            if (!nome || !tipo) {
                return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
            }

            const tipoNormalizado = tipo.toLowerCase().trim();

            const result = db.prepare(
                'INSERT INTO categorias (nome, tipo, cor) VALUES (?, ?, ?)'
            ).run(nome, tipoNormalizado, cor || '#c4a747');

            if (req.io) {
                req.io.emit('categoria:criada', { 
                    id: result.lastInsertRowid, 
                    nome,
                    mensagem: `🏷️ Categoria "${nome}" criada!`
                });
            }

            res.json({ 
                id: result.lastInsertRowid, 
                message: 'Categoria criada com sucesso' 
            });
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar categoria
    atualizar: (req, res) => {
        try {
            const { id } = req.params;
            const { nome, tipo, cor } = req.body;

            if (!nome || !tipo) {
                return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
            }

            const tipoNormalizado = tipo.toLowerCase().trim();

            const result = db.prepare(
                'UPDATE categorias SET nome = ?, tipo = ?, cor = ? WHERE id = ?'
            ).run(nome, tipoNormalizado, cor, id);
            
            if (result.changes === 0) {
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
        } catch (error) {
            console.error('Erro ao atualizar categoria:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Excluir categoria
    excluir: (req, res) => {
        try {
            const { id } = req.params;

            // Verificar se existem produtos usando esta categoria
            const result = db.prepare('SELECT COUNT(*) as count FROM produtos WHERE categoria_id = ?').get(id);

            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível excluir categoria com produtos vinculados',
                    quantidade: result.count 
                });
            }

            const deleteResult = db.prepare('DELETE FROM categorias WHERE id = ?').run(id);

            if (req.io) {
                req.io.emit('categoria:excluida', { 
                    id,
                    mensagem: `🗑️ Categoria excluída!`
                });
            }

            res.json({ message: 'Categoria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Listar tipos disponíveis (baseado nas categorias existentes)
    listarTipos: (req, res) => {
        try {
            const tipos = db.prepare('SELECT DISTINCT tipo FROM categorias ORDER BY tipo').all();
            res.json(tipos.map(t => t.tipo));
        } catch (error) {
            console.error('Erro ao listar tipos:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = categoriaController;