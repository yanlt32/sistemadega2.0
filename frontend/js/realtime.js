// ============================================
// SISTEMA DE NOTIFICAÇÕES E ATUALIZAÇÃO EM TEMPO REAL
// VERSÃO CORRIGIDA - SEM LOOP INFINITO
// ============================================

// Sistema de notificações bonitas
const Notificacao = {
    _ultimaNotificacao: 0,
    _filaNotificacoes: [],
    
    mostrar(mensagem, tipo = 'info', duracao = 3000) {
        // Limitar taxa de notificações (máximo 1 a cada 2 segundos)
        const agora = Date.now();
        if (agora - this._ultimaNotificacao < 2000) {
            // Adicionar à fila para mostrar depois
            this._filaNotificacoes.push({ mensagem, tipo, duracao });
            setTimeout(() => this._processarFila(), 2000);
            return;
        }
        
        this._ultimaNotificacao = agora;
        
        // Remover notificações antigas se houver muitas
        const notificacoesExistentes = document.querySelectorAll('.toast-notification');
        if (notificacoesExistentes.length > 3) {
            notificacoesExistentes[0]?.remove();
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
            if (toast && toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duracao);
    },
    
    _processarFila() {
        if (this._filaNotificacoes.length > 0) {
            const next = this._filaNotificacoes.shift();
            this.mostrar(next.mensagem, next.tipo, next.duracao);
        }
    }
};

// Sistema de atualização em tempo real
const Realtime = {
    socket: null,
    connected: false,
    _initialized: false,
    _fallbackInterval: null,
    _ultimaAtualizacao: {},
    
    init() {
        // Evitar múltiplas inicializações
        if (this._initialized) {
            console.log('⚠️ Realtime já inicializado, ignorando...');
            return;
        }
        
        this._initialized = true;
        this.conectar();
        this.configurarListeners();
        this.adicionarEstilos();
    },
    
    destroy() {
        if (this._fallbackInterval) {
            clearInterval(this._fallbackInterval);
            this._fallbackInterval = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this._initialized = false;
        this.connected = false;
    },
    
    conectar() {
        try {
            // Verificar se o Socket.IO está disponível
            if (typeof io === 'undefined') {
                console.log('⚠️ Socket.IO não disponível, usando fallback (polling a cada 60s)');
                this.connected = false;
                
                // Fallback: usar polling simples a cada 60 segundos (menos frequente)
                if (!this._fallbackInterval) {
                    this._fallbackInterval = setInterval(() => {
                        if (document.visibilityState === 'visible') {
                            this.atualizarPaginasAtuais();
                        }
                    }, 60000); // 60 segundos
                }
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
                reconnectionDelay: 2000,
                reconnectionDelayMax: 10000,
                timeout: 10000,
                transports: ['polling', 'websocket']
            });
            
            this.socket.on('connect', () => {
                console.log('🟢 Conectado ao servidor WebSocket');
                this.connected = true;
                // Não mostrar notificação de conexão para não poluir
                // Notificacao.mostrar('🟢 Conectado ao servidor', 'success', 2000);
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔴 Desconectado do servidor WebSocket');
                this.connected = false;
            });
            
            this.socket.on('connect_error', (error) => {
                console.log('⚠️ Erro na conexão WebSocket:', error?.message || error);
                this.connected = false;
            });
            
            // ===== EVENTOS DE PRODUTO =====
            this.socket.on('produto:criado', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'success');
                }
                this.atualizarPaginas(['produtos', 'vendas']);
            });
            
            this.socket.on('produto:atualizado', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'info');
                }
                this.atualizarPaginas(['produtos', 'vendas']);
            });
            
            this.socket.on('produto:excluido', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'warning');
                }
                this.atualizarPaginas(['produtos', 'vendas']);
            });
            
            // ===== EVENTOS DE ESTOQUE =====
            this.socket.on('estoque:atualizado', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'info');
                }
                this.atualizarPaginas(['produtos', 'dashboard']);
            });
            
            // ===== EVENTOS DE VENDA =====
            this.socket.on('venda:realizada', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'success');
                }
                this.atualizarPaginas(['vendas', 'historico', 'dashboard', 'relatorios']);
            });
            
            this.socket.on('venda:excluida', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'warning');
                }
                this.atualizarPaginas(['historico', 'dashboard', 'relatorios']);
            });
            
            // ===== EVENTOS DE CATEGORIA =====
            this.socket.on('categoria:criada', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'success');
                }
                this.atualizarPaginas(['categorias', 'produtos']);
            });
            
            this.socket.on('categoria:excluida', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'warning');
                }
                this.atualizarPaginas(['categorias', 'produtos']);
            });
            
            // ===== EVENTOS DE CAIXA =====
            this.socket.on('caixa:aberto', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'success');
                }
                this.atualizarPaginas(['dashboard', 'caixa']);
            });
            
            this.socket.on('caixa:fechado', (data) => {
                if (data && data.mensagem) {
                    Notificacao.mostrar(data.mensagem, 'info');
                }
                this.atualizarPaginas(['dashboard', 'caixa', 'relatorios']);
            });
            
        } catch (error) {
            console.error('Erro ao conectar WebSocket:', error);
            this.connected = false;
            
            // Fallback em caso de erro
            if (!this._fallbackInterval) {
                this._fallbackInterval = setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        this.atualizarPaginasAtuais();
                    }
                }, 60000);
            }
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
    
    atualizarPaginasAtuais() {
        const path = window.location.pathname;
        const paginasParaAtualizar = [];
        
        if (path.includes('dashboard.html')) paginasParaAtualizar.push('dashboard');
        if (path.includes('produtos.html')) paginasParaAtualizar.push('produtos');
        if (path.includes('vendas.html')) paginasParaAtualizar.push('vendas');
        if (path.includes('historico-vendas.html')) paginasParaAtualizar.push('historico');
        if (path.includes('categorias.html')) paginasParaAtualizar.push('categorias');
        if (path.includes('relatorios.html')) paginasParaAtualizar.push('relatorios');
        if (path.includes('caixa.html')) paginasParaAtualizar.push('caixa');
        
        if (paginasParaAtualizar.length > 0) {
            this.atualizarPaginas(paginasParaAtualizar);
        }
    },
    
    atualizarPaginas(paginas) {
        const path = window.location.pathname;
        const agora = Date.now();
        
        paginas.forEach(pagina => {
            // Limitar taxa de atualização por página (máximo 1 a cada 30 segundos)
            const ultimaAtualizacao = this._ultimaAtualizacao[pagina] || 0;
            if (agora - ultimaAtualizacao < 30000) {
                return; // Muito recente, pular
            }
            
            try {
                switch(pagina) {
                    case 'dashboard':
                        if (path.includes('dashboard.html')) {
                            if (window.DashboardAdmin && !window.DashboardAdmin.loading) {
                                this._ultimaAtualizacao[pagina] = agora;
                                window.DashboardAdmin.carregarDados?.();
                            } else if (window.Dashboard && !window.Dashboard.loading) {
                                this._ultimaAtualizacao[pagina] = agora;
                                window.Dashboard.loadData?.();
                            }
                        }
                        break;
                        
                    case 'produtos':
                        if (path.includes('produtos.html') && window.Produtos && !window.Produtos.loading) {
                            this._ultimaAtualizacao[pagina] = agora;
                            window.Produtos.carregar?.();
                        }
                        break;
                        
                    case 'vendas':
                        if (path.includes('vendas.html') && window.Vendas && !window.Vendas.loading) {
                            this._ultimaAtualizacao[pagina] = agora;
                            window.Vendas.carregarProdutos?.();
                        }
                        break;
                        
                    case 'historico':
                        if (path.includes('historico-vendas.html') && window.HistoricoVendas) {
                            this._ultimaAtualizacao[pagina] = agora;
                            if (typeof window.HistoricoVendas.carregar === 'function') {
                                window.HistoricoVendas.carregar();
                            }
                        }
                        break;
                        
                    case 'categorias':
                        if (path.includes('categorias.html') && window.CategoriasManager) {
                            this._ultimaAtualizacao[pagina] = agora;
                            window.CategoriasManager.carregarCategorias?.();
                            window.CategoriasManager.carregarTipos?.();
                        }
                        break;
                        
                    case 'relatorios':
                        if (path.includes('relatorios.html') && window.Relatorios) {
                            this._ultimaAtualizacao[pagina] = agora;
                            window.Relatorios.carregar?.();
                        }
                        break;
                        
                    case 'caixa':
                        if (path.includes('caixa.html') && window.Caixa) {
                            this._ultimaAtualizacao[pagina] = agora;
                            window.Caixa.carregarDados?.();
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

// Sobrescrever o método showNotification do App se existir
if (typeof window !== 'undefined' && window.App) {
    window.App.showNotification = function(message, type = 'info', duration = 3000) {
        Notificacao.mostrar(message, type, duration);
    };
}

// Inicializar quando a página carregar (exceto login)
let realtimeInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname === '/' ||
                        window.location.pathname === '/index.html';
    
    if (!isLoginPage && !realtimeInitialized) {
        realtimeInitialized = true;
        // Aguardar um pouco para garantir que o socket.io carregou
        setTimeout(() => {
            Realtime.init();
        }, 1500);
    }
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Notificacao = Notificacao;
    window.Realtime = Realtime;
}

// Para módulo Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Notificacao, Realtime };
}