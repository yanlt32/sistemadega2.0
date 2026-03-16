const { db } = require('./models/database');

console.log('🚀 Iniciando migração...');

// Verificar colunas da tabela vendas
db.all("PRAGMA table_info(vendas)", (err, columns) => {
    if (err) {
        console.error('Erro:', err);
        process.exit(1);
    }

    console.log('📊 Colunas atuais:', columns.map(c => c.name).join(', '));
    
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('forma_pagamento')) {
        console.log('➕ Adicionando coluna forma_pagamento...');
        
        db.run('ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT', (err) => {
            if (err) {
                console.error('Erro:', err);
            } else {
                console.log('✅ Coluna adicionada!');
                
                // Copiar dados da coluna antiga se existir
                if (columnNames.includes('forma_pagamento_text')) {
                    db.run(`
                        UPDATE vendas 
                        SET forma_pagamento = forma_pagamento_text 
                        WHERE forma_pagamento_text IS NOT NULL
                    `);
                }
            }
            process.exit(0);
        });
    } else {
        console.log('✅ Coluna já existe');
        process.exit(0);
    }
});