const authController = require('../controllers/authController');

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
};

// Middleware para verificar se é funcionário ou admin
const isFuncionario = (req, res, next) => {
    if (req.usuario && (req.usuario.role === 'admin' || req.usuario.role === 'funcionario')) {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado.' });
    }
};

module.exports = { isAdmin, isFuncionario };