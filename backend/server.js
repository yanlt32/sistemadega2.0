const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { initializeDatabase, criarUsuariosPadrao } = require('./models/database');

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO com CORS para produção
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? ['https://seu-dominio.onrender.com', 'http://localhost:3000']
            : "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    },
    transports: ['websocket', 'polling'], // Fallback para polling se websocket falhar
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 3000;

// Configurar CORS para produção
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://seu-dominio.onrender.com', 'http://localhost:3000']
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar banco de dados de forma assíncrona
let dbInitialized = false;

async function initDatabase() {
    try {
        console.log('🚀 Inicializando banco de dados...');
        initializeDatabase();
        await criarUsuariosPadrao();
        dbInitialized = true;
        console.log('✅ Banco de dados inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
        // Não deixar o servidor cair, mas marcar como não inicializado
        dbInitialized = false;
    }
}

// Middleware para verificar se o banco está inicializado
app.use((req, res, next) => {
    if (!dbInitialized && req.path !== '/health') {
        return res.status(503).json({ 
            error: 'Servidor ainda inicializando, tente novamente em alguns segundos',
            status: 'initializing'
        });
    }
    next();
});

// Middleware para emitir eventos WebSocket
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rotas da API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/produtos', require('./routes/produtoRoutes'));
app.use('/api/vendas', require('./routes/vendaRoutes'));
app.use('/api/relatorios', require('./routes/relatorioRoutes'));
app.use('/api/categorias', require('./routes/categoriaRoutes'));
app.use('/api/tipos', require('./routes/tipoRoutes'));
app.use('/api/exportar', require('./routes/exportacaoRoutes'));
app.use('/api/gastos', require('./routes/gastoRoutes'));
app.use('/api/caixa', require('./routes/caixaRoutes'));

// Rotas do frontend - Com fallback para SPA
const frontendFiles = [
    'index.html', 'dashboard.html', 'produtos.html', 'vendas.html',
    'historico-vendas.html', 'categorias.html', 'relatorios.html',
    'gastos.html', 'financeiro.html', 'login.html'
];

frontendFiles.forEach(file => {
    app.get(`/${file}`, (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend', file));
    });
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota de saúde - importante para o Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'initializing',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rota de status mais detalhada
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'ready' : 'initializing',
        websocket: io.engine.clientsCount,
        clients: io.engine.clientsCount
    });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('🟢 Cliente conectado:', socket.id);
    
    // Enviar status inicial
    socket.emit('connected', { 
        message: 'Conectado ao servidor',
        timestamp: new Date().toISOString()
    });
    
    socket.on('disconnect', (reason) => {
        console.log('🔴 Cliente desconectado:', socket.id, 'Motivo:', reason);
    });
    
    socket.on('error', (error) => {
        console.error('❌ Erro no socket:', socket.id, error);
    });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.stack);
    
    // Erro de banco de dados
    if (err.code === 'SQLITE_ERROR' || err.code === 'SQLITE_BUSY') {
        return res.status(503).json({ 
            error: 'Erro no banco de dados',
            code: err.code,
            message: 'Tente novamente em alguns instantes'
        });
    }
    
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado!'
    });
});

// Rota 404 - deve ser a última
app.use((req, res) => {
    // Se for uma API, retornar JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Rota não encontrada' });
    }
    // Para frontend, redirecionar para index (SPA)
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, fechando servidor...');
    server.close(() => {
        console.log('✅ Servidor fechado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, fechando servidor...');
    server.close(() => {
        console.log('✅ Servidor fechado');
        process.exit(0);
    });
});

// Inicializar banco antes de iniciar o servidor
initDatabase().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
        console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
        console.log(`✅ Health check: http://localhost:${PORT}/health`);
    });
}).catch(error => {
    console.error('❌ Falha crítica ao iniciar:', error);
    process.exit(1);
});