// ============================================
// PODPÁ - SISTEMA DE GESTÃO PROFISSIONAL
// VERSÃO: 2.1.0 COMPLETA
// ============================================

// Garantir que não haja duplicação de declarações
if (typeof window.App === 'undefined') {

// Controle de inicialização
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
        if (isInitializing) {
            console.log('⚠️ App já está inicializando, ignorando...');
            return;
        }
        
        isInitializing = true;
        console.log(`🍷 PodPá v${this.version} inicializado`);
        
        this.setupEventListeners();
        this.checkCurrentPage();
        
        isInitializing = false;
    }

    static setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"], .search-bar input');
                if (searchInput) searchInput.focus();
            }
            
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            newLogoutBtn.addEventListener('click', () => Auth.logout());
        }
    }

    static checkCurrentPage() {
        const path = window.location.pathname;
        const user = Auth.getCurrentUser();
        
        console.log('📄 Página atual:', path, 'Usuário:', user?.username || 'nenhum');
        
        if (initializedPages.has(path)) {
            console.log(`⚠️ Página ${path} já foi inicializada`);
            return;
        }
        
        if (!user && !path.includes('index.html') && path !== '/') {
            window.location.href = '/';
            return;
        }
        
        // DASHBOARD
        if (path.includes('dashboard.html')) {
            if (user && user.role === 'admin') {
                console.log('📊 Carregando dashboard admin');
                if (window.DashboardAdmin) {
                    if (window.DashboardAdmin.destroy) window.DashboardAdmin.destroy();
                    DashboardAdmin.init();
                    initializedPages.add(path);
                }
            } else {
                window.location.href = '/vendas.html';
            }
            return;
        }
        
        // PRODUTOS
        if (path.includes('produtos.html')) {
            if (window.Produtos) {
                Produtos.init();
                initializedPages.add(path);
            }
            return;
        }
        
        // VENDAS
        if (path.includes('vendas.html')) {
            if (window.Vendas) {
                Vendas.init();
                initializedPages.add(path);
            }
            return;
        }
        
        // HISTÓRICO
        if (path.includes('historico-vendas.html')) {
            if (window.HistoricoVendas) {
                HistoricoVendas.init();
                initializedPages.add(path);
            }
            return;
        }
        
        // CATEGORIAS
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
        
        // RELATÓRIOS
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
        
        // GASTOS
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
        
        // FINANCEIRO
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
        
        // CAIXA
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
        
        if (window.Notificacao) {
            window.Notificacao.mostrar(message, type, duration);
            return;
        }
        
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
        
        notification.innerHTML = `
            <div style="background: ${bgColor}; color: white; padding: 12px 20px; border-radius: 8px; 
                        margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-weight: 500;">
                ${message}
            </div>
        `;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.animation = 'slideIn 0.3s ease';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// ============================================
// API - COMUNICAÇÃO COM BACKEND
// ============================================
const API = {
    baseURL: 'https://sistemadega.onrender.com/api',
    
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error(`❌ API Error ${endpoint}:`, error);
            throw error;
        }
    },
    
    // Autenticação
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    async verificarToken() {
        return this.request('/auth/verify');
    },
    
    // Produtos
    async listarProdutos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/produtos${queryString ? `?${queryString}` : ''}`);
    },
    
    async criarProduto(produto) {
        return this.request('/produtos', {
            method: 'POST',
            body: JSON.stringify(produto)
        });
    },
    
    async atualizarProduto(id, produto) {
        return this.request(`/produtos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(produto)
        });
    },
    
    async excluirProduto(id) {
        return this.request(`/produtos/${id}`, {
            method: 'DELETE'
        });
    },
    
    async atualizarEstoque(id, dados) {
        return this.request(`/produtos/${id}/estoque`, {
            method: 'PATCH',
            body: JSON.stringify(dados)
        });
    },
    
    async estoqueBaixo() {
        return this.request('/produtos/estoque/baixo');
    },
    
    // Vendas
    async listarVendas(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/vendas${queryString ? `?${queryString}` : ''}`);
    },
    
    async criarVenda(venda) {
        return this.request('/vendas', {
            method: 'POST',
            body: JSON.stringify(venda)
        });
    },
    
    async getVenda(id) {
        return this.request(`/vendas/${id}`);
    },
    
    async cancelarVenda(id) {
        return this.request(`/vendas/${id}/cancelar`, {
            method: 'POST'
        });
    },
    
    // Categorias
    async listarCategorias() {
        return this.request('/categorias');
    },
    
    async criarCategoria(categoria) {
        return this.request('/categorias', {
            method: 'POST',
            body: JSON.stringify(categoria)
        });
    },
    
    async atualizarCategoria(id, categoria) {
        return this.request(`/categorias/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoria)
        });
    },
    
    async excluirCategoria(id) {
        return this.request(`/categorias/${id}`, {
            method: 'DELETE'
        });
    },
    
    // Tipos
    async listarTipos() {
        return this.request('/tipos');
    },
    
    async listarTiposPorCategoria(categoriaId) {
        return this.request(`/tipos?categoria_id=${categoriaId}`);
    },
    
    async criarTipo(tipo) {
        return this.request('/tipos', {
            method: 'POST',
            body: JSON.stringify(tipo)
        });
    },
    
    async atualizarTipo(id, tipo) {
        return this.request(`/tipos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tipo)
        });
    },
    
    async excluirTipo(id) {
        return this.request(`/tipos/${id}`, {
            method: 'DELETE'
        });
    },
    
    // Caixa
    async statusCaixa() {
        return this.request('/caixa/status');
    },
    
    async abrirCaixa(dados) {
        return this.request('/caixa/abrir', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    },
    
    async fecharCaixa(dados) {
        return this.request('/caixa/fechar', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    },
    
    async getMovimentacoes(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/caixa/movimentacoes${queryString ? `?${queryString}` : ''}`);
    },
    
    // Gastos
    async listarGastos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/gastos${queryString ? `?${queryString}` : ''}`);
    },
    
    async criarGasto(gasto) {
        return this.request('/gastos', {
            method: 'POST',
            body: JSON.stringify(gasto)
        });
    },
    
    async atualizarGasto(id, gasto) {
        return this.request(`/gastos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(gasto)
        });
    },
    
    async excluirGasto(id) {
        return this.request(`/gastos/${id}`, {
            method: 'DELETE'
        });
    },
    
    // Relatórios
    async lucroDiario() {
        return this.request('/relatorios/lucro/diario');
    },
    
    async lucroMensal() {
        return this.request('/relatorios/lucro/mensal');
    },
    
    async vendasPorPeriodo(periodo = 'mes') {
        return this.request(`/relatorios/vendas/${periodo}`);
    },
    
    async produtosMaisVendidos(limite = 10) {
        return this.request(`/relatorios/produtos/mais-vendidos?limite=${limite}`);
    },
    
    async faturamentoPorPeriodo(dataInicio, dataFim) {
        return this.request(`/relatorios/faturamento?data_inicio=${dataInicio}&data_fim=${dataFim}`);
    }
};

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
            if (el) el.textContent = user?.nome || user?.username || 'Usuário';
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
                loader.innerHTML = `
                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                background: rgba(0,0,0,0.7); z-index: 9999; 
                                display: flex; align-items: center; justify-content: center;">
                        <div style="background: var(--bg-secondary); padding: 20px 40px; border-radius: 12px; 
                                    box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center;">
                            <div class="spinner" style="width: 40px; height: 40px; border: 4px solid var(--border-color); 
                                                       border-top-color: var(--accent-primary); border-radius: 50%; 
                                                       animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                            <p style="color: var(--text-primary);">Carregando...</p>
                        </div>
                    </div>
                `;
                document.body.appendChild(loader);
                
                if (!document.querySelector('#spinner-style')) {
                    const style = document.createElement('style');
                    style.id = 'spinner-style';
                    style.textContent = `
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                        @keyframes slideIn {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                        @keyframes slideOut {
                            from { transform: translateX(0); opacity: 1; }
                            to { transform: translateX(100%); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        }
    },
    
    hideLoading() {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        
        if (this.loadingCount === 0) {
            const loader = document.getElementById('global-loader');
            if (loader) loader.remove();
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
// MÓDULO DASHBOARD ADMIN
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
        
        const userNomeSpan = document.getElementById('userNome');
        if (userNomeSpan) userNomeSpan.textContent = user.nome || user.username;
        
        const userRoleSpan = document.getElementById('userRole');
        if (userRoleSpan) {
            userRoleSpan.textContent = 'Admin';
            userRoleSpan.className = 'badge badge-success';
        }
        
        this.adicionarFiltro();
        this.destruirGraficos();
        await this.carregarDados();
        
        setTimeout(() => {
            if (!this.isDestroyed) this.inicializarGraficos();
        }, 100);
        
        this.configurarAtualizacao();
    },
    
    adicionarFiltro() {
        if (document.getElementById('filtroDashboard')) return;
        
        const topBar = document.querySelector('.top-bar');
        if (!topBar) return;
        
        const filtroDiv = document.createElement('div');
        filtroDiv.id = 'filtroDashboard';
        filtroDiv.style.cssText = 'display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap; justify-content: center; align-items: center;';
        
        filtroDiv.innerHTML = `
            <select id="filtroTipo" style="padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                <option value="mes">Mês</option>
                <option value="ano">Ano</option>
            </select>
            <div id="filtroMesContainer">
                <select id="filtroMes" style="padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                    ${this.gerarOptionsMeses()}
                </select>
            </div>
            <div id="filtroAnoContainer">
                <input type="number" id="filtroAno" value="${new Date().getFullYear()}" min="2020" max="2030" style="width: 100px; padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
            </div>
            <button class="btn btn-primary btn-sm" onclick="DashboardAdmin.aplicarFiltro()">Filtrar</button>
            <button class="btn btn-secondary btn-sm" onclick="DashboardAdmin.limparFiltro()">Mês Atual</button>
        `;
        
        topBar.parentNode.insertBefore(filtroDiv, topBar.nextSibling);
        
        document.getElementById('filtroTipo').addEventListener('change', (e) => {
            const mesContainer = document.getElementById('filtroMesContainer');
            if (mesContainer) mesContainer.style.display = e.target.value === 'mes' ? 'inline-block' : 'none';
        });
    },
    
    gerarOptionsMeses() {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesAtual = new Date().getMonth() + 1;
        return meses.map((mes, i) => `<option value="${i + 1}" ${i + 1 === mesAtual ? 'selected' : ''}>${mes}</option>`).join('');
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
        if (this.loading) return;
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
            
            const response = await API.listarVendas({ 
                data_inicio: dataInicioStr,
                data_fim: dataFimStr,
                limite: 1000
            });
            
            const vendas = response.vendas || [];
            
            let totalVendasPeriodo = 0;
            let totalLucroPeriodo = 0;
            
            vendas.forEach(v => {
                totalVendasPeriodo += v.total || 0;
                totalLucroPeriodo += v.lucro || 0;
            });
            
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
            
            const ultimos7Dias = [];
            for (let i = 6; i >= 0; i--) {
                const data = new Date();
                data.setDate(data.getDate() - i);
                const dataStr = data.toISOString().split('T')[0];
                
                const vendasDia = vendas.filter(v => v.data_venda?.split('T')[0] === dataStr);
                const totalDia = vendasDia.reduce((acc, v) => acc + (v.total || 0), 0);
                
                ultimos7Dias.push({
                    data: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
                    total: totalDia
                });
            }
            
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
            
            let estoqueBaixo = [];
            try {
                estoqueBaixo = await API.estoqueBaixo();
            } catch (e) {
                console.warn('Erro ao buscar estoque baixo:', e);
            }
            
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
            periodoInfo.style.cssText = 'text-align: center; margin-bottom: 10px; padding: 5px 15px; border-radius: 20px; font-size: 14px; color: var(--text-secondary); background: var(--bg-tertiary);';
            
            const statsGrid = document.querySelector('.dashboard-stats');
            if (statsGrid?.parentNode) statsGrid.parentNode.insertBefore(periodoInfo, statsGrid);
        }
        
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        if (this.filtroAtual.tipo === 'mes') {
            periodoInfo.textContent = `📅 Período: ${meses[this.filtroAtual.mes - 1]} de ${this.filtroAtual.ano}`;
        } else {
            periodoInfo.textContent = `📅 Período: Ano de ${this.filtroAtual.ano}`;
        }
    },
    
    atualizarCards() {
        const elementos = {
            vendasHoje: document.getElementById('vendasHoje'),
            lucroHoje: document.getElementById('lucroHoje'),
            vendasSemana: document.getElementById('vendasSemana'),
            vendasMes: document.getElementById('vendasMes'),
            estoqueBaixo: document.getElementById('estoqueBaixo'),
            ticketMedio: document.getElementById('ticketMedio')
        };
        
        if (elementos.vendasHoje) elementos.vendasHoje.textContent = UI.formatCurrency(this.data.vendasHoje || 0);
        if (elementos.lucroHoje) elementos.lucroHoje.textContent = UI.formatCurrency(this.data.lucroHoje || 0);
        if (elementos.vendasSemana) elementos.vendasSemana.textContent = UI.formatCurrency(this.data.vendasSemana || 0);
        if (elementos.vendasMes) elementos.vendasMes.textContent = UI.formatCurrency(this.data.vendasPeriodo || 0);
        if (elementos.estoqueBaixo) elementos.estoqueBaixo.textContent = this.data.estoqueBaixo?.length || 0;
        if (elementos.ticketMedio) elementos.ticketMedio.textContent = UI.formatCurrency(this.data.ticketMedio || 0);
    },
    
    async atualizarPagamentos() {
        const container = document.getElementById('pagamentosHoje');
        if (!container) return;
        
        try {
            const hoje = new Date().toISOString().split('T')[0];
            const response = await API.listarVendas({ data_inicio: hoje, data_fim: hoje, limite: 100 });
            const vendas = response.vendas || [];
            
            const pagamentos = {};
            vendas.forEach(v => {
                const forma = v.forma_pagamento || 'Outros';
                if (!pagamentos[forma]) pagamentos[forma] = { forma, quantidade: 0, total: 0 };
                pagamentos[forma].quantidade++;
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
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: '#2d3540' }, ticks: { color: '#94a3b8', callback: (v) => 'R$ ' + v } },
                            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                        }
                    }
                });
            } catch (e) { console.error('Erro ao criar gráfico de vendas:', e); }
        }
        
        const ctxProdutos = document.getElementById('graficoProdutos');
        if (ctxProdutos && this.data.produtosMaisVendidos.length > 0 && !this.charts.produtos) {
            try {
                this.charts.produtos = new Chart(ctxProdutos, {
                    type: 'bar',
                    data: {
                        labels: this.data.produtosMaisVendidos.map(p => p.nome.length > 10 ? p.nome.substring(0, 10) + '...' : p.nome),
                        datasets: [{ label: 'Quantidade Vendida', data: this.data.produtosMaisVendidos.map(p => p.quantidade), backgroundColor: '#c4a747', borderRadius: 6 }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: '#2d3540' }, ticks: { color: '#94a3b8', stepSize: 1 } },
                            x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45 } }
                        }
                    }
                });
            } catch (e) { console.error('Erro ao criar gráfico de produtos:', e); }
        }
    },
    
    atualizarGraficos() {
        if (this.charts.vendas && this.data.vendasPorDia) {
            this.charts.vendas.data.datasets[0].data = this.data.vendasPorDia.map(d => d.total);
            this.charts.vendas.update();
        }
        
        if (this.charts.produtos && this.data.produtosMaisVendidos.length > 0) {
            this.charts.produtos.data.labels = this.data.produtosMaisVendidos.map(p => p.nome.length > 10 ? p.nome.substring(0, 10) + '...' : p.nome);
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
        
        if (!this.data.estoqueBaixo?.length) {
            container.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px;">✅ Todos os produtos com estoque adequado</div>`;
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.slice(0, 5).map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div><strong>${p.nome}</strong><br><small style="color: var(--text-muted);">Estoque: ${p.quantidade} unidades</small></div>
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
        
        if (!this.data.ultimasVendas?.length) {
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
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && !this.loading && !this.isDestroyed) {
                this.carregarDados();
            }
        }, 60000);
    }
};

