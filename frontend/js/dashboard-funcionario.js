// ============================================
// DASHBOARD FUNCIONÁRIO - VERSÃO SIMPLIFICADA
// ============================================
const DashboardFuncionario = {
    data: {},
    
    async init() {
        await Auth.checkAuth();
        
        // Verificar se é funcionário (mas não redirecionar se for admin)
        const user = Auth.getCurrentUser();
        if (!user) {
            window.location.href = '/';
            return;
        }
        
        // Se for admin, carrega o dashboard admin em vez deste
        if (user.role === 'admin') {
            if (window.DashboardAdmin) {
                window.DashboardAdmin.init();
            } else {
                window.Dashboard.init();
            }
            return;
        }
        
        // Se chegou aqui, é funcionário - carrega o dashboard
        await this.carregarDados();
        this.configurarAtualizacao();
    },
    
    async carregarDados() {
        try {
            UI.showLoading();
            
            // Carregar apenas dados que funcionário pode ver
            const [estoqueBaixo, ultimasVendas] = await Promise.all([
                API.estoqueBaixo().catch(() => []),
                this.buscarUltimasVendas()
            ]);
            
            this.data = {
                estoqueBaixo,
                ultimasVendas: ultimasVendas || []
            };
            
            this.atualizarCards();
            this.mostrarEstoqueBaixo();
            this.mostrarUltimasVendas();
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            if (window.Notificacao) {
                Notificacao.mostrar('Erro ao carregar dados', 'danger');
            }
        } finally {
            UI.hideLoading();
        }
    },
    
    async buscarUltimasVendas() {
        try {
            const response = await API.listarVendas({ limite: 5 });
            return response.vendas || [];
        } catch (error) {
            console.error('Erro ao buscar últimas vendas:', error);
            return [];
        }
    },
    
    async buscarTotalProdutos() {
        try {
            const response = await API.listarProdutos({ limit: 1 });
            // Não temos um endpoint específico para total, então vamos calcular
            const allProducts = await API.listarProdutos({ limit: 1000 });
            const total = allProducts.produtos?.reduce((acc, p) => acc + (p.quantidade || 0), 0) || 0;
            return total;
        } catch (error) {
            console.error('Erro ao buscar total de produtos:', error);
            return 0;
        }
    },
    
    atualizarCards() {
        // Calcular vendas de hoje
        const hoje = new Date().toDateString();
        const vendasHoje = this.data.ultimasVendas.filter(v => 
            new Date(v.data_venda).toDateString() === hoje
        );
        
        const vendasHojeElement = document.getElementById('vendasHoje');
        if (vendasHojeElement) {
            vendasHojeElement.textContent = vendasHoje.length;
        }
        
        // Buscar total de produtos em estoque
        this.buscarTotalProdutos().then(total => {
            const produtosElement = document.getElementById('produtosEmEstoque');
            if (produtosElement) {
                produtosElement.textContent = total;
            }
        });
    },
    
    mostrarEstoqueBaixo() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo || this.data.estoqueBaixo.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 15px;">✅ Todos os produtos estão com estoque adequado</div>';
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.slice(0, 5).map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong>${p.nome}</strong>
                    <br>
                    <small>Estoque: ${p.quantidade} unidades</small>
                </div>
                <span class="badge badge-warning">⚠️ Baixo</span>
            </div>
        `).join('');
    },
    
    mostrarUltimasVendas() {
        const tbody = document.querySelector('#ultimasVendasTable tbody');
        if (!tbody) return;
        
        if (!this.data.ultimasVendas || this.data.ultimasVendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma venda recente</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.data.ultimasVendas.map(v => `
            <tr>
                <td>#${v.id}</td>
                <td>${new Date(v.data_venda).toLocaleString('pt-BR')}</td>
                <td>${UI.formatCurrency(v.total)}</td>
                <td><span class="badge badge-success">${v.forma_pagamento || 'N/A'}</span></td>
            </tr>
        `).join('');
    },
    
    configurarAtualizacao() {
        // Atualizar a cada 30 segundos
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.carregarDados();
            }
        }, 30000);
    }
};

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        DashboardFuncionario.init();
    }
});