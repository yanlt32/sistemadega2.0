// ============================================
// DASHBOARD FUNCIONÁRIO - VERSÃO SIMPLIFICADA
// ============================================
const DashboardFuncionario = {
    data: {},
    
    async init() {
        await Auth.checkAuth();
        
        // Verificar se é funcionário
        const user = Auth.getCurrentUser();
        if (!user || user.role !== 'funcionario') {
            window.location.href = '/dashboard.html';
            return;
        }
        
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
    
    atualizarCards() {
        // Cards básicos que funcionário pode ver
        const elementos = {
            totalVendasHoje: document.getElementById('totalVendasHoje'),
            produtosEmEstoque: document.getElementById('produtosEmEstoque'),
            vendasHoje: document.getElementById('vendasHoje')
        };
        
        // Calcular vendas de hoje
        const hoje = new Date().toDateString();
        const vendasHoje = this.data.ultimasVendas.filter(v => 
            new Date(v.data_venda).toDateString() === hoje
        );
        
        if (elementos.vendasHoje) {
            elementos.vendasHoje.textContent = vendasHoje.length;
        }
        
        if (elementos.produtosEmEstoque) {
            // Esse valor viria de uma API específica
            elementos.produtosEmEstoque.textContent = '...';
        }
    },
    
    mostrarEstoqueBaixo() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo?.length) {
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
        const tbody = document.getElementById('ultimasVendasTable')?.querySelector('tbody');
        if (!tbody) return;
        
        if (!this.data.ultimasVendas.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma venda recente</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.data.ultimasVendas.map(v => `
            <tr>
                <td>#${v.id}</td>
                <td>${new Date(v.data_venda).toLocaleString('pt-BR')}</td>
                <td>${UI.formatCurrency(v.total)}</td>
                <td><span class="badge badge-success">${v.forma_pagamento}</span></td>
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
        // Verificar perfil e carregar dashboard apropriado
        const user = Auth.getCurrentUser();
        if (user && user.role === 'funcionario') {
            DashboardFuncionario.init();
        }
    }
});