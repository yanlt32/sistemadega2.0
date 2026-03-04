const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

// Garantir que o diretório data existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
    db.serialize(() => {
        // Criar tabela de categorias
        db.run(`CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            tipo TEXT NOT NULL,
            cor TEXT DEFAULT '#4CAF50',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Criar tabela de tipos
        db.run(`CREATE TABLE IF NOT EXISTS tipos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
            UNIQUE(nome, categoria_id)
        )`);

        // Criar tabela de usuários
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            nome TEXT,
            email TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )`);

        // Criar tabela de produtos (atualizada)
        db.run(`CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria_id INTEGER,
            tipo_id INTEGER,
            preco_custo DECIMAL(10,2) NOT NULL,
            preco_venda DECIMAL(10,2) NOT NULL,
            quantidade INTEGER NOT NULL DEFAULT 0,
            codigo_barras TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id),
            FOREIGN KEY (tipo_id) REFERENCES tipos(id)
        )`);

        // Criar tabela de vendas
        db.run(`CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
            total DECIMAL(10,2) NOT NULL,
            lucro DECIMAL(10,2) NOT NULL,
            forma_pagamento TEXT NOT NULL,
            usuario_id INTEGER,
            status TEXT DEFAULT 'concluida',
            observacao TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);

        // Criar tabela de itens_venda
        db.run(`CREATE TABLE IF NOT EXISTS itens_venda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER,
            produto_id INTEGER,
            quantidade INTEGER NOT NULL,
            preco_unitario DECIMAL(10,2) NOT NULL,
            preco_custo_unitario DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )`);

        // Criar tabela de movimentacoes_estoque
        db.run(`CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER,
            tipo TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            observacao TEXT,
            usuario_id INTEGER,
            FOREIGN KEY (produto_id) REFERENCES produtos(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);

        // Criar tabela de configurações
        db.run(`CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT,
            tipo TEXT DEFAULT 'text',
            descricao TEXT
        )`);

        // Inserir categorias padrão se não existirem - CORRIGIDO
        db.run(`INSERT OR IGNORE INTO categorias (nome, tipo, cor) VALUES 
            ('Bebidas', 'bebida', '#2196F3'),
            ('Comes', 'come', '#FF9800'),
            ('Outros', 'outro', '#9C27B0')`);

        // Inserir tipos padrão - CORRIGIDO
        db.run(`INSERT OR IGNORE INTO tipos (nome, categoria_id) VALUES 
            ('Cerveja', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Whisky', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Vodka', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Refrigerante', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Suco', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Salgado', (SELECT id FROM categorias WHERE nome = 'Comes')),
            ('Doce', (SELECT id FROM categorias WHERE nome = 'Comes')),
            ('Porção', (SELECT id FROM categorias WHERE nome = 'Comes')),
            ('Petisco', (SELECT id FROM categorias WHERE nome = 'Comes'))`);

        // Inserir configurações padrão - CORRIGIDO
        db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor, tipo, descricao) VALUES 
            ('estoque_minimo', '5', 'number', 'Quantidade mínima para alerta de estoque'),
            ('tema', 'dark', 'text', 'Tema do sistema'),
            ('empresa_nome', 'Adega System', 'text', 'Nome da empresa')`);

        console.log('✅ Banco de dados inicializado com sucesso!');
    });
}

async function criarUsuarioPadrao() {
    const senhaCriptografada = await bcrypt.hash('admin123', 10);
    
    db.get('SELECT * FROM usuarios WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
            console.error('Erro ao verificar usuário:', err);
            return;
        }
        
        if (!row) {
            db.run(
                'INSERT INTO usuarios (username, password, nome, email, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', senhaCriptografada, 'Administrador', 'admin@adega.com', 'admin'],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar usuário padrão:', err);
                    } else {
                        console.log('✅ Usuário padrão criado: admin / admin123');
                    }
                }
            );
        } else {
            console.log('✅ Usuário padrão já existe');
        }
    });
}

module.exports = { db, initializeDatabase, criarUsuarioPadrao };