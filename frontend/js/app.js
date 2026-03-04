// ============================================
// ADEGA SYSTEM - SISTEMA DE GESTÃO PROFISSIONAL
// VERSÃO: 2.0.0
// ============================================

// Garantir que não haja duplicação de declarações
if (typeof window.App === 'undefined') {

// ============================================
// CLASSE PRINCIPAL APP
// ============================================
class App {
    constructor() {
        this.version = '2.0.0';
        this.modules = {};
        this.currentUser = null;
        this.config = {
            animations: true,
            notifications: true,
            autoSave: true
        };
    }

    static init() {
        console.log(`🍷 Adega System v${this.version} inicializado`);
        
        // Inicializar módulos baseados na página atual
        this.setupEventListeners();
        this.checkCurrentPage();
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

        // Configurar logout em todas as páginas
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }
    }

    static checkCurrentPage() {
        const path = window.location.pathname;
        
        if (path.includes('dashboard.html')) {
            Dashboard.init();
        } else if (path.includes('produtos.html')) {
            Produtos.init();
        } else if (path.includes('vendas.html')) {
            Vendas.init();
        } else if (path.includes('categorias.html')) {
            CategoriasManager.init();
        } else if (path.includes('relatorios.html')) {
            Relatorios.init();
        }
    }

    static closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    static showNotification(message, type = 'info', duration = 3000) {
        if (!this.config.notifications) return;
        
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
                
                App.showNotification('Login realizado com sucesso!', 'success');
                
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
        
        elements.forEach(el => {
            if (el) {
                el.textContent = user?.nome || user?.username || 'Usuário';
            }
        });
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
            const loader = document.createElement('div');
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
    }
};

// ============================================
// MÓDULO DASHBOARD
// ============================================
const Dashboard = {
    charts: {},
    data: {},
    
    async init() {
        await Auth.checkAuth();
        await this.loadData();
        this.setupCharts();
        this.startAutoRefresh();
    },
    
    async loadData() {
        try {
            UI.showLoading();
            
            const [
                lucroDiario,
                lucroMensal,
                estoqueBaixo,
                vendasPeriodo
            ] = await Promise.all([
                API.lucroDiario(),
                API.lucroMensal(),
                API.estoqueBaixo(),
                API.vendasPorPeriodo('dia')
            ]);
            
            this.data = {
                lucroDiario,
                lucroMensal,
                estoqueBaixo,
                vendasPeriodo
            };
            
            this.updateCards();
            this.updateCharts();
            this.showLowStock();
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            App.showNotification('Erro ao carregar dados do dashboard', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    updateCards() {
        const elements = {
            vendasHoje: document.getElementById('vendasHoje'),
            lucroHoje: document.getElementById('lucroHoje'),
            vendasMes: document.getElementById('vendasMes'),
            estoqueBaixo: document.getElementById('estoqueBaixo')
        };
        
        if (elements.vendasHoje) {
            elements.vendasHoje.textContent = UI.formatCurrency(this.data.lucroDiario?.total_vendas || 0);
        }
        
        if (elements.lucroHoje) {
            elements.lucroHoje.textContent = UI.formatCurrency(this.data.lucroDiario?.total_lucro || 0);
        }
        
        if (elements.vendasMes) {
            elements.vendasMes.textContent = UI.formatCurrency(this.data.lucroMensal?.total_vendas || 0);
        }
        
        if (elements.estoqueBaixo) {
            elements.estoqueBaixo.textContent = this.data.estoqueBaixo?.length || 0;
        }
    },
    
    setupCharts() {
        const ctxVendas = document.getElementById('graficoVendas')?.getContext('2d');
        if (!ctxVendas) return;
        
        if (this.charts.vendas) {
            this.charts.vendas.destroy();
        }
        
        this.charts.vendas = new Chart(ctxVendas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Vendas',
                    data: [],
                    borderColor: '#00c853',
                    backgroundColor: 'rgba(0, 200, 83, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e4e6eb'
                        }
                    }
                },
                scales: {
                    y: {
                        grid: {
                            color: '#2f3742'
                        },
                        ticks: {
                            color: '#b0b3b8',
                            callback: (value) => UI.formatCurrency(value)
                        }
                    },
                    x: {
                        grid: {
                            color: '#2f3742'
                        },
                        ticks: {
                            color: '#b0b3b8'
                        }
                    }
                }
            }
        });
    },
    
    updateCharts() {
        if (this.charts.vendas && this.data.vendasPeriodo && this.data.vendasPeriodo.length > 0) {
            this.charts.vendas.data.labels = this.data.vendasPeriodo.map(d => 
                UI.formatDate(d.periodo)
            );
            this.charts.vendas.data.datasets[0].data = this.data.vendasPeriodo.map(d => 
                d.total_vendas || 0
            );
            this.charts.vendas.update();
        }
    },
    
    showLowStock() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo || this.data.estoqueBaixo.length === 0) {
            container.innerHTML = `
                <div class="alert alert-success">
                    ✅ Todos os produtos estão com estoque adequado
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.map(p => `
            <div class="alert alert-warning" style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${p.nome}</strong>
                        <br>
                        <small>Estoque atual: ${p.quantidade} unidades</small>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="Produtos.abrirModalEstoque(${p.id})">
                        Repor
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    startAutoRefresh() {
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadData();
            }
        }, 300000);
    }
};

