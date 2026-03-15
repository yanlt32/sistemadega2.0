const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { initializeDatabase, criarUsuariosPadrao } = require('./models/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = process.env.PORT || 3000;

// Configurar CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar banco de dados
console.log('🚀 Inicializando banco de dados...');
initializeDatabase();
criarUsuariosPadrao();

// Middleware para emitir eventos WebSocket
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rotas da API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/produtos', require('./routes/produtoRoutes'));
app.use('/api/vendas', require('./routes/vendaRoutes')); // ← VERIFIQUE ESTA LINHA
app.use('/api/relatorios', require('./routes/relatorioRoutes'));
app.use('/api/categorias', require('./routes/categoriaRoutes'));
app.use('/api/tipos', require('./routes/tipoRoutes'));
app.use('/api/exportar', require('./routes/exportacaoRoutes'));

// Rotas do frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/produtos.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/produtos.html'));
});

app.get('/vendas.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/vendas.html'));
});

app.get('/historico-vendas.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/historico-vendas.html'));
});

app.get('/categorias.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/categorias.html'));
});

app.get('/relatorios.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/relatorios.html'));
});

app.get('/gastos.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/gastos.html'));
});

app.get('/financeiro.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/financeiro.html'));
});

// Rota de saúde
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('🟢 Cliente conectado:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔴 Cliente desconectado:', socket.id);
    });
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
});