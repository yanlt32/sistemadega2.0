const Financeiro = {
    charts: {},
    dados: {
        vendas: [],
        gastos: []
    },
    
    async init() {
        await Auth.checkAuth();
        
        if (!Auth.isAdmin()) {
            window.location.href = '/dashboard.html';
            return;
        }
        
        this.setupEventListeners();
        await this.carregarDados();
        this.inicializarGraficos();
    },
    
    setupEventListeners() {
        document.getElementById('btnAtualizar')?.addEventListener('click', () => this.carregarDados());
        document.getElementById('btnExportarExcel')?.addEventListener('click', () => this.exportarExcel());
    },
    
    async carregarDados() {
        try {
            UI.showLoading();
            
            const tipo = document.getElementById('periodoTipo').value;
            const hoje = new Date();
            let dataInicio, dataFim;
            
            // Calcular período
            if (tipo === 'semana') {
                dataFim = hoje.toISOString().split('T')[0];
                dataInicio = new Date(hoje.setDate(hoje.getDate() - 7)).toISOString().split('T')[0];
            } else if (tipo === 'mes') {
                dataFim = hoje.toISOString().split('T')[0];
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
            } else { // ano
                dataFim = hoje.toISOString().split('T')[0];
                dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
            }
            
            // Buscar vendas do período
            const vendasResponse = await API.listarVendas({
                data_inicio: dataInicio,
                data_fim: dataFim,
                limite: 1000
            });
            
            // Buscar gastos do período
            const gastosResponse = await API.listarGastos({
                page: 1,
                limit: 1000
            });
            
            // Filtrar gastos por data
            const gastosFiltrados = (gastosResponse.gastos || []).filter(g => {
                const dataGasto = new Date(g.data_gasto).toISOString().split('T')[0];
                return dataGasto >= dataInicio && dataGasto <= dataFim;
            });
            
            this.dados = {
                vendas: vendasResponse.vendas || [],
                gastos: gastosFiltrados
            };
            
            this.atualizarCards();
            this.atualizarTabelas();
            this.atualizarGraficos();
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Notificacao.mostrar('Erro ao carregar dados', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    atualizarCards() {
        const totalVendas = this.dados.vendas.reduce((acc, v) => acc + v.total, 0);
        const totalGastos = this.dados.gastos.reduce((acc, g) => acc + g.valor, 0);
        const lucroLiquido = totalVendas - totalGastos;
        const margemLucro = totalVendas > 0 ? ((lucroLiquido / totalVendas) * 100).toFixed(1) : 0;
        
        document.getElementById('totalVendas').textContent = UI.formatCurrency(totalVendas);
        document.getElementById('totalGastos').textContent = UI.formatCurrency(totalGastos);
        document.getElementById('lucroLiquido').textContent = UI.formatCurrency(lucroLiquido);
        document.getElementById('margemLucro').textContent = margemLucro + '%';
        
        // Cor do lucro
        const lucroElement = document.getElementById('lucroLiquido');
        if (lucroLiquido >= 0) {
            lucroElement.style.color = 'var(--accent-primary)';
        } else {
            lucroElement.style.color = 'var(--danger)';
        }
    },
    
    atualizarTabelas() {
        // Tabela de vendas por período
        const tbodyVendas = document.querySelector('#tabelaVendasPeriodo tbody');
        if (tbodyVendas) {
            // Agrupar vendas por dia
            const vendasPorDia = {};
            this.dados.vendas.forEach(v => {
                const data = new Date(v.data_venda).toLocaleDateString('pt-BR');
                if (!vendasPorDia[data]) {
                    vendasPorDia[data] = { total: 0, lucro: 0 };
                }
                vendasPorDia[data].total += v.total;
                vendasPorDia[data].lucro += v.lucro || 0;
            });
            
            tbodyVendas.innerHTML = Object.entries(vendasPorDia)
                .sort((a, b) => new Date(b[0].split('/').reverse()) - new Date(a[0].split('/').reverse()))
                .slice(0, 10)
                .map(([data, valores]) => `
                    <tr>
                        <td>${data}</td>
                        <td>${UI.formatCurrency(valores.total)}</td>
                        <td>${UI.formatCurrency(valores.lucro)}</td>
                    </tr>
                `).join('');
        }
        
        // Tabela de gastos por categoria
        const tbodyGastos = document.querySelector('#tabelaGastosCategoria tbody');
        if (tbodyGastos) {
            const gastosPorCategoria = {};
            let totalGastos = 0;
            
            this.dados.gastos.forEach(g => {
                const categoria = g.categoria_nome || 'Sem categoria';
                if (!gastosPorCategoria[categoria]) {
                    gastosPorCategoria[categoria] = 0;
                }
                gastosPorCategoria[categoria] += g.valor;
                totalGastos += g.valor;
            });
            
            tbodyGastos.innerHTML = Object.entries(gastosPorCategoria)
                .sort((a, b) => b[1] - a[1])
                .map(([categoria, valor]) => {
                    const percentual = totalGastos > 0 ? ((valor / totalGastos) * 100).toFixed(1) : 0;
                    return `
                        <tr>
                            <td>${categoria}</td>
                            <td>${UI.formatCurrency(valor)}</td>
                            <td>${percentual}%</td>
                        </tr>
                    `;
                }).join('');
        }
        
        // Tabela de últimos registros
        const tbodyRegistros = document.querySelector('#tabelaUltimosRegistros tbody');
        if (tbodyRegistros) {
            const registros = [
                ...this.dados.vendas.map(v => ({
                    data: v.data_venda,
                    tipo: 'Venda',
                    descricao: `Venda #${v.id}`,
                    valor: v.total,
                    classe: 'venda'
                })),
                ...this.dados.gastos.map(g => ({
                    data: g.data_gasto,
                    tipo: 'Gasto',
                    descricao: g.descricao,
                    valor: -g.valor,
                    classe: 'gasto'
                }))
            ].sort((a, b) => new Date(b.data) - new Date(a.data))
             .slice(0, 10);
            
            tbodyRegistros.innerHTML = registros.map(r => `
                <tr>
                    <td>${new Date(r.data).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <span class="badge ${r.tipo === 'Venda' ? 'badge-success' : 'badge-danger'}">
                            ${r.tipo}
                        </span>
                    </td>
                    <td>${r.descricao}</td>
                    <td style="color: ${r.valor >= 0 ? 'var(--accent-primary)' : 'var(--danger)'}">
                        ${UI.formatCurrency(Math.abs(r.valor))}
                    </td>
                </tr>
            `).join('');
        }
    },
    
    inicializarGraficos() {
        // Gráfico comparativo
        const ctxComparativo = document.getElementById('graficoComparativo')?.getContext('2d');
        if (ctxComparativo) {
            this.charts.comparativo = new Chart(ctxComparativo, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Vendas',
                            data: [],
                            backgroundColor: 'rgba(196, 167, 71, 0.8)'
                        },
                        {
                            label: 'Gastos',
                            data: [],
                            backgroundColor: 'rgba(185, 28, 60, 0.8)'
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
        
        // Gráfico de gastos
        const ctxGastos = document.getElementById('graficoGastos')?.getContext('2d');
        if (ctxGastos) {
            this.charts.gastos = new Chart(ctxGastos, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#c4a747',
                            '#b91c3c',
                            '#2196f3',
                            '#ff9800',
                            '#4caf50',
                            '#f44336',
                            '#9c27b0',
                            '#e91e63',
                            '#3f51b5',
                            '#00acc1'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', font: { size: 11 } }
                        }
                    }
                }
            });
        }
    },
    
    atualizarGraficos() {
        // Atualizar gráfico comparativo
        if (this.charts.comparativo) {
            const ultimos7Dias = [];
            const labels = [];
            
            for (let i = 6; i >= 0; i--) {
                const data = new Date();
                data.setDate(data.getDate() - i);
                const dataStr = data.toLocaleDateString('pt-BR');
                labels.push(dataStr);
                
                const vendasDia = this.dados.vendas
                    .filter(v => new Date(v.data_venda).toLocaleDateString('pt-BR') === dataStr)
                    .reduce((acc, v) => acc + v.total, 0);
                    
                const gastosDia = this.dados.gastos
                    .filter(g => new Date(g.data_gasto).toLocaleDateString('pt-BR') === dataStr)
                    .reduce((acc, g) => acc + g.valor, 0);
                
                ultimos7Dias.push({ vendas: vendasDia, gastos: gastosDia });
            }
            
            this.charts.comparativo.data.labels = labels;
            this.charts.comparativo.data.datasets[0].data = ultimos7Dias.map(d => d.vendas);
            this.charts.comparativo.data.datasets[1].data = ultimos7Dias.map(d => d.gastos);
            this.charts.comparativo.update();
        }
        
        // Atualizar gráfico de gastos
        if (this.charts.gastos) {
            const gastosPorCategoria = {};
            this.dados.gastos.forEach(g => {
                const categoria = g.categoria_nome || 'Outros';
                gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + g.valor;
            });
            
            const topCategorias = Object.entries(gastosPorCategoria)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 7);
            
            this.charts.gastos.data.labels = topCategorias.map(([cat]) => cat);
            this.charts.gastos.data.datasets[0].data = topCategorias.map(([, valor]) => valor);
            this.charts.gastos.update();
        }
    },
    
    exportarExcel() {
        const tipo = document.getElementById('periodoTipo').value;
        const data = new Date();
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        
        API.exportarResumo({ mes, ano });
        Notificacao.mostrar('Exportando relatório financeiro...', 'info');
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('financeiro.html')) {
        Financeiro.init();
    }
});