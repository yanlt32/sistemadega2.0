const express = require('express');
const router = express.Router();
const exportacaoController = require('../controllers/exportacaoController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas de exportação requerem autenticação
router.use(authMiddleware);

// Rotas de exportação
router.get('/vendas', exportacaoController.exportarVendas);
router.get('/produtos', exportacaoController.exportarProdutos);
router.get('/resumo-gastos', exportacaoController.exportarResumoGastos);

module.exports = router;