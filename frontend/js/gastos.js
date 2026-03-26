// ============================================
// MÓDULO DE GASTOS
// ============================================
const Gastos = {
    paginaAtual: 1,
    totalPaginas: 1,
    filtros: {
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        categoria: ''
    },
    categorias: [],
    formasPagamento: [],
    gastoEditando: null,
    
    async init() {
        await Auth.checkAuth();
        
        if (!Auth.isAdmin()) {
            window.location.href = '/dashboard.html';
            return;
        }
        
        await this.carregarCategorias();
        await this.carregarFormasPagamento();
        this.setupEventListeners();
        await this.carregarGastos();
        await this.carregarResumoRapido();
    },
    
    setupEventListeners() {
        const btnNovo = document.getElementById('btnNovoGasto');
        if (btnNovo) btnNovo.addEventListener('click', () => this.abrirModal());
        
        const btnResumo = document.getElementById('btnResumoMensal');
        if (btnResumo) btnResumo.addEventListener('click', () => this.abrirModalResumo());
        
        const btnExportar = document.getElementById('btnExportarExcel');
        if (btnExportar) btnExportar.addEventListener('click', () => this.exportarExcel());
        
        const btnFiltrar = document.getElementById('btnFiltrar');
        if (btnFiltrar) btnFiltrar.addEventListener('click', () => this.aplicarFiltros());
        
        const btnLimpar = document.getElementById('btnLimparFiltros');
        if (btnLimpar) btnLimpar.addEventListener('click', () => this.limparFiltros());
        
        const formGasto = document.getElementById('formGasto');
        if (formGasto) {
            formGasto.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvar();
            });
        }
        
        const closeBtn = document.querySelector('#modalGasto .close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.fecharModal());
        
        const closeResumoBtn = document.querySelector('#modalResumo .close');
        if (closeResumoBtn) closeResumoBtn.addEventListener('click', () => this.fecharModalResumo());
        
        // Fechar modal com clique fora
        window.addEventListener('click', (e) => {
            const modalGasto = document.getElementById('modalGasto');
            if (e.target === modalGasto) this.fecharModal();
            
            const modalResumo = document.getElementById('modalResumo');
            if (e.target === modalResumo) this.fecharModalResumo();
        });
        
        // Atualizar resumo ao mudar mês/ano
        const resumoMes = document.getElementById('resumoMes');
        const resumoAno = document.getElementById('resumoAno');
        if (resumoMes) resumoMes.addEventListener('change', () => this.carregarResumo());
        if (resumoAno) resumoAno.addEventListener('change', () => this.carregarResumo());
    },
    
    async carregarCategorias() {
        try {
            this.categorias = await API.listarCategoriasGastos();
            
            // Preencher select do filtro
            const filtroSelect = document.getElementById('filtroCategoria');
            if (filtroSelect) {
                filtroSelect.innerHTML = '<option value="">Todas categorias</option>' +
                    this.categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            }
            
            // Preencher select do modal
            const modalSelect = document.getElementById('gastoCategoria');
            if (modalSelect) {
                modalSelect.innerHTML = '<option value="">Selecione uma categoria</option>' +
                    this.categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            App.showNotification('Erro ao carregar categorias', 'danger');
        }
    },
    
    async carregarFormasPagamento() {
        try {
            this.formasPagamento = await API.listarFormasPagamento();
            
            const select = document.getElementById('gastoPagamento');
            if (select) {
                select.innerHTML = '<option value="">Selecione</option>' +
                    this.formasPagamento.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar formas de pagamento:', error);
        }
    },
    
    async carregarGastos() {
        try {
            UI.showLoading();
            
            const params = {
                page: this.paginaAtual,
                limit: 15,
                mes: this.filtros.mes,
                ano: this.filtros.ano
            };
            
            if (this.filtros.categoria) {
                params.categoria = this.filtros.categoria;
            }
            
            const data = await API.listarGastos(params);
            
            this.renderizarTabela(data.gastos || []);
            this.totalPaginas = data.totalPages || 1;
            this.renderizarPaginacao();
            
        } catch (error) {
            console.error('Erro ao carregar gastos:', error);
            App.showNotification('Erro ao carregar gastos', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizarTabela(gastos) {
        const tbody = document.querySelector('#tabelaGastos tbody');
        if (!tbody) return;
        
        if (gastos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">💸</div>
                        <h3>Nenhum gasto encontrado</h3>
                        <p style="color: var(--text-muted);">Clique em "Novo Gasto" para registrar</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = gastos.map(g => `
            <tr>
                <td>${new Date(g.data_gasto).toLocaleDateString('pt-BR')}</td>
                <td><strong>${g.descricao}</strong></td>
                <td>
                    <span class="badge" style="background: ${g.categoria_cor || '#c4a747'}; color: white;">
                        ${g.categoria_nome || 'Sem categoria'}
                    </span>
                </td>
                <td><strong style="color: var(--danger);">${UI.formatCurrency(g.valor)}</strong></td>
                <td>${g.forma_pagamento_nome || '-'}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-primary btn-sm" onclick="Gastos.editar(${g.id})" title="Editar">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="Gastos.excluir(${g.id})" title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    renderizarPaginacao() {
        const container = document.getElementById('paginacao');
        if (!container) return;
        
        if (this.totalPaginas <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        html += `<button onclick="Gastos.irParaPagina(${this.paginaAtual - 1})" 
                 ${this.paginaAtual === 1 ? 'disabled' : ''}>◀</button>`;
        
        for (let i = 1; i <= this.totalPaginas; i++) {
            if (i === 1 || i === this.totalPaginas || 
                (i >= this.paginaAtual - 2 && i <= this.paginaAtual + 2)) {
                html += `<button class="${i === this.paginaAtual ? 'active' : ''}" 
                         onclick="Gastos.irParaPagina(${i})">${i}</button>`;
            } else if (i === this.paginaAtual - 3 || i === this.paginaAtual + 3) {
                html += `<button disabled>...</button>`;
            }
        }
        
        html += `<button onclick="Gastos.irParaPagina(${this.paginaAtual + 1})"
                 ${this.paginaAtual === this.totalPaginas ? 'disabled' : ''}>▶</button>`;
        
        container.innerHTML = html;
    },
    
    irParaPagina(pagina) {
        if (pagina < 1 || pagina > this.totalPaginas) return;
        this.paginaAtual = pagina;
        this.carregarGastos();
    },
    
    aplicarFiltros() {
        const mesSelect = document.getElementById('filtroMes');
        const anoInput = document.getElementById('filtroAno');
        const categoriaSelect = document.getElementById('filtroCategoria');
        
        this.filtros.mes = mesSelect ? parseInt(mesSelect.value) : new Date().getMonth() + 1;
        this.filtros.ano = anoInput ? parseInt(anoInput.value) : new Date().getFullYear();
        this.filtros.categoria = categoriaSelect ? categoriaSelect.value : '';
        
        this.paginaAtual = 1;
        this.carregarGastos();
        this.carregarResumoRapido();
    },
    
    limparFiltros() {
        this.filtros = {
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear(),
            categoria: ''
        };
        
        const mesSelect = document.getElementById('filtroMes');
        const anoInput = document.getElementById('filtroAno');
        const categoriaSelect = document.getElementById('filtroCategoria');
        
        if (mesSelect) mesSelect.value = this.filtros.mes;
        if (anoInput) anoInput.value = this.filtros.ano;
        if (categoriaSelect) categoriaSelect.value = '';
        
        this.paginaAtual = 1;
        this.carregarGastos();
        this.carregarResumoRapido();
    },
    
    async carregarResumoRapido() {
        try {
            const resumo = await API.resumoMensalGastos({
                mes: this.filtros.mes,
                ano: this.filtros.ano
            });
            
            const gastosMesEl = document.getElementById('gastosMes');
            const qtdGastosEl = document.getElementById('qtdGastos');
            const maiorGastoEl = document.getElementById('maiorGasto');
            
            if (gastosMesEl) {
                gastosMesEl.textContent = UI.formatCurrency(resumo.gastos?.total || 0);
            }
            
            if (qtdGastosEl) {
                qtdGastosEl.textContent = resumo.gastos?.quantidade || 0;
            }
            
            // Calcular maior gasto
            if (resumo.gastos?.por_categoria?.length) {
                const maior = Math.max(...resumo.gastos.por_categoria.map(c => c.total));
                if (maiorGastoEl) {
                    maiorGastoEl.textContent = UI.formatCurrency(maior);
                }
            } else if (maiorGastoEl) {
                maiorGastoEl.textContent = UI.formatCurrency(0);
            }
            
        } catch (error) {
            console.error('Erro ao carregar resumo rápido:', error);
        }
    },
    
    abrirModal(gasto = null) {
        this.gastoEditando = gasto;
        
        const modal = document.getElementById('modalGasto');
        const titulo = document.getElementById('modalTitulo');
        
        if (!modal || !titulo) return;
        
        titulo.textContent = gasto ? '✏️ Editar Gasto' : '➕ Novo Gasto';
        
        if (gasto) {
            document.getElementById('gastoId').value = gasto.id || '';
            document.getElementById('gastoDescricao').value = gasto.descricao || '';
            document.getElementById('gastoValor').value = gasto.valor || '';
            document.getElementById('gastoData').value = gasto.data_gasto?.split('T')[0] || '';
            document.getElementById('gastoCategoria').value = gasto.categoria_id || '';
            document.getElementById('gastoPagamento').value = gasto.forma_pagamento_id || '';
            document.getElementById('gastoObservacao').value = gasto.observacao || '';
        } else {
            document.getElementById('formGasto').reset();
            document.getElementById('gastoData').value = new Date().toISOString().split('T')[0];
        }
        
        modal.style.display = 'block';
    },
    
    fecharModal() {
        const modal = document.getElementById('modalGasto');
        if (modal) {
            modal.style.display = 'none';
            this.gastoEditando = null;
        }
    },
    
    async salvar() {
        try {
            UI.showLoading();
            
            const gasto = {
                descricao: document.getElementById('gastoDescricao')?.value,
                valor: parseFloat(document.getElementById('gastoValor')?.value),
                data_gasto: document.getElementById('gastoData')?.value,
                categoria_id: document.getElementById('gastoCategoria')?.value,
                forma_pagamento_id: document.getElementById('gastoPagamento')?.value || null,
                observacao: document.getElementById('gastoObservacao')?.value
            };
            
            if (!gasto.descricao) throw new Error('Descrição é obrigatória');
            if (!gasto.valor || gasto.valor <= 0) throw new Error('Valor inválido');
            if (!gasto.categoria_id) throw new Error('Categoria é obrigatória');
            
            if (this.gastoEditando) {
                await API.atualizarGasto(this.gastoEditando.id, gasto);
                App.showNotification('Gasto atualizado!', 'success');
            } else {
                await API.criarGasto(gasto);
                App.showNotification('Gasto registrado!', 'success');
            }
            
            this.fecharModal();
            await this.carregarGastos();
            await this.carregarResumoRapido();
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async editar(id) {
        try {
            UI.showLoading();
            
            // Buscar o gasto específico
            let gasto = null;
            
            if (API.buscarGasto) {
                try {
                    gasto = await API.buscarGasto(id);
                } catch (e) {
                    // Se falhar, buscar na lista
                    const data = await API.listarGastos({ id });
                    gasto = data.gastos?.find(g => g.id === id);
                }
            }
            
            if (gasto) {
                this.abrirModal(gasto);
            } else {
                throw new Error('Gasto não encontrado');
            }
        } catch (error) {
            console.error('Erro ao carregar gasto:', error);
            App.showNotification('Erro ao carregar gasto', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async excluir(id) {
        if (!confirm('Tem certeza que deseja excluir este gasto?')) return;
        
        try {
            UI.showLoading();
            await API.excluirGasto(id);
            
            App.showNotification('Gasto excluído!', 'success');
            
            await this.carregarGastos();
            await this.carregarResumoRapido();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            App.showNotification(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    abrirModalResumo() {
        const modal = document.getElementById('modalResumo');
        if (modal) {
            modal.style.display = 'block';
            this.carregarResumo();
        }
    },
    
    fecharModalResumo() {
        const modal = document.getElementById('modalResumo');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    async carregarResumo() {
        try {
            UI.showLoading();
            
            const mesSelect = document.getElementById('resumoMes');
            const anoInput = document.getElementById('resumoAno');
            
            const mes = mesSelect ? parseInt(mesSelect.value) : new Date().getMonth() + 1;
            const ano = anoInput ? parseInt(anoInput.value) : new Date().getFullYear();
            
            const resumo = await API.resumoMensalGastos({ mes, ano });
            
            const container = document.getElementById('resumoConteudo');
            if (!container) return;
            
            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div style="background: var(--bg-tertiary); padding: 20px; border-radius: 12px;">
                        <h3 style="color: var(--text-muted); margin-bottom: 10px;">Vendas</h3>
                        <p style="font-size: 24px; color: var(--accent-primary);">${UI.formatCurrency(resumo.vendas?.total || 0)}</p>
                        <p>${resumo.vendas?.quantidade || 0} vendas</p>
                        <p>Lucro: ${UI.formatCurrency(resumo.vendas?.lucro || 0)}</p>
                    </div>
                    
                    <div style="background: var(--bg-tertiary); padding: 20px; border-radius: 12px;">
                        <h3 style="color: var(--text-muted); margin-bottom: 10px;">Gastos</h3>
                        <p style="font-size: 24px; color: var(--danger);">${UI.formatCurrency(resumo.gastos?.total || 0)}</p>
                        <p>${resumo.gastos?.quantidade || 0} gastos</p>
                    </div>
                </div>
                
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h3>Saldo Final</h3>
                    <p style="font-size: 32px; color: ${resumo.saldo_final >= 0 ? 'var(--accent-primary)' : 'var(--danger)'};">
                        ${UI.formatCurrency(resumo.saldo_final)}
                    </p>
                </div>
                
                <h3>Gastos por Categoria</h3>
                <div style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
                    ${resumo.gastos?.por_categoria?.length > 0 ? 
                        resumo.gastos.por_categoria.map(c => `
                            <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color);">
                                <span>${c.categoria || 'Sem categoria'}</span>
                                <span style="color: var(--danger);">${UI.formatCurrency(c.total)}</span>
                            </div>
                        `).join('') 
                        : '<p style="text-align: center; padding: 20px;">Nenhum gasto no período</p>'}
                </div>
                
                <h3>Vendas por Pagamento</h3>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${resumo.vendas_por_pagamento?.length > 0 ? 
                        resumo.vendas_por_pagamento.map(v => `
                            <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color);">
                                <span>${v.forma_pagamento || 'Sem informação'}</span>
                                <span style="color: var(--accent-primary);">${UI.formatCurrency(v.total)}</span>
                            </div>
                        `).join('') 
                        : '<p style="text-align: center; padding: 20px;">Nenhuma venda no período</p>'}
                </div>
            `;
            
        } catch (error) {
            console.error('Erro ao carregar resumo:', error);
            App.showNotification('Erro ao carregar resumo', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    exportarExcel() {
        const mes = this.filtros.mes;
        const ano = this.filtros.ano;
        
        const token = API.getToken();
        const url = `${API.baseURL}/gastos/exportar/resumo?mes=${mes}&ano=${ano}&token=${token}`;
        
        window.open(url, '_blank');
        App.showNotification('Exportando relatório...', 'info', 2000);
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('gastos.html')) {
        Gastos.init();
    }
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Gastos = Gastos;
}