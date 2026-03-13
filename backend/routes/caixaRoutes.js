const express = require('express');
const router = express.Router();
const caixaController = require('../controllers/caixaController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin, isFuncionario } = require('../middleware/permissaoMiddleware');

router.use(authMiddleware);

// Todos podem ver status do caixa
router.get('/status', isFuncionario, caixaController.status);

// Funcionário pode abrir/fechar caixa
router.post('/abrir', isFuncionario, caixaController.abrir);
router.post('/fechar', isFuncionario, caixaController.fechar);

// Apenas admin vê relatórios e histórico completo
router.get('/historico', isAdmin, caixaController.historico);
router.get('/relatorio/semanal', isAdmin, caixaController.relatorioSemanal);
router.get('/relatorio/mensal', isAdmin, caixaController.relatorioMensal);

module.exports = router;