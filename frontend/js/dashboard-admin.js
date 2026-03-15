// ============================================
// DASHBOARD ADMIN - VERSÃO COMPLETA E CORRIGIDA
// ============================================
const DashboardAdmin = {
    charts: {},
    data: {},
    
    async init() {
        await Auth.checkAuth();
        
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
            
            const [lucroDiario, lucroMensal, estoqueBaixo, vendasPeriodo, produtosMaisVendidos, ultimasVendas] = await Promise.all([
                API.lucroDiario().catch(() => ({ total_vendas: 0, total_lucro: 0, quantidade_vendas: 0 })),
                API.lucroMensal().catch(() => ({ total_vendas: 0, total_lucro: 0 })),
                API.estoqueBaixo().catch(() => []),
                API.vendasPorPeriodo('dia').catch(() => []),
                this.buscarProdutosMaisVendidos(),
                API.listarVendas({ limite: 10 }).catch(() => ({ vendas: [] }))
            ]);
            
            const vendasUltimos7Dias = this.processarVendasSemana(vendasPeriodo);
            
            this.data = {
                lucroDiario,
                lucroMensal,
                estoqueBaixo,
                vendasPeriodo: vendasUltimos7Dias,
                produtosMaisVendidos: produtosMaisVendidos || [],
                ultimasVendas: ultimasVendas.vendas || []
            };
            
            this.atualizarCards();
            this.atualizarGraficos();
            this.mostrarEstoqueBaixo();
            this.mostrarProdutosMaisVendidos();
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
    
    async buscarProdutosMaisVendidos() {
        try {
            // Buscar vendas dos últimos 30 dias
            const response = await API.listarVendas({ limite: 100 });
            const vendas = response.vendas || [];
            
            // Mapa para contar produtos
            const produtosMap = new Map();
            
            // Para cada venda, buscar detalhes
            for (const venda of vendas) {
                try {
                    const detalhes = await API.buscarVenda(venda.id);
                    if (detalhes.itens) {
                        detalhes.itens.forEach(item => {
                            const key = item.produto_id;
                            if (!produtosMap.has(key)) {
                                produtosMap.set(key, {
                                    id: key,
                                    nome: item.produto_nome || 'Produto',
                                    quantidade: 0
                                });
                            }
                            produtosMap.get(key).quantidade += item.quantidade || 0;
                        });
                    }
                } catch (e) {
                    console.log('Erro ao buscar detalhes da venda', venda.id);
                }
            }
            
            // Converter para array, ordenar e pegar top 5
            return Array.from(produtosMap.values())
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 5);
                
        } catch (error) {
            console.error('Erro ao buscar produtos mais vendidos:', error);
            return [];
        }
    },
    
    processarVendasSemana(vendasPeriodo) {
        const ultimos7Dias = [];
        const hoje = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() - i);
            const dataStr = data.toISOString().split('T')[0];
            
            const vendaDia = vendasPeriodo.find(v => v.periodo === dataStr) || { total_vendas: 0 };
            
            ultimos7Dias.push({
                data: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
                total: vendaDia.total_vendas || 0
            });
        }
        
        return ultimos7Dias;
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
            elementos.vendasHoje.textContent = UI.formatCurrency(this.data.lucroDiario?.total_vendas || 0);
        }
        
        if (elementos.lucroHoje) {
            elementos.lucroHoje.textContent = UI.formatCurrency(this.data.lucroDiario?.total_lucro || 0);
        }
        
        if (elementos.vendasSemana) {
            const totalSemana = this.data.vendasPeriodo.reduce((acc, d) => acc + d.total, 0);
            elementos.vendasSemana.textContent = UI.formatCurrency(totalSemana);
        }
        
        if (elementos.lucroSemana) {
            const totalVendas = this.data.vendasPeriodo.reduce((acc, d) => acc + d.total, 0);
            const margemLucro = 0.3;
            elementos.lucroSemana.textContent = UI.formatCurrency(totalVendas * margemLucro);
        }
        
        if (elementos.vendasMes) {
            elementos.vendasMes.textContent = UI.formatCurrency(this.data.lucroMensal?.total_vendas || 0);
        }
        
        if (elementos.estoqueBaixo) {
            elementos.estoqueBaixo.textContent = this.data.estoqueBaixo?.length || 0;
        }
        
        if (elementos.ticketMedio) {
            const qtd = this.data.lucroDiario?.quantidade_vendas || 1;
            const ticket = (this.data.lucroDiario?.total_vendas || 0) / qtd;
            elementos.ticketMedio.textContent = UI.formatCurrency(ticket);
        }
    },
    
    inicializarGraficos() {
        // Destruir gráficos existentes
        if (this.charts.vendas) {
            this.charts.vendas.destroy();
            this.charts.vendas = null;
        }
        
        if (this.charts.produtos) {
            this.charts.produtos.destroy();
            this.charts.produtos = null;
        }
        
        // Gráfico de Vendas por Dia
        const ctxVendas = document.getElementById('graficoVendasSemana');
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
        const ctxProdutos = document.getElementById('graficoProdutos');
        if (ctxProdutos) {
            this.charts.produtos = new Chart(ctxProdutos, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Quantidade Vendida',
                        data: [],
                        backgroundColor: '#c4a747',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.raw} unidades`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#2d3540' },
                            ticks: {
                                color: '#94a3b8',
                                stepSize: 1
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { 
                                color: '#94a3b8',
                                maxRotation: 45,
                                minRotation: 45
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
            this.charts.vendas.data.datasets[0].data = this.data.vendasPeriodo.map(d => d.total);
            this.charts.vendas.update();
        }
        
        // Atualizar gráfico de produtos mais vendidos
        if (this.charts.produtos && this.data.produtosMaisVendidos.length > 0) {
            this.charts.produtos.data.labels = this.data.produtosMaisVendidos.map(p => 
                p.nome.length > 10 ? p.nome.substring(0, 10) + '...' : p.nome
            );
            this.charts.produtos.data.datasets[0].data = this.data.produtosMaisVendidos.map(p => p.quantidade);
            this.charts.produtos.update();
        }
    },
    
    mostrarEstoqueBaixo() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo || this.data.estoqueBaixo.length === 0) {
            container.innerHTML = `
                <div style="color: var(--text-muted); text-align: center; padding: 20px;">
                    ✅ Todos os produtos estão com estoque adequado
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.slice(0, 5).map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong style="color: var(--text-primary);">${p.nome}</strong>
                    <br>
                    <small style="color: var(--text-muted);">Estoque: ${p.quantidade} unidades</small>
                </div>
                <button class="btn btn-primary btn-sm" onclick="Produtos.abrirModalEstoque(${p.id})">
                    Repor
                </button>
            </div>
        `).join('');
    },
    
    mostrarProdutosMaisVendidos() {
        const container = document.getElementById('produtoMaisVendido');
        if (!container) return;
        
        if (this.data.produtosMaisVendidos && this.data.produtosMaisVendidos.length > 0) {
            const top3 = this.data.produtosMaisVendidos.slice(0, 3);
            container.innerHTML = `
                <div style="padding: 10px;">
                    ${top3.map((p, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: ${index < top3.length-1 ? '1px solid var(--border-color)' : 'none'};">
                            <div>
                                <span style="color: var(--accent-primary); font-weight: bold; margin-right: 8px;">${index+1}º</span>
                                <strong style="color: var(--text-primary);">${p.nome}</strong>
                            </div>
                            <span style="color: var(--text-muted); background: var(--bg-tertiary); padding: 4px 8px; border-radius: 12px;">${p.quantidade} vendidos</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="color: var(--text-muted); text-align: center; padding: 20px;">
                    Nenhuma venda registrada ainda
                </div>
            `;
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