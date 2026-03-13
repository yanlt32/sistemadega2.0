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
            cor TEXT DEFAULT '#c4a747',
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

        // ===== NOVAS TABELAS =====
        
        // Criar tabela de formas_pagamento
        db.run(`CREATE TABLE IF NOT EXISTS formas_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            tipo TEXT DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Inserir formas de pagamento padrão
        db.run(`INSERT OR IGNORE INTO formas_pagamento (nome, tipo) VALUES 
            ('Dinheiro', 'dinheiro'),
            ('Débito', 'debito'),
            ('Crédito', 'credito'),
            ('Pix', 'pix')`);

        // Criar tabela de categorias_gastos
        db.run(`CREATE TABLE IF NOT EXISTS categorias_gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            descricao TEXT,
            cor TEXT DEFAULT '#c4a747',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Inserir categorias de gastos padrão
        db.run(`INSERT OR IGNORE INTO categorias_gastos (nome, descricao, cor) VALUES 
            ('Salários', 'Pagamento de funcionários', '#b91c3c'),
            ('Aluguel', 'Aluguel do estabelecimento', '#c4a747'),
            ('Água', 'Conta de água', '#2196f3'),
            ('Luz', 'Conta de energia', '#ff9800'),
            ('Internet', 'Internet e telefone', '#4caf50'),
            ('Impostos', 'Impostos e taxas', '#f44336'),
            ('Manutenção', 'Manutenção do espaço', '#9c27b0'),
            ('Marketing', 'Publicidade e divulgação', '#e91e63'),
            ('Fornecedores', 'Pagamento a fornecedores', '#3f51b5'),
            ('Compras', 'Compra de mercadorias', '#00acc1'),
            ('Equipamentos', 'Compra de equipamentos', '#7b1fa2'),
            ('Outros', 'Outros gastos', '#607d8b')`);

        // Criar tabela de gastos
        db.run(`CREATE TABLE IF NOT EXISTS gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descricao TEXT NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            data_gasto DATETIME DEFAULT CURRENT_TIMESTAMP,
            categoria_id INTEGER,
            forma_pagamento_id INTEGER,
            observacao TEXT,
            usuario_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias_gastos(id),
            FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);

        // Criar tabela de resumo_mensal
        db.run(`CREATE TABLE IF NOT EXISTS resumo_mensal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ano INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            total_vendas DECIMAL(10,2) DEFAULT 0,
            total_lucro DECIMAL(10,2) DEFAULT 0,
            total_gastos DECIMAL(10,2) DEFAULT 0,
            saldo_final DECIMAL(10,2) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(ano, mes)
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

        // Criar tabela de vendas (atualizada)
        db.run(`CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
            total DECIMAL(10,2) NOT NULL,
            lucro DECIMAL(10,2) NOT NULL,
            forma_pagamento_id INTEGER,
            forma_pagamento_text TEXT,
            usuario_id INTEGER,
            status TEXT DEFAULT 'concluida',
            observacao TEXT,
            tipo TEXT DEFAULT 'normal',
            FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id),
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
            ('Bebidas', 'bebida', '#c4a747'),
            ('Comes', 'come', '#b91c3c'),
            ('Doses', 'dose', '#c4a747'),
            ('Combos', 'combo', '#b91c3c'),
            ('Outros', 'outro', '#666666')`);

        // Inserir tipos padrão
        db.run(`INSERT OR IGNORE INTO tipos (nome, categoria_id) VALUES 
            ('Cerveja', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Whisky', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Vodka', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Refrigerante', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Suco', (SELECT id FROM categorias WHERE nome = 'Bebidas')),
            ('Dose Simples', (SELECT id FROM categorias WHERE nome = 'Doses')),
            ('Dose Dupla', (SELECT id FROM categorias WHERE nome = 'Doses')),
            ('Combo PodPá', (SELECT id FROM categorias WHERE nome = 'Combos')),
            ('Combo Especial', (SELECT id FROM categorias WHERE nome = 'Combos')),
            ('Salgado', (SELECT id FROM categorias WHERE nome = 'Comes')),
            ('Doce', (SELECT id FROM categorias WHERE nome = 'Comes')),
            ('Porção', (SELECT id FROM categorias WHERE nome = 'Comes'))`);

        // Inserir configurações padrão
        db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor, tipo, descricao) VALUES 
            ('estoque_minimo', '5', 'number', 'Quantidade mínima para alerta de estoque'),
            ('tema', 'dark', 'text', 'Tema do sistema'),
            ('empresa_nome', 'PodPá', 'text', 'Nome da empresa'),
            ('ultimo_resumo_mensal', '', 'text', 'Data do último resumo mensal')`);

        console.log('✅ Banco de dados PodPá inicializado com sucesso!');
    });
}

async function criarUsuariosPadrao() {
    const senhaAdmin = await bcrypt.hash('podpa201121', 10);
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
                ['admin', senhaAdmin, 'Administrador', 'admin@podpa.com', 'admin'],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar admin:', err);
                    } else {
                        console.log('✅ Admin criado: admin / podpa201121');
                    }
                }
            );
        } else {
            // Se já existe, atualizar a senha
            db.run(
                'UPDATE usuarios SET password = ? WHERE username = ?',
                [senhaAdmin, 'admin'],
                function(err) {
                    if (err) {
                        console.error('Erro ao atualizar senha do admin:', err);
                    } else {
                        console.log('✅ Senha do admin atualizada para: podpa201121');
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
                ['funcionario', senhaFuncionario, 'Funcionário', 'func@podpa.com', 'funcionario'],
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