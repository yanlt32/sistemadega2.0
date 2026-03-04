const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas de produtos requerem autenticação
router.use(authMiddleware);

router.get('/', produtoController.listarProdutos);
router.post('/', produtoController.criarProduto);
router.put('/:id', produtoController.atualizarProduto);
router.put('/:id/estoque', produtoController.atualizarEstoque);
router.delete('/:id', produtoController.excluirProduto);
router.get('/estoque-baixo', produtoController.estoqueBaixo);

module.exports = router;