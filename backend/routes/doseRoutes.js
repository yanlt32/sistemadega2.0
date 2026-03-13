const express = require('express');
const router = express.Router();
const doseController = require('../controllers/doseController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', doseController.listar);
router.get('/:id', doseController.buscarPorId);
router.post('/', doseController.criar);
router.put('/:id', doseController.atualizar);
router.put('/:id/estoque', doseController.atualizarEstoque);
router.delete('/:id', doseController.excluir);

module.exports = router;