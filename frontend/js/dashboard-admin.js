// ============================================
// DASHBOARD ADMIN - VERSÃO OTIMIZADA (SEM LOOP)
// ============================================
const DashboardAdmin = {
    charts: {},
    data: {},
    refreshInterval: null,
    loading: false,
    isDestroyed: false,
    filtroAtual: {
        tipo: 'mes',
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
    },
    
    destroy() {
        this.isDestroyed = true;
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.destruirGraficos();
    },
    
    async init() {
        if (this.isDestroyed) {
            console.log('Dashboard foi destruído, recriando...');
            this.isDestroyed = false;
        }
        
        await Auth.checkAuth();
        
        const user = Auth.getCurrentUser();
        if (!user || user.role !== 'admin') {
            window.location.href = '/vendas.html';
            return;
        }
        
        const userNomeSpan = document.getElementById('userNome');
        if (userNomeSpan) {
            userNomeSpan.textContent = user.nome || user.username;
        }
        
        const userRoleSpan = document.getElementById('userRole');
        if (userRoleSpan) {
            userRoleSpan.textContent = 'Admin';
            userRoleSpan.className = 'badge badge-success';
        }
        
        this.adicionarFiltro();
        this.destruirGraficos();
        await this.carregarDados();
        
        setTimeout(() => {
            if (!this.isDestroyed) {
                this.inicializarGraficos();
            }
        }, 100);
        
        this.configurarAtualizacao();
    },
    
    adicionarFiltro() {
        if (document.getElementById('filtroDashboard')) return;
        
        const topBar = document.querySelector('.top-bar');
        if (!topBar) return;
        
        const filtroDiv = document.createElement('div');
        filtroDiv.id = 'filtroDashboard';
        filtroDiv.style.display = 'flex';
        filtroDiv.style.gap = '10px';
        filtroDiv.style.margin = '15px 0';
        filtroDiv.style.flexWrap = 'wrap';
        filtroDiv.style.justifyContent = 'center';
        filtroDiv.style.alignItems = 'center';
        
        filtroDiv.innerHTML = `
            <select id="filtroTipo" style="padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                <option value="mes">Mês</option>
                <option value="ano">Ano</option>
            </select>
            
            <div id="filtroMesContainer" style="display: inline-block;">
                <select id="filtroMes" style="padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                    ${this.gerarOptionsMeses()}
                </select>
            </div>
            
            <div id="filtroAnoContainer" style="display: inline-block;">
                <input type="number" id="filtroAno" value="${new Date().getFullYear()}" min="2020" max="2030" style="width: 100px; padding: 8px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
            </div>
            
            <button class="btn btn-primary btn-sm" onclick="DashboardAdmin.aplicarFiltro()">Filtrar</button>
            <button class="btn btn-secondary btn-sm" onclick="DashboardAdmin.limparFiltro()">Mês Atual</button>
        `;
        
        topBar.parentNode.insertBefore(filtroDiv, topBar.nextSibling);
        
        document.getElementById('filtroTipo').addEventListener('change', (e) => {
            const tipo = e.target.value;
            const mesContainer = document.getElementById('filtroMesContainer');
            if (mesContainer) {
                mesContainer.style.display = tipo === 'mes' ? 'inline-block' : 'none';
            }
        });
    },
    
    gerarOptionsMeses() {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesAtual = new Date().getMonth() + 1;
        return meses.map((mes, i) => 
            `<option value="${i + 1}" ${i + 1 === mesAtual ? 'selected' : ''}>${mes}</option>`
        ).join('');
    },
    
    aplicarFiltro() {
        const tipo = document.getElementById('filtroTipo')?.value;
        const mes = document.getElementById('filtroMes')?.value;
        const ano = document.getElementById('filtroAno')?.value;
        
        this.filtroAtual = {
            tipo: tipo || 'mes',
            mes: tipo === 'mes' ? parseInt(mes) : null,
            ano: parseInt(ano)
        };
        
        this.carregarDados();
    },
    
    limparFiltro() {
        const hoje = new Date();
        this.filtroAtual = {
            tipo: 'mes',
            mes: hoje.getMonth() + 1,
            ano: hoje.getFullYear()
        };
        
        const tipoSelect = document.getElementById('filtroTipo');
        const mesSelect = document.getElementById('filtroMes');
        const anoInput = document.getElementById('filtroAno');
        
        if (tipoSelect) tipoSelect.value = 'mes';
        if (mesSelect) mesSelect.value = this.filtroAtual.mes;
        if (anoInput) anoInput.value = this.filtroAtual.ano;
        
        const mesContainer = document.getElementById('filtroMesContainer');
        if (mesContainer) mesContainer.style.display = 'inline-block';
        
        this.carregarDados();
    },
    
    destruirGraficos() {
        try {
            if (this.charts.vendas) {
                this.charts.vendas.destroy();
                this.charts.vendas = null;
            }
            if (this.charts.produtos) {
                this.charts.produtos.destroy();
                this.charts.produtos = null;
            }
        } catch (e) {
            console.warn('Erro ao destruir gráficos:', e);
        }
    },
    
    async carregarDados() {
        if (this.loading) {
            console.log('⏳ Carregamento já em andamento, ignorando...');
            return;
        }
        
        this.loading = true;
        
        try {
            UI.showLoading();
            
            let dataInicio, dataFim;
            
            if (this.filtroAtual.tipo === 'mes') {
                dataInicio = new Date(this.filtroAtual.ano, this.filtroAtual.mes - 1, 1);
                dataFim = new Date(this.filtroAtual.ano, this.filtroAtual.mes, 0);
            } else {
                dataInicio = new Date(this.filtroAtual.ano, 0, 1);
                dataFim = new Date(this.filtroAtual.ano, 11, 31);
            }
            
            const dataInicioStr = dataInicio.toISOString().split('T')[0];
            const dataFimStr = dataFim.toISOString().split('T')[0];
            
            console.log('🔍 Buscando dados de:', dataInicioStr, 'até', dataFimStr);
            
            // Buscar vendas do período (UMA VEZ)
            const response = await API.listarVendas({ 
                data_inicio: dataInicioStr,
                data_fim: dataFimStr,
                limite: 1000
            });
            
            const vendas = response.vendas || [];
            console.log('📊 Vendas encontradas:', vendas.length);
            
            // Calcular totais do período
            let totalVendasPeriodo = 0;
            let totalLucroPeriodo = 0;
            
            vendas.forEach(v => {
                totalVendasPeriodo += v.total || 0;
                totalLucroPeriodo += v.lucro || 0;
            });
            
            // Dados do dia
            const hoje = new Date().toISOString().split('T')[0];
            const vendasHojeResponse = await API.listarVendas({ 
                data_inicio: hoje,
                data_fim: hoje,
                limite: 100
            });
            
            const vendasHoje = vendasHojeResponse.vendas || [];
            let totalVendasHoje = 0;
            let totalLucroHoje = 0;
            let quantidadeHoje = 0;
            
            vendasHoje.forEach(v => {
                totalVendasHoje += v.total || 0;
                totalLucroHoje += v.lucro || 0;
                quantidadeHoje++;
            });
            
            // Calcular vendas dos últimos 7 dias
            const ultimos7Dias = [];
            for (let i = 6; i >= 0; i--) {
                const data = new Date();
                data.setDate(data.getDate() - i);
                const dataStr = data.toISOString().split('T')[0];
                
                const vendasDia = vendas.filter(v => 
                    v.data_venda && v.data_venda.split('T')[0] === dataStr
                );
                
                const totalDia = vendasDia.reduce((acc, v) => acc + (v.total || 0), 0);
                
                ultimos7Dias.push({
                    data: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
                    total: totalDia
                });
            }
            
            // ============================================
            // PRODUTOS MAIS VENDIDOS - SEM LOOP DE REQUISIÇÕES!
            // Usa apenas os dados que já temos
            // ============================================
            const produtosMap = new Map();
            
            for (const venda of vendas) {
                // Se a venda já tem os itens, use-os
                if (venda.itens && Array.isArray(venda.itens)) {
                    venda.itens.forEach(item => {
                        const key = item.produto_id || item.id;
                        if (!produtosMap.has(key)) {
                            produtosMap.set(key, {
                                id: key,
                                nome: item.produto_nome || item.nome || 'Produto',
                                quantidade: 0
                            });
                        }
                        produtosMap.get(key).quantidade += item.quantidade || 0;
                    });
                }
            }
            
            const produtosMaisVendidos = Array.from(produtosMap.values())
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 5);
            
            console.log('🏆 Produtos mais vendidos:', produtosMaisVendidos);
            
            // Buscar estoque baixo (UMA REQUISIÇÃO)
            let estoqueBaixo = [];
            try {
                estoqueBaixo = await API.estoqueBaixo();
            } catch (e) {
                console.warn('Erro ao buscar estoque baixo:', e);
            }
            
            // Últimas vendas (UMA REQUISIÇÃO)
            let ultimasVendas = [];
            try {
                const ultimasVendasResponse = await API.listarVendas({ limite: 5 });
                ultimasVendas = ultimasVendasResponse.vendas || [];
            } catch (e) {
                console.warn('Erro ao buscar últimas vendas:', e);
            }
            
            const ticketMedio = quantidadeHoje > 0 ? (totalVendasHoje / quantidadeHoje) : 0;
            
            this.data = {
                vendasHoje: totalVendasHoje,
                lucroHoje: totalLucroHoje,
                quantidadeHoje,
                vendasPeriodo: totalVendasPeriodo,
                lucroPeriodo: totalLucroPeriodo,
                quantidadePeriodo: vendas.length,
                vendasSemana: ultimos7Dias.reduce((acc, d) => acc + d.total, 0),
                lucroSemana: ultimos7Dias.reduce((acc, d) => acc + (d.total * 0.3), 0),
                vendasPorDia: ultimos7Dias,
                produtosMaisVendidos,
                estoqueBaixo,
                ultimasVendas,
                ticketMedio
            };
            
            this.atualizarCards();
            this.atualizarInfoFiltro();
            this.atualizarGraficos();
            this.mostrarEstoqueBaixo();
            this.mostrarProdutosMaisVendidos();
            this.mostrarUltimasVendas();
            this.atualizarPagamentos();
            
            console.log('✅ Dashboard carregado com sucesso! Total de requisições:', API._requestCount);
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            UI.showToast('Erro ao carregar dados do dashboard', 'error');
        } finally {
            UI.hideLoading();
            this.loading = false;
        }
    },
    
    atualizarInfoFiltro() {
        let periodoInfo = document.getElementById('periodoInfo');
        if (!periodoInfo) {
            periodoInfo = document.createElement('div');
            periodoInfo.id = 'periodoInfo';
            periodoInfo.style.textAlign = 'center';
            periodoInfo.style.marginBottom = '10px';
            periodoInfo.style.padding = '5px 15px';
            periodoInfo.style.borderRadius = '20px';
            periodoInfo.style.fontSize = '14px';
            periodoInfo.style.color = 'var(--text-secondary)';
            periodoInfo.style.background = 'var(--bg-tertiary)';
            
            const statsGrid = document.querySelector('.dashboard-stats');
            if (statsGrid && statsGrid.parentNode) {
                statsGrid.parentNode.insertBefore(periodoInfo, statsGrid);
            }
        }
        
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        if (this.filtroAtual.tipo === 'mes') {
            periodoInfo.textContent = `📅 Período filtrado: ${meses[this.filtroAtual.mes - 1]} de ${this.filtroAtual.ano}`;
        } else {
            periodoInfo.textContent = `📅 Período filtrado: Ano de ${this.filtroAtual.ano}`;
        }
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
            elementos.vendasHoje.textContent = UI.formatCurrency(this.data.vendasHoje || 0);
        }
        if (elementos.lucroHoje) {
            elementos.lucroHoje.textContent = UI.formatCurrency(this.data.lucroHoje || 0);
        }
        if (elementos.vendasSemana) {
            elementos.vendasSemana.textContent = UI.formatCurrency(this.data.vendasSemana || 0);
        }
        if (elementos.lucroSemana) {
            elementos.lucroSemana.textContent = UI.formatCurrency(this.data.lucroSemana || 0);
        }
        if (elementos.vendasMes) {
            elementos.vendasMes.textContent = UI.formatCurrency(this.data.vendasPeriodo || 0);
        }
        if (elementos.estoqueBaixo) {
            elementos.estoqueBaixo.textContent = this.data.estoqueBaixo?.length || 0;
        }
        if (elementos.ticketMedio) {
            elementos.ticketMedio.textContent = UI.formatCurrency(this.data.ticketMedio || 0);
        }
    },
    
    async atualizarPagamentos() {
        const container = document.getElementById('pagamentosHoje');
        if (!container) return;
        
        try {
            const hoje = new Date().toISOString().split('T')[0];
            const response = await API.listarVendas({ 
                data_inicio: hoje,
                data_fim: hoje,
                limite: 100
            });
            
            const vendas = response.vendas || [];
            
            const pagamentos = {};
            vendas.forEach(v => {
                const forma = v.forma_pagamento || 'Outros';
                if (!pagamentos[forma]) {
                    pagamentos[forma] = {
                        forma: forma,
                        quantidade: 0,
                        total: 0
                    };
                }
                pagamentos[forma].quantidade += 1;
                pagamentos[forma].total += v.total || 0;
            });
            
            const pagamentosArray = Object.values(pagamentos);
            
            if (pagamentosArray.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhuma venda hoje</p>';
                return;
            }
            
            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    ${pagamentosArray.map(p => `
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 18px; font-weight: bold; color: var(--accent-primary);">${p.forma}</div>
                            <div style="font-size: 20px; font-weight: 600; margin: 5px 0;">${UI.formatCurrency(p.total)}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">${p.quantidade} venda(s)</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Erro ao carregar pagamentos:', error);
            container.innerHTML = '<p style="color: var(--text-muted);">Erro ao carregar dados</p>';
        }
    },
    
    inicializarGraficos() {
        this.recriarCanvases();
        
        const ctxVendas = document.getElementById('graficoVendasSemana');
        if (ctxVendas && !this.charts.vendas) {
            try {
                this.charts.vendas = new Chart(ctxVendas, {
                    type: 'line',
                    data: {
                        labels: this.data.vendasPorDia?.map(d => d.data) || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                        datasets: [{
                            label: 'Vendas (R$)',
                            data: this.data.vendasPorDia?.map(d => d.total) || [0,0,0,0,0,0,0],
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
                        plugins: { legend: { display: false } },
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
            } catch (e) {
                console.error('Erro ao criar gráfico de vendas:', e);
            }
        }
        
        const ctxProdutos = document.getElementById('graficoProdutos');
        if (ctxProdutos && this.data.produtosMaisVendidos.length > 0 && !this.charts.produtos) {
            try {
                this.charts.produtos = new Chart(ctxProdutos, {
                    type: 'bar',
                    data: {
                        labels: this.data.produtosMaisVendidos.map(p => 
                            p.nome.length > 10 ? p.nome.substring(0, 10) + '...' : p.nome
                        ),
                        datasets: [{
                            label: 'Quantidade Vendida',
                            data: this.data.produtosMaisVendidos.map(p => p.quantidade),
                            backgroundColor: '#c4a747',
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: '#2d3540' },
                                ticks: { color: '#94a3b8', stepSize: 1 }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '#94a3b8', maxRotation: 45 }
                            }
                        }
                    }
                });
            } catch (e) {
                console.error('Erro ao criar gráfico de produtos:', e);
            }
        }
    },
    
    atualizarGraficos() {
        if (this.charts.vendas && this.data.vendasPorDia) {
            this.charts.vendas.data.datasets[0].data = this.data.vendasPorDia.map(d => d.total);
            this.charts.vendas.update();
        }
        
        if (this.charts.produtos && this.data.produtosMaisVendidos.length > 0) {
            this.charts.produtos.data.labels = this.data.produtosMaisVendidos.map(p => 
                p.nome.length > 10 ? p.nome.substring(0, 10) + '...' : p.nome
            );
            this.charts.produtos.data.datasets[0].data = this.data.produtosMaisVendidos.map(p => p.quantidade);
            this.charts.produtos.update();
        }
    },
    
    recriarCanvases() {
        const recriarCanvas = (id) => {
            const oldCanvas = document.getElementById(id);
            if (oldCanvas) {
                const parent = oldCanvas.parentNode;
                const newCanvas = document.createElement('canvas');
                newCanvas.id = id;
                newCanvas.style.width = '100%';
                newCanvas.style.height = '100%';
                parent.replaceChild(newCanvas, oldCanvas);
            }
        };
        
        recriarCanvas('graficoVendasSemana');
        recriarCanvas('graficoProdutos');
    },
    
    mostrarEstoqueBaixo() {
        const container = document.getElementById('estoqueBaixoLista');
        if (!container) return;
        
        if (!this.data.estoqueBaixo || this.data.estoqueBaixo.length === 0) {
            container.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px;">✅ Todos os produtos estão com estoque adequado</div>`;
            return;
        }
        
        container.innerHTML = this.data.estoqueBaixo.slice(0, 5).map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div>
                    <strong>${p.nome}</strong><br>
                    <small style="color: var(--text-muted);">Estoque: ${p.quantidade} unidades</small>
                </div>
                <button class="btn btn-primary btn-sm" onclick="if(window.Produtos) Produtos.abrirModalEstoque(${p.id})">Repor</button>
            </div>
        `).join('');
    },
    
    mostrarProdutosMaisVendidos() {
        const container = document.getElementById('produtoMaisVendido');
        if (!container) return;
        
        if (this.data.produtosMaisVendidos.length > 0) {
            const top3 = this.data.produtosMaisVendidos.slice(0, 3);
            container.innerHTML = `
                <div style="padding: 10px;">
                    ${top3.map((p, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: ${index < top3.length-1 ? '1px solid var(--border-color)' : 'none'};">
                            <div><span style="color: var(--accent-primary); font-weight: bold;">${index+1}º</span> ${p.nome}</div>
                            <span style="color: var(--text-muted);">${p.quantidade} vendidos</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhuma venda registrada</div>`;
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
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        // Atualizar a cada 60 segundos
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && !this.loading && !this.isDestroyed) {
                this.carregarDados();
            }
        }, 60000);
    }
};

// Inicializar
if (typeof window !== 'undefined') {
    window.DashboardAdmin = DashboardAdmin;
}