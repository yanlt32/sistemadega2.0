// ============================================
// DASHBOARD ADMIN - VERSÃO COMPLETA
// ============================================
const DashboardAdmin = {
    charts: {},
    data: {},
    
    async init() {
        await Auth.checkAuth();
        
        // Verificar se é admin
        const user = Auth.getCurrentUser();
        if (!user || user.role !== 'admin') {
            window.location.href = '/vendas.html';
            return;
        }
        
        await this.carregarDados();
        this.inicializarGraficos();
        this.configurarAtualizacao();
    },
    
    async carregarDados() {
        try {
            UI.showLoading();
            
            // Buscar todos os dados necessários
            const [lucroDiario, lucroMensal, estoqueBaixo, vendasPeriodo, produtoMaisVendido] = await Promise.all([
                API.lucroDiario().catch(() => ({ total_vendas: 0, total_lucro: 0, quantidade_vendas: 0 })),
                API.lucroMensal().catch(() => ({ total_vendas: 0, total_lucro: 0 })),
                API.estoqueBaixo().catch(() => []),
                API.vendasPorPeriodo('dia').catch(() => []),
                API.produtoMaisVendido().catch(() => null)
            ]);
            
            this.data = {
                lucroDiario,
                lucroMensal,
                estoqueBaixo,
                vendasPeriodo: vendasPeriodo.slice(0, 7).reverse(),
                produtoMaisVendido
            };
            
            this.atualizarCards();
            this.atualizarGraficos();
            this.mostrarEstoqueBaixo();
            this.mostrarProdutoMaisVendido();
            this.carregarUltimasVendas();
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            Notificacao.mostrar('Erro ao carregar dados', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    atualizarCards() {
        const elementos = {
            vendasHoje: document.getElementById('vendasHoje'),
            lucroHoje: document.getElementById('lucroHoje'),
            vendasSemana: document.getElementById('vendasSemana'),
            lucroSemana: document.getElementById('lucroSemana'),
            vendasMes: document.getElementById('vendasMes'),
            estoqueBaixo: document.getElementById('estoqueBaixo')
        };
        
        if (elementos.vendasHoje) {
            elementos.vendasHoje.textContent = UI.formatCurrency(this.data.lucroDiario?.total_vendas || 0);
        }
        
        if (elementos.lucroHoje) {
            elementos.lucroHoje.textContent = UI.formatCurrency(this.data.lucroDiario?.total_lucro || 0);
        }
        
        if (elementos.vendasSemana) {
            const totalSemana = this.data.vendasPeriodo.reduce((acc, d) => acc + (d.total_vendas || 0), 0);
            elementos.vendasSemana.textContent = UI.formatCurrency(totalSemana);
        }
        
        if (elementos.lucroSemana) {
            const lucroSemana = this.data.vendasPeriodo.reduce((acc, d) => acc + (d.total_lucro || 0), 0);
            elementos.lucroSemana.textContent = UI.formatCurrency(lucroSemana);
        }
        
        if (elementos.vendasMes) {
            elementos.vendasMes.textContent = UI.formatCurrency(this.data.lucroMensal?.total_vendas || 0);
        }
        
        if (elementos.estoqueBaixo) {
            elementos.estoqueBaixo.textContent = this.data.estoqueBaixo?.length || 0;
        }
    },
    
    inicializarGraficos() {
        // Gráfico de Vendas por Dia
        const ctxVendas = document.getElementById('graficoVendasSemana')?.getContext('2d');
        if (ctxVendas) {
            this.charts.vendas = new Chart(ctxVendas, {
                type: 'line',
                data: {
                    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                    datasets: [{
                        label: 'Vendas (R$)',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#c4a747',
                        backgroundColor: 'rgba(196, 167, 71, 0.1)',
                        borderWidth: 2,
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
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Vendas: ${UI.formatCurrency(context.raw)}`
                            }
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
        
        // Gráfico de Produtos Mais Vendidos
        const ctxProdutos = document.getElementById('graficoProdutos')?.getContext('2d');
        if (ctxProdutos) {
            this.charts.produtos = new Chart(ctxProdutos, {
                type: 'doughnut',
                data: {
                    labels: ['Aguardando dados...'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#c4a747'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', font: { size: 12 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${context.raw} unidades`
                            }
                        }
                    }
                }
            });
        }
    },
    
    atualizarGraficos() {
        // Atualizar gráfico de vendas
        if (this.charts.vendas && this.data.vendasPeriodo.length > 0) {
            const dadosSemana = [0, 0, 0, 0, 0, 0, 0];
            this.data.vendasPeriodo.forEach((item, index) => {
                if (index < 7) dadosSemana[index] = item.total_vendas || 0;
            });
            
            this.charts.vendas.data.datasets[0].data = dadosSemana;
            this.charts.vendas.update();
        }
        
        // Atualizar gráfico de produtos
        if (this.charts.produtos && this.data.produtoMaisVendido?.nome) {
            this.charts.produtos.data.labels = [this.data.produtoMaisVendido.nome, 'Outros'];
            this.charts.produtos.data.datasets[0].data = [
                this.data.produtoMaisVendido.total_vendido || 1,
                1
            ];
            this.charts.produtos.data.datasets[0].backgroundColor = ['#c4a747', '#2d3540'];
            this.charts.produtos.update();
        }
    },
    
    mostrarEstoqueBaixo() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo?.length) {
            container.innerHTML = `
                <div style="color: var(--text-muted); text-align: center; padding: 15px;">
                    ✅ Todos os produtos estão com estoque adequado
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.slice(0, 5).map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong>${p.nome}</strong>
                    <br>
                    <small>Estoque: ${p.quantidade} unidades</small>
                </div>
                <button class="btn btn-primary btn-sm" onclick="Produtos.abrirModalEstoque(${p.id})">Repor</button>
            </div>
        `).join('');
    },
    
    mostrarProdutoMaisVendido() {
        const container = document.getElementById('produtoMaisVendido');
        if (!container) return;
        
        if (this.data.produtoMaisVendido?.nome) {
            container.innerHTML = `
                <div style="text-align: center; padding: 15px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">🏆</div>
                    <h4 style="color: var(--accent-primary); margin-bottom: 5px;">${this.data.produtoMaisVendido.nome}</h4>
                    <p style="color: var(--text-muted);">${this.data.produtoMaisVendido.total_vendido || 0} unidades</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="color: var(--text-muted); text-align: center; padding: 15px;">
                    Nenhuma venda registrada
                </div>
            `;
        }
    },
    
    async carregarUltimasVendas() {
        try {
            const response = await API.listarVendas({ limite: 5 });
            const vendas = response.vendas || [];
            
            const tbody = document.querySelector('#tabelaUltimasVendas tbody');
            if (!tbody) return;
            
            if (!vendas.length) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma venda recente</td></tr>';
                return;
            }
            
            tbody.innerHTML = vendas.map(v => `
                <tr>
                    <td>#${v.id}</td>
                    <td>${new Date(v.data_venda).toLocaleString('pt-BR')}</td>
                    <td>${UI.formatCurrency(v.total)}</td>
                    <td><span class="badge badge-success">${v.forma_pagamento}</span></td>
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('Erro ao carregar últimas vendas:', error);
        }
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
        DashboardAdmin.init();
    }
});