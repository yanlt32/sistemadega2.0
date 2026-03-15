const { db } = require('./models/database');

console.log('🔄 Verificando estrutura do banco de dados...');

// Verificar colunas da tabela vendas
db.all("PRAGMA table_info(vendas)", (err, columns) => {
    if (err) {
        console.error('Erro ao verificar colunas:', err);
        return;
    }

    console.log('📊 Colunas atuais da tabela vendas:');
    columns.forEach(col => console.log(`   - ${col.name} (${col.type})`));

    // Verificar se a coluna forma_pagamento existe
    const hasFormaPagamento = columns.some(col => col.name === 'forma_pagamento');
    
    if (!hasFormaPagamento) {
        console.log('➕ Adicionando coluna forma_pagamento...');
        
        db.run('ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT', (err) => {
            if (err) {
                console.error('Erro ao adicionar coluna:', err);
            } else {
                console.log('✅ Coluna forma_pagamento adicionada com sucesso!');
            }
        });
    } else {
        console.log('✅ Coluna forma_pagamento já existe');
    }

    // Verificar outras colunas necessárias
    const hasFormaPagamentoId = columns.some(col => col.name === 'forma_pagamento_id');
    if (!hasFormaPagamentoId) {
        db.run('ALTER TABLE vendas ADD COLUMN forma_pagamento_id INTEGER', () => {});
    }

    const hasFormaPagamentoText = columns.some(col => col.name === 'forma_pagamento_text');
    if (!hasFormaPagamentoText) {
        db.run('ALTER TABLE vendas ADD COLUMN forma_pagamento_text TEXT', () => {});
    }
});

// Verificar tabela formas_pagamento
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='formas_pagamento'", (err, row) => {
    if (!row) {
        console.log('📦 Criando tabela formas_pagamento...');
        db.run(`
            CREATE TABLE formas_pagamento (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT UNIQUE NOT NULL,
                tipo TEXT DEFAULT 'normal',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Inserir formas de pagamento padrão
        db.run(`INSERT OR IGNORE INTO formas_pagamento (nome, tipo) VALUES 
            ('Dinheiro', 'dinheiro'),
            ('Débito', 'debito'),
            ('Crédito', 'credito'),
            ('Pix', 'pix')`);
    }
});

setTimeout(() => {
    console.log('✅ Migração concluída!');
    process.exit(0);
}, 2000);