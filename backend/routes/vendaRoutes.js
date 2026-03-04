const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', vendaController.criar);
router.get('/', vendaController.listar);
router.get('/:id', vendaController.buscarPorId);
router.put('/:id', vendaController.atualizar);
router.delete('/:id', vendaController.excluir);
router.put('/:id/cancelar', vendaController.cancelar);

module.exports = router;