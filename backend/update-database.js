const { db } = require('./models/database');

console.log('🔄 Atualizando banco de dados...');

db.serialize(() => {
    // Verificar se a coluna forma_pagamento_id existe na tabela vendas
    db.all("PRAGMA table_info(vendas)", (err, columns) => {
        if (err) {
            console.error('Erro ao verificar colunas:', err);
            return;
        }

        const hasFormaPagamentoId = columns.some(col => col.name === 'forma_pagamento_id');
        
        if (!hasFormaPagamentoId) {
            console.log('📦 Adicionando coluna forma_pagamento_id à tabela vendas...');
            db.run(`ALTER TABLE vendas ADD COLUMN forma_pagamento_id INTEGER REFERENCES formas_pagamento(id)`);
        }

        const hasFormaPagamentoText = columns.some(col => col.name === 'forma_pagamento_text');
        if (!hasFormaPagamentoText) {
            console.log('📦 Adicionando coluna forma_pagamento_text à tabela vendas...');
            db.run(`ALTER TABLE vendas ADD COLUMN forma_pagamento_text TEXT`);
        }
    });

    // Criar tabela de formas_pagamento se não existir
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

    // Criar tabela de categorias_gastos se não existir
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

    // Criar tabela de gastos se não existir
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

    console.log('✅ Banco de dados atualizado com sucesso!');
});

setTimeout(() => {
    db.close();
    console.log('🔌 Conexão com banco de dados fechada');
}, 1000);