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

// ============================================
// IMPORTANTE: Rotas específicas PRIMEIRO
// ============================================

// Categorias de gastos (ESPECÍFICAS)
router.get('/categorias', isAdmin, gastoController.listarCategorias);
console.log('✅ Rota GET /categorias configurada');
router.post('/categorias', isAdmin, gastoController.criarCategoria);
console.log('✅ Rota POST /categorias configurada');
router.delete('/categorias/:id', isAdmin, gastoController.excluirCategoria);
console.log('✅ Rota DELETE /categorias/:id configurada');

// Formas de pagamento (ESPECÍFICAS)
router.get('/formas-pagamento', isAdmin, gastoController.listarFormasPagamento);
console.log('✅ Rota GET /formas-pagamento configurada');

// Resumos (ESPECÍFICOS)
router.get('/resumo/mensal', isAdmin, gastoController.resumoMensal);
console.log('✅ Rota GET /resumo/mensal configurada');
router.get('/resumo/simplificado', isAdmin, gastoController.resumoSimplificado);
console.log('✅ Rota GET /resumo/simplificado configurada');

// Exportação (ESPECÍFICA)
router.get('/exportar/resumo', isAdmin, gastoController.exportarResumo);
console.log('✅ Rota GET /exportar/resumo configurada');

// ============================================
// Rotas com parâmetros DEPOIS
// ============================================
router.get('/', isAdmin, gastoController.listar);
console.log('✅ Rota GET / configurada');
router.get('/:id', isAdmin, gastoController.buscarPorId);
console.log('✅ Rota GET /:id configurada');
router.post('/', isAdmin, gastoController.criar);
console.log('✅ Rota POST / configurada');
router.put('/:id', isAdmin, gastoController.atualizar);
console.log('✅ Rota PUT /:id configurada');
router.delete('/:id', isAdmin, gastoController.excluir);
console.log('✅ Rota DELETE /:id configurada');

console.log('✅ Todas as rotas de gastos configuradas!');
console.log('🚀 ========== GASTO ROUTES CARREGADO ==========');

module.exports = router;