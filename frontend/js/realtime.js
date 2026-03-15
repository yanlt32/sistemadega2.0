// ============================================
// SISTEMA DE NOTIFICAÇÕES E ATUALIZAÇÃO EM TEMPO REAL
// ============================================

// Sistema de notificações bonitas
const Notificacao = {
    mostrar(mensagem, tipo = 'info', duracao = 3000) {
        // Remover notificações antigas se houver muitas
        const notificacoesExistentes = document.querySelectorAll('.toast-notification');
        if (notificacoesExistentes.length > 3) {
            notificacoesExistentes[0].remove();
        }
        
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

// Sistema de atualização em tempo real
const Realtime = {
    socket: null,
    connected: false,
    
    init() {
        this.conectar();
        this.configurarListeners();
        this.adicionarEstilos();
    },
    
    conectar() {
        try {
            // Verificar se o Socket.IO está disponível
            if (typeof io === 'undefined') {
                console.log('⚠️ Socket.IO não disponível, usando fallback');
                this.connected = false;
                
                // Fallback: usar polling simples a cada 30 segundos
                setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        this.atualizarPaginas(['dashboard', 'produtos', 'vendas', 'historico']);
                    }
                }, 30000);
                return;
            }
            
            // Detectar URL do servidor
            const serverUrl = window.location.hostname.includes('onrender.com') 
                ? `https://${window.location.hostname}`
                : `http://${window.location.hostname}:3000`;
            
            console.log('🔄 Conectando ao servidor WebSocket:', serverUrl);
            
            this.socket = io(serverUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                transports: ['polling', 'websocket'] // Fallback para polling
            });
            
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
            
            this.socket.on('connect_error', (error) => {
                console.log('⚠️ Erro na conexão:', error);
                this.connected = false;
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
                Notificacao.mostrar(data.mensagem || '💰 Venda realizada com sucesso!', 'success');
                this.atualizarPaginas(['vendas', 'historico', 'dashboard', 'relatorios']);
            });
            
            this.socket.on('venda:excluida', (data) => {
                Notificacao.mostrar(data.mensagem || '🗑️ Venda excluída!', 'warning');
                this.atualizarPaginas(['historico', 'dashboard', 'relatorios']);
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
            this.connected = false;
            
            // Fallback em caso de erro
            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.atualizarPaginas(['dashboard', 'produtos', 'vendas', 'historico']);
                }
            }, 30000);
        }
    },
    
    configurarListeners() {
        // Atualização manual (pode ser chamada por botões)
        document.addEventListener('realtime:update', (e) => {
            if (e.detail && e.detail.paginas) {
                this.atualizarPaginas(e.detail.paginas);
            }
        });
    },
    
    atualizarPaginas(paginas) {
        const path = window.location.pathname;
        
        paginas.forEach(pagina => {
            try {
                switch(pagina) {
                    case 'dashboard':
                        if (path.includes('dashboard.html')) {
                            if (window.DashboardAdmin) {
                                DashboardAdmin.carregarDados?.();
                            } else if (window.Dashboard) {
                                Dashboard.loadData?.(true);
                            } else if (window.DashboardFuncionario) {
                                DashboardFuncionario.carregarDados?.();
                            }
                        }
                        break;
                        
                    case 'produtos':
                        if (path.includes('produtos.html') && window.Produtos) {
                            Produtos.carregar?.(true);
                        }
                        break;
                        
                    case 'vendas':
                        if (path.includes('vendas.html') && window.Vendas) {
                            Vendas.carregarProdutos?.(true);
                        }
                        break;
                        
                    case 'historico':
                        if (path.includes('historico-vendas.html') && window.HistoricoVendas) {
                            if (typeof HistoricoVendas.carregar === 'function') {
                                HistoricoVendas.carregar();
                            }
                        }
                        break;
                        
                    case 'categorias':
                        if (path.includes('categorias.html') && window.CategoriasManager) {
                            CategoriasManager.carregarCategorias?.();
                            CategoriasManager.carregarTipos?.();
                        }
                        break;
                        
                    case 'relatorios':
                        if (path.includes('relatorios.html') && window.Relatorios) {
                            Relatorios.carregar?.();
                        }
                        break;
                }
            } catch (error) {
                console.error(`Erro ao atualizar página ${pagina}:`, error);
            }
        });
    },
    
    adicionarEstilos() {
        // Verificar se os estilos já existem
        if (document.getElementById('realtime-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'realtime-styles';
        style.textContent = `
            .toast-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 280px;
                max-width: 350px;
                background: var(--bg-secondary, #1a1f26);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10000;
                border-left: 4px solid;
                animation: slideIn 0.3s ease;
                overflow: hidden;
                color: var(--text-primary, #fff);
                font-family: 'Inter', sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .toast-success { 
                border-left-color: #c4a747;
                background: rgba(26, 31, 38, 0.95);
            }
            .toast-danger { 
                border-left-color: #b91c3c;
                background: rgba(26, 31, 38, 0.95);
            }
            .toast-warning { 
                border-left-color: #ff9800;
                background: rgba(26, 31, 38, 0.95);
            }
            .toast-info { 
                border-left-color: #2196f3;
                background: rgba(26, 31, 38, 0.95);
            }
            
            .toast-icon {
                font-size: 24px;
                filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));
            }
            
            .toast-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.5;
                font-weight: 500;
            }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: currentColor;
                opacity: 0.3;
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
            
            /* Melhorias nos modais */
            .modal {
                animation: fadeIn 0.2s ease;
            }
            
            .modal-content {
                animation: slideDown 0.2s ease;
                box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-30px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            /* Loading spinner melhorado */
            .spinner-container {
                backdrop-filter: blur(5px);
                background: rgba(0,0,0,0.7);
            }
            
            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid var(--bg-tertiary, #2d323c);
                border-top-color: var(--accent-primary, #c4a747);
                border-radius: 50%;
                animation: spin 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
                box-shadow: 0 0 20px rgba(196, 167, 71, 0.3);
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Scrollbar personalizada */
            ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            ::-webkit-scrollbar-track {
                background: var(--bg-secondary);
            }
            
            ::-webkit-scrollbar-thumb {
                background: var(--accent-primary);
                border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: var(--accent-secondary);
            }
        `;
        document.head.appendChild(style);
    }
};

// Sobrescrever o método showNotification do App para usar o novo sistema
if (window.App) {
    const originalShowNotification = App.showNotification;
    App.showNotification = function(message, type = 'info', duration = 3000) {
        Notificacao.mostrar(message, type, duration);
    };
}

// Inicializar quando a página carregar (exceto login)
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/') {
        // Aguardar um pouco para garantir que o socket.io carregou
        setTimeout(() => {
            Realtime.init();
        }, 1000);
    }
});

// Exportar para uso global
window.Notificacao = Notificacao;
window.Realtime = Realtime;