const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/permissaoMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Relatórios básicos
router.get('/lucro-diario', isAdmin, relatorioController.lucroDiario);
router.get('/lucro-mensal', isAdmin, relatorioController.lucroMensal);

// Relatórios avançados
router.get('/completo', isAdmin, relatorioController.relatorioCompleto);
router.get('/mensal', isAdmin, relatorioController.relatorioMensalDetalhado);
router.get('/anual', isAdmin, relatorioController.relatorioAnual);

module.exports = router;