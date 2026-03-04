const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { initializeDatabase, criarUsuarioPadrao } = require('./models/database');

const app = express();
const PORT = 3000;

// Configurar CORS para permitir conexões de outros dispositivos
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar banco de dados
console.log('🔄 Inicializando banco de dados...');
initializeDatabase();
criarUsuarioPadrao();

// Rotas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/produtos', require('./routes/produtoRoutes'));
app.use('/api/vendas', require('./routes/vendaRoutes'));
app.use('/api/relatorios', require('./routes/relatorioRoutes'));
app.use('/api/categorias', require('./routes/categoriaRoutes'));
app.use('/api/tipos', require('./routes/tipoRoutes'));

// Rota para servir o frontend
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

app.get('/categorias.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/categorias.html'));
});

app.get('/relatorios.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/relatorios.html'));
});

// Rota para obter informações de rede
app.get('/api/network-info', (req, res) => {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({
                    interface: name,
                    address: iface.address
                });
            }
        }
    }
    
    res.json({
        localUrl: `http://localhost:${PORT}`,
        networkUrls: addresses.map(a => ({
            name: a.interface,
            url: `http://${a.address}:${PORT}`
        }))
    });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acessos:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    
    // Mostrar endereços de rede
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`   - Rede (${name}): http://${iface.address}:${PORT}`);
            }
        }
    }
    console.log('');
});