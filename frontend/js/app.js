// ============================================
// PODPÁ - SISTEMA DE GESTÃO PROFISSIONAL
// VERSÃO: 2.1.0
// ============================================

// Garantir que não haja duplicação de declarações
if (typeof window.App === 'undefined') {

// Controle de inicialização para evitar loops
let isInitializing = false;
let initializedPages = new Set();

// ============================================
// CLASSE PRINCIPAL APP
// ============================================
class App {
    constructor() {
        this.version = '2.1.0';
        this.modules = {};
        this.currentUser = null;
        this.config = {
            animations: true,
            notifications: true,
            autoSave: true
        };
    }

    static init() {
        // Evita múltiplas inicializações
        if (isInitializing) {
            console.log('⚠️ App já está inicializando, ignorando...');
            return;
        }
        
        isInitializing = true;
        console.log(`🍷 PodPá v${this.version} inicializado`);
        
        // Inicializar módulos baseados na página atual
        this.setupEventListeners();
        this.checkCurrentPage();
        
        isInitializing = false;
    }

    static setupEventListeners() {
        // Evento global para teclas de atalho
        document.addEventListener('keydown', (e) => {
            // Ctrl + K para focar busca
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"], .search-bar input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Esc para fechar modais
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Configurar logout em todas as páginas (evitar duplicação)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // Remove listener antigo se existir
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            newLogoutBtn.addEventListener('click', () => Auth.logout());
        }
    }

    static checkCurrentPage() {
        const path = window.location.pathname;
        const user = Auth.getCurrentUser();
        
        console.log('Página atual:', path, 'Usuário:', user?.username || 'nenhum');
        
        // Verificar se já inicializou esta página
        if (initializedPages.has(path)) {
            console.log(`⚠️ Página ${path} já foi inicializada, ignorando...`);
            return;
        }
        
        if (!user && !path.includes('index.html') && path !== '/') {
            window.location.href = '/';
            return;
        }
        
        // DASHBOARD - ADMIN TEM DASHBOARD COMPLETO
        if (path.includes('dashboard.html')) {
            if (user && user.role === 'admin') {
                console.log('Carregando dashboard admin');
                if (window.DashboardAdmin) {
                    // Limpar instância anterior se existir
                    if (window.DashboardAdmin.destroy) {
                        window.DashboardAdmin.destroy();
                    }
                    DashboardAdmin.init();
                    initializedPages.add(path);
                } else if (window.Dashboard) {
                    Dashboard.init();
                    initializedPages.add(path);
                }
            } else {
                console.log('Redirecionando para vendas (não é admin)');
                window.location.href = '/vendas.html';
            }
            return;
        }
        
        // PRODUTOS - todos podem
        if (path.includes('produtos.html')) {
            if (window.Produtos) {
                Produtos.init();
                initializedPages.add(path);
            }
            return;
        }
        
        // VENDAS - todos podem
        if (path.includes('vendas.html')) {
            if (window.Vendas) {
                Vendas.init();
                initializedPages.add(path);
            }
            return;
        }
        
        // HISTÓRICO - todos podem
        if (path.includes('historico-vendas.html')) {
            if (window.HistoricoVendas) {
                HistoricoVendas.init();
                initializedPages.add(path);
            }
            return;
        }
        
        // CATEGORIAS - apenas admin
        if (path.includes('categorias.html')) {
            if (user?.role === 'admin') {
                if (window.CategoriasManager) {
                    CategoriasManager.init();
                    initializedPages.add(path);
                }
            } else {
                window.location.href = '/vendas.html';
            }
            return;
        }
        
        // RELATÓRIOS - apenas admin
        if (path.includes('relatorios.html')) {
            if (user?.role === 'admin') {
                if (window.RelatoriosExternos) {
                    window.RelatoriosExternos.init();
                    initializedPages.add(path);
                } else if (window.Relatorios) {
                    Relatorios.init();
                    initializedPages.add(path);
                }
            } else {
                window.location.href = '/vendas.html';
            }
            return;
        }
        
        // GASTOS - apenas admin
        if (path.includes('gastos.html')) {
            if (user?.role === 'admin') {
                if (window.Gastos) {
                    Gastos.init();
                    initializedPages.add(path);
                }
            } else {
                window.location.href = '/vendas.html';
            }
            return;
        }
        
        // FINANCEIRO - apenas admin
        if (path.includes('financeiro.html')) {
            if (user?.role === 'admin') {
                if (window.Financeiro) {
                    Financeiro.init();
                    initializedPages.add(path);
                }
            } else {
                window.location.href = '/vendas.html';
            }
            return;
        }
        
        // CAIXA - todos podem ver status
        if (path.includes('caixa.html')) {
            if (window.Caixa) {
                Caixa.init();
                initializedPages.add(path);
            }
            return;
        }
    }

    static closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    static showNotification(message, type = 'info', duration = 3000) {
        if (!this.config.notifications) return;
        
        // Usar o sistema de notificação melhorado se disponível
        if (window.Notificacao) {
            window.Notificacao.mostrar(message, type, duration);
            return;
        }
        
        // Fallback
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '350px';
        notification.style.animation = 'slideIn 0.3s ease';
        notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// ============================================
// MÓDULO DE AUTENTICAÇÃO
// ============================================
const Auth = {
    currentUser: null,
    
    async login(username, password) {
        try {
            UI.showLoading();
            
            const response = await API.login(username, password);
            
            if (response.token) {
                this.currentUser = response.user;
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                
                App.showNotification(`Bem-vindo, ${response.user.nome || response.user.username}!`, 'success');
                
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 500);
                
                return { success: true };
            }
            
            return { success: false, error: 'Resposta inválida do servidor' };
        } catch (error) {
            App.showNotification(error.message, 'danger');
            return { success: false, error: error.message };
        } finally {
            UI.hideLoading();
        }
    },
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        // Limpar páginas inicializadas
        initializedPages.clear();
        App.showNotification('Logout realizado', 'info');
        window.location.href = '/';
    },
    
    getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        
        const user = localStorage.getItem('user');
        if (user) {
            try {
                this.currentUser = JSON.parse(user);
                return this.currentUser;
            } catch (e) {
                return null;
            }
        }
        
        return null;
    },
    
    getUserRole() {
        const user = this.getCurrentUser();
        return user?.role || 'funcionario';
    },

    isAdmin() {
        return this.getUserRole() === 'admin';
    },

    isFuncionario() {
        return this.getUserRole() === 'funcionario';
    },
    
    async checkAuth() {
        const token = localStorage.getItem('token');
        
        if (!token) {
            if (!window.location.pathname.includes('index.html') && 
                window.location.pathname !== '/') {
                window.location.href = '/';
            }
            return false;
        }
        
        try {
            const response = await API.verificarToken();
            
            if (response.valid) {
                this.currentUser = response.user;
                this.updateUserInfo();
                this.updateMenuByRole();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return false;
        }
    },
    
    updateUserInfo() {
        const user = this.getCurrentUser();
        const elements = document.querySelectorAll('#userNome');
        const roleElements = document.querySelectorAll('#userRole');
        
        elements.forEach(el => {
            if (el) {
                el.textContent = user?.nome || user?.username || 'Usuário';
            }
        });
        
        roleElements.forEach(el => {
            if (el) {
                const role = user?.role || 'funcionario';
                el.textContent = role === 'admin' ? 'Admin' : 'Funcionário';
                el.className = `badge ${role === 'admin' ? 'badge-success' : 'badge-info'}`;
            }
        });
    },

    updateMenuByRole() {
        const isAdmin = this.isAdmin();
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        const currentPath = window.location.pathname;
        
        menuItems.forEach(item => {
            const text = item.textContent || '';
            
            if (isAdmin) {
                item.style.display = 'flex';
            } else {
                if (text.includes('Dashboard') || 
                    text.includes('Categorias') || 
                    text.includes('Relatórios') || 
                    text.includes('Gastos') || 
                    text.includes('Financeiro') || 
                    text.includes('Caixa')) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'flex';
                }
            }
        });

        if (!isAdmin && currentPath.includes('dashboard.html')) {
            window.location.href = '/vendas.html';
            return;
        }

        if (!isAdmin && currentPath.includes('produtos.html')) {
            const btnNovo = document.getElementById('btnNovoProduto');
            if (btnNovo) btnNovo.style.display = 'none';
        }
    }
};

// ============================================
// MÓDULO DE INTERFACE
// ============================================
const UI = {
    loadingCount: 0,
    
    showLoading() {
        this.loadingCount++;
        
        if (this.loadingCount === 1) {
            let loader = document.getElementById('global-loader');
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'global-loader';
                loader.className = 'spinner-container';
                loader.innerHTML = '<div class="spinner"></div>';
                loader.style.position = 'fixed';
                loader.style.top = '0';
                loader.style.left = '0';
                loader.style.width = '100%';
                loader.style.height = '100%';
                loader.style.background = 'rgba(0,0,0,0.7)';
                loader.style.zIndex = '9999';
                loader.style.display = 'flex';
                loader.style.alignItems = 'center';
                loader.style.justifyContent = 'center';
                
                document.body.appendChild(loader);
            }
        }
    },
    
    hideLoading() {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        
        if (this.loadingCount === 0) {
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.remove();
            }
        }
    },
    
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    },
    
    formatDate(date) {
        if (!date) return '-';
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    },
    
    formatDateTime(date) {
        if (!date) return '-';
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(new Date(date));
    },
    
    showToast(message, type = 'info') {
        App.showNotification(message, type);
    }
};

