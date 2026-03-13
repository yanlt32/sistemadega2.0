// ============================================
// SISTEMA DE NOTIFICAÇÕES E ATUALIZAÇÃO EM TEMPO REAL
// ============================================

const Notificacao = {
    mostrar(mensagem, tipo = 'info', duracao = 3000) {
        // Criar elemento de notificação
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${tipo}`;
        
        // Ícones por tipo
        const icones = {
            success: '✅',
            danger: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icones[tipo] || '📢'}</div>
            <div class="toast-message">${mensagem}</div>
            <div class="toast-progress"></div>
        `;
        
        document.body.appendChild(toast);
        
        // Remover após duração
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duracao);
    }
};

const Realtime = {
    socket: null,
    connected: false,
    
    init() {
        this.connect();
        this.setupListeners();
        this.adicionarEstilos();
    },
    
    connect() {
        try {
            // Detectar URL do servidor
            const serverUrl = window.location.hostname.includes('onrender.com') 
                ? `https://${window.location.hostname}`
                : `http://${window.location.hostname}:3000`;
            
            this.socket = io(serverUrl);
            
            this.socket.on('connect', () => {
                console.log('🟢 Conectado ao servidor');
                this.connected = true;
                Notificacao.mostrar('🟢 Conectado ao servidor', 'success', 2000);
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔴 Desconectado do servidor');
                this.connected = false;
                Notificacao.mostrar('🔴 Desconectado. Reconectando...', 'warning', 3000);
            });
            
            // ===== EVENTOS DE PRODUTO =====
            this.socket.on('produto:criado', (data) => {
                Notificacao.mostrar(data.mensagem || '✅ Produto criado!', 'success');
                this.atualizarPaginas(['produtos', 'vendas']);
            });
            
            this.socket.on('produto:atualizado', (data) => {
                Notificacao.mostrar(data.mensagem || '✏️ Produto atualizado!', 'info');
                this.atualizarPaginas(['produtos', 'vendas']);
            });
            
            this.socket.on('produto:excluido', (data) => {
                Notificacao.mostrar(data.mensagem || '🗑️ Produto excluído!', 'warning');
                this.atualizarPaginas(['produtos', 'vendas']);
            });
            
            // ===== EVENTOS DE ESTOQUE =====
            this.socket.on('estoque:atualizado', (data) => {
                Notificacao.mostrar(data.mensagem || '📦 Estoque atualizado!', 'info');
                this.atualizarPaginas(['produtos', 'dashboard']);
            });
            
            // ===== EVENTOS DE VENDA =====
            this.socket.on('venda:realizada', (data) => {
                Notificacao.mostrar(data.mensagem || '💰 Venda realizada!', 'success');
                this.atualizarPaginas(['vendas', 'historico', 'dashboard', 'relatorios']);
            });
            
            this.socket.on('venda:excluida', (data) => {
                Notificacao.mostrar(data.mensagem || '🗑️ Venda excluída!', 'warning');
                this.atualizarPaginas(['historico', 'dashboard', 'relatorios']);
            });
            
            this.socket.on('venda:cancelada', (data) => {
                Notificacao.mostrar(data.mensagem || '❌ Venda cancelada!', 'warning');
                this.atualizarPaginas(['historico', 'dashboard']);
            });
            
            // ===== EVENTOS DE CATEGORIA =====
            this.socket.on('categoria:criada', (data) => {
                Notificacao.mostrar(data.mensagem || '🏷️ Categoria criada!', 'success');
                this.atualizarPaginas(['categorias', 'produtos']);
            });
            
            this.socket.on('categoria:excluida', (data) => {
                Notificacao.mostrar(data.mensagem || '🗑️ Categoria excluída!', 'warning');
                this.atualizarPaginas(['categorias', 'produtos']);
            });
            
            // ===== EVENTOS DE CAIXA =====
            this.socket.on('caixa:aberto', (data) => {
                Notificacao.mostrar(data.mensagem || '🔓 Caixa aberto!', 'success');
                this.atualizarPaginas(['dashboard']);
            });
            
            this.socket.on('caixa:fechado', (data) => {
                Notificacao.mostrar(data.mensagem || '🔒 Caixa fechado!', 'info');
                this.atualizarPaginas(['dashboard', 'relatorios']);
            });
            
        } catch (error) {
            console.error('Erro ao conectar WebSocket:', error);
        }
    },
    
    setupListeners() {
        // Atualização manual (pode ser chamada por botões)
        document.addEventListener('realtime:update', (e) => {
            if (e.detail.paginas) {
                this.atualizarPaginas(e.detail.paginas);
            }
        });
    },
    
    atualizarPaginas(paginas) {
        const path = window.location.pathname;
        
        paginas.forEach(pagina => {
            switch(pagina) {
                case 'dashboard':
                    if (path.includes('dashboard.html') && window.Dashboard) {
                        Dashboard.loadData(true);
                    }
                    break;
                    
                case 'produtos':
                    if (path.includes('produtos.html') && window.Produtos) {
                        Produtos.carregar(true);
                    }
                    break;
                    
                case 'vendas':
                    if (path.includes('vendas.html') && window.Vendas) {
                        Vendas.carregarProdutos(true);
                    }
                    break;
                    
                case 'historico':
                    if (path.includes('historico-vendas.html') && window.HistoricoVendas) {
                        HistoricoVendas.carregar();
                    }
                    break;
                    
                case 'categorias':
                    if (path.includes('categorias.html') && window.CategoriasManager) {
                        CategoriasManager.carregarCategorias();
                        CategoriasManager.carregarTipos();
                    }
                    break;
                    
                case 'relatorios':
                    if (path.includes('relatorios.html') && window.Relatorios) {
                        Relatorios.carregar();
                    }
                    break;
            }
        });
    },
    
    adicionarEstilos() {
        const style = document.createElement('style');
        style.textContent = `
            .toast-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                max-width: 400px;
                background: var(--bg-card, #242830);
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10000;
                border-left: 4px solid;
                animation: slideIn 0.3s ease;
                overflow: hidden;
                color: var(--text-primary, #fff);
            }
            
            .toast-success { border-left-color: #00c853; }
            .toast-danger { border-left-color: #f44336; }
            .toast-warning { border-left-color: #ff9800; }
            .toast-info { border-left-color: #2196f3; }
            
            .toast-icon {
                font-size: 24px;
            }
            
            .toast-message {
                flex: 1;
                font-size: 14px;
            }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: currentColor;
                opacity: 0.5;
                animation: progress 3s linear;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Inicializar quando a página carregar (exceto login)
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/') {
        Realtime.init();
    }
});