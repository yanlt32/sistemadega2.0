console.log('🚀 ========== INICIANDO GASTO ROUTES ==========');

const express = require('express');
const router = express.Router();
const gastoController = require('../controllers/gastoController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/permissaoMiddleware');

console.log('✅ Controller importado:', typeof gastoController);
console.log('✅ Funções do controller:', Object.keys(gastoController));

// Todas as rotas requerem autenticação
router.use(authMiddleware);
console.log('✅ Middleware auth aplicado');

// Rotas de gastos (apenas admin)
console.log('📌 Configurando rotas...');
router.get('/', isAdmin, gastoController.listar);
router.get('/:id', isAdmin, gastoController.buscarPorId);
router.post('/', isAdmin, gastoController.criar);
router.put('/:id', isAdmin, gastoController.atualizar);
router.delete('/:id', isAdmin, gastoController.excluir);

// Categorias de gastos
router.get('/categorias', isAdmin, gastoController.listarCategorias);
console.log('✅ Rota /categorias configurada');
router.post('/categorias', isAdmin, gastoController.criarCategoria);
router.delete('/categorias/:id', isAdmin, gastoController.excluirCategoria);

// Formas de pagamento
router.get('/formas-pagamento', isAdmin, gastoController.listarFormasPagamento);
console.log('✅ Rota /formas-pagamento configurada');

// Resumo
router.get('/resumo/mensal', isAdmin, gastoController.resumoMensal);
router.get('/resumo/simplificado', isAdmin, gastoController.resumoSimplificado);

// Exportação
router.get('/exportar/resumo', isAdmin, gastoController.exportarResumo);

console.log('✅ Todas as rotas de gastos configuradas!');
console.log('🚀 ========== GASTO ROUTES CARREGADO ==========');

module.exports = router;