// ============================================
// MÓDULO DE PRODUTOS - CORRIGIDO
// ============================================
const Produtos = {
    paginaAtual: 1,
    totalPaginas: 1,
    filtros: { categoria: 'todas', busca: '', estoqueBaixo: false },
    produtos: [],
    produtoEditando: null,
    
    async init() {
        console.log('📦 Inicializando módulo de produtos...');
        await Auth.checkAuth();
        this.verificarPermissoes();
        this.setupEventListeners();
        await this.carregarCategorias();
        await this.carregar();
        console.log('✅ Módulo de produtos inicializado');
    },

    verificarPermissoes() {
        this.isAdmin = Auth.isAdmin();
        const btnNovo = document.getElementById('btnNovoProduto');
        if (btnNovo) btnNovo.style.display = this.isAdmin ? 'flex' : 'none';
    },
    
    setupEventListeners() {
        const btnNovo = document.getElementById('btnNovoProduto');
        if (btnNovo && this.isAdmin) btnNovo.addEventListener('click', () => this.abrirModal());
        
        const buscaInput = document.getElementById('buscaProduto');
        if (buscaInput) buscaInput.addEventListener('input', debounce((e) => {
            this.filtros.busca = e.target.value;
            this.paginaAtual = 1;
            this.carregar();
        }, 500));
        
        const filtroCategoria = document.getElementById('filtroCategoria');
        if (filtroCategoria) filtroCategoria.addEventListener('change', (e) => {
            this.filtros.categoria = e.target.value;
            this.paginaAtual = 1;
            this.carregar();
        });
        
        const formProduto = document.getElementById('formProduto');
        if (formProduto && this.isAdmin) formProduto.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvar();
        });
        
        const closeBtn = document.querySelector('#modalProduto .close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.fecharModal());
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modalProduto');
            if (e.target === modal) this.fecharModal();
        });
    },
    
    async carregarCategorias() {
        try {
            const categorias = await API.listarCategorias();
            
            const filtroSelect = document.getElementById('filtroCategoria');
            if (filtroSelect) filtroSelect.innerHTML = '<option value="todas">Todas categorias</option>' + categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            
            const modalSelect = document.getElementById('produtoCategoria');
            if (modalSelect && this.isAdmin) {
                modalSelect.innerHTML = '<option value="">Selecione uma categoria</option>' + categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
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
            if (!categoriaId) { select.innerHTML = '<option value="">Selecione uma categoria primeiro</option>'; return; }
            const tipos = await API.listarTiposPorCategoria(categoriaId);
            select.innerHTML = '<option value="">Selecione um tipo</option>' + tipos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
        } catch (error) {
            console.error('Erro ao carregar tipos:', error);
        }
    },
    
    async carregar() {
        try {
            UI.showLoading();
            const params = { page: this.paginaAtual, limit: 10 };
            if (this.filtros.busca) params.busca = this.filtros.busca;
            if (this.filtros.categoria && this.filtros.categoria !== 'todas') params.categoria = this.filtros.categoria;
            
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
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 50px;"><div style="font-size: 48px; margin-bottom: 20px;">📦</div><h3>Nenhum produto encontrado</h3><p style="color: var(--text-muted);">${this.isAdmin ? 'Clique em "Novo Produto" para começar' : 'Nenhum produto cadastrado'}</p></td></tr>`;
            return;
        }
        
        tbody.innerHTML = this.produtos.map(p => {
            const acoesDisplay = this.isAdmin ? `
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-primary btn-sm" onclick="Produtos.editar(${p.id})" title="Editar">✏️</button>
                    <button class="btn btn-warning btn-sm" onclick="Produtos.abrirModalEstoque(${p.id})" title="Ajustar Estoque">📦</button>
                    <button class="btn btn-danger btn-sm" onclick="Produtos.excluir(${p.id})" title="Excluir">🗑️</button>
                </div>
            ` : '<span class="badge badge-info">Apenas visualização</span>';
            
            return `<tr>
                <td><strong>${p.nome || '-'}</strong></td>
                <td>${p.categoria_nome || '-'}</td>
                <td>${p.tipo_nome || '-'}</td>
                <td>${this.isAdmin ? UI.formatCurrency(p.preco_custo) : '---'}</td>
                <td>${UI.formatCurrency(p.preco_venda)}</td>
                <td><span class="badge ${(p.quantidade || 0) < 5 ? 'badge-warning' : 'badge-success'}">${p.quantidade || 0}</span></td>
                <td>${p.codigo_barras || '-'}</td>
                <td>${acoesDisplay}</td>
            </tr>`;
        }).join('');
    },
    
    renderizarPaginacao() {
        const container = document.getElementById('paginacao');
        if (!container || this.totalPaginas <= 1) { if(container) container.innerHTML = ''; return; }
        
        let html = `<button onclick="Produtos.irParaPagina(${this.paginaAtual - 1})" ${this.paginaAtual === 1 ? 'disabled' : ''}>◀</button>`;
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (i === 1 || i === this.totalPaginas || (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)) {
                html += `<button class="${i === this.paginaAtual ? 'active' : ''}" onclick="Produtos.irParaPagina(${i})">${i}</button>`;
            } else if (i === this.paginaAtual - 3 || i === this.paginaAtual + 3) {
                html += `<button disabled>...</button>`;
            }
        }
        html += `<button onclick="Produtos.irParaPagina(${this.paginaAtual + 1})" ${this.paginaAtual === this.totalPaginas ? 'disabled' : ''}>▶</button>`;
        container.innerHTML = html;
    },
    
    irParaPagina(pagina) {
        if (pagina < 1 || pagina > this.totalPaginas) return;
        this.paginaAtual = pagina;
        this.carregar();
    },
    
    abrirModal(produto = null) {
        if (!this.isAdmin) { App.showNotification('Apenas administradores podem editar produtos', 'warning'); return; }
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
            document.getElementById('formProduto')?.reset();
        }
        
        if (produto?.categoria_id) {
            this.carregarTipos(produto.categoria_id).then(() => {
                if (produto.tipo_id) document.getElementById('produtoTipo').value = produto.tipo_id;
            });
        }
        modal.style.display = 'block';
    },
    
    fecharModal() {
        const modal = document.getElementById('modalProduto');
        if (modal) { modal.style.display = 'none'; this.produtoEditando = null; }
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
        if (produto) this.abrirModal(produto);
    },
    
    abrirModalEstoque(id) {
        if (!this.isAdmin) { App.showNotification('Apenas administradores podem ajustar estoque', 'warning'); return; }
        const produto = this.produtos.find(p => p.id === id);
        if (!produto) return;
        const quantidade = prompt(`Digite a nova quantidade em estoque para ${produto.nome}:`, produto.quantidade);
        if (quantidade !== null) this.atualizarEstoque(id, parseInt(quantidade));
    },
    
    async atualizarEstoque(id, quantidade) {
        if (!this.isAdmin) return;
        try {
            UI.showLoading();
            if (isNaN(quantidade) || quantidade < 0) throw new Error('Quantidade inválida');
            await API.atualizarEstoque(id, { quantidade, tipo: 'ajuste', observacao: 'Ajuste manual' });
            App.showNotification('Estoque atualizado com sucesso!', 'success');
            await this.carregar();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async excluir(id) {
        if (!this.isAdmin) { App.showNotification('Apenas administradores podem excluir produtos', 'warning'); return; }
        const produto = this.produtos.find(p => p.id === id);
        if (!produto) return;
        if (!confirm(`⚠️ Tem certeza que deseja excluir o produto "${produto.nome}"?`)) return;
        
        try {
            UI.showLoading();
            await API.excluirProduto(id);
            App.showNotification('✅ Produto excluído com sucesso!', 'success');
            await this.carregar();
        } catch (error) {
            App.showNotification('❌ ' + (error.message || 'Erro ao excluir produto'), 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE VENDAS - COMPLETO E CORRIGIDO
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
            if (btnFinalizar) {
                btnFinalizar.disabled = !status.aberto;
                btnFinalizar.style.opacity = status.aberto ? '1' : '0.5';
                btnFinalizar.title = status.aberto ? '' : 'Caixa fechado. Não é possível realizar vendas.';
            }
        } catch (error) {
            console.error('Erro ao verificar caixa:', error);
        }
    },
    
    setupEventListeners() {
        const buscaInput = document.getElementById('buscaProduto');
        if (buscaInput) buscaInput.addEventListener('input', debounce((e) => this.buscarProdutos(e.target.value), 500));
        
        const pagamentoSelect = document.getElementById('formaPagamento');
        if (pagamentoSelect) pagamentoSelect.addEventListener('change', (e) => this.formaPagamento = e.target.value);
        
        const btnFinalizar = document.getElementById('btnFinalizarVenda');
        if (btnFinalizar) btnFinalizar.addEventListener('click', () => this.finalizarVenda());
        
        const btnLimpar = document.getElementById('btnLimparCarrinho');
        if (btnLimpar) btnLimpar.addEventListener('click', () => {
            if (this.carrinho.length > 0 && confirm('Limpar todo o carrinho?')) {
                this.carrinho = [];
                this.atualizarCarrinho();
            }
        });
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
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizarProdutos(produtos) {
        const container = document.getElementById('listaProdutos');
        if (!container) {
            console.error('❌ Container #listaProdutos não encontrado! Criando...');
            const main = document.querySelector('main') || document.body;
            const newGrid = document.createElement('div');
            newGrid.id = 'listaProdutos';
            newGrid.className = 'produtos-grid';
            newGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; padding: 20px;';
            main.appendChild(newGrid);
            return this.renderizarProdutos(produtos);
        }
        
        if (!produtos || produtos.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 50px; grid-column: 1/-1;"><div style="font-size: 48px;">🔍</div><h3>Nenhum produto encontrado</h3><p style="color: var(--text-muted);">Cadastre produtos para começar a vender</p></div>`;
            return;
        }
        
        console.log('🎨 Renderizando', produtos.length, 'produtos');
        
        container.innerHTML = produtos.map(p => {
            const disponivel = (p.quantidade || 0) > 0;
            const precoFormatado = UI.formatCurrency(p.preco_venda || 0);
            const nomeLimpo = this.escapeHtml(p.nome) || 'Sem nome';
            const categoriaNome = this.escapeHtml(p.categoria_nome) || 'Sem categoria';
            const tipoNome = this.escapeHtml(p.tipo_nome) || 'Sem tipo';
            
            return `
                <div class="produto-card" data-produto-id="${p.id}" 
                     style="background: var(--bg-secondary); border-radius: 12px; padding: 15px; 
                            cursor: ${disponivel ? 'pointer' : 'not-allowed'}; opacity: ${disponivel ? '1' : '0.6'};
                            transition: transform 0.2s, box-shadow 0.2s; position: relative;
                            border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">${nomeLimpo}</h4>
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                        ${categoriaNome} • ${tipoNome}
                    </div>
                    <div style="font-size: 20px; font-weight: bold; color: var(--accent-primary); margin-bottom: 8px;">
                        ${precoFormatado}
                    </div>
                    <div style="font-size: 12px; color: ${(p.quantidade || 0) < 5 && disponivel ? '#f59e0b' : 'var(--text-muted)'};">
                        📦 Estoque: ${p.quantidade || 0}
                    </div>
                    ${!disponivel ? '<div style="position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px;">Indisponível</div>' : ''}
                </div>
            `;
        }).join('');
        
        // Adicionar event listeners
        document.querySelectorAll('.produto-card').forEach(card => {
            const produtoId = card.dataset.produtoId;
            if (produtoId) {
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('🖱️ Clique no produto:', produtoId);
                    this.adicionarAoCarrinho(parseInt(produtoId));
                });
                // Efeito hover
                card.addEventListener('mouseenter', () => {
                    if ((this.produtos.find(p => p.id == produtoId)?.quantidade || 0) > 0) {
                        card.style.transform = 'scale(1.02)';
                        card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = '';
                    card.style.boxShadow = '';
                });
            }
        });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    
    async buscarProdutos(termo) {
        try {
            const data = await API.listarProdutos({ busca: termo, limit: 100 });
            this.renderizarProdutos(data.produtos || []);
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
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
            App.showNotification(`Produto ID ${produtoId} não encontrado!`, 'danger');
            return;
        }
        
        console.log('✅ Produto encontrado:', produto.nome);
        
        if ((produto.quantidade || 0) <= 0) {
            App.showNotification(`❌ Produto "${produto.nome}" sem estoque!`, 'warning');
            return;
        }
        
        if (!produto.preco_venda || produto.preco_venda <= 0) {
            App.showNotification(`❌ Produto "${produto.nome}" sem preço de venda!`, 'danger');
            return;
        }
        
        const isShiftClick = window.event && window.event.shiftKey;
        
        if (isShiftClick) {
            const quantidade = prompt(`Quantidade de ${produto.nome}:`, '1');
            if (quantidade) {
                const qtd = parseInt(quantidade);
                if (!isNaN(qtd) && qtd > 0) this.adicionarMultiplo(produto, qtd);
            }
            return;
        }
        
        const itemExistente = this.carrinho.find(item => item.produto_id === produtoId);
        
        if (itemExistente) {
            if (itemExistente.quantidade >= (produto.quantidade || 0)) {
                App.showNotification('Quantidade máxima em estoque!', 'warning');
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
        
        // Efeito visual
        const card = document.querySelector(`.produto-card[data-produto-id="${produtoId}"]`);
        if (card) {
            card.style.transform = 'scale(0.98)';
            setTimeout(() => card.style.transform = '', 150);
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
            App.showNotification('Quantidade superior ao estoque!', 'warning');
            return;
        }
        
        item.quantidade = quantidade;
        this.atualizarCarrinho();
    },
    
    calcularTotais() {
        let total = 0, lucro = 0;
        this.carrinho.forEach(item => {
            total += (item.preco || 0) * item.quantidade;
            lucro += ((item.preco || 0) - (item.preco_custo || 0)) * item.quantidade;
        });
        return { total, lucro };
    },
    
    atualizarCarrinho() {
        const container = document.getElementById('carrinhoItens');
        const totalElement = document.getElementById('carrinhoTotal');
        const lucroElement = document.getElementById('carrinhoLucro');
        
        if (!container) return;
        
        const { total, lucro } = this.calcularTotais();
        
        if (this.carrinho.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 30px;"><div style="font-size: 48px;">🛒</div><h3>Carrinho vazio</h3><p style="color: var(--text-muted);">Clique nos produtos para adicionar</p><p style="color: var(--text-muted); font-size: 12px;">💡 Dica: Shift + clique para adicionar múltiplos</p></div>`;
        } else {
            container.innerHTML = this.carrinho.map((item, index) => `
                <div style="background: var(--bg-tertiary); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong>${this.escapeHtml(item.nome)}</strong>
                        <span>${UI.formatCurrency((item.preco || 0) * item.quantidade)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <button onclick="Vendas.atualizarQuantidade(${index}, ${item.quantidade - 1})" 
                                    style="width: 28px; height: 28px; border-radius: 6px; border: none; background: var(--bg-secondary); cursor: pointer;"
                                    ${item.quantidade <= 1 ? 'disabled' : ''}>−</button>
                            <input type="number" value="${item.quantidade}" min="1" max="${item.estoque || 999}" 
                                   onchange="Vendas.atualizarQuantidade(${index}, this.value)"
                                   style="width: 50px; text-align: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 5px;">
                            <button onclick="Vendas.atualizarQuantidade(${index}, ${item.quantidade + 1})"
                                    style="width: 28px; height: 28px; border-radius: 6px; border: none; background: var(--bg-secondary); cursor: pointer;"
                                    ${item.quantidade >= (item.estoque || 999) ? 'disabled' : ''}>+</button>
                        </div>
                        <button onclick="Vendas.removerDoCarrinho(${index})" 
                                style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 5px 12px; cursor: pointer;">Remover</button>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">Unitário: ${UI.formatCurrency(item.preco)}</div>
                </div>
            `).join('');
        }
        
        if (totalElement) totalElement.textContent = UI.formatCurrency(total);
        if (lucroElement) {
            if (Auth.isAdmin()) {
                lucroElement.textContent = UI.formatCurrency(lucro);
                lucroElement.parentElement.style.display = 'flex';
            } else {
                lucroElement.parentElement.style.display = 'none';
            }
        }
    },
    
    async finalizarVenda() {
        const formaPagamento = document.getElementById('formaPagamento')?.value;
        
        if (this.carrinho.length === 0) {
            App.showNotification('Adicione itens ao carrinho!', 'warning');
            return;
        }
        
        if (!formaPagamento) {
            App.showNotification('Selecione a forma de pagamento!', 'warning');
            return;
        }
        
        const { total } = this.calcularTotais();
        
        if (!confirm(`Confirmar venda no valor de ${UI.formatCurrency(total)}?`)) return;
        
        try {
            UI.showLoading();
            
            const venda = {
                itens: this.carrinho.map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade })),
                forma_pagamento: formaPagamento,
                observacao: ''
            };
            
            const result = await API.criarVenda(venda);
            
            App.showNotification(`✅ Venda finalizada! Total: ${UI.formatCurrency(result.total)}`, 'success');
            
            this.carrinho = [];
            this.atualizarCarrinho();
            await this.carregarProdutos();
            
            const pagamentoSelect = document.getElementById('formaPagamento');
            if (pagamentoSelect) pagamentoSelect.value = '';
            this.formaPagamento = '';
            
        } catch (error) {
            if (error.message.includes('Caixa fechado')) {
                App.showNotification('❌ Caixa fechado! Não é possível realizar vendas.', 'danger');
            } else {
                App.showNotification('Erro ao finalizar venda: ' + error.message, 'danger');
            }
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE HISTÓRICO DE VENDAS
// ============================================
const HistoricoVendas = {
    vendas: [],
    paginaAtual: 1,
    totalPaginas: 1,
    filtros: { dataInicio: '', dataFim: '', busca: '' },
    
    async init() {
        console.log('📜 Inicializando histórico de vendas...');
        await Auth.checkAuth();
        this.setupEventListeners();
        await this.carregar();
        console.log('✅ Histórico inicializado');
    },
    
    setupEventListeners() {
        const btnBuscar = document.getElementById('btnBuscar');
        if (btnBuscar) btnBuscar.addEventListener('click', () => this.carregar());
        
        const btnLimpar = document.getElementById('btnLimparFiltros');
        if (btnLimpar) btnLimpar.addEventListener('click', () => this.limparFiltros());
        
        const buscaInput = document.getElementById('buscaVenda');
        if (buscaInput) buscaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.carregar();
        });
    },
    
    limparFiltros() {
        document.getElementById('dataInicio').value = '';
        document.getElementById('dataFim').value = '';
        document.getElementById('buscaVenda').value = '';
        this.filtros = { dataInicio: '', dataFim: '', busca: '' };
        this.paginaAtual = 1;
        this.carregar();
    },
    
    async carregar() {
        try {
            UI.showLoading();
            
            const params = { page: this.paginaAtual, limit: 20 };
            
            const dataInicio = document.getElementById('dataInicio')?.value;
            const dataFim = document.getElementById('dataFim')?.value;
            const busca = document.getElementById('buscaVenda')?.value;
            
            if (dataInicio) params.data_inicio = dataInicio;
            if (dataFim) params.data_fim = dataFim;
            if (busca) params.busca = busca;
            
            const response = await API.listarVendas(params);
            this.vendas = response.vendas || [];
            this.totalPaginas = response.totalPages || 1;
            
            this.renderizar();
            this.renderizarPaginacao();
            this.atualizarResumo();
            
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            App.showNotification('Erro ao carregar histórico', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizar() {
        const tbody = document.getElementById('historicoVendasTable');
        if (!tbody) return;
        
        if (this.vendas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 50px;"><div style="font-size: 48px;">📭</div><h3>Nenhuma venda encontrada</h3><p style="color: var(--text-muted);">Ajuste os filtros ou realize novas vendas</p></td></tr>`;
            return;
        }
        
        tbody.innerHTML = this.vendas.map(v => `
            <tr>
                <td>#${v.id}</td>
                <td>${UI.formatDateTime(v.data_venda)}</td>
                <td>${v.cliente_nome || 'Consumidor'}</td>
                <td>${v.itens?.length || 0} item(ns)</td>
                <td>${UI.formatCurrency(v.total)}</td>
                <td><span class="badge ${v.status === 'cancelada' ? 'badge-danger' : 'badge-success'}">${v.status || 'concluída'}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="HistoricoVendas.verDetalhes(${v.id})">Ver</button>
                    ${v.status !== 'cancelada' ? `<button class="btn btn-danger btn-sm" onclick="HistoricoVendas.cancelar(${v.id})">Cancelar</button>` : ''}
                </td>
            </tr>
        `).join('');
    },
    
    renderizarPaginacao() {
        const container = document.getElementById('paginacaoHistorico');
        if (!container || this.totalPaginas <= 1) { if(container) container.innerHTML = ''; return; }
        
        let html = `<button onclick="HistoricoVendas.irParaPagina(${this.paginaAtual - 1})" ${this.paginaAtual === 1 ? 'disabled' : ''}>◀</button>`;
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (i === 1 || i === this.totalPaginas || (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)) {
                html += `<button class="${i === this.paginaAtual ? 'active' : ''}" onclick="HistoricoVendas.irParaPagina(${i})">${i}</button>`;
            } else if (i === this.paginaAtual - 3 || i === this.paginaAtual + 3) {
                html += `<button disabled>...</button>`;
            }
        }
        html += `<button onclick="HistoricoVendas.irParaPagina(${this.paginaAtual + 1})" ${this.paginaAtual === this.totalPaginas ? 'disabled' : ''}>▶</button>`;
        container.innerHTML = html;
    },
    
    irParaPagina(pagina) {
        if (pagina < 1 || pagina > this.totalPaginas) return;
        this.paginaAtual = pagina;
        this.carregar();
    },
    
    atualizarResumo() {
        const totalVendas = this.vendas.reduce((acc, v) => acc + (v.total || 0), 0);
        const totalLucro = this.vendas.reduce((acc, v) => acc + (v.lucro || 0), 0);
        
        const totalElement = document.getElementById('totalVendasPeriodo');
        const lucroElement = document.getElementById('totalLucroPeriodo');
        
        if (totalElement) totalElement.textContent = UI.formatCurrency(totalVendas);
        if (lucroElement && Auth.isAdmin()) lucroElement.textContent = UI.formatCurrency(totalLucro);
    },
    
    async verDetalhes(id) {
        try {
            UI.showLoading();
            const venda = await API.getVenda(id);
            
            const modal = document.getElementById('modalDetalhesVenda');
            const content = document.getElementById('detalhesVendaContent');
            
            if (!modal || !content) return;
            
            content.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <p><strong>ID:</strong> #${venda.id}</p>
                    <p><strong>Data:</strong> ${UI.formatDateTime(venda.data_venda)}</p>
                    <p><strong>Forma de Pagamento:</strong> ${venda.forma_pagamento || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="badge ${venda.status === 'cancelada' ? 'badge-danger' : 'badge-success'}">${venda.status || 'concluída'}</span></p>
                    <p><strong>Cliente:</strong> ${venda.cliente_nome || 'Consumidor'}</p>
                    ${Auth.isAdmin() ? `<p><strong>Lucro:</strong> ${UI.formatCurrency(venda.lucro || 0)}</p>` : ''}
                </div>
                <h4>Itens da Venda</h4>
                <table class="table" style="width: 100%;">
                    <thead><tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead>
                    <tbody>
                        ${(venda.itens || []).map(item => `
                            <tr>
                                <td>${item.produto_nome || item.nome}</td>
                                <td>${item.quantidade}</td>
                                <td>${UI.formatCurrency(item.preco_unitario)}</td>
                                <td>${UI.formatCurrency(item.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>${UI.formatCurrency(venda.total)}</strong></td></tr></tfoot>
                </table>
            `;
            
            modal.style.display = 'block';
            
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
            
            window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
            
        } catch (error) {
            App.showNotification('Erro ao carregar detalhes da venda', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async cancelar(id) {
        if (!confirm('⚠️ Tem certeza que deseja cancelar esta venda?')) return;
        
        try {
            UI.showLoading();
            await API.cancelarVenda(id);
            App.showNotification('✅ Venda cancelada com sucesso!', 'success');
            await this.carregar();
        } catch (error) {
            App.showNotification(error.message, 'danger');
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
        if (!Auth.isAdmin()) { window.location.href = '/dashboard.html'; return; }
        await this.carregarCategorias();
        await this.carregarTipos();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        const filtro = document.getElementById('filtroTipoCategoria');
        if (filtro) filtro.addEventListener('change', () => this.carregarTipos());
        
        const formCategoria = document.getElementById('formCategoria');
        if (formCategoria) formCategoria.addEventListener('submit', (e) => { e.preventDefault(); this.salvarCategoria(); });
        
        const formTipo = document.getElementById('formTipo');
        if (formTipo) formTipo.addEventListener('submit', (e) => { e.preventDefault(); this.salvarTipo(); });
        
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'));
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
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 50px;"><div style="font-size: 48px;">🏷️</div><h3>Nenhuma categoria cadastrada</h3><button class="btn btn-primary" onclick="CategoriasManager.abrirModalCategoria()">Criar primeira categoria</button></td></tr>`;
            return;
        }
        
        tbody.innerHTML = categorias.map(c => `
            <tr>
                <td><span style="display: inline-block; width: 20px; height: 20px; background-color: ${c.cor || '#c4a747'}; border-radius: 4px; margin-right: 10px; vertical-align: middle;"></span>${c.nome || 'Sem nome'}</td>
                <td><span class="badge ${c.tipo === 'bebida' ? 'badge-info' : c.tipo === 'come' ? 'badge-warning' : 'badge-secondary'}">${c.tipo || 'outro'}</span></td>
                <td>${c.total_produtos || 0}</td>
                <td><button class="btn btn-primary btn-sm" onclick="CategoriasManager.editarCategoria(${c.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="CategoriasManager.excluirCategoria(${c.id})" ${c.total_produtos > 0 ? 'disabled' : ''}>🗑️</button></td>
            </tr>
        `).join('');
    },
    
    carregarSelectCategorias(categorias) {
        const select = document.getElementById('tipoCategoria');
        const filtro = document.getElementById('filtroTipoCategoria');
        const options = categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        if (select) select.innerHTML = '<option value="">Selecione uma categoria</option>' + options;
        if (filtro) filtro.innerHTML = '<option value="todas">Todas as categorias</option>' + options;
    },
    
    async carregarTipos() {
        try {
            const filtro = document.getElementById('filtroTipoCategoria')?.value;
            let tipos;
            if (filtro && filtro !== 'todas') tipos = await API.listarTiposPorCategoria(filtro);
            else tipos = await API.listarTipos();
            this.renderizarTipos(tipos || []);
        } catch (error) {
            console.error('Erro ao carregar tipos:', error);
        }
    },
    
    renderizarTipos(tipos) {
        const tbody = document.getElementById('tabelaTipos');
        if (!tbody) return;
        
        if (tipos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px;">Nenhum tipo cadastrado</td></tr>`;
            return;
        }
        
        tbody.innerHTML = tipos.map(t => `
            <tr>
                <td>${t.nome || '-'}</td>
                <td>${t.categoria_nome || '-'}</td>
                <td>${t.total_produtos || 0}</td>
                <td><button class="btn btn-primary btn-sm" onclick="CategoriasManager.editarTipo(${t.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="CategoriasManager.excluirTipo(${t.id})" ${t.total_produtos > 0 ? 'disabled' : ''}>🗑️</button></td>
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
            document.getElementById('formCategoria')?.reset();
            if(document.getElementById('categoriaCor')) document.getElementById('categoriaCor').value = '#c4a747';
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
                const novoTipo = prompt('Digite o tipo da categoria:');
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
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async editarCategoria(id) {
        try {
            const categorias = await API.listarCategorias();
            const categoria = categorias.find(c => c.id === id);
            if (categoria) this.abrirModalCategoria(categoria);
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
            document.getElementById('formTipo')?.reset();
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
            if (tipo) this.abrirModalTipo(tipo);
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
// MÓDULO DE RELATÓRIOS
// ============================================
const Relatorios = {
    charts: {},
    
    async init() {
        await Auth.checkAuth();
        if (!Auth.isAdmin()) { window.location.href = '/dashboard.html'; return; }
        this.setupEventListeners();
        await this.carregar();
    },
    
    setupEventListeners() {
        const periodoSelect = document.getElementById('periodoRelatorio');
        if (periodoSelect) periodoSelect.addEventListener('change', (e) => this.carregar(e.target.value));
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
        if (hojeEl) hojeEl.textContent = UI.formatCurrency(lucroDiario?.total_lucro || 0);
        if (mesEl) mesEl.textContent = UI.formatCurrency(lucroMensal?.total_lucro || 0);
    },
    
    atualizarTabela(vendas) {
        const tbody = document.getElementById('tabelaVendasPeriodo');
        if (!tbody) return;
        if (!vendas?.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">Nenhuma venda encontrada</td></tr>'; return; }
        
        tbody.innerHTML = vendas.map(v => `
            <tr><td>${v.periodo || '-'}</td><td>${v.quantidade_vendas || 0}</td><td>${UI.formatCurrency(v.total_vendas || 0)}</td><td>${UI.formatCurrency(v.total_lucro || 0)}</td></tr>
        `).join('');
    },
    
    atualizarGrafico(vendas, periodo) {
        const ctx = document.getElementById('graficoRelatorio')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.relatorio) this.charts.relatorio.destroy();
        if (!vendas?.length) return;
        
        this.charts.relatorio = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: vendas.map(v => v.periodo || ''),
                datasets: [
                    { label: 'Vendas (R$)', data: vendas.map(v => v.total_vendas || 0), backgroundColor: '#c4a747', borderRadius: 4 },
                    { label: 'Lucro (R$)', data: vendas.map(v => v.total_lucro || 0), backgroundColor: '#b91c3c', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    y: { grid: { color: '#2d3540' }, ticks: { color: '#94a3b8', callback: (v) => 'R$ ' + v } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
};

// Alias para compatibilidade
const RelatoriosExternos = Relatorios;

// ============================================
// MÓDULO DE GASTOS (APENAS ADMIN)
// ============================================
const Gastos = {
    gastos: [],
    paginaAtual: 1,
    totalPaginas: 1,
    filtros: { dataInicio: '', dataFim: '', categoria: '' },
    gastoEditando: null,
    
    async init() {
        await Auth.checkAuth();
        if (!Auth.isAdmin()) { window.location.href = '/dashboard.html'; return; }
        this.setupEventListeners();
        await this.carregar();
    },
    
    setupEventListeners() {
        const btnBuscar = document.getElementById('btnBuscarGastos');
        if (btnBuscar) btnBuscar.addEventListener('click', () => this.carregar());
        
        const btnNovo = document.getElementById('btnNovoGasto');
        if (btnNovo) btnNovo.addEventListener('click', () => this.abrirModal());
        
        const formGasto = document.getElementById('formGasto');
        if (formGasto) formGasto.addEventListener('submit', (e) => { e.preventDefault(); this.salvar(); });
        
        const closeBtn = document.querySelector('#modalGasto .close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.fecharModal());
    },
    
    async carregar() {
        try {
            UI.showLoading();
            const params = { page: this.paginaAtual, limit: 20 };
            
            const dataInicio = document.getElementById('gastoDataInicio')?.value;
            const dataFim = document.getElementById('gastoDataFim')?.value;
            const categoria = document.getElementById('gastoCategoria')?.value;
            
            if (dataInicio) params.data_inicio = dataInicio;
            if (dataFim) params.data_fim = dataFim;
            if (categoria) params.categoria = categoria;
            
            const response = await API.listarGastos(params);
            this.gastos = response.gastos || [];
            this.totalPaginas = response.totalPages || 1;
            
            this.renderizar();
            this.renderizarPaginacao();
            this.atualizarResumo();
        } catch (error) {
            console.error('Erro ao carregar gastos:', error);
            App.showNotification('Erro ao carregar gastos', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizar() {
        const tbody = document.getElementById('gastosTable');
        if (!tbody) return;
        
        if (this.gastos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 50px;"><div style="font-size: 48px;">💰</div><h3>Nenhum gasto registrado</h3><button class="btn btn-primary" onclick="Gastos.abrirModal()">Registrar primeiro gasto</button></td></tr>`;
            return;
        }
        
        tbody.innerHTML = this.gastos.map(g => `
            <tr>
                <td>${UI.formatDateTime(g.data_gasto)}</td>
                <td>${g.descricao || '-'}</td>
                <td>${g.categoria || 'Outros'}</td>
                <td>${UI.formatCurrency(g.valor)}</td>
                <td><span class="badge ${g.status === 'pago' ? 'badge-success' : 'badge-warning'}">${g.status || 'pendente'}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Gastos.editar(${g.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="Gastos.excluir(${g.id})">🗑️</button>
                 </td>
            </tr>
        `).join('');
    },
    
    renderizarPaginacao() {
        const container = document.getElementById('paginacaoGastos');
        if (!container || this.totalPaginas <= 1) { if(container) container.innerHTML = ''; return; }
        
        let html = `<button onclick="Gastos.irParaPagina(${this.paginaAtual - 1})" ${this.paginaAtual === 1 ? 'disabled' : ''}>◀</button>`;
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (i === 1 || i === this.totalPaginas || (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)) {
                html += `<button class="${i === this.paginaAtual ? 'active' : ''}" onclick="Gastos.irParaPagina(${i})">${i}</button>`;
            } else if (i === this.paginaAtual - 3 || i === this.paginaAtual + 3) {
                html += `<button disabled>...</button>`;
            }
        }
        html += `<button onclick="Gastos.irParaPagina(${this.paginaAtual + 1})" ${this.paginaAtual === this.totalPaginas ? 'disabled' : ''}>▶</button>`;
        container.innerHTML = html;
    },
    
    irParaPagina(pagina) {
        if (pagina < 1 || pagina > this.totalPaginas) return;
        this.paginaAtual = pagina;
        this.carregar();
    },
    
    atualizarResumo() {
        const totalGastos = this.gastos.reduce((acc, g) => acc + (g.valor || 0), 0);
        const totalElement = document.getElementById('totalGastosPeriodo');
        if (totalElement) totalElement.textContent = UI.formatCurrency(totalGastos);
    },
    
    abrirModal(gasto = null) {
        this.gastoEditando = gasto;
        const modal = document.getElementById('modalGasto');
        const titulo = document.getElementById('modalGastoTitulo');
        if (!modal) return;
        titulo.textContent = gasto ? '✏️ Editar Gasto' : '➕ Novo Gasto';
        
        if (gasto) {
            document.getElementById('gastoId').value = gasto.id || '';
            document.getElementById('gastoDescricao').value = gasto.descricao || '';
            document.getElementById('gastoValor').value = gasto.valor || '';
            document.getElementById('gastoData').value = gasto.data_gasto?.split('T')[0] || '';
            document.getElementById('gastoCategoriaModal').value = gasto.categoria || '';
            document.getElementById('gastoStatus').value = gasto.status || 'pendente';
        } else {
            document.getElementById('formGasto')?.reset();
            document.getElementById('gastoData').value = new Date().toISOString().split('T')[0];
        }
        modal.style.display = 'block';
    },
    
    fecharModal() {
        const modal = document.getElementById('modalGasto');
        if (modal) { modal.style.display = 'none'; this.gastoEditando = null; }
    },
    
    async salvar() {
        try {
            UI.showLoading();
            const gasto = {
                descricao: document.getElementById('gastoDescricao')?.value,
                valor: parseFloat(document.getElementById('gastoValor')?.value) || 0,
                data_gasto: document.getElementById('gastoData')?.value,
                categoria: document.getElementById('gastoCategoriaModal')?.value,
                status: document.getElementById('gastoStatus')?.value
            };
            
            if (!gasto.descricao) throw new Error('Descrição é obrigatória');
            if (!gasto.valor || gasto.valor <= 0) throw new Error('Valor inválido');
            if (!gasto.data_gasto) throw new Error('Data é obrigatória');
            
            if (this.gastoEditando) {
                await API.atualizarGasto(this.gastoEditando.id, gasto);
                App.showNotification('✅ Gasto atualizado!', 'success');
            } else {
                await API.criarGasto(gasto);
                App.showNotification('✅ Gasto registrado!', 'success');
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
        const gasto = this.gastos.find(g => g.id === id);
        if (gasto) this.abrirModal(gasto);
    },
    
    async excluir(id) {
        if (!confirm('⚠️ Tem certeza que deseja excluir este gasto?')) return;
        try {
            UI.showLoading();
            await API.excluirGasto(id);
            App.showNotification('✅ Gasto excluído!', 'success');
            await this.carregar();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE FINANCEIRO (APENAS ADMIN)
// ============================================
const Financeiro = {
    async init() {
        await Auth.checkAuth();
        if (!Auth.isAdmin()) { window.location.href = '/dashboard.html'; return; }
        await this.carregar();
    },
    
    async carregar() {
        try {
            UI.showLoading();
            
            const hoje = new Date().toISOString().split('T')[0];
            const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            
            const [vendasMes, vendasHoje, gastosMes, gastosHoje] = await Promise.all([
                API.listarVendas({ data_inicio: primeiroDiaMes, limite: 1000 }),
                API.listarVendas({ data_inicio: hoje, data_fim: hoje, limite: 100 }),
                API.listarGastos({ data_inicio: primeiroDiaMes, limite: 1000 }),
                API.listarGastos({ data_inicio: hoje, data_fim: hoje, limite: 100 })
            ]);
            
            const totalVendasMes = (vendasMes.vendas || []).reduce((acc, v) => acc + (v.total || 0), 0);
            const totalVendasHoje = (vendasHoje.vendas || []).reduce((acc, v) => acc + (v.total || 0), 0);
            const totalGastosMes = (gastosMes.gastos || []).reduce((acc, g) => acc + (g.valor || 0), 0);
            const totalGastosHoje = (gastosHoje.gastos || []).reduce((acc, g) => acc + (g.valor || 0), 0);
            
            const lucroMes = totalVendasMes - totalGastosMes;
            const lucroHoje = totalVendasHoje - totalGastosHoje;
            
            const elementos = {
                vendasHoje: document.getElementById('finVendasHoje'),
                gastosHoje: document.getElementById('finGastosHoje'),
                lucroHoje: document.getElementById('finLucroHoje'),
                vendasMes: document.getElementById('finVendasMes'),
                gastosMes: document.getElementById('finGastosMes'),
                lucroMes: document.getElementById('finLucroMes')
            };
            
            if (elementos.vendasHoje) elementos.vendasHoje.textContent = UI.formatCurrency(totalVendasHoje);
            if (elementos.gastosHoje) elementos.gastosHoje.textContent = UI.formatCurrency(totalGastosHoje);
            if (elementos.lucroHoje) {
                elementos.lucroHoje.textContent = UI.formatCurrency(lucroHoje);
                elementos.lucroHoje.style.color = lucroHoje >= 0 ? '#10b981' : '#ef4444';
            }
            if (elementos.vendasMes) elementos.vendasMes.textContent = UI.formatCurrency(totalVendasMes);
            if (elementos.gastosMes) elementos.gastosMes.textContent = UI.formatCurrency(totalGastosMes);
            if (elementos.lucroMes) {
                elementos.lucroMes.textContent = UI.formatCurrency(lucroMes);
                elementos.lucroMes.style.color = lucroMes >= 0 ? '#10b981' : '#ef4444';
            }
            
        } catch (error) {
            console.error('Erro ao carregar financeiro:', error);
            App.showNotification('Erro ao carregar dados financeiros', 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE CAIXA
// ============================================
const Caixa = {
    status: null,
    refreshInterval: null,
    
    async init() {
        await Auth.checkAuth();
        this.setupEventListeners();
        await this.carregarStatus();
        await this.carregarMovimentacoes();
        this.configurarAtualizacao();
    },
    
    setupEventListeners() {
        const btnAbrir = document.getElementById('btnAbrirCaixa');
        if (btnAbrir) btnAbrir.addEventListener('click', () => this.abrirCaixa());
        
        const btnFechar = document.getElementById('btnFecharCaixa');
        if (btnFechar) btnFechar.addEventListener('click', () => this.fecharCaixa());
        
        const btnSangria = document.getElementById('btnSangria');
        if (btnSangria) btnSangria.addEventListener('click', () => this.registrarSangria());
        
        const btnSuprimento = document.getElementById('btnSuprimento');
        if (btnSuprimento) btnSuprimento.addEventListener('click', () => this.registrarSuprimento());
    },
    
    async carregarStatus() {
        try {
            const status = await API.statusCaixa();
            this.status = status;
            this.atualizarUI();
        } catch (error) {
            console.error('Erro ao carregar status do caixa:', error);
        }
    },
    
    atualizarUI() {
        const statusDiv = document.getElementById('caixaStatus');
        const infoDiv = document.getElementById('caixaInfo');
        const botoes = {
            abrir: document.getElementById('btnAbrirCaixa'),
            fechar: document.getElementById('btnFecharCaixa'),
            sangria: document.getElementById('btnSangria'),
            suprimento: document.getElementById('btnSuprimento')
        };
        
        if (this.status?.aberto) {
            if (statusDiv) {
                statusDiv.innerHTML = '<span class="badge badge-success">🟢 CAIXA ABERTO</span>';
                statusDiv.style.color = '#10b981';
            }
            if (infoDiv && this.status.caixa_atual) {
                infoDiv.innerHTML = `
                    <p><strong>Aberto por:</strong> ${this.status.caixa_atual.usuario_nome || this.status.caixa_atual.usuario_id}</p>
                    <p><strong>Aberto em:</strong> ${UI.formatDateTime(this.status.caixa_atual.data_abertura)}</p>
                    <p><strong>Saldo inicial:</strong> ${UI.formatCurrency(this.status.caixa_atual.saldo_inicial)}</p>
                    <p><strong>Saldo atual:</strong> ${UI.formatCurrency(this.status.caixa_atual.saldo_atual)}</p>
                `;
            }
            if (botoes.abrir) botoes.abrir.style.display = 'none';
            if (botoes.fechar) botoes.fechar.style.display = 'inline-block';
            if (botoes.sangria) botoes.sangria.style.display = 'inline-block';
            if (botoes.suprimento) botoes.suprimento.style.display = 'inline-block';
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = '<span class="badge badge-danger">🔴 CAIXA FECHADO</span>';
                statusDiv.style.color = '#ef4444';
            }
            if (infoDiv) infoDiv.innerHTML = '<p>Caixa está fechado. Abra o caixa para começar a vender.</p>';
            if (botoes.abrir) botoes.abrir.style.display = 'inline-block';
            if (botoes.fechar) botoes.fechar.style.display = 'none';
            if (botoes.sangria) botoes.sangria.style.display = 'none';
            if (botoes.suprimento) botoes.suprimento.style.display = 'none';
        }
    },
    
    async abrirCaixa() {
        const saldoInicial = prompt('Digite o saldo inicial do caixa:', '0');
        if (saldoInicial === null) return;
        
        const valor = parseFloat(saldoInicial);
        if (isNaN(valor)) {
            App.showNotification('Valor inválido', 'danger');
            return;
        }
        
        try {
            UI.showLoading();
            await API.abrirCaixa({ saldo_inicial: valor });
            App.showNotification('✅ Caixa aberto com sucesso!', 'success');
            await this.carregarStatus();
            await this.carregarMovimentacoes();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async fecharCaixa() {
        if (!confirm('⚠️ Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.')) return;
        
        try {
            UI.showLoading();
            await API.fecharCaixa({});
            App.showNotification('✅ Caixa fechado com sucesso!', 'success');
            await this.carregarStatus();
            await this.carregarMovimentacoes();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async registrarSangria() {
        const valor = prompt('Digite o valor da sangria (retirada):', '0');
        if (valor === null) return;
        
        const valorNum = parseFloat(valor);
        if (isNaN(valorNum) || valorNum <= 0) {
            App.showNotification('Valor inválido', 'danger');
            return;
        }
        
        const motivo = prompt('Motivo da sangria:', '');
        
        try {
            UI.showLoading();
            await API.registrarMovimentacao({
                tipo: 'sangria',
                valor: valorNum,
                motivo: motivo || 'Sangria manual'
            });
            App.showNotification('✅ Sangria registrada!', 'success');
            await this.carregarStatus();
            await this.carregarMovimentacoes();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async registrarSuprimento() {
        const valor = prompt('Digite o valor do suprimento (adição):', '0');
        if (valor === null) return;
        
        const valorNum = parseFloat(valor);
        if (isNaN(valorNum) || valorNum <= 0) {
            App.showNotification('Valor inválido', 'danger');
            return;
        }
        
        const motivo = prompt('Motivo do suprimento:', '');
        
        try {
            UI.showLoading();
            await API.registrarMovimentacao({
                tipo: 'suprimento',
                valor: valorNum,
                motivo: motivo || 'Suprimento manual'
            });
            App.showNotification('✅ Suprimento registrado!', 'success');
            await this.carregarStatus();
            await this.carregarMovimentacoes();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async carregarMovimentacoes() {
        try {
            const movimentacoes = await API.getMovimentacoes({ limite: 50 });
            this.renderizarMovimentacoes(movimentacoes.movimentacoes || []);
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
        }
    },
    
    renderizarMovimentacoes(movimentacoes) {
        const tbody = document.getElementById('movimentacoesTable');
        if (!tbody) return;
        
        if (movimentacoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px;">Nenhuma movimentação registrada</td></tr>';
            return;
        }
        
        tbody.innerHTML = movimentacoes.map(m => `
            <tr>
                <td>${UI.formatDateTime(m.data_movimento)}</td>
                <td><span class="badge ${m.tipo === 'venda' ? 'badge-success' : m.tipo === 'sangria' ? 'badge-danger' : 'badge-info'}">${m.tipo}</span></td>
                <td>${m.descricao || '-'}</td>
                <td>${m.tipo === 'sangria' ? '-' : '+'} ${UI.formatCurrency(Math.abs(m.valor))}</td>
                <td>${UI.formatCurrency(m.saldo_apos)}</td>
            </tr>
        `).join('');
    },
    
    configurarAtualizacao() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.carregarStatus();
                this.carregarMovimentacoes();
            }
        }, 30000);
    }
};

// ============================================
// DASHBOARD FALLBACK
// ============================================
const Dashboard = {
    async init() {
        const user = Auth.getCurrentUser();
        if (user && user.role === 'admin') {
            if (window.DashboardAdmin) await DashboardAdmin.init();
            else window.location.href = '/vendas.html';
        } else {
            window.location.href = '/vendas.html';
        }
    }
};

// ============================================
// UTILITÁRIOS
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// INICIALIZAÇÃO
// ============================================
let appInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (appInitialized) return;
    appInitialized = true;
    App.init();
});

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
window.API = API;
window.Dashboard = Dashboard;
window.DashboardAdmin = DashboardAdmin;
window.Produtos = Produtos;
window.Vendas = Vendas;
window.HistoricoVendas = HistoricoVendas;
window.CategoriasManager = CategoriasManager;
window.Relatorios = Relatorios;
window.RelatoriosExternos = RelatoriosExternos;
window.Gastos = Gastos;
window.Financeiro = Financeiro;
window.Caixa = Caixa;

console.log('🍷 PodPá v2.1.0 - Todos os módulos carregados!');

} // Fim do if (typeof window.App === 'undefined')