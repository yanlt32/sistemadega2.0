const TipoModel = require('../models/tipoModel');

exports.listar = async (req, res) => {
    try {
        const tipos = await TipoModel.findAll();
        res.json(tipos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.porCategoria = async (req, res) => {
    try {
        const tipos = await TipoModel.findByCategoria(req.params.categoriaId);
        res.json(tipos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.criar = async (req, res) => {
    try {
        const { nome, categoria_id } = req.body;
        
        if (!nome || !categoria_id) {
            return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
        }

        const id = await TipoModel.create(nome, categoria_id);
        res.json({ id, message: 'Tipo criado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.atualizar = async (req, res) => {
    try {
        const { nome, categoria_id } = req.body;
        const changes = await TipoModel.update(req.params.id, nome, categoria_id);
        
        if (changes === 0) {
            return res.status(404).json({ error: 'Tipo não encontrado' });
        }
        
        res.json({ message: 'Tipo atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.excluir = async (req, res) => {
    try {
        const changes = await TipoModel.delete(req.params.id);
        
        if (changes === 0) {
            return res.status(404).json({ error: 'Tipo não encontrado' });
        }
        
        res.json({ message: 'Tipo excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};