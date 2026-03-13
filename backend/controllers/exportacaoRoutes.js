const express = require('express');
const router = express.Router();
const exportacaoController = require('../controllers/exportacaoController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/vendas', exportacaoController.exportarVendas);
router.get('/produtos', exportacaoController.exportarProdutos);
router.get('/caixa', exportacaoController.exportarCaixa);

module.exports = router;