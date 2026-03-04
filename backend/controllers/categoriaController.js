const CategoriaModel = require('../models/categoriaModel');
const TipoModel = require('../models/tipoModel');

exports.listar = async (req, res) => {
    try {
        const categorias = await CategoriaModel.findAll();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.buscar = async (req, res) => {
    try {
        const categoria = await CategoriaModel.findById(req.params.id);
        if (!categoria) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        res.json(categoria);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.criar = async (req, res) => {
    try {
        const { nome, tipo, cor } = req.body;
        
        if (!nome || !tipo) {
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }

        const id = await CategoriaModel.create(nome, tipo, cor || '#4CAF50');
        res.json({ id, message: 'Categoria criada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.atualizar = async (req, res) => {
    try {
        const { nome, tipo, cor } = req.body;
        const changes = await CategoriaModel.update(req.params.id, nome, tipo, cor);
        
        if (changes === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json({ message: 'Categoria atualizada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.excluir = async (req, res) => {
    try {
        const changes = await CategoriaModel.delete(req.params.id);
        
        if (changes === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json({ message: 'Categoria excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listarTipos = async (req, res) => {
    try {
        const tipos = await TipoModel.findByCategoria(req.params.id);
        res.json(tipos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};