const express = require('express');
const router = express.Router();
const gastoController = require('../controllers/gastoController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/permissaoMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de gastos (apenas admin)
router.get('/', isAdmin, gastoController.listar);
router.get('/:id', isAdmin, gastoController.buscarPorId);
router.post('/', isAdmin, gastoController.criar);
router.put('/:id', isAdmin, gastoController.atualizar);
router.delete('/:id', isAdmin, gastoController.excluir);

// Categorias de gastos
router.get('/categorias/listar', isAdmin, gastoController.listarCategorias);
router.post('/categorias', isAdmin, gastoController.criarCategoria);
router.delete('/categorias/:id', isAdmin, gastoController.excluirCategoria);

// Formas de pagamento - CORRIGIDO: caminho correto
router.get('/formas-pagamento', isAdmin, gastoController.listarFormasPagamento);

// Resumo mensal
router.get('/resumo/mensal', isAdmin, gastoController.resumoMensal);
router.get('/exportar/resumo', isAdmin, gastoController.exportarResumo);

module.exports = router;