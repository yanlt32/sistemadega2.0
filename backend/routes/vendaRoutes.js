const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', vendaController.criarVenda);
router.get('/', vendaController.listarVendas);

module.exports = router;