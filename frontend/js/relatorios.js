const Relatorios = {
    charts: {},
    
    async init() {
        await Auth.checkAuth();
        
        if (!Auth.isAdmin()) {
            window.location.href = '/dashboard.html';
            return;
        }
        
        this.configurarFiltros();
        await this.carregar();
    },
    
    configurarFiltros() {
        const tipoSelect = document.getElementById('tipoRelatorio');
        const filtroData = document.getElementById('filtroData');
        const filtroMesAno = document.getElementById('filtroMesAno');
        
        if (!tipoSelect || !filtroData || !filtroMesAno) {
            console.warn('⚠️ Elementos de filtro não encontrados - pode ser primeira carga');
            return;
        }
        
        tipoSelect.addEventListener('change', () => {
            const tipo = tipoSelect.value;
            
            // Esconder todos
            filtroData.style.display = 'none';
            filtroMesAno.style.display = 'none';
            
            // Mostrar o selecionado
            if (tipo === 'personalizado') {
                filtroData.style.display = 'flex';
            } else if (tipo === 'mensal' || tipo === 'anual') {
                filtroMesAno.style.display = 'flex';
            }
            
            // Recarregar automaticamente ao mudar
            this.carregar();
        });
    },
    
    async carregar() {
        try {
            UI.showLoading();
            
            const tipo = document.getElementById('tipoRelatorio')?.value || 'mensal';
            let params = {};
            
            if (tipo === 'diario') {
                const hoje = new Date().toISOString().split('T')[0];
                params = { data_inicio: hoje, data_fim: hoje };
            } 
            else if (tipo === 'mensal') {
                const mes = document.getElementById('mesRelatorio')?.value || new Date().getMonth() + 1;
                const ano = document.getElementById('anoRelatorio')?.value || new Date().getFullYear();
                const dataInicio = `${ano}-${mes.toString().padStart(2,'0')}-01`;
                const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0];
                params = { data_inicio: dataInicio, data_fim: dataFim };
            } 
            else if (tipo === 'anual') {
                const ano = document.getElementById('anoRelatorio')?.value || new Date().getFullYear();
                params = { data_inicio: `${ano}-01-01`, data_fim: `${ano}-12-31` };
            } 
            else {
                params = {
                    data_inicio: document.getElementById('dataInicio')?.value,
                    data_fim: document.getElementById('dataFim')?.value
                };
            }
            
            // Validar datas
            if (!params.data_inicio || !params.data_fim) {
                if (window.Notificacao) {
                    Notificacao.mostrar('Selecione as datas para gerar o relatório', 'warning');
                }
                UI.hideLoading();
                return;
            }
            
            console.log('🔍 Buscando relatório:', params);
            
            const queryString = new URLSearchParams(params).toString();
            const data = await API.request(`/relatorios/completo?${queryString}`);
            
            console.log('📊 Dados recebidos:', data);
            
            this.renderizar(data);
            
        } catch (error) {
            console.error('❌ Erro ao carregar relatórios:', error);
            
            let mensagem = 'Erro ao carregar relatórios';
            if (error.message.includes('404')) {
                mensagem = 'Rota de relatórios não encontrada no servidor';
            }
            
            if (window.Notificacao) {
                Notificacao.mostrar(mensagem, 'danger');
            }
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizar(data) {
        if (!data || !data.resumo) {
            console.error('❌ Dados inválidos:', data);
            return;
        }
        
        // Cards de resumo
        const elementos = {
            totalVendas: document.getElementById('totalVendas'),
            totalLucro: document.getElementById('totalLucro'),
            quantidadeVendas: document.getElementById('quantidadeVendas'),
            ticketMedio: document.getElementById('ticketMedio'),
            margemLucro: document.getElementById('margemLucro')
        };
        
        if (elementos.totalVendas) {
            elementos.totalVendas.textContent = UI.formatCurrency(data.resumo.total_vendas || 0);
        }
        if (elementos.totalLucro) {
            elementos.totalLucro.textContent = UI.formatCurrency(data.resumo.total_lucro || 0);
        }
        if (elementos.quantidadeVendas) {
            elementos.quantidadeVendas.textContent = data.resumo.quantidade_vendas || 0;
        }
        if (elementos.ticketMedio) {
            const ticket = data.resumo.ticket_medio || 0;
            elementos.ticketMedio.textContent = UI.formatCurrency(ticket);
        }
        if (elementos.margemLucro) {
            const margem = data.resumo.margem_lucro || 0;
            elementos.margemLucro.textContent = margem + '%';
        }
        
        // Tabelas
        this.renderizarTabelaProdutos(data.produtos_mais_vendidos);
        this.renderizarTabelaCategorias(data.categorias_mais_vendidas);
        
        // Gráficos
        this.atualizarGraficos(data);
    },
    
    renderizarTabelaProdutos(produtos) {
        const tbody = document.querySelector('#tabelaProdutos tbody');
        if (!tbody) return;
        
        if (!produtos || produtos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 30px;">Nenhum produto vendido no período</td></tr>';
            return;
        }
        
        tbody.innerHTML = produtos.map(p => `
            <tr>
                <td><strong>${p.nome || 'Produto'}</strong></td>
                <td style="text-align: center;">${p.quantidade_vendida || 0}</td>
                <td style="text-align: right; color: var(--accent-primary);">${UI.formatCurrency(p.faturamento || 0)}</td>
            </tr>
        `).join('');
    },
    
    renderizarTabelaCategorias(categorias) {
        const tbody = document.querySelector('#tabelaCategorias tbody');
        if (!tbody) return;
        
        if (!categorias || categorias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 30px;">Nenhuma categoria vendida</td></tr>';
            return;
        }
        
        tbody.innerHTML = categorias.map(c => `
            <tr>
                <td>
                    <span style="display:inline-block; width:12px; height:12px; background:${c.cor || '#c4a747'}; border-radius:4px; margin-right:8px;"></span>
                    ${c.categoria || 'Categoria'}
                </td>
                <td style="text-align: center;">${c.quantidade_total || 0}</td>
                <td style="text-align: right; color: var(--accent-primary);">${UI.formatCurrency(c.faturamento || 0)}</td>
            </tr>
        `).join('');
    },
    
    atualizarGraficos(data) {
        this.destruirGraficos();
        
        // Gráfico de vendas por dia
        this.criarGraficoVendas(data.vendas_por_dia);
        
        // Gráfico de pagamentos
        this.criarGraficoPagamentos(data.vendas_por_pagamento);
    },
    
    criarGraficoVendas(vendasPorDia) {
        const ctx = document.getElementById('graficoVendasDia');
        if (!ctx) return;
        
        if (!vendasPorDia || vendasPorDia.length === 0) {
            // Mostrar mensagem no canvas
            const canvasCtx = ctx.getContext('2d');
            canvasCtx.clearRect(0, 0, ctx.width, ctx.height);
            canvasCtx.font = '14px Arial';
            canvasCtx.fillStyle = '#94a3b8';
            canvasCtx.textAlign = 'center';
            canvasCtx.fillText('Sem dados para exibir', ctx.width/2, ctx.height/2);
            return;
        }
        
        try {
            this.charts.vendas = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: vendasPorDia.map(d => {
                        const data = new Date(d.dia);
                        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    }),
                    datasets: [{
                        label: 'Vendas (R$)',
                        data: vendasPorDia.map(d => d.total || 0),
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
                            ticks: { color: '#94a3b8', maxRotation: 45 }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Erro ao criar gráfico de vendas:', e);
        }
    },
    
    criarGraficoPagamentos(vendasPorPagamento) {
        const ctx = document.getElementById('graficoPagamentos');
        if (!ctx) return;
        
        if (!vendasPorPagamento || vendasPorPagamento.length === 0) {
            const canvasCtx = ctx.getContext('2d');
            canvasCtx.clearRect(0, 0, ctx.width, ctx.height);
            canvasCtx.font = '14px Arial';
            canvasCtx.fillStyle = '#94a3b8';
            canvasCtx.textAlign = 'center';
            canvasCtx.fillText('Sem dados para exibir', ctx.width/2, ctx.height/2);
            return;
        }
        
        try {
            this.charts.pagamentos = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: vendasPorPagamento.map(p => p.forma_pagamento || 'Outros'),
                    datasets: [{
                        data: vendasPorPagamento.map(p => p.total || 0),
                        backgroundColor: ['#c4a747', '#b91c3c', '#2196f3', '#4caf50', '#ff9800', '#9c27b0'],
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
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.raw / total) * 100).toFixed(1);
                                    return `${context.label}: ${UI.formatCurrency(context.raw)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Erro ao criar gráfico de pagamentos:', e);
        }
    },
    
    destruirGraficos() {
        try {
            if (this.charts.vendas) {
                this.charts.vendas.destroy();
                this.charts.vendas = null;
            }
        } catch (e) {}
        
        try {
            if (this.charts.pagamentos) {
                this.charts.pagamentos.destroy();
                this.charts.pagamentos = null;
            }
        } catch (e) {}
    },
    
    exportarPDF() {
        if (window.Notificacao) {
            Notificacao.mostrar('📄 Funcionalidade de exportação PDF em desenvolvimento', 'info', 3000);
        } else {
            alert('Funcionalidade de exportação PDF em desenvolvimento');
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('relatorios.html')) {
        // Pequeno delay para garantir que o DOM está pronto
        setTimeout(() => {
            Relatorios.init();
        }, 100);
    }
});

window.Relatorios = Relatorios;