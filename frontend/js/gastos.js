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
        this.carregarResumoRapido();
    },
    
    setupEventListeners() {
        document.getElementById('btnNovoGasto')?.addEventListener('click', () => this.abrirModal());
        document.getElementById('btnResumoMensal')?.addEventListener('click', () => this.abrirModalResumo());
        document.getElementById('btnExportarExcel')?.addEventListener('click', () => this.exportarExcel());
        document.getElementById('btnFiltrar')?.addEventListener('click', () => this.aplicarFiltros());
        document.getElementById('btnLimparFiltros')?.addEventListener('click', () => this.limparFiltros());
        
        const formGasto = document.getElementById('formGasto');
        if (formGasto) {
            formGasto.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvar();
            });
        }
        
        document.querySelector('#modalGasto .close')?.addEventListener('click', () => this.fecharModal());
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
            Notificacao.mostrar('Erro ao carregar gastos', 'danger');
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
                    <button class="btn btn-primary btn-sm" onclick="Gastos.editar(${g.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="Gastos.excluir(${g.id})">🗑️</button>
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
        this.filtros.mes = document.getElementById('filtroMes').value;
        this.filtros.ano = document.getElementById('filtroAno').value;
        this.filtros.categoria = document.getElementById('filtroCategoria').value;
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
        document.getElementById('filtroMes').value = this.filtros.mes;
        document.getElementById('filtroAno').value = this.filtros.ano;
        document.getElementById('filtroCategoria').value = '';
        this.paginaAtual = 1;
        this.carregarGastos();
        this.carregarResumoRapido();
    },
    
    async carregarResumoRapido() {
        try {
            const resumo = await API.resumoMensal({
                mes: this.filtros.mes,
                ano: this.filtros.ano
            });
            
            document.getElementById('gastosMes').textContent = UI.formatCurrency(resumo.gastos?.total || 0);
            document.getElementById('qtdGastos').textContent = resumo.gastos?.quantidade || 0;
            
            // Calcular maior gasto
            if (resumo.gastos?.por_categoria?.length) {
                const maior = Math.max(...resumo.gastos.por_categoria.map(c => c.total));
                document.getElementById('maiorGasto').textContent = UI.formatCurrency(maior);
            }
            
        } catch (error) {
            console.error('Erro ao carregar resumo rápido:', error);
        }
    },
    
    abrirModal(gasto = null) {
        this.gastoEditando = gasto;
        
        const modal = document.getElementById('modalGasto');
        const titulo = document.getElementById('modalTitulo');
        
        titulo.textContent = gasto ? '✏️ Editar Gasto' : '➕ Novo Gasto';
        
        if (gasto) {
            document.getElementById('gastoId').value = gasto.id;
            document.getElementById('gastoDescricao').value = gasto.descricao;
            document.getElementById('gastoValor').value = gasto.valor;
            document.getElementById('gastoData').value = gasto.data_gasto?.split('T')[0];
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
        document.getElementById('modalGasto').style.display = 'none';
        this.gastoEditando = null;
    },
    
    async salvar() {
        try {
            UI.showLoading();
            
            const gasto = {
                descricao: document.getElementById('gastoDescricao').value,
                valor: parseFloat(document.getElementById('gastoValor').value),
                data_gasto: document.getElementById('gastoData').value,
                categoria_id: document.getElementById('gastoCategoria').value,
                forma_pagamento_id: document.getElementById('gastoPagamento').value || null,
                observacao: document.getElementById('gastoObservacao').value
            };
            
            if (!gasto.descricao) throw new Error('Descrição é obrigatória');
            if (!gasto.valor || gasto.valor <= 0) throw new Error('Valor inválido');
            if (!gasto.categoria_id) throw new Error('Categoria é obrigatória');
            
            if (this.gastoEditando) {
                await API.atualizarGasto(this.gastoEditando.id, gasto);
                Notificacao.mostrar('Gasto atualizado!', 'success');
            } else {
                await API.criarGasto(gasto);
                Notificacao.mostrar('Gasto registrado!', 'success');
            }
            
            this.fecharModal();
            await this.carregarGastos();
            await this.carregarResumoRapido();
            
        } catch (error) {
            Notificacao.mostrar(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async editar(id) {
        try {
            UI.showLoading();
            const gasto = await API.buscarGasto?.(id) || 
                (await API.listarGastos({ id })).gastos?.find(g => g.id === id);
            
            if (gasto) {
                this.abrirModal(gasto);
            }
        } catch (error) {
            Notificacao.mostrar('Erro ao carregar gasto', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async excluir(id) {
        if (!confirm('Tem certeza que deseja excluir este gasto?')) return;
        
        try {
            UI.showLoading();
            await API.excluirGasto(id);
            Notificacao.mostrar('Gasto excluído!', 'success');
            await this.carregarGastos();
            await this.carregarResumoRapido();
        } catch (error) {
            Notificacao.mostrar(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    abrirModalResumo() {
        const modal = document.getElementById('modalResumo');
        modal.style.display = 'block';
        this.carregarResumo();
    },
    
    fecharModalResumo() {
        document.getElementById('modalResumo').style.display = 'none';
    },
    
    async carregarResumo() {
        try {
            UI.showLoading();
            
            const mes = document.getElementById('resumoMes').value;
            const ano = document.getElementById('resumoAno').value;
            
            const resumo = await API.resumoMensal({ mes, ano });
            
            const container = document.getElementById('resumoConteudo');
            
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
                <div style="max-height: 300px; overflow-y: auto;">
                    ${resumo.gastos?.por_categoria?.map(c => `
                        <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color);">
                            <span>${c.categoria || 'Sem categoria'}</span>
                            <span style="color: var(--danger);">${UI.formatCurrency(c.total)}</span>
                        </div>
                    `).join('') || '<p>Nenhum gasto no período</p>'}
                </div>
                
                <h3 style="margin-top: 20px;">Vendas por Pagamento</h3>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${resumo.vendas_por_pagamento?.map(v => `
                        <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color);">
                            <span>${v.forma_pagamento || 'Sem informação'}</span>
                            <span style="color: var(--accent-primary);">${UI.formatCurrency(v.total)}</span>
                        </div>
                    `).join('') || '<p>Nenhuma venda no período</p>'}
                </div>
            `;
            
        } catch (error) {
            console.error('Erro ao carregar resumo:', error);
            Notificacao.mostrar('Erro ao carregar resumo', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    exportarExcel() {
        const mes = this.filtros.mes;
        const ano = this.filtros.ano;
        // Usar o método correto da API
        const url = `${API.baseURL}/gastos/exportar/resumo?mes=${mes}&ano=${ano}&token=${API.getToken()}`;
        API.exportarResumo({ mes, ano });
        Notificacao.mostrar('Exportando relatório...', 'info');
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('gastos.html')) {
        Gastos.init();
    }
}); 