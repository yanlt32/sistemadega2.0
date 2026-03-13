const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Garantir que o diretório data existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
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

        // Criar tabela de usuários (ATUALIZADA com role)
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            nome TEXT,
            email TEXT UNIQUE,
            role TEXT DEFAULT 'funcionario',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )`);

        // Criar tabela de produtos
        db.run(`CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria_id INTEGER,
            tipo_id INTEGER,
            unidade_medida TEXT DEFAULT 'unidade',
            preco_custo DECIMAL(10,2) NOT NULL,
            preco_venda DECIMAL(10,2) NOT NULL,
            quantidade INTEGER NOT NULL DEFAULT 0,
            codigo_barras TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id),
            FOREIGN KEY (tipo_id) REFERENCES tipos(id)
        )`);

        // Criar tabela de doses
        db.run(`CREATE TABLE IF NOT EXISTS doses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER,
            nome TEXT NOT NULL,
            volume_ml INTEGER,
            preco_custo DECIMAL(10,2) NOT NULL,
            preco_venda DECIMAL(10,2) NOT NULL,
            quantidade_estoque INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
        )`);

        // Criar tabela de combos
        db.run(`CREATE TABLE IF NOT EXISTS combos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco_custo DECIMAL(10,2) NOT NULL,
            preco_venda DECIMAL(10,2) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Criar tabela de itens_combo
        db.run(`CREATE TABLE IF NOT EXISTS itens_combo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            combo_id INTEGER,
            produto_id INTEGER,
            dose_id INTEGER,
            quantidade INTEGER NOT NULL,
            FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id),
            FOREIGN KEY (dose_id) REFERENCES doses(id)
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
            tipo TEXT DEFAULT 'normal',
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);

        // Criar tabela de itens_venda
        db.run(`CREATE TABLE IF NOT EXISTS itens_venda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER,
            produto_id INTEGER,
            dose_id INTEGER,
            combo_id INTEGER,
            quantidade INTEGER NOT NULL,
            preco_unitario DECIMAL(10,2) NOT NULL,
            preco_custo_unitario DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id),
            FOREIGN KEY (dose_id) REFERENCES doses(id),
            FOREIGN KEY (combo_id) REFERENCES combos(id)
        )`);

        // Criar tabela de movimentacoes_estoque
        db.run(`CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER,
            dose_id INTEGER,
            tipo TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            observacao TEXT,
            usuario_id INTEGER,
            FOREIGN KEY (produto_id) REFERENCES produtos(id),
            FOREIGN KEY (dose_id) REFERENCES doses(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);

        // NOVA TABELA: caixa
        db.run(`CREATE TABLE IF NOT EXISTS caixa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_fechamento DATETIME,
            valor_inicial DECIMAL(10,2) DEFAULT 0,
            valor_final DECIMAL(10,2),
            total_vendas DECIMAL(10,2) DEFAULT 0,
            total_lucro DECIMAL(10,2) DEFAULT 0,
            observacao TEXT,
            status TEXT DEFAULT 'aberto',
            usuario_id INTEGER,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);

        // NOVA TABELA: movimentacoes_caixa
        db.run(`CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caixa_id INTEGER,
            tipo TEXT NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            descricao TEXT,
            data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            usuario_id INTEGER,
            FOREIGN KEY (caixa_id) REFERENCES caixa(id) ON DELETE CASCADE,
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

        // Inserir categorias padrão
        db.run(`INSERT OR IGNORE INTO categorias (nome, tipo, cor) VALUES 
            ('Bebidas', 'bebida', '#2196F3'),
            ('Comes', 'come', '#FF9800'),
            ('Doses', 'dose', '#9C27B0'),
            ('Combos', 'combo', '#E91E63'),
            ('Outros', 'outro', '#607D8B')`);

        // Inserir tipos padrão
        db.run(`INSERT OR IGNORE INTO tipos (nome, categoria_id) VALUES 
            ('Cerveja', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Whisky', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Vodka', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Refrigerante', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Suco', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Dose Simples', (SELECT id FROM categorias WHERE nome = 'Doses')),
            ('Dose Dupla', (SELECT id FROM categorias WHERE nome = 'Doses')),
            ('Combo Promocional', (SELECT id FROM categorias WHERE nome = 'Combos')),
            ('Combo Festa', (SELECT id FROM categorias WHERE nome = 'Combos')),
            ('Salgado', (SELECT id FROM categorias WHERE nome = 'Comes')),
            ('Doce', (SELECT id FROM categorias WHERE nome = 'Comes')),
            ('Porção', (SELECT id FROM categorias WHERE nome = 'Comes'))`);

        // Inserir configurações padrão
        db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor, tipo, descricao) VALUES 
            ('estoque_minimo', '5', 'number', 'Quantidade mínima para alerta de estoque'),
            ('tema', 'dark', 'text', 'Tema do sistema'),
            ('empresa_nome', 'Adega System', 'text', 'Nome da empresa'),
            ('caixa_aberto', 'false', 'boolean', 'Status do caixa'),
            ('ultimo_fechamento', '', 'text', 'Data do último fechamento')`);

        console.log('✅ Banco de dados inicializado com sucesso!');
    });
}

async function criarUsuariosPadrao() {
    const senhaAdmin = await bcrypt.hash('admin123', 10);
    const senhaFuncionario = await bcrypt.hash('func123', 10);
    
    // Criar admin se não existir
    db.get('SELECT * FROM usuarios WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
            console.error('Erro ao verificar admin:', err);
            return;
        }
        
        if (!row) {
            db.run(
                'INSERT INTO usuarios (username, password, nome, email, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', senhaAdmin, 'Administrador', 'admin@adega.com', 'admin'],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar admin:', err);
                    } else {
                        console.log('✅ Admin criado: admin / admin123');
                    }
                }
            );
        }
    });
    
    // Criar funcionário se não existir
    db.get('SELECT * FROM usuarios WHERE username = ?', ['funcionario'], (err, row) => {
        if (err) {
            console.error('Erro ao verificar funcionário:', err);
            return;
        }
        
        if (!row) {
            db.run(
                'INSERT INTO usuarios (username, password, nome, email, role) VALUES (?, ?, ?, ?, ?)',
                ['funcionario', senhaFuncionario, 'Funcionário', 'func@adega.com', 'funcionario'],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar funcionário:', err);
                    } else {
                        console.log('✅ Funcionário criado: funcionario / func123');
                    }
                }
            );
        }
    });
}

module.exports = { db, initializeDatabase, criarUsuariosPadrao };