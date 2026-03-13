const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/permissaoMiddleware');

router.use(authMiddleware);

// Apenas admin pode ver relatórios financeiros
router.get('/lucro-diario', isAdmin, relatorioController.lucroDiario);
router.get('/lucro-mensal', isAdmin, relatorioController.lucroMensal);
router.get('/produto-mais-vendido', isAdmin, relatorioController.produtoMaisVendido);
router.get('/categoria-mais-vendida', isAdmin, relatorioController.categoriaMaisVendida);
router.get('/vendas-por-periodo', isAdmin, relatorioController.vendasPorPeriodo);

module.exports = router;