// ============================================
// MÓDULO DASHBOARD ADMIN (OTIMIZADO)
// ============================================
const DashboardAdmin = {
    charts: {},
    data: {},
    refreshInterval: null,
    loading: false,
    isDestroyed: false,
    filtroAtual: {
        tipo: 'mes',
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
    },
    
    destroy() {
        this.isDestroyed = true;
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.destruirGraficos();
    },
    
    async init() {
        if (this.isDestroyed) {
            console.log('Dashboard foi destruído, recriando...');
            this.isDestroyed = false;
        }
        
        await Auth.checkAuth();
        
        const user = Auth.getCurrentUser();
        if (!user || user.role !== 'admin') {
            window.location.href = '/vendas.html';
            return;
        }
        
        // Atualizar nome do usuário
        const userNomeSpan = document.getElementById('userNome');
        if (userNomeSpan) {
            userNomeSpan.textContent = user.nome || user.username;
        }
        
        const userRoleSpan = document.getElementById('userRole');
        if (userRoleSpan) {
            userRoleSpan.textContent = 'Admin';
            userRoleSpan.className = 'badge badge-success';
        }
        
        this.adicionarFiltro();
        this.destruirGraficos();
        await this.carregarDados();
        
        setTimeout(() => {
            if (!this.isDestroyed) {
                this.inicializarGraficos();
            }
        }, 100);
        
        this.configurarAtualizacao();
    },
    
    adicionarFiltro() {
        if (document.getElementById('filtroDashboard')) return;
        
        const topBar = document.querySelector('.top-bar');
        if (!topBar) return;
        
        const filtroDiv = document.createElement('div');
        filtroDiv.id = 'filtroDashboard';
        filtroDiv.style.display = 'flex';
        filtroDiv.style.gap = '10px';
        filtroDiv.style.margin = '15px 0';
        filtroDiv.style.flexWrap = 'wrap';
        filtroDiv.style.justifyContent = 'center';
        filtroDiv.style.alignItems = 'center';
        
        filtroDiv.innerHTML = `
            <select id="filtroTipo" style="padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                <option value="mes">Mês</option>
                <option value="ano">Ano</option>
            </select>
            
            <div id="filtroMesContainer" style="display: inline-block;">
                <select id="filtroMes" style="padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                    ${this.gerarOptionsMeses()}
                </select>
            </div>
            
            <div id="filtroAnoContainer" style="display: inline-block;">
                <input type="number" id="filtroAno" value="${new Date().getFullYear()}" min="2020" max="2030" style="width: 100px; padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
            </div>
            
            <button class="btn btn-primary btn-sm" onclick="DashboardAdmin.aplicarFiltro()">Filtrar</button>
            <button class="btn btn-secondary btn-sm" onclick="DashboardAdmin.limparFiltro()">Mês Atual</button>
        `;
        
        topBar.parentNode.insertBefore(filtroDiv, topBar.nextSibling);
        
        document.getElementById('filtroTipo').addEventListener('change', (e) => {
            const tipo = e.target.value;
            const mesContainer = document.getElementById('filtroMesContainer');
            if (mesContainer) {
                mesContainer.style.display = tipo === 'mes' ? 'inline-block' : 'none';
            }
        });
    },
    
    gerarOptionsMeses() {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesAtual = new Date().getMonth() + 1;
        return meses.map((mes, i) => 
            `<option value="${i + 1}" ${i + 1 === mesAtual ? 'selected' : ''}>${mes}</option>`
        ).join('');
    },
    
    aplicarFiltro() {
        const tipo = document.getElementById('filtroTipo')?.value;
        const mes = document.getElementById('filtroMes')?.value;
        const ano = document.getElementById('filtroAno')?.value;
        
        this.filtroAtual = {
            tipo: tipo || 'mes',
            mes: tipo === 'mes' ? parseInt(mes) : null,
            ano: parseInt(ano)
        };
        
        this.carregarDados();
    },
    
    limparFiltro() {
        const hoje = new Date();
        this.filtroAtual = {
            tipo: 'mes',
            mes: hoje.getMonth() + 1,
            ano: hoje.getFullYear()
        };
        
        const tipoSelect = document.getElementById('filtroTipo');
        const mesSelect = document.getElementById('filtroMes');
        const anoInput = document.getElementById('filtroAno');
        
        if (tipoSelect) tipoSelect.value = 'mes';
        if (mesSelect) mesSelect.value = this.filtroAtual.mes;
        if (anoInput) anoInput.value = this.filtroAtual.ano;
        
        const mesContainer = document.getElementById('filtroMesContainer');
        if (mesContainer) mesContainer.style.display = 'inline-block';
        
        this.carregarDados();
    },
    
    destruirGraficos() {
        try {
            if (this.charts.vendas) {
                this.charts.vendas.destroy();
                this.charts.vendas = null;
            }
            if (this.charts.produtos) {
                this.charts.produtos.destroy();
                this.charts.produtos = null;
            }
        } catch (e) {
            console.warn('Erro ao destruir gráficos:', e);
        }
    },
    
    async carregarDados() {
        if (this.loading) {
            console.log('⏳ Carregamento já em andamento, ignorando...');
            return;
        }
        
        this.loading = true;
        
        try {
            UI.showLoading();
            
            let dataInicio, dataFim;
            
            if (this.filtroAtual.tipo === 'mes') {
                dataInicio = new Date(this.filtroAtual.ano, this.filtroAtual.mes - 1, 1);
                dataFim = new Date(this.filtroAtual.ano, this.filtroAtual.mes, 0);
            } else {
                dataInicio = new Date(this.filtroAtual.ano, 0, 1);
                dataFim = new Date(this.filtroAtual.ano, 11, 31);
            }
            
            const dataInicioStr = dataInicio.toISOString().split('T')[0];
            const dataFimStr = dataFim.toISOString().split('T')[0];
            
            console.log('🔍 Buscando dados de:', dataInicioStr, 'até', dataFimStr);
            
            // Buscar vendas do período (UMA VEZ)
            const response = await API.listarVendas({ 
                data_inicio: dataInicioStr,
                data_fim: dataFimStr,
                limite: 1000
            });
            
            const vendas = response.vendas || [];
            console.log('📊 Vendas encontradas:', vendas.length);
            
            // Calcular totais do período
            let totalVendasPeriodo = 0;
            let totalLucroPeriodo = 0;
            
            vendas.forEach(v => {
                totalVendasPeriodo += v.total || 0;
                totalLucroPeriodo += v.lucro || 0;
            });
            
            // Dados do dia
            const hoje = new Date().toISOString().split('T')[0];
            const vendasHojeResponse = await API.listarVendas({ 
                data_inicio: hoje,
                data_fim: hoje,
                limite: 100
            });
            
            const vendasHoje = vendasHojeResponse.vendas || [];
            let totalVendasHoje = 0;
            let totalLucroHoje = 0;
            let quantidadeHoje = 0;
            
            vendasHoje.forEach(v => {
                totalVendasHoje += v.total || 0;
                totalLucroHoje += v.lucro || 0;
                quantidadeHoje++;
            });
            
            // Calcular vendas dos últimos 7 dias
            const ultimos7Dias = [];
            for (let i = 6; i >= 0; i--) {
                const data = new Date();
                data.setDate(data.getDate() - i);
                const dataStr = data.toISOString().split('T')[0];
                
                const vendasDia = vendas.filter(v => 
                    v.data_venda && v.data_venda.split('T')[0] === dataStr
                );
                
                const totalDia = vendasDia.reduce((acc, v) => acc + (v.total || 0), 0);
                
                ultimos7Dias.push({
                    data: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
                    total: totalDia
                });
            }
            
            // Produtos mais vendidos
            const produtosMap = new Map();
            
            for (const venda of vendas) {
                if (venda.itens && Array.isArray(venda.itens)) {
                    venda.itens.forEach(item => {
                        const key = item.produto_id || item.id;
                        if (!produtosMap.has(key)) {
                            produtosMap.set(key, {
                                id: key,
                                nome: item.produto_nome || item.nome || 'Produto',
                                quantidade: 0
                            });
                        }
                        produtosMap.get(key).quantidade += item.quantidade || 0;
                    });
                }
            }
            
            const produtosMaisVendidos = Array.from(produtosMap.values())
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 5);
            
            // Buscar estoque baixo
            let estoqueBaixo = [];
            try {
                estoqueBaixo = await API.estoqueBaixo();
            } catch (e) {
                console.warn('Erro ao buscar estoque baixo:', e);
            }
            
            // Últimas vendas
            let ultimasVendas = [];
            try {
                const ultimasVendasResponse = await API.listarVendas({ limite: 5 });
                ultimasVendas = ultimasVendasResponse.vendas || [];
            } catch (e) {
                console.warn('Erro ao buscar últimas vendas:', e);
            }
            
            const ticketMedio = quantidadeHoje > 0 ? (totalVendasHoje / quantidadeHoje) : 0;
            
            this.data = {
                vendasHoje: totalVendasHoje,
                lucroHoje: totalLucroHoje,
                quantidadeHoje,
                vendasPeriodo: totalVendasPeriodo,
                lucroPeriodo: totalLucroPeriodo,
                quantidadePeriodo: vendas.length,
                vendasSemana: ultimos7Dias.reduce((acc, d) => acc + d.total, 0),
                lucroSemana: ultimos7Dias.reduce((acc, d) => acc + (d.total * 0.3), 0),
                vendasPorDia: ultimos7Dias,
                produtosMaisVendidos,
                estoqueBaixo,
                ultimasVendas,
                ticketMedio
            };
            
            this.atualizarCards();
            this.atualizarInfoFiltro();
            this.atualizarGraficos();
            this.mostrarEstoqueBaixo();
            this.mostrarProdutosMaisVendidos();
            this.mostrarUltimasVendas();
            this.atualizarPagamentos();
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            UI.showToast('Erro ao carregar dados do dashboard', 'error');
        } finally {
            UI.hideLoading();
            this.loading = false;
        }
    },
    
    atualizarInfoFiltro() {
        let periodoInfo = document.getElementById('periodoInfo');
        if (!periodoInfo) {
            periodoInfo = document.createElement('div');
            periodoInfo.id = 'periodoInfo';
            periodoInfo.style.textAlign = 'center';
            periodoInfo.style.marginBottom = '10px';
            periodoInfo.style.padding = '5px 15px';
            periodoInfo.style.borderRadius = '20px';
            periodoInfo.style.fontSize = '14px';
            periodoInfo.style.color = 'var(--text-secondary)';
            periodoInfo.style.background = 'var(--bg-tertiary)';
            
            const statsGrid = document.querySelector('.dashboard-stats');
            if (statsGrid && statsGrid.parentNode) {
                statsGrid.parentNode.insertBefore(periodoInfo, statsGrid);
            }
        }
        
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        if (this.filtroAtual.tipo === 'mes') {
            periodoInfo.textContent = `📅 Período filtrado: ${meses[this.filtroAtual.mes - 1]} de ${this.filtroAtual.ano}`;
        } else {
            periodoInfo.textContent = `📅 Período filtrado: Ano de ${this.filtroAtual.ano}`;
        }
    },
    
    atualizarCards() {
        const elementos = {
            vendasHoje: document.getElementById('vendasHoje'),
            lucroHoje: document.getElementById('lucroHoje'),
            vendasSemana: document.getElementById('vendasSemana'),
            lucroSemana: document.getElementById('lucroSemana'),
            vendasMes: document.getElementById('vendasMes'),
            estoqueBaixo: document.getElementById('estoqueBaixo'),
            ticketMedio: document.getElementById('ticketMedio')
        };
        
        if (elementos.vendasHoje) {
            elementos.vendasHoje.textContent = UI.formatCurrency(this.data.vendasHoje || 0);
        }
        if (elementos.lucroHoje) {
            elementos.lucroHoje.textContent = UI.formatCurrency(this.data.lucroHoje || 0);
        }
        if (elementos.vendasSemana) {
            elementos.vendasSemana.textContent = UI.formatCurrency(this.data.vendasSemana || 0);
        }
        if (elementos.lucroSemana) {
            elementos.lucroSemana.textContent = UI.formatCurrency(this.data.lucroSemana || 0);
        }
        if (elementos.vendasMes) {
            elementos.vendasMes.textContent = UI.formatCurrency(this.data.vendasPeriodo || 0);
        }
        if (elementos.estoqueBaixo) {
            elementos.estoqueBaixo.textContent = this.data.estoqueBaixo?.length || 0;
        }
        if (elementos.ticketMedio) {
            elementos.ticketMedio.textContent = UI.formatCurrency(this.data.ticketMedio || 0);
        }
    },
    
    async atualizarPagamentos() {
        const container = document.getElementById('pagamentosHoje');
        if (!container) return;
        
        try {
            const hoje = new Date().toISOString().split('T')[0];
            const response = await API.listarVendas({ 
                data_inicio: hoje,
                data_fim: hoje,
                limite: 100
            });
            
            const vendas = response.vendas || [];
            
            const pagamentos = {};
            vendas.forEach(v => {
                const forma = v.forma_pagamento || 'Outros';
                if (!pagamentos[forma]) {
                    pagamentos[forma] = {
                        forma: forma,
                        quantidade: 0,
                        total: 0
                    };
                }
                pagamentos[forma].quantidade += 1;
                pagamentos[forma].total += v.total || 0;
            });
            
            const pagamentosArray = Object.values(pagamentos);
            
            if (pagamentosArray.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhuma venda hoje</p>';
                return;
            }
            
            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    ${pagamentosArray.map(p => `
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 18px; font-weight: bold; color: var(--accent-primary);">${p.forma}</div>
                            <div style="font-size: 20px; font-weight: 600; margin: 5px 0;">${UI.formatCurrency(p.total)}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">${p.quantidade} venda(s)</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Erro ao carregar pagamentos:', error);
            container.innerHTML = '<p style="color: var(--text-muted);">Erro ao carregar dados</p>';
        }
    },
    
    inicializarGraficos() {
        this.recriarCanvases();
        
        const ctxVendas = document.getElementById('graficoVendasSemana');
        if (ctxVendas && !this.charts.vendas) {
            try {
                this.charts.vendas = new Chart(ctxVendas, {
                    type: 'line',
                    data: {
                        labels: this.data.vendasPorDia?.map(d => d.data) || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                        datasets: [{
                            label: 'Vendas (R$)',
                            data: this.data.vendasPorDia?.map(d => d.total) || [0,0,0,0,0,0,0],
                            borderColor: '#c4a747',
                            backgroundColor: 'rgba(196, 167, 71, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#c4a747',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                grid: { color: '#2d3540' },
                                ticks: {
                                    color: '#94a3b8',
                                    callback: (value) => 'R$ ' + value
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '#94a3b8' }
                            }
                        }
                    }
                });
            } catch (e) {
                console.error('Erro ao criar gráfico de vendas:', e);
            }
        }
        
        const ctxProdutos = document.getElementById('graficoProdutos');
        if (ctxProdutos && this.data.produtosMaisVendidos.length > 0 && !this.charts.produtos) {
            try {
                this.charts.produtos = new Chart(ctxProdutos, {
                    type: 'bar',
                    data: {
                        labels: this.data.produtosMaisVendidos.map(p => 
                            p.nome.length > 10 ? p.nome.substring(0, 10) + '...' : p.nome
                        ),
                        datasets: [{
                            label: 'Quantidade Vendida',
                            data: this.data.produtosMaisVendidos.map(p => p.quantidade),
                            backgroundColor: '#c4a747',
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: '#2d3540' },
                                ticks: { color: '#94a3b8', stepSize: 1 }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '#94a3b8', maxRotation: 45 }
                            }
                        }
                    }
                });
            } catch (e) {
                console.error('Erro ao criar gráfico de produtos:', e);
            }
        }
    },
    
    atualizarGraficos() {
        if (this.charts.vendas && this.data.vendasPorDia) {
            this.charts.vendas.data.datasets[0].data = this.data.vendasPorDia.map(d => d.total);
            this.charts.vendas.update();
        }
        
        if (this.charts.produtos && this.data.produtosMaisVendidos.length > 0) {
            this.charts.produtos.data.labels = this.data.produtosMaisVendidos.map(p => 
                p.nome.length > 10 ? p.nome.substring(0, 10) + '...' : p.nome
            );
            this.charts.produtos.data.datasets[0].data = this.data.produtosMaisVendidos.map(p => p.quantidade);
            this.charts.produtos.update();
        }
    },
    
    recriarCanvases() {
        const recriarCanvas = (id) => {
            const oldCanvas = document.getElementById(id);
            if (oldCanvas) {
                const parent = oldCanvas.parentNode;
                const newCanvas = document.createElement('canvas');
                newCanvas.id = id;
                newCanvas.style.width = '100%';
                newCanvas.style.height = '100%';
                parent.replaceChild(newCanvas, oldCanvas);
            }
        };
        
        recriarCanvas('graficoVendasSemana');
        recriarCanvas('graficoProdutos');
    },
    
    mostrarEstoqueBaixo() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo || this.data.estoqueBaixo.length === 0) {
            container.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px;">✅ Todos os produtos estão com estoque adequado</div>`;
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.slice(0, 5).map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong>${p.nome}</strong><br>
                    <small style="color: var(--text-muted);">Estoque: ${p.quantidade} unidades</small>
                </div>
                <button class="btn btn-primary btn-sm" onclick="if(window.Produtos) Produtos.abrirModalEstoque(${p.id})">Repor</button>
            </div>
        `).join('');
    },
    
    mostrarProdutosMaisVendidos() {
        const container = document.getElementById('produtoMaisVendido');
        if (!container) return;
        
        if (this.data.produtosMaisVendidos.length > 0) {
            const top3 = this.data.produtosMaisVendidos.slice(0, 3);
            container.innerHTML = `
                <div style="padding: 10px;">
                    ${top3.map((p, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: ${index < top3.length-1 ? '1px solid var(--border-color)' : 'none'};">
                            <div><span style="color: var(--accent-primary); font-weight: bold;">${index+1}º</span> ${p.nome}</div>
                            <span style="color: var(--text-muted);">${p.quantidade} vendidos</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhuma venda registrada</div>`;
        }
    },
    
    mostrarUltimasVendas() {
        const tbody = document.querySelector('#tabelaUltimasVendas tbody');
        if (!tbody) return;
        
        if (!this.data.ultimasVendas || this.data.ultimasVendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhuma venda recente</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.data.ultimasVendas.slice(0, 5).map(v => `
            <tr>
                <td>#${v.id}</td>
                <td>${new Date(v.data_venda).toLocaleString('pt-BR')}</td>
                <td>${UI.formatCurrency(v.total)}</td>
                <td><span class="badge badge-success">${v.forma_pagamento || 'N/A'}</span></td>
            </tr>
        `).join('');
    },
    
    configurarAtualizacao() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        // Atualizar a cada 60 segundos (menos requisições)
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && !this.loading && !this.isDestroyed) {
                this.carregarDados();
            }
        }, 60000);
    }
};

// ============================================
// DASHBOARD FALLBACK (para funcionários)
// ============================================
const Dashboard = {
    async init() {
        console.log('Dashboard fallback para funcionários');
        const user = Auth.getCurrentUser();
        if (user && user.role === 'admin') {
            if (window.DashboardAdmin) {
                await DashboardAdmin.init();
                return;
            }
        }
        window.location.href = '/vendas.html';
    }
};

// ============================================
// MÓDULO DE PRODUTOS (VERSÃO SIMPLIFICADA)
// ============================================
const Produtos = {
    paginaAtual: 1,
    totalPaginas: 1,
    filtros: {
        categoria: 'todas',
        busca: '',
        estoqueBaixo: false
    },
    produtos: [],
    produtoEditando: null,
    
    async init() {
        await Auth.checkAuth();
        this.verificarPermissoes();
        this.setupEventListeners();
        await this.carregarCategorias();
        await this.carregar();
    },

    verificarPermissoes() {
        this.isAdmin = Auth.isAdmin();
        
        const btnNovo = document.getElementById('btnNovoProduto');
        if (btnNovo) {
            btnNovo.style.display = this.isAdmin ? 'flex' : 'none';
        }
    },
    
    setupEventListeners() {
        const btnNovo = document.getElementById('btnNovoProduto');
        if (btnNovo && this.isAdmin) {
            btnNovo.addEventListener('click', () => {
                this.abrirModal();
            });
        }
        
        const buscaInput = document.getElementById('buscaProduto');
        if (buscaInput) {
            buscaInput.addEventListener('input', 
                debounce((e) => {
                    this.filtros.busca = e.target.value;
                    this.paginaAtual = 1;
                    this.carregar();
                }, 500)
            );
        }
        
        const filtroCategoria = document.getElementById('filtroCategoria');
        if (filtroCategoria) {
            filtroCategoria.addEventListener('change', (e) => {
                this.filtros.categoria = e.target.value;
                this.paginaAtual = 1;
                this.carregar();
            });
        }
        
        const formProduto = document.getElementById('formProduto');
        if (formProduto && this.isAdmin) {
            formProduto.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvar();
            });
        }
        
        const closeBtn = document.querySelector('#modalProduto .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.fecharModal();
            });
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modalProduto');
            if (e.target === modal) {
                this.fecharModal();
            }
        });
    },
    
    async carregarCategorias() {
        try {
            const categorias = await API.listarCategorias();
            
            const filtroSelect = document.getElementById('filtroCategoria');
            if (filtroSelect) {
                filtroSelect.innerHTML = '<option value="todas">Todas categorias</option>' +
                    categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            }
            
            const modalSelect = document.getElementById('produtoCategoria');
            if (modalSelect && this.isAdmin) {
                modalSelect.innerHTML = '<option value="">Selecione uma categoria</option>' +
                    categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
                
                modalSelect.addEventListener('change', () => this.carregarTipos());
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    },
    
    async carregarTipos(categoriaId = null) {
        if (!this.isAdmin) return;
        
        try {
            const select = document.getElementById('produtoTipo');
            if (!select) return;
            
            categoriaId = categoriaId || document.getElementById('produtoCategoria')?.value;
            
            if (!categoriaId) {
                select.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
                return;
            }
            
            const tipos = await API.listarTiposPorCategoria(categoriaId);
            
            select.innerHTML = '<option value="">Selecione um tipo</option>' +
                tipos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
        } catch (error) {
            console.error('Erro ao carregar tipos:', error);
        }
    },
    
    async carregar() {
        try {
            UI.showLoading();
            
            const params = {
                page: this.paginaAtual,
                limit: 10
            };
            
            if (this.filtros.busca) {
                params.busca = this.filtros.busca;
            }
            
            if (this.filtros.categoria && this.filtros.categoria !== 'todas') {
                params.categoria = this.filtros.categoria;
            }
            
            const data = await API.listarProdutos(params);
            this.produtos = data.produtos || [];
            this.totalPaginas = data.totalPages || 1;
            
            this.renderizar();
            this.renderizarPaginacao();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            App.showNotification('Erro ao carregar produtos', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizar() {
        const tbody = document.getElementById('produtosTable');
        if (!tbody) return;
        
        if (this.produtos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 50px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
                        <h3>Nenhum produto encontrado</h3>
                        <p style="color: var(--text-muted); margin-top: 10px;">
                            ${this.isAdmin ? 'Clique em "Novo Produto" para começar' : 'Nenhum produto cadastrado'}
                        </p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.produtos.map(p => {
            const precoCustoDisplay = this.isAdmin ? UI.formatCurrency(p.preco_custo) : '---';
            const codigoBarrasDisplay = p.codigo_barras || '-';
            
            const acoesDisplay = this.isAdmin ? `
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-primary btn-sm" onclick="Produtos.editar(${p.id})" title="Editar">✏️</button>
                    <button class="btn btn-warning btn-sm" onclick="Produtos.abrirModalEstoque(${p.id})" title="Ajustar Estoque">📦</button>
                    <button class="btn btn-danger btn-sm" onclick="Produtos.excluir(${p.id})" title="Excluir">🗑️</button>
                </div>
            ` : '<span class="badge badge-info">Apenas visualização</span>';
            
            return `
                <tr>
                    <td><strong>${p.nome || '-'}</strong></td>
                    <td>${p.categoria_nome || '-'}</td>
                    <td>${p.tipo_nome || '-'}</td>
                    <td>${precoCustoDisplay}</td>
                    <td>${UI.formatCurrency(p.preco_venda)}</td>
                    <td>
                        <span class="badge ${(p.quantidade || 0) < 5 ? 'badge-warning' : 'badge-success'}">
                            ${p.quantidade || 0}
                        </span>
                    </td>
                    <td>${codigoBarrasDisplay}</td>
                    <td>${acoesDisplay}</td>
                </tr>
            `;
        }).join('');
    },
    
    renderizarPaginacao() {
        const container = document.getElementById('paginacao');
        if (!container) return;
        
        if (this.totalPaginas <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        html += `<button onclick="Produtos.irParaPagina(${this.paginaAtual - 1})" 
                 ${this.paginaAtual === 1 ? 'disabled' : ''}>◀</button>`;
        
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (i === 1 || i === this.totalPaginas || 
                (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)) {
                html += `<button class="${i === this.paginaAtual ? 'active' : ''}" 
                         onclick="Produtos.irParaPagina(${i})">${i}</button>`;
            } else if (i === this.paginaAtual - 3 || i === this.paginaAtual + 3) {
                html += `<button disabled>...</button>`;
            }
        }
        
        html += `<button onclick="Produtos.irParaPagina(${this.paginaAtual + 1})"
                 ${this.paginaAtual === this.totalPaginas ? 'disabled' : ''}>▶</button>`;
        
        container.innerHTML = html;
    },
    
    irParaPagina(pagina) {
        if (pagina < 1 || pagina > this.totalPaginas) return;
        this.paginaAtual = pagina;
        this.carregar();
    },
    
    abrirModal(produto = null) {
        if (!this.isAdmin) {
            App.showNotification('Apenas administradores podem editar produtos', 'warning');
            return;
        }
        
        this.produtoEditando = produto;
        
        const modal = document.getElementById('modalProduto');
        const titulo = document.getElementById('modalTitulo');
        
        if (!modal) return;
        
        titulo.textContent = produto ? '✏️ Editar Produto' : '➕ Novo Produto';
        
        if (produto) {
            document.getElementById('produtoId').value = produto.id || '';
            document.getElementById('produtoNome').value = produto.nome || '';
            document.getElementById('produtoCategoria').value = produto.categoria_id || '';
            document.getElementById('produtoTipo').value = produto.tipo_id || '';
            document.getElementById('produtoPrecoCusto').value = produto.preco_custo || '';
            document.getElementById('produtoPrecoVenda').value = produto.preco_venda || '';
            document.getElementById('produtoQuantidade').value = produto.quantidade || 0;
            document.getElementById('produtoCodigoBarras').value = produto.codigo_barras || '';
        } else {
            document.getElementById('formProduto').reset();
        }
        
        if (produto?.categoria_id) {
            this.carregarTipos(produto.categoria_id).then(() => {
                if (produto.tipo_id) {
                    document.getElementById('produtoTipo').value = produto.tipo_id;
                }
            });
        }
        
        modal.style.display = 'block';
    },
    
    fecharModal() {
        const modal = document.getElementById('modalProduto');
        if (modal) {
            modal.style.display = 'none';
            this.produtoEditando = null;
        }
    },
    
    async salvar() {
        if (!this.isAdmin) return;
        
        try {
            UI.showLoading();
            
            const produto = {
                nome: document.getElementById('produtoNome')?.value,
                categoria_id: document.getElementById('produtoCategoria')?.value,
                tipo_id: document.getElementById('produtoTipo')?.value,
                preco_custo: parseFloat(document.getElementById('produtoPrecoCusto')?.value) || 0,
                preco_venda: parseFloat(document.getElementById('produtoPrecoVenda')?.value) || 0,
                quantidade: parseInt(document.getElementById('produtoQuantidade')?.value) || 0,
                codigo_barras: document.getElementById('produtoCodigoBarras')?.value || null
            };
            
            if (!produto.nome) throw new Error('Nome é obrigatório');
            if (!produto.categoria_id) throw new Error('Categoria é obrigatória');
            if (!produto.tipo_id) throw new Error('Tipo é obrigatório');
            
            if (this.produtoEditando) {
                await API.atualizarProduto(this.produtoEditando.id, produto);
                App.showNotification('Produto atualizado com sucesso!', 'success');
            } else {
                await API.criarProduto(produto);
                App.showNotification('Produto criado com sucesso!', 'success');
            }
            
            this.fecharModal();
            await this.carregar();
            
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async editar(id) {
        if (!this.isAdmin) return;
        const produto = this.produtos.find(p => p.id === id);
        if (produto) {
            this.abrirModal(produto);
        }
    },
    
    abrirModalEstoque(id) {
        if (!this.isAdmin) {
            App.showNotification('Apenas administradores podem ajustar estoque', 'warning');
            return;
        }
        
        const produto = this.produtos.find(p => p.id === id);
        if (!produto) return;
        
        const quantidade = prompt(`Digite a nova quantidade em estoque para ${produto.nome}:`, produto.quantidade);
        
        if (quantidade !== null) {
            this.atualizarEstoque(id, parseInt(quantidade));
        }
    },
    
    async atualizarEstoque(id, quantidade) {
        if (!this.isAdmin) return;
        
        try {
            UI.showLoading();
            
            if (isNaN(quantidade) || quantidade < 0) {
                throw new Error('Quantidade inválida');
            }
            
            await API.atualizarEstoque(id, {
                quantidade,
                tipo: 'ajuste',
                observacao: 'Ajuste manual'
            });
            
            App.showNotification('Estoque atualizado com sucesso!', 'success');
            await this.carregar();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async excluir(id) {
        if (!this.isAdmin) {
            App.showNotification('Apenas administradores podem excluir produtos', 'warning');
            return;
        }
        
        const produto = this.produtos.find(p => p.id === id);
        if (!produto) return;
        
        if (!confirm(`⚠️ Tem certeza que deseja excluir o produto "${produto.nome}"?`)) {
            return;
        }
        
        try {
            UI.showLoading();
            await API.excluirProduto(id);
            App.showNotification('✅ Produto excluído com sucesso!', 'success');
            await this.carregar();
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            App.showNotification('❌ ' + (error.message || 'Erro ao excluir produto'), 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE VENDAS - CORRIGIDO
// ============================================
const Vendas = {
    carrinho: [],
    produtos: [],
    formaPagamento: '',
    
    async init() {
        console.log('🛒 Inicializando módulo de vendas...');
        await Auth.checkAuth();
        await this.carregarProdutos();
        this.setupEventListeners();
        this.atualizarCarrinho();
        this.verificarCaixa();
        console.log('✅ Módulo de vendas inicializado com', this.produtos.length, 'produtos');
    },
    
    async verificarCaixa() {
        try {
            const status = await API.statusCaixa();
            const btnFinalizar = document.getElementById('btnFinalizarVenda');
            
            if (!status || !status.aberto) {
                if (btnFinalizar) {
                    btnFinalizar.disabled = true;
                    btnFinalizar.style.opacity = '0.5';
                    btnFinalizar.title = 'Caixa fechado. Não é possível realizar vendas.';
                }
            } else {
                if (btnFinalizar) {
                    btnFinalizar.disabled = false;
                    btnFinalizar.style.opacity = '1';
                    btnFinalizar.title = '';
                }
            }
        } catch (error) {
            console.error('Erro ao verificar caixa:', error);
            // Se erro na API, assume caixa fechado por segurança
            const btnFinalizar = document.getElementById('btnFinalizarVenda');
            if (btnFinalizar) {
                btnFinalizar.disabled = true;
                btnFinalizar.style.opacity = '0.5';
            }
        }
    },
    
    setupEventListeners() {
        const buscaInput = document.getElementById('buscaProduto');
        if (buscaInput) {
            buscaInput.addEventListener('input', 
                debounce((e) => {
                    this.buscarProdutos(e.target.value);
                }, 500)
            );
        }
        
        const pagamentoSelect = document.getElementById('formaPagamento');
        if (pagamentoSelect) {
            pagamentoSelect.addEventListener('change', (e) => {
                this.formaPagamento = e.target.value;
                console.log('Forma de pagamento selecionada:', this.formaPagamento);
            });
        }
        
        const btnFinalizar = document.getElementById('btnFinalizarVenda');
        if (btnFinalizar) {
            // Remove listeners antigos
            const newBtn = btnFinalizar.cloneNode(true);
            btnFinalizar.parentNode.replaceChild(newBtn, btnFinalizar);
            newBtn.addEventListener('click', () => {
                console.log('Botão finalizar clicado');
                this.finalizarVenda();
            });
        }
        
        const btnLimpar = document.getElementById('btnLimparCarrinho');
        if (btnLimpar) {
            const newBtn = btnLimpar.cloneNode(true);
            btnLimpar.parentNode.replaceChild(newBtn, btnLimpar);
            newBtn.addEventListener('click', () => {
                if (this.carrinho.length > 0 && confirm('Limpar todo o carrinho?')) {
                    this.carrinho = [];
                    this.atualizarCarrinho();
                    App.showNotification('Carrinho limpo!', 'info');
                }
            });
        }
    },
    
    async carregarProdutos() {
        try {
            UI.showLoading();
            console.log('🔄 Carregando produtos da API...');
            const data = await API.listarProdutos({ limit: 100 });
            this.produtos = data.produtos || [];
            console.log('📦 Produtos carregados:', this.produtos.length);
            this.renderizarProdutos(this.produtos);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            App.showNotification('Erro ao carregar produtos', 'danger');
            // Mostrar container vazio
            const container = document.getElementById('listaProdutos');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; grid-column: 1/-1;">
                        <div style="font-size: 48px;">⚠️</div>
                        <h3>Erro ao carregar produtos</h3>
                        <p style="color: var(--text-muted);">Tente novamente mais tarde</p>
                        <button class="btn btn-primary" onclick="Vendas.carregarProdutos()">Tentar novamente</button>
                    </div>
                `;
            }
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizarProdutos(produtos) {
        const container = document.getElementById('listaProdutos');
        if (!container) {
            console.error('❌ Container listaProdutos não encontrado!');
            return;
        }
        
        if (!produtos || produtos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; grid-column: 1/-1;">
                    <div style="font-size: 48px;">🔍</div>
                    <h3>Nenhum produto encontrado</h3>
                    <p style="color: var(--text-muted);">Cadastre produtos para começar a vender</p>
                </div>
            `;
            return;
        }
        
        console.log('🎨 Renderizando', produtos.length, 'produtos');
        
        container.innerHTML = produtos.map(p => {
            const disponivel = (p.quantidade || 0) > 0;
            const precoFormatado = UI.formatCurrency(p.preco_venda || 0);
            const nomeProduto = (p.nome || 'Sem nome').substring(0, 30);
            const categoriaNome = p.categoria_nome || 'Sem categoria';
            const tipoNome = p.tipo_nome || 'Sem tipo';
            const estoque = p.quantidade || 0;
            
            return `
                <div class="produto-card" 
                     data-produto-id="${p.id}"
                     data-produto-nome="${nomeProduto.replace(/"/g, '&quot;')}"
                     data-produto-preco="${p.preco_venda || 0}"
                     data-produto-estoque="${estoque}"
                     style="background: var(--bg-secondary); border-radius: 12px; padding: 15px; 
                            cursor: ${disponivel ? 'pointer' : 'not-allowed'}; 
                            opacity: ${disponivel ? '1' : '0.6'};
                            transition: all 0.2s ease; position: relative;
                            border: 1px solid var(--border-color);
                            hover: ${disponivel ? 'transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15);' : ''}">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">${nomeProduto}</h4>
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                        ${categoriaNome} • ${tipoNome}
                    </div>
                    <div style="font-size: 20px; font-weight: bold; color: var(--accent-primary); margin-bottom: 8px;">
                        ${precoFormatado}
                    </div>
                    <div style="font-size: 12px; color: ${estoque < 5 && disponivel ? '#f59e0b' : 'var(--text-muted)'};">
                        📦 Estoque: ${estoque}
                    </div>
                    ${!disponivel ? '<div style="position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px;">Indisponível</div>' : ''}
                </div>
            `;
        }).join('');
        
        // Adicionar event listeners para cada card
        const cards = document.querySelectorAll('.produto-card');
        console.log(`🎯 Encontrados ${cards.length} cards de produto`);
        
        cards.forEach(card => {
            const produtoId = parseInt(card.dataset.produtoId);
            const disponivel = card.style.opacity !== '0.6';
            
            if (disponivel && produtoId) {
                // Remove listener antigo se existir
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
                
                newCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('🖱️ Clique no produto ID:', produtoId);
                    this.adicionarAoCarrinho(produtoId);
                });
                
                // Efeito hover
                newCard.addEventListener('mouseenter', () => {
                    newCard.style.transform = 'translateY(-2px)';
                    newCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                newCard.addEventListener('mouseleave', () => {
                    newCard.style.transform = '';
                    newCard.style.boxShadow = '';
                });
            }
        });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async buscarProdutos(termo) {
        if (!termo || termo.length < 2) {
            // Se busca vazia, recarrega todos
            await this.carregarProdutos();
            return;
        }
        
        try {
            UI.showLoading();
            const data = await API.listarProdutos({ busca: termo, limit: 100 });
            this.renderizarProdutos(data.produtos || []);
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        } finally {
            UI.hideLoading();
        }
    },
    
    adicionarAoCarrinho(produtoId) {
        console.log('➕ Adicionando produto ID:', produtoId);
        
        if (!produtoId || isNaN(produtoId)) {
            console.error('❌ Produto ID inválido:', produtoId);
            App.showNotification('Erro: ID do produto inválido', 'danger');
            return;
        }
        
        const produto = this.produtos.find(p => p.id === produtoId);
        
        if (!produto) {
            console.error('❌ Produto não encontrado! ID:', produtoId);
            App.showNotification(`Produto não encontrado!`, 'danger');
            return;
        }
        
        console.log('✅ Produto encontrado:', produto.nome, 'Preço:', produto.preco_venda, 'Estoque:', produto.quantidade);
        
        if ((produto.quantidade || 0) <= 0) {
            App.showNotification(`❌ "${produto.nome}" - Sem estoque!`, 'warning');
            return;
        }
        
        if (!produto.preco_venda || produto.preco_venda <= 0) {
            App.showNotification(`❌ "${produto.nome}" - Preço não definido!`, 'danger');
            return;
        }
        
        // Verificar se é clique com Shift
        const isShiftClick = window.event && window.event.shiftKey;
        
        if (isShiftClick) {
            const quantidade = prompt(`Quantidade de ${produto.nome}:`, '1');
            if (quantidade) {
                const qtd = parseInt(quantidade);
                if (!isNaN(qtd) && qtd > 0) {
                    this.adicionarMultiplo(produto, qtd);
                }
            }
            return;
        }
        
        const itemExistente = this.carrinho.find(item => item.produto_id === produtoId);
        
        if (itemExistente) {
            if (itemExistente.quantidade >= (produto.quantidade || 0)) {
                App.showNotification(`⚠️ Estoque insuficiente! Máximo: ${produto.quantidade}`, 'warning');
                return;
            }
            itemExistente.quantidade++;
            App.showNotification(`✅ ${produto.nome} - Quantidade: ${itemExistente.quantidade}`, 'success');
        } else {
            this.carrinho.push({
                produto_id: produto.id,
                nome: produto.nome,
                preco: produto.preco_venda,
                preco_custo: produto.preco_custo || 0,
                quantidade: 1,
                estoque: produto.quantidade
            });
            App.showNotification(`✅ ${produto.nome} adicionado ao carrinho!`, 'success');
        }
        
        this.atualizarCarrinho();
        
        // Efeito visual no card clicado
        const card = document.querySelector(`.produto-card[data-produto-id="${produtoId}"]`);
        if (card) {
            card.style.transform = 'scale(0.97)';
            card.style.transition = 'transform 0.1s ease';
            setTimeout(() => {
                if (card) card.style.transform = '';
            }, 150);
        }
    },
    
    adicionarMultiplo(produto, quantidade) {
        if (quantidade > (produto.quantidade || 0)) {
            App.showNotification(`Estoque insuficiente! Disponível: ${produto.quantidade}`, 'warning');
            return;
        }
        
        const itemExistente = this.carrinho.find(item => item.produto_id === produto.id);
        
        if (itemExistente) {
            if (itemExistente.quantidade + quantidade > (produto.quantidade || 0)) {
                App.showNotification('Quantidade superior ao estoque!', 'warning');
                return;
            }
            itemExistente.quantidade += quantidade;
        } else {
            this.carrinho.push({
                produto_id: produto.id,
                nome: produto.nome,
                preco: produto.preco_venda,
                preco_custo: produto.preco_custo,
                quantidade: quantidade,
                estoque: produto.quantidade
            });
        }
        
        this.atualizarCarrinho();
        App.showNotification(`${quantidade}x ${produto.nome} adicionado!`, 'success');
    },
    
    removerDoCarrinho(index) {
        if (confirm('Remover item do carrinho?')) {
            const item = this.carrinho[index];
            this.carrinho.splice(index, 1);
            this.atualizarCarrinho();
            App.showNotification(`❌ ${item.nome} removido`, 'info');
        }
    },
    
    atualizarQuantidade(index, quantidade) {
        const item = this.carrinho[index];
        const produto = this.produtos.find(p => p.id === item.produto_id);
        quantidade = parseInt(quantidade);
        
        if (isNaN(quantidade) || quantidade <= 0) {
            this.removerDoCarrinho(index);
            return;
        }
        
        if (quantidade > (produto?.quantidade || 0)) {
            App.showNotification(`⚠️ Estoque insuficiente! Máximo: ${produto?.quantidade || 0}`, 'warning');
            return;
        }
        
        item.quantidade = quantidade;
        this.atualizarCarrinho();
    },
    
    calcularTotais() {
        let total = 0;
        let lucro = 0;
        
        this.carrinho.forEach(item => {
            const subtotal = (item.preco || 0) * item.quantidade;
            total += subtotal;
            lucro += ((item.preco || 0) - (item.preco_custo || 0)) * item.quantidade;
        });
        
        return { total, lucro };
    },
    
    atualizarCarrinho() {
        const container = document.getElementById('carrinhoItens');
        const totalElement = document.getElementById('carrinhoTotal');
        const lucroElement = document.getElementById('carrinhoLucro');
        const qtdElement = document.getElementById('carrinhoQuantidade');
        
        if (!container) return;
        
        const { total, lucro } = this.calcularTotais();
        const quantidadeTotal = this.carrinho.reduce((acc, item) => acc + item.quantidade, 0);
        
        // Atualizar badge de quantidade
        if (qtdElement) {
            qtdElement.textContent = quantidadeTotal;
            qtdElement.style.display = quantidadeTotal > 0 ? 'inline-block' : 'none';
        }
        
        if (this.carrinho.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🛒</div>
                    <h3 style="margin-bottom: 10px;">Carrinho vazio</h3>
                    <p style="color: var(--text-muted);">Clique nos produtos para adicionar</p>
                    <p style="color: var(--text-muted); font-size: 12px; margin-top: 10px;">
                        💡 Dica: Shift + clique para adicionar múltiplos
                    </p>
                </div>
            `;
        } else {
            container.innerHTML = this.carrinho.map((item, index) => `
                <div class="cart-item" style="background: var(--bg-tertiary); border-radius: 10px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 14px;">${this.escapeHtml(item.nome)}</strong>
                        <span style="font-weight: bold; color: var(--accent-primary);">${UI.formatCurrency((item.preco || 0) * item.quantidade)}</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="btn-quantity" onclick="Vendas.atualizarQuantidade(${index}, ${item.quantidade - 1})"
                                    style="width: 30px; height: 30px; border-radius: 6px; border: none; background: var(--bg-secondary); cursor: pointer; font-size: 16px;"
                                    ${item.quantidade <= 1 ? 'disabled' : ''}>−</button>
                            
                            <input type="number" class="quantity-input" value="${item.quantidade}" 
                                   min="1" max="${item.estoque || 999}" 
                                   onchange="Vendas.atualizarQuantidade(${index}, this.value)"
                                   style="width: 50px; text-align: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px;">
                            
                            <button class="btn-quantity" onclick="Vendas.atualizarQuantidade(${index}, ${item.quantidade + 1})"
                                    style="width: 30px; height: 30px; border-radius: 6px; border: none; background: var(--bg-secondary); cursor: pointer; font-size: 16px;"
                                    ${item.quantidade >= (item.estoque || 999) ? 'disabled' : ''}>+</button>
                        </div>
                        
                        <button class="btn-remove" onclick="Vendas.removerDoCarrinho(${index})" 
                                style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px;">
                            Remover
                        </button>
                    </div>
                    
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
                        Unitário: ${UI.formatCurrency(item.preco)} • Estoque: ${item.estoque}
                    </div>
                </div>
            `).join('');
        }
        
        if (totalElement) {
            totalElement.textContent = UI.formatCurrency(total);
        }
        
        if (lucroElement) {
            if (Auth.isAdmin()) {
                lucroElement.textContent = UI.formatCurrency(lucro);
                const lucroContainer = lucroElement.closest('.cart-total-item');
                if (lucroContainer) lucroContainer.style.display = 'flex';
            } else {
                const lucroContainer = lucroElement.closest('.cart-total-item');
                if (lucroContainer) lucroContainer.style.display = 'none';
            }
        }
        
        // Habilitar/desabilitar botão finalizar baseado no carrinho
        const btnFinalizar = document.getElementById('btnFinalizarVenda');
        if (btnFinalizar && !btnFinalizar.disabled) {
            btnFinalizar.disabled = this.carrinho.length === 0;
        }
    },
    
    async finalizarVenda() {
        console.log('🎯 Finalizando venda...');
        
        const formaPagamentoSelect = document.getElementById('formaPagamento');
        const formaPagamento = formaPagamentoSelect?.value;
        
        // Validações
        if (this.carrinho.length === 0) {
            App.showNotification('Adicione itens ao carrinho!', 'warning');
            return;
        }
        
        if (!formaPagamento) {
            App.showNotification('Selecione a forma de pagamento!', 'warning');
            formaPagamentoSelect?.focus();
            return;
        }
        
        const { total } = this.calcularTotais();
        
        // Confirmar venda
        const confirmado = confirm(
            `📋 CONFIRMAR VENDA\n\n` +
            `Itens: ${this.carrinho.reduce((acc, i) => acc + i.quantidade, 0)}\n` +
            `Total: ${UI.formatCurrency(total)}\n` +
            `Pagamento: ${formaPagamento}\n\n` +
            `Confirmar esta venda?`
        );
        
        if (!confirmado) return;
        
        try {
            UI.showLoading();
            
            // Preparar dados da venda
            const venda = {
                itens: this.carrinho.map(item => ({
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco
                })),
                forma_pagamento: formaPagamento,
                observacao: '',
                total: total
            };
            
            console.log('📝 Enviando venda:', venda);
            
            const result = await API.criarVenda(venda);
            
            console.log('✅ Venda finalizada:', result);
            
            // Mostrar comprovante
            const comprovante = `
                ✅ VENDA REALIZADA COM SUCESSO!
                
                Nº: #${result.id || 'N/A'}
                Data: ${new Date().toLocaleString()}
                Total: ${UI.formatCurrency(result.total || total)}
                Pagamento: ${formaPagamento}
                
                Obrigado pela preferência!
            `;
            
            App.showNotification(comprovante, 'success', 5000);
            
            // Limpar carrinho
            this.carrinho = [];
            this.atualizarCarrinho();
            
            // Resetar forma de pagamento
            if (formaPagamentoSelect) {
                formaPagamentoSelect.value = '';
            }
            this.formaPagamento = '';
            
            // Recarregar produtos para atualizar estoque
            await this.carregarProdutos();
            
            // Verificar caixa novamente
            await this.verificarCaixa();
            
        } catch (error) {
            console.error('❌ Erro ao finalizar venda:', error);
            
            let mensagem = 'Erro ao finalizar venda: ';
            if (error.message.includes('Caixa fechado') || error.message.includes('caixa fechado')) {
                mensagem = '❌ CAIXA FECHADO! Não é possível realizar vendas.';
            } else if (error.message.includes('estoque')) {
                mensagem = '❌ Estoque insuficiente! Recarregue a página e tente novamente.';
            } else {
                mensagem += error.message;
            }
            
            App.showNotification(mensagem, 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE CATEGORIAS (APENAS ADMIN)
// ============================================
const CategoriasManager = {
    categoriaEditando: null,
    tipoEditando: null,
    
    async init() {
        await Auth.checkAuth();
        
        if (!Auth.isAdmin()) {
            window.location.href = '/dashboard.html';
            return;
        }
        
        await this.carregarCategorias();
        await this.carregarTipos();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        const filtro = document.getElementById('filtroTipoCategoria');
        if (filtro) {
            filtro.addEventListener('change', () => {
                this.carregarTipos();
            });
        }
        
        const formCategoria = document.getElementById('formCategoria');
        if (formCategoria) {
            formCategoria.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarCategoria();
            });
        }
        
        const formTipo = document.getElementById('formTipo');
        if (formTipo) {
            formTipo.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarTipo();
            });
        }
        
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            });
        });
    },
    
    async carregarCategorias() {
        try {
            UI.showLoading();
            const categorias = await API.listarCategorias();
            this.renderizarCategorias(categorias);
            this.carregarSelectCategorias(categorias);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            App.showNotification('Erro ao carregar categorias', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizarCategorias(categorias) {
        const tbody = document.getElementById('tabelaCategorias');
        if (!tbody) return;
        
        if (categorias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 50px;">
                        <div style="font-size: 48px;">🏷️</div>
                        <h3>Nenhuma categoria cadastrada</h3>
                        <button class="btn btn-primary" onclick="CategoriasManager.abrirModalCategoria()">
                            Criar primeira categoria
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = categorias.map(c => `
            <tr>
                <td>
                    <span style="display: inline-block; width: 20px; height: 20px; 
                               background-color: ${c.cor || '#c4a747'}; border-radius: 4px; 
                               margin-right: 10px; vertical-align: middle;"></span>
                    ${c.nome || 'Sem nome'}
                </td>
                <td>
                    <span class="badge ${c.tipo === 'bebida' ? 'badge-info' : 
                                          c.tipo === 'come' ? 'badge-warning' : 'badge-secondary'}">
                        ${c.tipo || 'outro'}
                    </span>
                </td>
                <td>${c.total_produtos || 0}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="CategoriasManager.editarCategoria(${c.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="CategoriasManager.excluirCategoria(${c.id})" 
                            ${c.total_produtos > 0 ? 'disabled' : ''}>🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    carregarSelectCategorias(categorias) {
        const select = document.getElementById('tipoCategoria');
        const filtro = document.getElementById('filtroTipoCategoria');
        
        const options = categorias.map(c => 
            `<option value="${c.id}">${c.nome}</option>`
        ).join('');
        
        if (select) {
            select.innerHTML = '<option value="">Selecione uma categoria</option>' + options;
        }
        
        if (filtro) {
            filtro.innerHTML = '<option value="todas">Todas as categorias</option>' + options;
        }
    },
    
    async carregarTipos() {
        try {
            const filtro = document.getElementById('filtroTipoCategoria')?.value;
            let tipos;
            
            if (filtro && filtro !== 'todas') {
                tipos = await API.listarTiposPorCategoria(filtro);
            } else {
                tipos = await API.listarTipos();
            }
            
            this.renderizarTipos(tipos || []);
        } catch (error) {
            console.error('Erro ao carregar tipos:', error);
        }
    },
    
    renderizarTipos(tipos) {
        const tbody = document.getElementById('tabelaTipos');
        if (!tbody) return;
        
        if (tipos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px;">
                        Nenhum tipo cadastrado
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = tipos.map(t => `
            <tr>
                <td>${t.nome || '-'}</td>
                <td>${t.categoria_nome || '-'}</td>
                <td>${t.total_produtos || 0}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="CategoriasManager.editarTipo(${t.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="CategoriasManager.excluirTipo(${t.id})"
                            ${t.total_produtos > 0 ? 'disabled' : ''}>🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    abrirModalCategoria(categoria = null) {
        this.categoriaEditando = categoria;
        
        const modal = document.getElementById('modalCategoria');
        const titulo = document.getElementById('modalCategoriaTitulo');
        
        if (!modal) return;
        
        titulo.textContent = categoria ? '✏️ Editar Categoria' : '➕ Nova Categoria';
        
        if (categoria) {
            document.getElementById('categoriaId').value = categoria.id || '';
            document.getElementById('categoriaNome').value = categoria.nome || '';
            document.getElementById('categoriaTipo').value = categoria.tipo || 'outro';
            document.getElementById('categoriaCor').value = categoria.cor || '#c4a747';
        } else {
            document.getElementById('formCategoria').reset();
            document.getElementById('categoriaCor').value = '#c4a747';
        }
        
        modal.style.display = 'block';
    },
    
    async salvarCategoria() {
        try {
            UI.showLoading();
            
            const nome = document.getElementById('categoriaNome')?.value?.trim();
            let tipo = document.getElementById('categoriaTipo')?.value;
            
            if (!nome) throw new Error('Nome é obrigatório');
            if (!tipo) throw new Error('Tipo é obrigatório');
            
            if (tipo === 'outro') {
                const novoTipo = prompt('Digite o tipo da categoria (ex: cigarro, eletrônicos, etc):');
                if (!novoTipo) throw new Error('Tipo é obrigatório');
                tipo = novoTipo.toLowerCase().trim();
            }
            
            const cor = document.getElementById('categoriaCor')?.value || '#c4a747';
            
            const categoria = { nome, tipo, cor };
            
            if (this.categoriaEditando) {
                await API.atualizarCategoria(this.categoriaEditando.id, categoria);
                App.showNotification('✅ Categoria atualizada!', 'success');
            } else {
                await API.criarCategoria(categoria);
                App.showNotification('✅ Categoria criada!', 'success');
            }
            
            document.getElementById('modalCategoria').style.display = 'none';
            await this.carregarCategorias();
            await this.carregarTipos();
            
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async editarCategoria(id) {
        try {
            const categorias = await API.listarCategorias();
            const categoria = categorias.find(c => c.id === id);
            if (categoria) {
                this.abrirModalCategoria(categoria);
            }
        } catch (error) {
            App.showNotification('Erro ao carregar categoria', 'danger');
        }
    },
    
    async excluirCategoria(id) {
        if (!confirm('⚠️ Tem certeza que deseja excluir esta categoria?')) return;
        
        try {
            UI.showLoading();
            await API.excluirCategoria(id);
            App.showNotification('✅ Categoria excluída!', 'success');
            await this.carregarCategorias();
            await this.carregarTipos();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    abrirModalTipo(tipo = null) {
        this.tipoEditando = tipo;
        
        const modal = document.getElementById('modalTipo');
        const titulo = document.getElementById('modalTipoTitulo');
        
        if (!modal) return;
        
        titulo.textContent = tipo ? '✏️ Editar Tipo' : '➕ Novo Tipo';
        
        if (tipo) {
            document.getElementById('tipoId').value = tipo.id || '';
            document.getElementById('tipoNome').value = tipo.nome || '';
            document.getElementById('tipoCategoria').value = tipo.categoria_id || '';
        } else {
            document.getElementById('formTipo').reset();
        }
        
        modal.style.display = 'block';
    },
    
    async salvarTipo() {
        try {
            UI.showLoading();
            
            const nome = document.getElementById('tipoNome')?.value?.trim();
            const categoria_id = document.getElementById('tipoCategoria')?.value;
            
            if (!nome) throw new Error('Nome é obrigatório');
            if (!categoria_id) throw new Error('Categoria é obrigatória');
            
            const tipo = { nome, categoria_id };
            
            if (this.tipoEditando) {
                await API.atualizarTipo(this.tipoEditando.id, tipo);
                App.showNotification('✅ Tipo atualizado!', 'success');
            } else {
                await API.criarTipo(tipo);
                App.showNotification('✅ Tipo criado!', 'success');
            }
            
            document.getElementById('modalTipo').style.display = 'none';
            await this.carregarTipos();
            
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async editarTipo(id) {
        try {
            const tipos = await API.listarTipos();
            const tipo = tipos.find(t => t.id === id);
            if (tipo) {
                this.abrirModalTipo(tipo);
            }
        } catch (error) {
            App.showNotification('Erro ao carregar tipo', 'danger');
        }
    },
    
    async excluirTipo(id) {
        if (!confirm('⚠️ Tem certeza que deseja excluir este tipo?')) return;
        
        try {
            UI.showLoading();
            await API.excluirTipo(id);
            App.showNotification('✅ Tipo excluído!', 'success');
            await this.carregarTipos();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE RELATÓRIOS (APENAS ADMIN)
// ============================================
const Relatorios = {
    charts: {},
    
    async init() {
        await Auth.checkAuth();
        
        if (!Auth.isAdmin()) {
            window.location.href = '/dashboard.html';
            return;
        }
        
        this.setupEventListeners();
        await this.carregar();
    },
    
    setupEventListeners() {
        const periodoSelect = document.getElementById('periodoRelatorio');
        if (periodoSelect) {
            periodoSelect.addEventListener('change', (e) => {
                this.carregar(e.target.value);
            });
        }
    },
    
    async carregar(periodo = 'mes') {
        try {
            UI.showLoading();
            
            const [lucroDiario, lucroMensal, vendasPeriodo] = await Promise.all([
                API.lucroDiario().catch(() => ({ total_lucro: 0 })),
                API.lucroMensal().catch(() => ({ total_lucro: 0 })),
                API.vendasPorPeriodo?.(periodo).catch(() => []) || []
            ]);
            
            this.atualizarCards(lucroDiario, lucroMensal);
            this.atualizarTabela(vendasPeriodo || []);
            this.atualizarGrafico(vendasPeriodo || [], periodo);
            
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            App.showNotification('Erro ao carregar relatórios', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    atualizarCards(lucroDiario, lucroMensal) {
        const hojeEl = document.getElementById('lucroDiarioValor');
        const mesEl = document.getElementById('lucroMensalValor');
        
        if (hojeEl) {
            hojeEl.textContent = UI.formatCurrency(lucroDiario?.total_lucro || 0);
        }
        
        if (mesEl) {
            mesEl.textContent = UI.formatCurrency(lucroMensal?.total_lucro || 0);
        }
    },
    
    atualizarTabela(vendas) {
        const tbody = document.getElementById('tabelaVendasPeriodo');
        if (!tbody) return;
        
        if (!vendas || vendas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px;">
                        Nenhuma venda encontrada
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = vendas.map(v => `
            <tr>
                <td>${v.periodo || '-'}</td>
                <td>${v.quantidade_vendas || 0}</td>
                <td>${UI.formatCurrency(v.total_vendas || 0)}</td>
                <td>${UI.formatCurrency(v.total_lucro || 0)}</td>
            </tr>
        `).join('');
    },
    
    atualizarGrafico(vendas, periodo) {
        const ctx = document.getElementById('graficoRelatorio')?.getContext('2d');
        if (!ctx) return;
        
        if (this.charts.relatorio) {
            this.charts.relatorio.destroy();
        }
        
        if (!vendas || vendas.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('Sem dados para exibir', ctx.canvas.width/2, ctx.canvas.height/2);
            return;
        }
        
        this.charts.relatorio = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: vendas.map(v => v.periodo || ''),
                datasets: [
                    {
                        label: 'Vendas (R$)',
                        data: vendas.map(v => v.total_vendas || 0),
                        backgroundColor: '#c4a747',
                        borderRadius: 4
                    },
                    {
                        label: 'Lucro (R$)',
                        data: vendas.map(v => v.total_lucro || 0),
                        backgroundColor: '#b91c3c',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#94a3b8' }
                    }
                },
                scales: {
                    y: {
                        grid: { color: '#2d3540' },
                        ticks: {
                            color: '#94a3b8',
                            callback: (value) => 'R$ ' + value
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }
};

// ============================================
// UTILITÁRIOS
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// INICIALIZAÇÃO - APENAS UMA VEZ
// ============================================
let appInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (appInitialized) {
        console.log('⚠️ App já foi inicializado, ignorando DOMContentLoaded');
        return;
    }
    appInitialized = true;
    App.init();
});

// Se o documento já estiver carregado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!appInitialized) {
        appInitialized = true;
        setTimeout(() => App.init(), 100);
    }
}

// Exportar para uso global
window.App = App;
window.Auth = Auth;
window.UI = UI;
window.Dashboard = Dashboard;
window.DashboardAdmin = DashboardAdmin;
window.Produtos = Produtos;
window.Vendas = Vendas;
window.CategoriasManager = CategoriasManager;
window.Relatorios = Relatorios;

} // Fim do if (typeof window.App === 'undefined')