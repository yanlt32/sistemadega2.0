const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', categoriaController.listar);
router.get('/:id', categoriaController.buscar);
router.post('/', categoriaController.criar);
router.put('/:id', categoriaController.atualizar);
router.delete('/:id', categoriaController.excluir);
router.get('/:id/tipos', categoriaController.listarTipos);

module.exports = router;