const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas de relatórios requerem autenticação
router.use(authMiddleware);

// Definir as rotas
router.get('/lucro-diario', relatorioController.lucroDiario);
router.get('/lucro-mensal', relatorioController.lucroMensal);
router.get('/produto-mais-vendido', relatorioController.produtoMaisVendido);
router.get('/categoria-mais-vendida', relatorioController.categoriaMaisVendida);
router.get('/vendas-por-periodo', relatorioController.vendasPorPeriodo);

module.exports = router;