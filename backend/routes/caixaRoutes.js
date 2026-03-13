const express = require('express');
const router = express.Router();
const caixaController = require('../controllers/caixaController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/abrir', caixaController.abrir);
router.post('/fechar', caixaController.fechar);
router.get('/status', caixaController.status);
router.get('/historico', caixaController.historico);
router.get('/relatorio/semanal', caixaController.relatorioSemanal);
router.get('/relatorio/mensal', caixaController.relatorioMensal);

module.exports = router;