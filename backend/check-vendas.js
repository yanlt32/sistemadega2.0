const { db } = require('./models/database');

console.log('=== VERIFICANDO VENDAS NO BANCO ===\n');

// Verificar vendas
db.all('SELECT * FROM vendas ORDER BY data_venda DESC', [], (err, vendas) => {
    if (err) {
        console.error('Erro:', err);
        return;
    }
    
    console.log(`📊 Total de vendas: ${vendas.length}\n`);
    
    if (vendas.length === 0) {
        console.log('❌ Nenhuma venda encontrada no banco!');
        console.log('Possíveis problemas:');
        console.log('1. As vendas não estão sendo salvas');
        console.log('2. Erro na transação do banco');
        console.log('3. Status das vendas não está como "concluida"');
    } else {
        vendas.forEach(v => {
            console.log(`Venda #${v.id}:`);
            console.log(`   Data: ${v.data_venda}`);
            console.log(`   Total: R$ ${v.total}`);
            console.log(`   Lucro: R$ ${v.lucro}`);
            console.log(`   Pagamento: ${v.forma_pagamento}`);
            console.log(`   Status: ${v.status}`);
            console.log('---');
        });
    }
    
    // Verificar itens
    db.all('SELECT COUNT(*) as total FROM itens_venda', [], (err, result) => {
        console.log(`\n📦 Total de itens vendidos: ${result[0].total}`);
        db.close();
    });
});