// ============================================
// MÓDULO DE PRODUTOS
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
        this.setupEventListeners();
        await this.carregarCategorias();
        await this.carregar();
    },
    
    setupEventListeners() {
        // Botão novo produto
        const btnNovo = document.getElementById('btnNovoProduto');
        if (btnNovo) {
            btnNovo.addEventListener('click', () => {
                this.abrirModal();
            });
        }
        
        // Busca
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
        
        // Filtro categoria
        const filtroCategoria = document.getElementById('filtroCategoria');
        if (filtroCategoria) {
            filtroCategoria.addEventListener('change', (e) => {
                this.filtros.categoria = e.target.value;
                this.paginaAtual = 1;
                this.carregar();
            });
        }
        
        // Formulário
        const formProduto = document.getElementById('formProduto');
        if (formProduto) {
            formProduto.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvar();
            });
        }
        
        // Fechar modal
        const closeBtn = document.querySelector('#modalProduto .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.fecharModal();
            });
        }
    },
    
    async carregarCategorias() {
        try {
            const categorias = await API.listarCategorias();
            
            // Preencher select de filtro
            const filtroSelect = document.getElementById('filtroCategoria');
            if (filtroSelect) {
                filtroSelect.innerHTML = '<option value="todas">Todas categorias</option>' +
                    categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            }
            
            // Preencher select do modal
            const modalSelect = document.getElementById('produtoCategoria');
            if (modalSelect) {
                modalSelect.innerHTML = '<option value="">Selecione uma categoria</option>' +
                    categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
                
                modalSelect.addEventListener('change', () => this.carregarTipos());
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    },
    
    async carregarTipos(categoriaId = null) {
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
                    <td colspan="7" style="text-align: center; padding: 50px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
                        <h3>Nenhum produto encontrado</h3>
                        <p style="color: var(--text-muted); margin-top: 10px;">
                            Clique em "Novo Produto" para começar
                        </p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.produtos.map(p => `
            <tr>
                <td><strong>${p.nome || '-'}</strong></td>
                <td>${p.categoria_nome || '-'}</td>
                <td>${p.tipo_nome || '-'}</td>
                <td>${UI.formatCurrency(p.preco_custo)}</td>
                <td>${UI.formatCurrency(p.preco_venda)}</td>
                <td>
                    <span class="badge ${(p.quantidade || 0) < 5 ? 'badge-warning' : 'badge-success'}">
                        ${p.quantidade || 0}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-primary btn-sm" onclick="Produtos.editar(${p.id})" title="Editar">
                            ✏️
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="Produtos.abrirModalEstoque(${p.id})" title="Ajustar Estoque">
                            📦
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="Produtos.excluir(${p.id})" title="Excluir">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    renderizarPaginacao() {
        const container = document.getElementById('paginacao');
        if (!container) return;
        
        if (this.totalPaginas <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Botão anterior
        html += `<button onclick="Produtos.irParaPagina(${this.paginaAtual - 1})" 
                 ${this.paginaAtual === 1 ? 'disabled' : ''}>◀</button>`;
        
        // Páginas
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (
                i === 1 ||
                i === this.totalPaginas ||
                (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)
            ) {
                html += `<button class="${i === this.paginaAtual ? 'active' : ''}" 
                         onclick="Produtos.irParaPagina(${i})">${i}</button>`;
            } else if (
                i === this.paginaAtual - 3 ||
                i === this.paginaAtual + 3
            ) {
                html += `<button disabled>...</button>`;
            }
        }
        
        // Botão próximo
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
        } else {
            document.getElementById('formProduto').reset();
        }
        
        // Carregar tipos se já tiver categoria selecionada
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
        try {
            UI.showLoading();
            
            const produto = {
                nome: document.getElementById('produtoNome')?.value,
                categoria_id: document.getElementById('produtoCategoria')?.value,
                tipo_id: document.getElementById('produtoTipo')?.value,
                preco_custo: parseFloat(document.getElementById('produtoPrecoCusto')?.value) || 0,
                preco_venda: parseFloat(document.getElementById('produtoPrecoVenda')?.value) || 0,
                quantidade: parseInt(document.getElementById('produtoQuantidade')?.value) || 0
            };
            
            // Validações
            if (!produto.nome) throw new Error('Nome é obrigatório');
            if (!produto.categoria_id) throw new Error('Categoria é obrigatória');
            if (!produto.tipo_id) throw new Error('Tipo é obrigatório');
            if (produto.preco_custo < 0) throw new Error('Preço de custo inválido');
            if (produto.preco_venda < 0) throw new Error('Preço de venda inválido');
            if (produto.preco_venda <= produto.preco_custo) {
                App.showNotification('Atenção: Preço de venda menor ou igual ao custo!', 'warning');
            }
            
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
        const produto = this.produtos.find(p => p.id === id);
        if (produto) {
            this.abrirModal(produto);
        }
    },
    
    abrirModalEstoque(id) {
        const produto = this.produtos.find(p => p.id === id);
        if (!produto) return;
        
        const quantidade = prompt(`Digite a nova quantidade em estoque para ${produto.nome}:`, produto.quantidade);
        
        if (quantidade !== null) {
            this.atualizarEstoque(id, parseInt(quantidade));
        }
    },
    
    async atualizarEstoque(id, quantidade) {
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
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        
        try {
            UI.showLoading();
            await API.excluirProduto(id);
            App.showNotification('Produto excluído com sucesso!', 'success');
            await this.carregar();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE VENDAS
// ============================================
const Vendas = {
    carrinho: [],
    produtos: [],
    formaPagamento: '',
    
    async init() {
        await Auth.checkAuth();
        await this.carregarProdutos();
        this.setupEventListeners();
        this.atualizarCarrinho();
    },
    
    setupEventListeners() {
        // Busca de produtos
        const buscaInput = document.getElementById('buscaProduto');
        if (buscaInput) {
            buscaInput.addEventListener('input', 
                debounce((e) => {
                    this.buscarProdutos(e.target.value);
                }, 500)
            );
        }
        
        // Forma de pagamento
        const pagamentoSelect = document.getElementById('formaPagamento');
        if (pagamentoSelect) {
            pagamentoSelect.addEventListener('change', (e) => {
                this.formaPagamento = e.target.value;
            });
        }
        
        // Finalizar venda
        const btnFinalizar = document.getElementById('btnFinalizarVenda');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', () => {
                this.finalizarVenda();
            });
        }
        
        // Limpar carrinho
        const btnLimpar = document.getElementById('btnLimparCarrinho');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => {
                if (this.carrinho.length > 0 && confirm('Limpar todo o carrinho?')) {
                    this.carrinho = [];
                    this.atualizarCarrinho();
                }
            });
        }
    },
    
    async carregarProdutos() {
        try {
            UI.showLoading();
            const data = await API.listarProdutos({ limit: 100 });
            this.produtos = data.produtos || [];
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
        if (!container) return;
        
        if (produtos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; grid-column: 1/-1;">
                    <div style="font-size: 48px;">🔍</div>
                    <h3>Nenhum produto encontrado</h3>
                </div>
            `;
            return;
        }
        
        container.innerHTML = produtos.map(p => `
            <div class="card produto-card" onclick="Vendas.adicionarAoCarrinho(${p.id})">
                <h4>${p.nome || 'Sem nome'}</h4>
                <div class="categoria">
                    ${p.categoria_nome || 'Sem categoria'} • ${p.tipo_nome || 'Sem tipo'}
                </div>
                <div class="preco">${UI.formatCurrency(p.preco_venda)}</div>
                <div class="estoque ${(p.quantidade || 0) < 5 ? 'estoque-baixo' : ''}">
                    📦 Estoque: ${p.quantidade || 0}
                </div>
                ${(p.quantidade || 0) > 0 ? 
                    '<div class="badge badge-success" style="position: absolute; top: 10px; right: 10px;">Disponível</div>' :
                    '<div class="badge badge-danger" style="position: absolute; top: 10px; right: 10px;">Indisponível</div>'
                }
            </div>
        `).join('');
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
        const produto = this.produtos.find(p => p.id === produtoId);
        
        if (!produto) return;
        
        if ((produto.quantidade || 0) <= 0) {
            App.showNotification('Produto sem estoque!', 'warning');
            return;
        }
        
        // Adicionar múltiplos com Shift
        if (window.event?.shiftKey) {
            const quantidade = prompt(`Quantidade de ${produto.nome}:`, '1');
            if (quantidade) {
                const qtd = parseInt(quantidade);
                if (!isNaN(qtd) && qtd > 0) {
                    this.adicionarMultiplo(produto, qtd);
                }
            }
            return;
        }
        
        // Adicionar 1 normalmente
        const itemExistente = this.carrinho.find(item => item.produto_id === produtoId);
        
        if (itemExistente) {
            if (itemExistente.quantidade >= (produto.quantidade || 0)) {
                App.showNotification('Quantidade máxima em estoque!', 'warning');
                return;
            }
            itemExistente.quantidade++;
        } else {
            this.carrinho.push({
                produto_id: produto.id,
                nome: produto.nome,
                preco: produto.preco_venda,
                preco_custo: produto.preco_custo,
                quantidade: 1,
                estoque: produto.quantidade
            });
        }
        
        this.atualizarCarrinho();
        
        // Feedback visual
        const card = window.event?.target?.closest('.produto-card');
        if (card) {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 100);
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
            this.carrinho.splice(index, 1);
            this.atualizarCarrinho();
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
        let total = 0;
        let lucro = 0;
        
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
            container.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🛒</div>
                    <h3>Carrinho vazio</h3>
                    <p style="color: var(--text-muted);">Clique nos produtos para adicionar</p>
                    <p style="color: var(--text-muted); font-size: 12px; margin-top: 10px;">
                        💡 Dica: Shift + clique para adicionar múltiplos
                    </p>
                </div>
            `;
        } else {
            container.innerHTML = this.carrinho.map((item, index) => `
                <div class="cart-item">
                    <div class="cart-item-header">
                        <strong>${item.nome}</strong>
                        <span>${UI.formatCurrency((item.preco || 0) * item.quantidade)}</span>
                    </div>
                    
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button class="btn-quantity" onclick="Vendas.atualizarQuantidade(${index}, ${item.quantidade - 1})"
                                    ${item.quantidade <= 1 ? 'disabled' : ''}>−</button>
                            
                            <input type="number" class="quantity-input" value="${item.quantidade}" 
                                   min="1" max="${item.estoque || 999}" 
                                   onchange="Vendas.atualizarQuantidade(${index}, this.value)">
                            
                            <button class="btn-quantity" onclick="Vendas.atualizarQuantidade(${index}, ${item.quantidade + 1})"
                                    ${item.quantidade >= (item.estoque || 999) ? 'disabled' : ''}>+</button>
                        </div>
                        
                        <button class="btn-remove" onclick="Vendas.removerDoCarrinho(${index})" title="Remover">✕</button>
                    </div>
                    
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 5px;">
                        Unitário: ${UI.formatCurrency(item.preco)}
                    </div>
                </div>
            `).join('');
        }
        
        if (totalElement) totalElement.textContent = UI.formatCurrency(total);
        if (lucroElement) lucroElement.textContent = UI.formatCurrency(lucro);
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
        
        if (!confirm(`Confirmar venda no valor de ${UI.formatCurrency(total)}?`)) {
            return;
        }
        
        try {
            UI.showLoading();
            
            const venda = {
                itens: this.carrinho.map(item => ({
                    produto_id: item.produto_id,
                    quantidade: item.quantidade
                })),
                forma_pagamento: formaPagamento
            };
            
            const result = await API.criarVenda(venda);
            
            App.showNotification(
                `✅ Venda finalizada!\nTotal: ${UI.formatCurrency(result.total)}`, 
                'success'
            );
            
            // Limpar carrinho e recarregar
            this.carrinho = [];
            this.atualizarCarrinho();
            await this.carregarProdutos();
            
            // Resetar forma de pagamento
            const pagamentoSelect = document.getElementById('formaPagamento');
            if (pagamentoSelect) pagamentoSelect.value = '';
            this.formaPagamento = '';
            
        } catch (error) {
            App.showNotification('Erro ao finalizar venda: ' + error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE CATEGORIAS
// ============================================
const CategoriasManager = {
    categoriaEditando: null,
    tipoEditando: null,
    
    async init() {
        await Auth.checkAuth();
        await this.carregarCategorias();
        await this.carregarTipos();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        // Filtro de tipos
        const filtro = document.getElementById('filtroTipoCategoria');
        if (filtro) {
            filtro.addEventListener('change', () => {
                this.carregarTipos();
            });
        }
        
        // Formulários
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
        
        // Botões de fechar modal
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
                               background-color: ${c.cor || '#4CAF50'}; border-radius: 4px; 
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
            select.innerHTML = options;
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
            document.getElementById('categoriaCor').value = categoria.cor || '#4CAF50';
        } else {
            document.getElementById('formCategoria').reset();
            document.getElementById('categoriaCor').value = '#4CAF50';
        }
        
        modal.style.display = 'block';
    },
    
    async salvarCategoria() {
        try {
            UI.showLoading();
            
            const categoria = {
                nome: document.getElementById('categoriaNome')?.value,
                tipo: document.getElementById('categoriaTipo')?.value,
                cor: document.getElementById('categoriaCor')?.value
            };
            
            if (!categoria.nome) throw new Error('Nome é obrigatório');
            
            if (this.categoriaEditando) {
                await API.atualizarCategoria(this.categoriaEditando.id, categoria);
                App.showNotification('Categoria atualizada!', 'success');
            } else {
                await API.criarCategoria(categoria);
                App.showNotification('Categoria criada!', 'success');
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
            if (categoria) {
                this.abrirModalCategoria(categoria);
            }
        } catch (error) {
            App.showNotification('Erro ao carregar categoria', 'danger');
        }
    },
    
    async excluirCategoria(id) {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
        
        try {
            UI.showLoading();
            await API.excluirCategoria(id);
            App.showNotification('Categoria excluída!', 'success');
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
            
            const tipo = {
                nome: document.getElementById('tipoNome')?.value,
                categoria_id: document.getElementById('tipoCategoria')?.value
            };
            
            if (!tipo.nome) throw new Error('Nome é obrigatório');
            if (!tipo.categoria_id) throw new Error('Categoria é obrigatória');
            
            if (this.tipoEditando) {
                await API.atualizarTipo(this.tipoEditando.id, tipo);
                App.showNotification('Tipo atualizado!', 'success');
            } else {
                await API.criarTipo(tipo);
                App.showNotification('Tipo criado!', 'success');
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
        if (!confirm('Tem certeza que deseja excluir este tipo?')) return;
        
        try {
            UI.showLoading();
            await API.excluirTipo(id);
            App.showNotification('Tipo excluído!', 'success');
            await this.carregarTipos();
        } catch (error) {
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// ============================================
// MÓDULO DE RELATÓRIOS (CORRIGIDO)
// ============================================
const Relatorios = {
    charts: {},
    
    async init() {
        console.log('Inicializando relatórios...'); // Debug
        await Auth.checkAuth();
        this.setupEventListeners();
        await this.carregar();
    },
    
    setupEventListeners() {
        const periodoSelect = document.getElementById('periodoRelatorio');
        if (periodoSelect) {
            periodoSelect.addEventListener('change', (e) => {
                console.log('Período alterado:', e.target.value); // Debug
                this.carregar(e.target.value);
            });
        }
    },
    
    async carregar(periodo = 'mes') {
        try {
            console.log('Carregando relatórios - período:', periodo); // Debug
            UI.showLoading();
            
            // Mostrar loading nos cards
            document.getElementById('produtoMaisVendido').innerHTML = '<p>Carregando...</p>';
            document.getElementById('categoriaMaisVendida').innerHTML = '<p>Carregando...</p>';
            
            const [lucroDiario, lucroMensal, produtoMaisVendido, categoriaMaisVendida, vendasPeriodo] = 
                await Promise.all([
                    API.lucroDiario().catch(e => {
                        console.error('Erro lucro diario:', e);
                        return { total_lucro: 0 };
                    }),
                    API.lucroMensal().catch(e => {
                        console.error('Erro lucro mensal:', e);
                        return { total_lucro: 0 };
                    }),
                    API.produtoMaisVendido().catch(e => {
                        console.error('Erro produto mais vendido:', e);
                        return null;
                    }),
                    API.categoriaMaisVendida().catch(e => {
                        console.error('Erro categoria mais vendida:', e);
                        return null;
                    }),
                    API.vendasPorPeriodo(periodo).catch(e => {
                        console.error('Erro vendas por periodo:', e);
                        return [];
                    })
                ]);
            
            console.log('Dados recebidos:', { lucroDiario, lucroMensal, produtoMaisVendido, categoriaMaisVendida, vendasPeriodo }); // Debug
            
            this.atualizarCards(lucroDiario, lucroMensal);
            this.atualizarDestaques(produtoMaisVendido, categoriaMaisVendida);
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
            const valor = lucroDiario?.total_lucro || 0;
            hojeEl.textContent = UI.formatCurrency(valor);
            console.log('Lucro hoje:', valor); // Debug
        }
        
        if (mesEl) {
            const valor = lucroMensal?.total_lucro || 0;
            mesEl.textContent = UI.formatCurrency(valor);
            console.log('Lucro mês:', valor); // Debug
        }
    },
    
    atualizarDestaques(produto, categoria) {
        const produtoEl = document.getElementById('produtoMaisVendido');
        const categoriaEl = document.getElementById('categoriaMaisVendida');
        
        if (produtoEl) {
            if (produto && produto.nome) {
                produtoEl.innerHTML = `
                    <h4 style="margin-bottom: 10px; color: var(--green);">🥇 ${produto.nome}</h4>
                    <p>Vendas: <strong>${produto.total_vendido || 0}</strong> unidades</p>
                    <p>Número de vendas: <strong>${produto.numero_vendas || 0}</strong></p>
                `;
            } else {
                produtoEl.innerHTML = '<p style="color: var(--text-muted);">Nenhuma venda registrada</p>';
            }
        }
        
        if (categoriaEl) {
            if (categoria && categoria.categoria) {
                categoriaEl.innerHTML = `
                    <h4 style="margin-bottom: 10px; color: var(--orange);">🏆 ${categoria.categoria}</h4>
                    <p>Vendas: <strong>${categoria.total_vendido || 0}</strong> unidades</p>
                    <p>Faturamento: <strong>${UI.formatCurrency(categoria.valor_total || 0)}</strong></p>
                `;
            } else {
                categoriaEl.innerHTML = '<p style="color: var(--text-muted);">Nenhuma venda registrada</p>';
            }
        }
    },
    
    atualizarTabela(vendas) {
        const tbody = document.getElementById('tabelaVendasPeriodo');
        if (!tbody) return;
        
        console.log('Atualizando tabela com:', vendas); // Debug
        
        if (!vendas || vendas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        Nenhuma venda encontrada no período
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
        if (!ctx) {
            console.warn('Canvas do gráfico não encontrado');
            return;
        }
        
        console.log('Atualizando gráfico com:', vendas); // Debug
        
        if (this.charts.relatorio) {
            this.charts.relatorio.destroy();
        }
        
        if (!vendas || vendas.length === 0) {
            // Mostrar mensagem no canvas
            ctx.font = '14px Arial';
            ctx.fillStyle = '#8f9bae';
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
                        backgroundColor: '#00c853',
                        borderRadius: 4
                    },
                    {
                        label: 'Lucro (R$)',
                        data: vendas.map(v => v.total_lucro || 0),
                        backgroundColor: '#ff9800',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#b8c0cc'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${UI.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        grid: {
                            color: '#363b47'
                        },
                        ticks: {
                            color: '#b8c0cc',
                            callback: (value) => UI.formatCurrency(value)
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#b8c0cc'
                        }
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
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Exportar para uso global
window.App = App;
window.Auth = Auth;
window.UI = UI;
window.Dashboard = Dashboard;
window.Produtos = Produtos;
window.Vendas = Vendas;
window.CategoriasManager = CategoriasManager;
window.Relatorios = Relatorios;

} // Fim do if (typeof window.App === 'undefined')