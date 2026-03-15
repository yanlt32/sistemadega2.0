const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando deploy seguro...');

// Verificar se o banco de dados existe
const dataDir = '/opt/render/project/src/backend/data';
const dbPath = path.join(dataDir, 'database.sqlite');

if (fs.existsSync(dbPath)) {
    console.log('✅ Banco de dados existente encontrado - dados serão preservados');
    
    // Fazer backup antes de atualizar
    const backupDir = '/opt/render/project/src/backend/backups';
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const date = new Date();
    const backupName = `pre_deploy_${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}.sqlite`;
    const backupPath = path.join(backupDir, backupName);
    
    fs.copyFileSync(dbPath, backupPath);
    console.log(`💾 Backup criado: ${backupName}`);
} else {
    console.log('🆕 Novo banco de dados será criado');
}

// Executar migração
console.log('🔄 Executando migrações...');
exec('node backend/migration.js', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Erro na migração:', error);
        return;
    }
    console.log(stdout);
    console.log('✅ Migrações concluídas');
});

console.log('🎉 Deploy seguro finalizado');