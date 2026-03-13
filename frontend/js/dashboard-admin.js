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
            
            // Buscar vendas dos últimos 7 dias
            const hoje = new Date();
            const seteDiasAtras = new Date();
            seteDiasAtras.setDate(hoje.getDate() - 7);
            
            const [lucroDiario, lucroMensal, estoqueBaixo, vendasPeriodo] = await Promise.all([
                API.lucroDiario().catch(() => ({ total_vendas: 0, total_lucro: 0, quantidade_vendas: 0 })),
                API.lucroMensal().catch(() => ({ total_vendas: 0, total_lucro: 0 })),
                API.estoqueBaixo().catch(() => []),
                API.vendasPorPeriodo('dia').catch(() => [])
            ]);
            
            this.data = { 
                lucroDiario, 
                lucroMensal, 
                estoqueBaixo, 
                vendasPeriodo: vendasPeriodo.slice(0, 7).reverse() 
            };
            
            this.atualizarCards();
            this.atualizarGraficos();
            this.mostrarEstoqueBaixo();
            
        } catch (error) {
            console.error('Erro:', error);
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
            ticketMedio: document.getElementById('ticketMedio')
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
        if (elementos.ticketMedio) {
            const qtd = this.data.lucroDiario?.quantidade_vendas || 1;
            const ticket = (this.data.lucroDiario?.total_vendas || 0) / qtd;
            elementos.ticketMedio.textContent = UI.formatCurrency(ticket);
        }
    },
    
    inicializarGraficos() {
        // Gráfico de Vendas da Semana
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
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            grid: {
                                color: '#2d3540'
                            },
                            ticks: {
                                color: '#94a3b8',
                                callback: (value) => 'R$ ' + value
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8'
                            }
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
                    labels: ['Carregando...'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#c4a747']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#94a3b8'
                            }
                        }
                    }
                }
            });
        }
    },
    
    async atualizarGraficos() {
        try {
            // Buscar produtos mais vendidos
            const produto = await API.produtoMaisVendido().catch(() => null);
            
            if (this.charts.vendas && this.data.vendasPeriodo.length > 0) {
                // Mapear dias da semana
                const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const dadosSemana = new Array(7).fill(0);
                
                this.data.vendasPeriodo.forEach((venda, index) => {
                    if (index < 7) {
                        dadosSemana[6 - index] = venda.total_vendas || 0;
                    }
                });
                
                this.charts.vendas.data.datasets[0].data = dadosSemana;
                this.charts.vendas.update();
            }
            
            if (this.charts.produtos && produto && produto.nome) {
                this.charts.produtos.data.labels = [produto.nome, 'Outros'];
                this.charts.produtos.data.datasets[0].data = [produto.total_vendido || 1, 1];
                this.charts.produtos.data.datasets[0].backgroundColor = ['#c4a747', '#2d3540'];
                this.charts.produtos.update();
            }
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
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
                <span>${p.nome}</span>
                <span class="badge badge-warning">${p.quantidade} und</span>
            </div>
        `).join('');
    },
    
    configurarAtualizacao() {
        setInterval(() => this.carregarDados(), 60000); // Atualizar a cada 1 minuto
    }
};