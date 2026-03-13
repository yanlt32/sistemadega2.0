const Caixa = {
    caixaAtual: null,
    
    async init() {
        await Auth.checkAuth();
        this.verificarPermissoes();
        await this.carregarStatus();
        this.setupEventListeners();
    },
    
    verificarPermissoes() {
        const isAdmin = Auth.isAdmin();
        const adminItems = document.querySelectorAll('.admin-only');
        
        adminItems.forEach(item => {
            item.style.display = isAdmin ? 'flex' : 'none';
        });
        
        document.getElementById('userRole').textContent = Auth.getUserRole();
    },
    
    setupEventListeners() {
        // Fechar modais com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.fecharModalAbrir();
                this.fecharModalFechar();
            }
        });
    },
    
    async carregarStatus() {
        try {
            UI.showLoading();
            const status = await API.statusCaixa();
            this.caixaAtual = status.aberto ? status : null;
            this.atualizarInterface(status);
            
            if (Auth.isAdmin()) {
                await this.carregarHistorico();
            }
        } catch (error) {
            console.error('Erro ao carregar status do caixa:', error);
            Notificacao.mostrar('Erro ao carregar status do caixa', 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    atualizarInterface(status) {
        const infoEl = document.getElementById('statusInfo');
        const actionsEl = document.getElementById('caixaActions');
        
        if (status.aberto) {
            infoEl.innerHTML = `
                <p><strong>Status:</strong> <span style="color: var(--success);">🟢 ABERTO</span></p>
                <p><strong>Abertura:</strong> ${new Date(status.data_abertura).toLocaleString('pt-BR')}</p>
                <p><strong>Valor Inicial:</strong> ${UI.formatCurrency(status.valor_inicial)}</p>
                <p><strong>Vendas do período:</strong> ${status.quantidade_vendas}</p>
                <p><strong>Total em vendas:</strong> ${UI.formatCurrency(status.total_vendas)}</p>
                <p><strong>Lucro do período:</strong> ${UI.formatCurrency(status.total_lucro)}</p>
                <p><strong>Saldo atual:</strong> ${UI.formatCurrency(status.saldo_atual)}</p>
            `;
            
            actionsEl.innerHTML = `
                <button class="btn btn-warning" onclick="Caixa.abrirModalFechar()">
                    🔒 Fechar Caixa
                </button>
            `;
        } else {
            infoEl.innerHTML = `
                <p><strong>Status:</strong> <span style="color: var(--danger);">🔴 FECHADO</span></p>
                <p>Nenhum caixa aberto no momento.</p>
            `;
            
            actionsEl.innerHTML = `
                <button class="btn btn-success" onclick="Caixa.abrirModalAbrir()">
                    🔓 Abrir Caixa
                </button>
            `;
        }
    },
    
    abrirModalAbrir() {
        document.getElementById('modalAbrirCaixa').style.display = 'block';
    },
    
    fecharModalAbrir() {
        document.getElementById('modalAbrirCaixa').style.display = 'none';
        document.getElementById('formAbrirCaixa').reset();
    },
    
    async abrir() {
        const valorInicial = parseFloat(document.getElementById('valorInicial').value) || 0;
        const observacao = document.getElementById('observacaoAbertura').value;
        
        try {
            UI.showLoading();
            await API.abrirCaixa({ valor_inicial: valorInicial, observacao });
            
            Notificacao.mostrar('✅ Caixa aberto com sucesso!', 'success');
            this.fecharModalAbrir();
            await this.carregarStatus();
            
        } catch (error) {
            Notificacao.mostrar(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async abrirModalFechar() {
        try {
            UI.showLoading();
            const status = await API.statusCaixa();
            
            const resumoEl = document.getElementById('resumoCaixa');
            resumoEl.innerHTML = `
                <p><strong>Valor Inicial:</strong> ${UI.formatCurrency(status.valor_inicial)}</p>
                <p><strong>Total de Vendas:</strong> ${UI.formatCurrency(status.total_vendas)}</p>
                <p><strong>Lucro:</strong> ${UI.formatCurrency(status.total_lucro)}</p>
                <p><strong>Quantidade de Vendas:</strong> ${status.quantidade_vendas}</p>
                <p><strong>Saldo a Fechar:</strong> ${UI.formatCurrency(status.saldo_atual)}</p>
                <hr>
                <p style="color: var(--warning);"><strong>Confirma o fechamento do caixa?</strong></p>
            `;
            
            document.getElementById('modalFecharCaixa').style.display = 'block';
        } catch (error) {
            Notificacao.mostrar(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    fecharModalFechar() {
        document.getElementById('modalFecharCaixa').style.display = 'none';
        document.getElementById('formFecharCaixa').reset();
    },
    
    async fechar() {
        const observacao = document.getElementById('observacaoFechamento').value;
        
        try {
            UI.showLoading();
            const result = await API.fecharCaixa({ observacao });
            
            Notificacao.mostrar('✅ Caixa fechado com sucesso!', 'success');
            this.fecharModalFechar();
            await this.carregarStatus();
            
        } catch (error) {
            Notificacao.mostrar(error.message, 'danger');
        } finally {
            UI.hideLoading();
        }
    },
    
    async carregarHistorico(page = 1) {
        try {
            const data = await API.historicoCaixa({ page, limit: 10 });
            this.renderizarHistorico(data.caixas || []);
            this.renderizarPaginacaoHistorico(data);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    },
    
    renderizarHistorico(caixas) {
        const tbody = document.getElementById('historicoTable');
        if (!tbody) return;
        
        if (caixas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center;">Nenhum fechamento encontrado</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = caixas.map(c => `
            <tr>
                <td>${new Date(c.data_abertura).toLocaleString('pt-BR')}</td>
                <td>${c.data_fechamento ? new Date(c.data_fechamento).toLocaleString('pt-BR') : '-'}</td>
                <td>${c.usuario_nome || '-'}</td>
                <td>${UI.formatCurrency(c.valor_inicial)}</td>
                <td>${UI.formatCurrency(c.total_vendas || 0)}</td>
                <td>${UI.formatCurrency(c.total_lucro || 0)}</td>
                <td>${UI.formatCurrency(c.valor_final || 0)}</td>
            </tr>
        `).join('');
    },
    
    renderizarPaginacaoHistorico(data) {
        const container = document.getElementById('paginacaoHistorico');
        if (!container) return;
        
        if (data.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        for (let i = 1; i <= data.totalPages; i++) {
            html += `<button onclick="Caixa.carregarHistorico(${i})" 
                     ${i === data.page ? 'class="active"' : ''}>${i}</button>`;
        }
        
        container.innerHTML = html;
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('caixa.html')) {
        Caixa.init();
    }
});