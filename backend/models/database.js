const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// ============================================
// CONFIGURAÇÃO DE AMBIENTE
// ============================================
const isProduction = process.env.NODE_ENV === 'production';

// Definir diretório de dados baseado no ambiente
let dataDir;

if (isProduction) {
    // Em produção (Render), usar o disco persistente montado
    dataDir = '/opt/render/project/src/backend/data';
    console.log('🏭 Ambiente de produção detectado');
} else {
    // Em desenvolvimento, usar pasta local
    dataDir = path.join(__dirname, '../data');
    console.log('💻 Ambiente de desenvolvimento detectado');
}

// Garantir que o diretório data existe
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 Diretório de dados criado: ${dataDir}`);
} else {
    console.log(`📁 Diretório de dados já existe: ${dataDir}`);
}

const dbPath = path.join(dataDir, 'database.sqlite');
console.log(`📦 Banco de dados em: ${dbPath}`);

// Verificar se o banco já existe
const dbExists = fs.existsSync(dbPath);
if (dbExists) {
    console.log('✅ Banco de dados existente encontrado - dados preservados');
    
    // Mostrar tamanho do arquivo
    const stats = fs.statSync(dbPath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`📊 Tamanho do banco: ${fileSizeInMB.toFixed(2)} MB`);
} else {
    console.log('🆕 Criando novo banco de dados');
}

// Criar conexão com better-sqlite3
const db = new Database(dbPath);

// Configurar pragmas para melhor performance
db.pragma('journal_mode = WAL'); // Write-Ahead Logging para melhor concorrência
db.pragma('foreign_keys = ON'); // Habilitar chaves estrangeiras

// ============================================
// FUNÇÃO PARA VERIFICAR SE TABELA EXISTE
// ============================================
function tableExists(tableName) {
    try {
        const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
        return !!row;
    } catch (err) {
        console.error(`Erro ao verificar tabela ${tableName}:`, err);
        return false;
    }
}

// ============================================
// FUNÇÃO PARA CORRIGIR A TABELA VENDAS
// ============================================
function migrarTabelaVendas() {
    try {
        // Verificar colunas da tabela vendas
        const columns = db.prepare("PRAGMA table_info(vendas)").all();
        
        console.log('📊 Verificando estrutura da tabela vendas...');
        
        const columnNames = columns.map(col => col.name);
        console.log('📋 Colunas existentes:', columnNames.join(', '));
        
        // Verificar se a coluna forma_pagamento existe
        if (!columnNames.includes('forma_pagamento')) {
            console.log('➕ Adicionando coluna forma_pagamento...');
            
            try {
                db.exec('ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT');
                console.log('✅ Coluna forma_pagamento adicionada com sucesso!');
                
                // Atualizar registros existentes copiando da coluna antiga
                if (columnNames.includes('forma_pagamento_text')) {
                    const result = db.prepare(`
                        UPDATE vendas 
                        SET forma_pagamento = forma_pagamento_text 
                        WHERE forma_pagamento_text IS NOT NULL
                    `).run();
                    
                    console.log(`📝 Dados copiados da coluna forma_pagamento_text: ${result.changes} registros atualizados`);
                } else {
                    // Se não houver dados antigos, definir padrão
                    db.prepare(`
                        UPDATE vendas 
                        SET forma_pagamento = 'Dinheiro' 
                        WHERE forma_pagamento IS NULL
                    `).run();
                    console.log('📝 Valor padrão definido para forma_pagamento');
                }
            } catch (err) {
                console.error('❌ Erro ao adicionar coluna:', err);
                throw err;
            }
        } else {
            console.log('✅ Coluna forma_pagamento já existe');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        throw error;
    }
}

// ============================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// ============================================
function initializeDatabase() {
    try {
        // ===== TABELAS PRINCIPAIS =====
        
        // Criar tabela de categorias
        db.exec(`CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            tipo TEXT NOT NULL,
            cor TEXT DEFAULT '#c4a747',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Criar tabela de tipos
        db.exec(`CREATE TABLE IF NOT EXISTS tipos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
            UNIQUE(nome, categoria_id)
        )`);

        // Criar tabela de usuários
        db.exec(`CREATE TABLE IF NOT EXISTS usuarios (
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
        db.exec(`CREATE TABLE IF NOT EXISTS produtos (
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
        db.exec(`CREATE TABLE IF NOT EXISTS doses (
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
        db.exec(`CREATE TABLE IF NOT EXISTS combos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco_custo DECIMAL(10,2) NOT NULL,
            preco_venda DECIMAL(10,2) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Criar tabela de itens_combo
        db.exec(`CREATE TABLE IF NOT EXISTS itens_combo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            combo_id INTEGER,
            produto_id INTEGER,
            dose_id INTEGER,
            quantidade INTEGER NOT NULL,
            FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id),
            FOREIGN KEY (dose_id) REFERENCES doses(id)
        )`);

        // ===== TABELAS DE PAGAMENTO =====
        
        // Criar tabela de formas_pagamento
        db.exec(`CREATE TABLE IF NOT EXISTS formas_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            tipo TEXT DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // ===== TABELAS DE GASTOS =====
        
        // Criar tabela de categorias_gastos
        db.exec(`CREATE TABLE IF NOT EXISTS categorias_gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            descricao TEXT,
            cor TEXT DEFAULT '#c4a747',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Criar tabela de gastos
        db.exec(`CREATE TABLE IF NOT EXISTS gastos (
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
        db.exec(`CREATE TABLE IF NOT EXISTS resumo_mensal (
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

        // ===== TABELAS DE ESTOQUE =====
        
        // Criar tabela de movimentacoes_estoque
        db.exec(`CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
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

        // ===== TABELAS DE VENDAS =====
        
        // Criar tabela de vendas
        db.exec(`CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
            total DECIMAL(10,2) NOT NULL,
            lucro DECIMAL(10,2) NOT NULL,
            forma_pagamento_id INTEGER,
            forma_pagamento_text TEXT,
            forma_pagamento TEXT,
            usuario_id INTEGER,
            status TEXT DEFAULT 'concluida',
            observacao TEXT,
            tipo TEXT DEFAULT 'normal',
            FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )`);

        // Criar tabela de itens_venda
        db.exec(`CREATE TABLE IF NOT EXISTS itens_venda (
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

        // ===== TABELA DE CAIXA =====
        db.exec(`CREATE TABLE IF NOT EXISTS caixa (
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

        // ===== TABELAS DE CONFIGURAÇÃO =====
        
        // Criar tabela de configurações
        db.exec(`CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT,
            tipo TEXT DEFAULT 'text',
            descricao TEXT
        )`);

        console.log('✅ Estrutura do banco de dados verificada');
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
        throw error;
    }
}

// ============================================
// INSERIR DADOS PADRÃO (APENAS SE NECESSÁRIO)
// ============================================
function inserirDadosPadrao() {
    try {
        // Inserir formas de pagamento padrão se não existirem
        const insertFormaPagamento = db.prepare(`INSERT OR IGNORE INTO formas_pagamento (nome, tipo) VALUES (?, ?)`);
        const formasPagamento = [
            ['Dinheiro', 'dinheiro'],
            ['Débito', 'debito'],
            ['Crédito', 'credito'],
            ['Pix', 'pix']
        ];
        
        for (const [nome, tipo] of formasPagamento) {
            insertFormaPagamento.run(nome, tipo);
        }

        // Inserir categorias de gastos padrão se não existirem
        const insertCategoriaGasto = db.prepare(`INSERT OR IGNORE INTO categorias_gastos (nome, descricao, cor) VALUES (?, ?, ?)`);
        const categoriasGastos = [
            ['Salários', 'Pagamento de funcionários', '#b91c3c'],
            ['Aluguel', 'Aluguel do estabelecimento', '#c4a747'],
            ['Água', 'Conta de água', '#2196f3'],
            ['Luz', 'Conta de energia', '#ff9800'],
            ['Internet', 'Internet e telefone', '#4caf50'],
            ['Impostos', 'Impostos e taxas', '#f44336'],
            ['Manutenção', 'Manutenção do espaço', '#9c27b0'],
            ['Marketing', 'Publicidade e divulgação', '#e91e63'],
            ['Fornecedores', 'Pagamento a fornecedores', '#3f51b5'],
            ['Compras', 'Compra de mercadorias', '#00acc1'],
            ['Equipamentos', 'Compra de equipamentos', '#7b1fa2'],
            ['Outros', 'Outros gastos', '#607d8b']
        ];
        
        for (const [nome, descricao, cor] of categoriasGastos) {
            insertCategoriaGasto.run(nome, descricao, cor);
        }

        // Inserir categorias padrão
        const insertCategoria = db.prepare(`INSERT OR IGNORE INTO categorias (nome, tipo, cor) VALUES (?, ?, ?)`);
        const categorias = [
            ['Bebidas', 'bebida', '#c4a747'],
            ['Comes', 'come', '#b91c3c'],
            ['Doses', 'dose', '#c4a747'],
            ['Combos', 'combo', '#b91c3c'],
            ['Outros', 'outro', '#666666']
        ];
        
        for (const [nome, tipo, cor] of categorias) {
            insertCategoria.run(nome, tipo, cor);
        }

        // Inserir tipos padrão
        const insertTipo = db.prepare(`INSERT OR IGNORE INTO tipos (nome, categoria_id) VALUES (?, 
            (SELECT id FROM categorias WHERE nome = ?))`);
        const tipos = [
            ['Cerveja', 'Bebidas'],
            ['Whisky', 'Bebidas'],
            ['Vodka', 'Bebidas'],
            ['Refrigerante', 'Bebidas'],
            ['Suco', 'Bebidas'],
            ['Dose Simples', 'Doses'],
            ['Dose Dupla', 'Doses'],
            ['Combo PodPá', 'Combos'],
            ['Combo Especial', 'Combos'],
            ['Salgado', 'Comes'],
            ['Doce', 'Comes'],
            ['Porção', 'Comes']
        ];
        
        for (const [nome, categoriaNome] of tipos) {
            insertTipo.run(nome, categoriaNome);
        }

        // Inserir configurações padrão
        const insertConfig = db.prepare(`INSERT OR IGNORE INTO configuracoes (chave, valor, tipo, descricao) VALUES (?, ?, ?, ?)`);
        const configuracoes = [
            ['estoque_minimo', '5', 'number', 'Quantidade mínima para alerta de estoque'],
            ['tema', 'dark', 'text', 'Tema do sistema'],
            ['empresa_nome', 'PodPá', 'text', 'Nome da empresa'],
            ['ultimo_resumo_mensal', '', 'text', 'Data do último resumo mensal']
        ];
        
        for (const [chave, valor, tipo, descricao] of configuracoes) {
            insertConfig.run(chave, valor, tipo, descricao);
        }

        console.log('📝 Dados padrão inseridos (apenas se não existiam)');
        return true;
    } catch (error) {
        console.error('❌ Erro ao inserir dados padrão:', error);
        throw error;
    }
}

// ============================================
// CRIAÇÃO DE USUÁRIOS PADRÃO
// ============================================
async function criarUsuariosPadrao() {
    try {
        const senhaAdmin = await bcrypt.hash('podpa201121', 10);
        const senhaFuncionario = await bcrypt.hash('func123', 10);
        
        // Verificar se já existem usuários
        const result = db.prepare('SELECT COUNT(*) as total FROM usuarios').get();
        
        // Se não houver usuários, criar os padrão
        if (result.total === 0) {
            console.log('👤 Criando usuários padrão...');
            
            // Criar admin
            const insertAdmin = db.prepare('INSERT INTO usuarios (username, password, nome, email, role) VALUES (?, ?, ?, ?, ?)');
            insertAdmin.run('admin', senhaAdmin, 'Administrador', 'admin@podpa.com', 'admin');
            console.log('✅ Admin criado: admin / podpa201121');
            
            // Criar funcionário
            const insertFunc = db.prepare('INSERT INTO usuarios (username, password, nome, email, role) VALUES (?, ?, ?, ?, ?)');
            insertFunc.run('funcionario', senhaFuncionario, 'Funcionário', 'func@podpa.com', 'funcionario');
            console.log('✅ Funcionário criado: funcionario / func123');
        } else {
            console.log(`👥 ${result.total} usuários já existentes - mantidos`);
            
            // Atualizar senha do admin para garantir
            const updateAdmin = db.prepare('UPDATE usuarios SET password = ? WHERE username = ?');
            const adminUpdate = updateAdmin.run(senhaAdmin, 'admin');
            
            if (adminUpdate.changes > 0) {
                console.log('🔑 Senha do admin atualizada');
            } else {
                console.log('🔑 Senha do admin já está correta');
            }
        }
        return true;
    } catch (error) {
        console.error('❌ Erro ao criar/atualizar usuários:', error);
        throw error;
    }
}

// ============================================
// FUNÇÃO PARA CRIAR BACKUP
// ============================================
function criarBackup() {
    try {
        const backupDir = path.join(__dirname, '../backups');
        
        // Criar pasta de backups se não existir
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Verificar se o banco existe
        if (!fs.existsSync(dbPath)) {
            console.log('❌ Banco de dados não encontrado para backup');
            return null;
        }
        
        // Criar nome do arquivo de backup com data
        const date = new Date();
        const backupName = `backup_${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}.sqlite`;
        const backupPath = path.join(backupDir, backupName);
        
        // Copiar arquivo
        fs.copyFileSync(dbPath, backupPath);
        console.log(`✅ Backup criado: ${backupName}`);
        
        // Manter apenas os últimos 10 backups
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.sqlite'))
            .sort()
            .reverse();
        
        if (backups.length > 10) {
            for (let i = 10; i < backups.length; i++) {
                fs.unlinkSync(path.join(backupDir, backups[i]));
                console.log(`🗑️ Backup antigo removido: ${backups[i]}`);
            }
        }
        
        return backupPath;
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
        return null;
    }
}

// ============================================
// INICIALIZAÇÃO COMPLETA
// ============================================
console.log('\n🚀 Inicializando banco de dados...');
console.log('=================================');

try {
    // Inicializar estrutura
    initializeDatabase();
    
    // Executar migrações após criar as tabelas
    migrarTabelaVendas();
    
    // Inserir dados padrão
    inserirDadosPadrao();
    
    // Criar usuários (async)
    criarUsuariosPadrao().catch(err => {
        console.error('❌ Erro ao criar usuários padrão:', err);
    });
    
    // Criar backup inicial (opcional)
    if (dbExists) {
        criarBackup();
    }
    
    console.log('=================================\n');
} catch (error) {
    console.error('❌ Erro fatal na inicialização do banco de dados:', error);
    process.exit(1);
}

// ============================================
// EXPORTAÇÃO
// ============================================
module.exports = { 
    db, 
    initializeDatabase, 
    criarUsuariosPadrao,
    criarBackup,
    tableExists,
    migrarTabelaVendas,
    inserirDadosPadrao
};  