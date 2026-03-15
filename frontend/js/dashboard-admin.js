// ============================================
// DASHBOARD ADMIN - VERSÃO CORRIGIDA
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
            
            const [lucroDiario, lucroMensal, estoqueBaixo, vendasPeriodo, produtoMaisVendido, ultimasVendas] = await Promise.all([
                API.lucroDiario().catch(() => ({ total_vendas: 0, total_lucro: 0, quantidade_vendas: 0 })),
                API.lucroMensal().catch(() => ({ total_vendas: 0, total_lucro: 0 })),
                API.estoqueBaixo().catch(() => []),
                API.vendasPorPeriodo('dia').catch(() => []),
                API.produtoMaisVendido().catch(() => null),
                API.listarVendas({ limite: 10 }).catch(() => ({ vendas: [] }))
            ]);
            
            const vendasUltimos7Dias = this.processarVendasSemana(vendasPeriodo);
            
            this.data = {
                lucroDiario,
                lucroMensal,
                estoqueBaixo,
                vendasPeriodo: vendasUltimos7Dias,
                produtoMaisVendido,
                ultimasVendas: ultimasVendas.vendas || []
            };
            
            this.atualizarCards();
            this.atualizarGraficos();
            this.mostrarEstoqueBaixo();
            this.mostrarProdutoMaisVendido();
            this.mostrarUltimasVendas();
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        } finally {
            UI.hideLoading();
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
            // Limpar o canvas
            const canvas = ctxVendas;
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            
            this.charts.vendas = new Chart(canvas, {
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
                        pointRadius: 5,
                        pointHoverRadius: 7
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
                                callback: (value) => 'R$ ' + value.toFixed(0)
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
            const canvas = ctxProdutos;
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            
            this.charts.produtos = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: ['Carregando...'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#c4a747'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { 
                                color: '#94a3b8',
                                font: { size: 12 }
                            }
                        }
                    }
                }
            });
        }
    },
    
    atualizarGraficos() {
        if (this.charts.vendas && this.data.vendasPeriodo.length > 0) {
            this.charts.vendas.data.datasets[0].data = this.data.vendasPeriodo.map(d => d.total);
            this.charts.vendas.update();
        }
        
        if (this.charts.produtos && this.data.produtoMaisVendido) {
            const produto = this.data.produtoMaisVendido;
            if (produto && produto.nome) {
                this.charts.produtos.data.labels = [produto.nome, 'Outros'];
                this.charts.produtos.data.datasets[0].data = [
                    produto.total_vendido || 1,
                    Math.max(1, (produto.total_vendido || 1) * 0.3)
                ];
                this.charts.produtos.data.datasets[0].backgroundColor = ['#c4a747', '#2d3540'];
                this.charts.produtos.update();
            }
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
    
    mostrarProdutoMaisVendido() {
        const container = document.getElementById('produtoMaisVendido');
        if (!container) return;
        
        if (this.data.produtoMaisVendido && this.data.produtoMaisVendido.nome) {
            const produto = this.data.produtoMaisVendido;
            container.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
                    <h4 style="color: var(--accent-primary); margin-bottom: 5px; font-size: 18px;">${produto.nome}</h4>
                    <p style="color: var(--text-muted);">${produto.total_vendido || 0} unidades vendidas</p>
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