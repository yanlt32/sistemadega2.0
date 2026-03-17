const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/permissaoMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de categorias (apenas admin)
router.get('/', isAdmin, categoriaController.listar);          // ← Linha 9
router.get('/tipos', isAdmin, categoriaController.listarTipos);
router.get('/:id', isAdmin, categoriaController.buscarPorId);
router.post('/', isAdmin, categoriaController.criar);
router.put('/:id', isAdmin, categoriaController.atualizar);
router.delete('/:id', isAdmin, categoriaController.excluir);

module.exports = router;