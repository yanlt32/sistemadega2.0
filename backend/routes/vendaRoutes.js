const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin, isFuncionario } = require('../middleware/permissaoMiddleware');

router.use(authMiddleware);

// Funcionário pode criar vendas e ver histórico
router.post('/', isFuncionario, vendaController.criar);
router.get('/', isFuncionario, vendaController.listar);
router.get('/:id', isFuncionario, vendaController.buscarPorId);

// Apenas admin pode excluir vendas
router.delete('/:id', isAdmin, vendaController.excluir);
router.put('/:id/cancelar', isAdmin, vendaController.cancelar);

module.exports = router;