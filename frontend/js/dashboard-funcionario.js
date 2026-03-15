// ============================================
// DASHBOARD FUNCIONÁRIO - VERSÃO SIMPLIFICADA
// ============================================
const DashboardFuncionario = {
    data: {},
    
    async init() {
        await Auth.checkAuth();
        
        const user = Auth.getCurrentUser();
        if (!user) {
            window.location.href = '/';
            return;
        }
        
        // Mostrar nome do usuário
        document.getElementById('userNomeDisplay').textContent = user.nome || user.username || 'Funcionário';
        
        await this.carregarDados();
        this.configurarAtualizacao();
    },
    
    async carregarDados() {
        try {
            UI.showLoading();
            
            // Carregar dados
            const [estoqueBaixo, ultimasVendas, totalProdutos] = await Promise.all([
                API.estoqueBaixo().catch(() => []),
                this.buscarUltimasVendas(),
                this.buscarTotalProdutos()
            ]);
            
            this.data = {
                estoqueBaixo,
                ultimasVendas: ultimasVendas || [],
                totalProdutos
            };
            
            this.atualizarCards();
            this.mostrarEstoqueBaixo();
            this.mostrarUltimasVendas();
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        } finally {
            UI.hideLoading();
        }
    },
    
    async buscarUltimasVendas() {
        try {
            const response = await API.listarVendas({ limite: 10 });
            return response.vendas || [];
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return [];
        }
    },
    
    async buscarTotalProdutos() {
        try {
            const response = await API.listarProdutos({ limit: 1 });
            // Estimar total (ou buscar endpoint específico)
            return response.total || 0;
        } catch (error) {
            return 0;
        }
    },
    
    atualizarCards() {
        // Calcular vendas de hoje
        const hoje = new Date().toDateString();
        const vendasHoje = this.data.ultimasVendas.filter(v => 
            new Date(v.data_venda).toDateString() === hoje
        );
        
        document.getElementById('vendasHoje').textContent = vendasHoje.length;
        document.getElementById('produtosEstoque').textContent = this.data.totalProdutos || '...';
    },
    
    mostrarEstoqueBaixo() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo || this.data.estoqueBaixo.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                    ✅ Todos os produtos estão com estoque adequado
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.slice(0, 5).map(p => `
            <div class="product-item">
                <div class="product-info">
                    <h4>${p.nome}</h4>
                    <small>Estoque: ${p.quantidade} unidades</small>
                </div>
                <span class="stock-badge">⚠️ Baixo</span>
            </div>
        `).join('');
    },
    
    mostrarUltimasVendas() {
        const tbody = document.getElementById('ultimasVendasTable');
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
                <td><span class="badge-pagamento">${v.forma_pagamento || 'N/A'}</span></td>
            </tr>
        `).join('');
    },
    
    configurarAtualizacao() {
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