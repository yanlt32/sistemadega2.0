const HistoricoVendas = {
    paginaAtual: 1,
    totalPaginas: 1,
    filtros: {
        dataInicio: '',
        dataFim: ''
    },
    vendaSelecionada: null,
    
    async init() {
        await Auth.checkAuth();
        this.setupEventListeners();
        await this.carregar();
    },
    
    setupEventListeners() {
        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.fecharModal();
                this.fecharModalConfirmacao();
            }
        });
    },
    
    async carregar() {
        try {
            UI.showLoading();
            
            const params = {
                pagina: this.paginaAtual,
                limite: 15
            };
            
            if (this.filtros.dataInicio) {
                params.data_inicio = this.filtros.dataInicio;
            }
            if (this.filtros.dataFim) {
                params.data_fim = this.filtros.dataFim;
            }
            
            const data = await API.listarVendas(params);
            console.log('Vendas carregadas:', data);
            
            this.renderizarTabela(data.vendas || []);
            this.totalPaginas = data.totalPaginas || 1;
            this.renderizarPaginacao();
            
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            App.showNotification('Erro ao carregar histórico', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizarTabela(vendas) {
        const tbody = document.getElementById('tabelaHistorico');
        if (!tbody) return;
        
        if (vendas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 50px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                        <h3>Nenhuma venda encontrada</h3>
                        <p style="color: var(--text-muted);">Faça uma venda na página de vendas</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = vendas.map(v => {
            const data = new Date(v.data_venda);
            const dataFormatada = data.toLocaleDateString('pt-BR') + ' ' + 
                                 data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const statusClass = v.status === 'concluida' ? 'badge-success' : 
                               v.status === 'cancelada' ? 'badge-danger' : 'badge-warning';
            
            return `
            <tr>
                <td><strong>#${v.id}</strong></td>
                <td>${dataFormatada}</td>
                <td>${v.total_itens || 0} itens</td>
                <td>${UI.formatCurrency(v.total)}</td>
                <td>${UI.formatCurrency(v.lucro)}</td>
                <td>${v.forma_pagamento || '-'}</td>
                <td><span class="badge ${statusClass}">${v.status || 'concluida'}</span></td>
                <td>${v.usuario_nome || 'Sistema'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="HistoricoVendas.verDetalhes(${v.id})" title="Ver detalhes">
                        👁️
                    </button>
                    ${v.status === 'concluida' ? `
                        <button class="btn btn-danger btn-sm" onclick="HistoricoVendas.abrirModalExclusao(${v.id})" title="Excluir venda">
                            🗑️
                        </button>
                    ` : ''}
                </td>
            </tr>
        `}).join('');
    },
    
    renderizarPaginacao() {
        const container = document.getElementById('paginacao');
        if (!container) return;
        
        if (this.totalPaginas <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        html += `<button onclick="HistoricoVendas.irParaPagina(${this.paginaAtual - 1})" 
                 ${this.paginaAtual === 1 ? 'disabled' : ''}>◀</button>`;
        
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (i === 1 || i === this.totalPaginas || 
                (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)) {
                html += `<button class="${i === this.paginaAtual ? 'active' : ''}" 
                         onclick="HistoricoVendas.irParaPagina(${i})">${i}</button>`;
            } else if (i === this.paginaAtual - 3 || i === this.paginaAtual + 3) {
                html += `<button disabled>...</button>`;
            }
        }
        
        html += `<button onclick="HistoricoVendas.irParaPagina(${this.paginaAtual + 1})"
                 ${this.paginaAtual === this.totalPaginas ? 'disabled' : ''}>▶</button>`;
        
        container.innerHTML = html;
    },
    
    irParaPagina(pagina) {
        if (pagina < 1 || pagina > this.totalPaginas) return;
        this.paginaAtual = pagina;
        this.carregar();
    },
    
    filtrar() {
        this.filtros.dataInicio = document.getElementById('dataInicio')?.value;
        this.filtros.dataFim = document.getElementById('dataFim')?.value;
        this.paginaAtual = 1;
        this.carregar();
    },
    
    limparFiltros() {
        document.getElementById('dataInicio').value = '';
        document.getElementById('dataFim').value = '';
        this.filtros = { dataInicio: '', dataFim: '' };
        this.paginaAtual = 1;
        this.carregar();
    },
    
    async verDetalhes(id) {
        try {
            UI.showLoading();
            const venda = await API.buscarVenda(id);
            this.mostrarDetalhes(venda);
        } catch (error) {
            App.showNotification('Erro ao carregar detalhes', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    mostrarDetalhes(venda) {
        this.vendaSelecionada = venda;
        
        document.getElementById('detalhesVendaId').textContent = venda.id;
        document.getElementById('detalhesData').textContent = new Date(venda.data_venda).toLocaleString('pt-BR');
        document.getElementById('detalhesPagamento').textContent = venda.forma_pagamento;
        document.getElementById('detalhesStatus').innerHTML = `<span class="badge badge-${venda.status}">${venda.status}</span>`;
        document.getElementById('detalhesTotal').textContent = UI.formatCurrency(venda.total);
        document.getElementById('detalhesLucro').textContent = UI.formatCurrency(venda.lucro);
        document.getElementById('detalhesVendedor').textContent = venda.usuario_nome || 'Sistema';
        document.getElementById('detalhesObservacao').textContent = venda.observacao || 'Sem observação';
        
        const itensTbody = document.getElementById('detalhesItens');
        itensTbody.innerHTML = venda.itens.map(item => `
            <tr>
                <td>${item.produto_nome}</td>
                <td>${item.quantidade}</td>
                <td>${UI.formatCurrency(item.preco_unitario)}</td>
                <td>${UI.formatCurrency(item.preco_unitario * item.quantidade)}</td>
            </tr>
        `).join('');
        
        document.getElementById('detalhesTotalFinal').textContent = UI.formatCurrency(venda.total);
        
        // Mostrar/esconder botão de excluir baseado no status
        const btnExcluir = document.getElementById('btnExcluirVenda');
        if (btnExcluir) {
            btnExcluir.style.display = venda.status === 'concluida' ? 'inline-block' : 'none';
        }
        
        document.getElementById('modalDetalhesVenda').style.display = 'block';
    },
    
    abrirModalExclusao(id) {
        this.vendaSelecionada = { id };
        document.getElementById('modalConfirmarExclusao').style.display = 'block';
    },
    
    fecharModal() {
        document.getElementById('modalDetalhesVenda').style.display = 'none';
    },
    
    fecharModalConfirmacao() {
        document.getElementById('modalConfirmarExclusao').style.display = 'none';
    },
    
    async excluirVenda() {
        this.fecharModal();
        this.abrirModalExclusao(this.vendaSelecionada.id);
    },
    
    async confirmarExclusao() {
        try {
            UI.showLoading();
            await API.excluirVenda(this.vendaSelecionada.id);
            App.showNotification('Venda excluída com sucesso!', 'success');
            this.fecharModalConfirmacao();
            this.fecharModal();
            await this.carregar();
        } catch (error) {
            App.showNotification('Erro ao excluir venda: ' + error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    }
};

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    HistoricoVendas.init();
});