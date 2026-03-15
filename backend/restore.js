const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function listarBackups() {
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) {
        console.log('❌ Nenhum backup encontrado');
        return [];
    }
    
    const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.sqlite'))
        .sort()
        .reverse();
    
    return files;
}

function restaurarBackup(backupFile) {
    const dataDir = path.join(__dirname, 'data');
    const dbPath = path.join(dataDir, 'database.sqlite');
    const backupPath = path.join(__dirname, 'backups', backupFile);
    
    // Fazer backup do atual antes de restaurar
    if (fs.existsSync(dbPath)) {
        const backupAtual = path.join(__dirname, 'backups', 'antes_restauracao.sqlite');
        fs.copyFileSync(dbPath, backupAtual);
        console.log('✅ Backup do banco atual salvo');
    }
    
    // Restaurar
    fs.copyFileSync(backupPath, dbPath);
    console.log(`✅ Banco restaurado: ${backupFile}`);
}

// Listar backups
const backups = listarBackups();

if (backups.length === 0) {
    console.log('❌ Nenhum backup disponível');
    process.exit(1);
}

console.log('\n📋 Backups disponíveis:');
backups.forEach((b, i) => {
    console.log(`${i + 1}. ${b}`);
});

rl.question('\nDigite o número do backup para restaurar: ', (answer) => {
    const index = parseInt(answer) - 1;
    
    if (index >= 0 && index < backups.length) {
        restaurarBackup(backups[index]);
    } else {
        console.log('❌ Opção inválida');
    }
    
    rl.close();
});