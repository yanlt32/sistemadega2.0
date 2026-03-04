const express = require('express');
const router = express.Router();
const tipoController = require('../controllers/tipoController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', tipoController.listar);
router.get('/categoria/:categoriaId', tipoController.porCategoria);
router.post('/', tipoController.criar);
router.put('/:id', tipoController.atualizar);
router.delete('/:id', tipoController.excluir);

module.exports = router;