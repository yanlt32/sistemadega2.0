const express = require('express');
const router = express.Router();
const comboController = require('../controllers/comboController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', comboController.listar);
router.get('/:id', comboController.buscarPorId);
router.post('/', comboController.criar);
router.put('/:id', comboController.atualizar);
router.delete('/:id', comboController.excluir);

module.exports = router;