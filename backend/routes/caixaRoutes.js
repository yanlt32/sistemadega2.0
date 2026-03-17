const express = require('express');
const router = express.Router();
const caixaController = require('../controllers/caixaController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin, isFuncionario } = require('../middleware/permissaoMiddleware');

router.use(authMiddleware);

router.post('/abrir', isAdmin, caixaController.abrirCaixa);
router.get('/status', isFuncionario, caixaController.statusCaixa);
router.post('/fechar', isAdmin, caixaController.fecharCaixa);
router.post('/recalcular/:id', isAdmin, caixaController.recalcularCaixa);
router.delete('/:id', isAdmin, caixaController.excluirCaixa);
router.post('/resetar', isAdmin, caixaController.resetarCaixa);
router.get('/historico', isAdmin, caixaController.historico);

module.exports = router;