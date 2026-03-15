const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin, isFuncionario } = require('../middleware/permissaoMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas que funcionário pode acessar
router.post('/', isFuncionario, vendaController.criar);
router.get('/', isFuncionario, vendaController.listar);
router.get('/:id', isFuncionario, vendaController.buscarPorId);

// Rotas que apenas admin pode acessar
router.delete('/:id', isAdmin, vendaController.excluir);

module.exports = router;