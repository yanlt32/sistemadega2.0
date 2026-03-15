const fs = require('fs');
const path = require('path');

// Função para fazer backup do banco de dados
function fazerBackup() {
    const dataDir = path.join(__dirname, 'data');
    const dbPath = path.join(dataDir, 'database.sqlite');
    const backupDir = path.join(__dirname, 'backups');
    
    // Criar pasta de backups se não existir
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Verificar se o banco existe
    if (!fs.existsSync(dbPath)) {
        console.log('❌ Banco de dados não encontrado');
        return;
    }
    
    // Criar nome do arquivo de backup com data
    const date = new Date();
    const backupName = `backup_${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}.sqlite`;
    const backupPath = path.join(backupDir, backupName);
    
    // Copiar arquivo
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup criado: ${backupName}`);
}

// Executar backup
fazerBackup();