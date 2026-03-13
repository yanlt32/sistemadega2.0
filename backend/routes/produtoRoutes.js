const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin, isFuncionario } = require('../middleware/permissaoMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas que funcionário pode acessar (apenas visualização)
router.get('/', isFuncionario, produtoController.listarProdutos);
router.get('/estoque-baixo', isFuncionario, produtoController.estoqueBaixo);

// Rotas que apenas admin pode acessar (CRUD completo)
router.post('/', isAdmin, produtoController.criarProduto);
router.put('/:id', isAdmin, produtoController.atualizarProduto);
router.put('/:id/estoque', isAdmin, produtoController.atualizarEstoque);
router.delete('/:id', isAdmin, produtoController.excluirProduto);

module.exports = router;