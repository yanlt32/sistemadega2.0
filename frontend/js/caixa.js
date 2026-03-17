const Caixa = {
    async init() {
        await Auth.checkAuth();
        
        // Verificar se o caixa está aberto antes de permitir vendas
        if (window.location.pathname.includes('vendas.html')) {
            await this.verificarCaixaAntesVenda();
        }
        
        await this.carregarStatus();
        this.configurarAtualizacao();
        this.verificarNotificacoes();
        
        // Configurar formulários
        const formAbrir = document.getElementById('formAbrirCaixa');
        if (formAbrir) {
            formAbrir.addEventListener('submit', (e) => {
                e.preventDefault();
                this.abrirCaixa();
            });
        }
        
        const formFechar = document.getElementById('formFecharCaixa');
        if (formFechar) {
            formFechar.addEventListener('submit', (e) => {
                e.preventDefault();
                this.fecharCaixa();
            });
        }
        
        // Fechar modais com clique no X
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('modalAbrirCaixa').style.display = 'none';
                document.getElementById('modalFecharCaixa').style.display = 'none';
            });
        });
        
        // Fechar modais com clique fora
        window.addEventListener('click', (e) => {
            const modalAbrir = document.getElementById('modalAbrirCaixa');
            const modalFechar = document.getElementById('modalFecharCaixa');
            
            if (e.target === modalAbrir) {
                modalAbrir.style.display = 'none';
            }
            if (e.target === modalFechar) {
                modalFechar.style.display = 'none';
            }
        });
    },

    // Função: Verificar se pode fazer venda
    async verificarCaixaAntesVenda() {
        try {
            const status = await API.statusCaixa();
            const btnFinalizar = document.getElementById('btnFinalizarVenda');
            
            if (!status.aberto) {
                // Se for funcionário e caixa estiver fechado, bloquear venda
                if (Auth.isFuncionario()) {
                    this.mostrarAlertaCaixaFechado();
                    
                    // Desabilitar botão de finalizar venda
                    if (btnFinalizar) {
                        btnFinalizar.disabled = true;
                        btnFinalizar.style.opacity = '0.5';
                        btnFinalizar.title = 'Caixa fechado. Aguarde abertura.';
                    }
                }
            } else {
                // Se caixa estiver aberto, habilitar botão
                if (btnFinalizar) {
                    btnFinalizar.disabled = false;
                    btnFinalizar.style.opacity = '1';
                    btnFinalizar.title = '';
                }
                
                // Se for funcionário e caixa acabou de abrir, notificar
                if (Auth.isFuncionario() && !sessionStorage.getItem('caixaNotificado')) {
                    this.mostrarNotificacaoCaixaAberto();
                    sessionStorage.setItem('caixaNotificado', 'true');
                }
            }
        } catch (error) {
            console.error('Erro ao verificar caixa:', error);
        }
    },

    // Função: Alerta de caixa fechado
    mostrarAlertaCaixaFechado() {
        // Remover alerta antigo se existir
        const alertaAntigo = document.getElementById('alerta-caixa-fechado');
        if (alertaAntigo) alertaAntigo.remove();
        
        const alerta = document.createElement('div');
        alerta.className = 'alert alert-danger';
        alerta.id = 'alerta-caixa-fechado';
        alerta.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 24px;">🔒</span>
                <div style="flex: 1;">
                    <strong>Caixa Fechado!</strong>
                    <p style="margin-top: 5px;">O caixa está fechado. Aguarde o administrador abrir para realizar vendas.</p>
                </div>
                <button class="btn btn-sm btn-primary" onclick="this.parentElement.parentElement.remove()">OK</button>
            </div>
        `;
        alerta.style.position = 'fixed';
        alerta.style.top = '20px';
        alerta.style.left = '50%';
        alerta.style.transform = 'translateX(-50%)';
        alerta.style.zIndex = '9999';
        alerta.style.maxWidth = '500px';
        alerta.style.width = '90%';
        alerta.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)';
        alerta.style.borderRadius = '8px';
        
        document.body.appendChild(alerta);
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (alerta.parentNode) alerta.remove();
        }, 10000);
    },

    async carregarStatus() {
        try {
            UI.showLoading();
            const status = await API.statusCaixa();
            this.atualizarInterface(status);
            
            // Verificar se precisa notificar funcionário
            if (status.aberto && Auth.isFuncionario() && !sessionStorage.getItem('caixaNotificado')) {
                this.mostrarNotificacaoCaixaAberto();
                sessionStorage.setItem('caixaNotificado', 'true');
            }
        } catch (error) {
            console.error('Erro ao carregar status do caixa:', error);
            if (window.Notificacao) {
                Notificacao.mostrar('Erro ao carregar status do caixa', 'danger');
            } else {
                console.error('Erro:', error);
            }
        } finally {
            UI.hideLoading();
        }
    },

    atualizarInterface(status) {
        const container = document.getElementById('caixaStatus');
        if (!container) return;

        if (!status.aberto) {
            container.innerHTML = `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h3 style="color: var(--danger); margin-bottom: 10px;">🔒 Caixa Fechado</h3>
                            <p style="color: var(--text-muted);">O caixa está fechado no momento.</p>
                        </div>
                        ${Auth.isAdmin() ? `
                            <button class="btn btn-primary" onclick="Caixa.abrirModalAbrir()">
                                Abrir Caixa (R$ 200,00)
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            if (Auth.isAdmin()) {
                const historicoEl = document.getElementById('historicoCaixa');
                if (historicoEl) {
                    historicoEl.style.display = 'block';
                    this.carregarHistorico();
                }
            }
            return;
        }

        // Caixa aberto
        const pagamentos = status.pagamentos_esperados || [];
        
        let pagamentosHtml = '';
        if (pagamentos.length > 0) {
            pagamentosHtml = `
                <div class="quick-table" style="margin-top: 20px;">
                    <h4 style="margin-bottom: 15px;">📊 Vendas por Forma de Pagamento</h4>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Forma</th>
                                    <th>Qtd</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pagamentos.map(p => `
                                    <tr>
                                        <td><strong>${p.forma_pagamento || 'N/A'}</strong></td>
                                        <td>${p.quantidade || 0}</td>
                                        <td>${UI.formatCurrency(p.total_esperado || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="2"><strong>TOTAL</strong></td>
                                    <td><strong>${UI.formatCurrency(status.total_vendas || 0)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h3 style="color: var(--accent-primary); margin-bottom: 10px;">🔓 Caixa Aberto</h3>
                        <p><strong>Abertura:</strong> ${new Date(status.data_abertura).toLocaleString('pt-BR')}</p>
                    </div>
                    ${Auth.isAdmin() ? `
                        <button class="btn btn-warning" onclick="Caixa.abrirModalFechar()">
                            Fechar Caixa
                        </button>
                    ` : ''}
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                        <small style="color: var(--text-muted);">Valor Inicial</small>
                        <div style="font-size: 24px; font-weight: bold;">${UI.formatCurrency(status.valor_inicial)}</div>
                    </div>
                    <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                        <small style="color: var(--text-muted);">Vendas</small>
                        <div style="font-size: 24px; font-weight: bold; color: var(--accent-primary);">${UI.formatCurrency(status.total_vendas)}</div>
                        <small>${status.quantidade_vendas || 0} vendas</small>
                    </div>
                    <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                        <small style="color: var(--text-muted);">Saldo Esperado</small>
                        <div style="font-size: 24px; font-weight: bold; color: var(--success);">${UI.formatCurrency(status.saldo_esperado)}</div>
                    </div>
                </div>
                
                ${pagamentosHtml}
            </div>
        `;
        
        if (Auth.isAdmin()) {
            const historicoEl = document.getElementById('historicoCaixa');
            if (historicoEl) {
                historicoEl.style.display = 'block';
                this.carregarHistorico();
            }
        }
    },

    abrirModalAbrir() {
        // Verificar status antes de abrir modal
        API.statusCaixa().then(status => {
            if (status.aberto) {
                if (window.Notificacao) {
                    Notificacao.mostrar('Já existe um caixa aberto!', 'warning');
                } else {
                    alert('Já existe um caixa aberto!');
                }
                return;
            }
            document.getElementById('modalAbrirCaixa').style.display = 'block';
        }).catch(() => {
            document.getElementById('modalAbrirCaixa').style.display = 'block';
        });
    },

    fecharModalAbrir() {
        document.getElementById('modalAbrirCaixa').style.display = 'none';
        document.getElementById('formAbrirCaixa')?.reset();
    },

    async abrirCaixa() {
        const observacao = document.getElementById('observacaoAbertura')?.value;
        
        try {
            UI.showLoading();
            const result = await API.abrirCaixa({ observacao });
            
            if (window.Notificacao) {
                Notificacao.mostrar('✅ Caixa aberto com R$ 200,00!', 'success');
            } else {
                alert('✅ Caixa aberto com R$ 200,00!');
            }
            
            this.fecharModalAbrir();
            await this.carregarStatus();
            
            // Resetar notificação do funcionário
            sessionStorage.removeItem('caixaNotificado');
            
        } catch (error) {
            console.error('Erro ao abrir caixa:', error);
            
            let mensagem = error.message;
            if (error.message.includes('Já existe um caixa aberto')) {
                mensagem = '❌ Já existe um caixa aberto!';
                this.fecharModalAbrir();
            }
            
            if (window.Notificacao) {
                Notificacao.mostrar(mensagem, 'danger');
            } else {
                alert(mensagem);
            }
        } finally {
            UI.hideLoading();
        }
    },

    async abrirModalFechar() {
        try {
            UI.showLoading();
            const status = await API.statusCaixa();
            
            if (!status.aberto) {
                if (window.Notificacao) {
                    Notificacao.mostrar('Não há caixa aberto!', 'warning');
                } else {
                    alert('Não há caixa aberto!');
                }
                return;
            }
            
            const pagamentos = status.pagamentos_esperados || [];
            const modal = document.getElementById('modalFecharCaixa');
            const resumoDiv = document.getElementById('resumoFechamento');
            
            if (!modal || !resumoDiv) return;
            
            let inputsHtml = '<h4 style="margin-bottom: 15px;">Conferência de Valores</h4>';
            inputsHtml += '<p style="margin-bottom: 15px; color: var(--text-muted);">Informe os valores reais de cada forma de pagamento:</p>';
            
            const todasFormas = ['Dinheiro', 'Débito', 'Crédito', 'Pix'];
            
            pagamentos.forEach(p => {
                inputsHtml += `
                    <div class="form-group">
                        <label>${p.forma_pagamento} (Esperado: ${UI.formatCurrency(p.total_esperado || 0)})</label>
                        <input type="number" 
                               class="valor-real form-control" 
                               data-forma="${p.forma_pagamento}" 
                               step="0.01" 
                               min="0" 
                               value="${(p.total_esperado || 0).toFixed(2)}" 
                               required
                               style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary);">
                    </div>
                `;
                const index = todasFormas.indexOf(p.forma_pagamento);
                if (index > -1) todasFormas.splice(index, 1);
            });
            
            todasFormas.forEach(forma => {
                inputsHtml += `
                    <div class="form-group">
                        <label>${forma}</label>
                        <input type="number" 
                               class="valor-real form-control" 
                               data-forma="${forma}" 
                               step="0.01" 
                               min="0" 
                               value="0.00" 
                               required
                               style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary);">
                    </div>
                `;
            });
            
            inputsHtml += `
                <div style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px;">
                    <strong>Total Esperado:</strong> ${UI.formatCurrency(status.saldo_esperado)}
                </div>
            `;
            
            resumoDiv.innerHTML = inputsHtml;
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Erro ao abrir modal de fechamento:', error);
            if (window.Notificacao) {
                Notificacao.mostrar(error.message, 'danger');
            } else {
                alert(error.message);
            }
        } finally {
            UI.hideLoading();
        }
    },

    fecharModalFechar() {
        document.getElementById('modalFecharCaixa').style.display = 'none';
        document.getElementById('formFecharCaixa')?.reset();
    },

    async fecharCaixa() {
        const senha = document.getElementById('senhaAdmin')?.value;
        const observacao = document.getElementById('observacaoFechamento')?.value;
        
        if (!senha) {
            if (window.Notificacao) {
                Notificacao.mostrar('Digite a senha de administrador', 'warning');
            } else {
                alert('Digite a senha de administrador');
            }
            return;
        }
        
        const inputs = document.querySelectorAll('#resumoFechamento .valor-real');
        const valores_reais = [];
        
        inputs.forEach(input => {
            const valor = parseFloat(input.value) || 0;
            if (valor < 0) {
                if (window.Notificacao) {
                    Notificacao.mostrar('Valores não podem ser negativos', 'warning');
                }
                return;
            }
            valores_reais.push({
                forma: input.dataset.forma,
                valor: valor
            });
        });
        
        if (valores_reais.length === 0) {
            if (window.Notificacao) {
                Notificacao.mostrar('Nenhum valor válido informado', 'warning');
            } else {
                alert('Nenhum valor válido informado');
            }
            return;
        }
        
        try {
            UI.showLoading();
            
            const result = await API.fecharCaixa({
                senha_admin: senha,
                valores_reais: valores_reais,
                observacao: observacao || ''
            });
            
            let mensagem = '✅ Caixa fechado com sucesso!\n\n';
            mensagem += `Valor inicial: ${UI.formatCurrency(result.dados.valor_inicial)}\n`;
            mensagem += `Total vendas: ${UI.formatCurrency(result.dados.total_vendas)}\n\n`;
            mensagem += `📊 Valores por pagamento:\n`;
            
            result.dados.valores_reais.forEach(v => {
                mensagem += `${v.forma}: ${UI.formatCurrency(v.valor)}\n`;
            });
            
            if (result.dados.diferencas && result.dados.diferencas.length > 0) {
                mensagem += `\n⚠️ DIFERENÇAS ENCONTRADAS:\n`;
                result.dados.diferencas.forEach(d => {
                    const sinal = d.diferenca > 0 ? '+' : '';
                    mensagem += `${d.forma}: Esperado ${UI.formatCurrency(d.esperado)} | Real ${UI.formatCurrency(d.real)} | Diferença ${sinal}${UI.formatCurrency(d.diferenca)}\n`;
                });
            } else {
                mensagem += `\n✅ Nenhuma diferença encontrada!`;
            }
            
            mensagem += `\n💰 Valor final: ${UI.formatCurrency(result.dados.valor_final)}`;
            
            // Mostrar mensagem
            alert(mensagem);
            
            if (window.Notificacao) {
                Notificacao.mostrar('Caixa fechado com sucesso!', 'success');
            }
            
            this.fecharModalFechar();
            await this.carregarStatus();
            
            // Resetar notificação
            sessionStorage.removeItem('caixaNotificado');
            
        } catch (error) {
            console.error('Erro ao fechar caixa:', error);
            if (window.Notificacao) {
                Notificacao.mostrar(error.message, 'danger');
            } else {
                alert('Erro: ' + error.message);
            }
        } finally {
            UI.hideLoading();
        }
    },

    // Função: Excluir caixa do histórico
    async excluirCaixa(id) {
        if (!confirm('⚠️ Tem certeza que deseja excluir este caixa do histórico?')) return;
        
        const senha = prompt('Digite sua senha de administrador para confirmar:');
        if (!senha) return;
        
        try {
            UI.showLoading();
            await API.excluirCaixa(id, { senha_admin: senha });
            
            if (window.Notificacao) {
                Notificacao.mostrar('✅ Caixa excluído!', 'success');
            } else {
                alert('✅ Caixa excluído!');
            }
            
            await this.carregarHistorico();
            
        } catch (error) {
            console.error('Erro ao excluir caixa:', error);
            if (window.Notificacao) {
                Notificacao.mostrar(error.message, 'danger');
            } else {
                alert('Erro: ' + error.message);
            }
        } finally {
            UI.hideLoading();
        }
    },

    // Função: Recalcular caixa
    async recalcularCaixa(id) {
        if (!confirm('🔄 Recalcular este caixa com base nas vendas atuais?')) return;
        
        const senha = prompt('Digite sua senha de administrador para confirmar:');
        if (!senha) return;
        
        try {
            UI.showLoading();
            const result = await API.recalcularCaixa(id, { senha_admin: senha });
            
            if (window.Notificacao) {
                Notificacao.mostrar('✅ Caixa recalculado!', 'success');
            } else {
                alert('✅ Caixa recalculado!');
            }
            
            await this.carregarHistorico();
            
        } catch (error) {
            console.error('Erro ao recalcular caixa:', error);
            if (window.Notificacao) {
                Notificacao.mostrar(error.message, 'danger');
            } else {
                alert('Erro: ' + error.message);
            }
        } finally {
            UI.hideLoading();
        }
    },

    async resetarCaixa() {
        if (!confirm('⚠️ ATENÇÃO: Isso vai apagar TODO o histórico de caixa. Tem certeza?')) return;
        
        const senha = prompt('Digite sua senha de administrador para confirmar:');
        if (!senha) return;
        
        try {
            UI.showLoading();
            await API.resetarCaixa({ senha_admin: senha });
            
            if (window.Notificacao) {
                Notificacao.mostrar('✅ Histórico de caixa resetado!', 'success');
            } else {
                alert('✅ Histórico de caixa resetado!');
            }
            
            await this.carregarStatus();
            
        } catch (error) {
            console.error('Erro ao resetar caixa:', error);
            if (window.Notificacao) {
                Notificacao.mostrar(error.message, 'danger');
            } else {
                alert('Erro: ' + error.message);
            }
        } finally {
            UI.hideLoading();
        }
    },

    async carregarHistorico(page = 1) {
        try {
            const data = await API.historicoCaixa({ page, limit: 10 });
            this.renderizarHistorico(data.caixas || []);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    },

    renderizarHistorico(caixas) {
        const tbody = document.querySelector('#tabelaHistoricoCaixa tbody');
        if (!tbody) return;
        
        if (caixas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Nenhum caixa fechado</td></tr>';
            return;
        }
        
        tbody.innerHTML = caixas.map(c => `
            <tr>
                <td>${new Date(c.data_abertura).toLocaleString('pt-BR')}</td>
                <td>${c.data_fechamento ? new Date(c.data_fechamento).toLocaleString('pt-BR') : '-'}</td>
                <td>${UI.formatCurrency(c.valor_inicial)}</td>
                <td>${UI.formatCurrency(c.total_vendas || 0)}</td>
                <td>${UI.formatCurrency(c.valor_final || 0)}</td>
                <td><span class="badge badge-success">Fechado</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Caixa.recalcularCaixa(${c.id})" title="Recalcular">🔄</button>
                    <button class="btn btn-danger btn-sm" onclick="Caixa.excluirCaixa(${c.id})" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    mostrarNotificacaoCaixaAberto() {
        // Remover notificação antiga se existir
        const antiga = document.getElementById('alerta-caixa-aberto');
        if (antiga) antiga.remove();
        
        const notificacao = document.createElement('div');
        notificacao.className = 'alert alert-success';
        notificacao.id = 'alerta-caixa-aberto';
        notificacao.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 24px;">🔓</span>
                <div style="flex: 1;">
                    <strong style="font-size: 16px;">Caixa Aberto!</strong>
                    <p style="margin-top: 5px;">O caixa foi aberto. Você já pode realizar vendas.</p>
                </div>
                <button class="btn btn-sm btn-primary" onclick="this.parentElement.parentElement.remove()">
                    OK
                </button>
            </div>
        `;
        notificacao.style.position = 'fixed';
        notificacao.style.top = '20px';
        notificacao.style.right = '20px';
        notificacao.style.zIndex = '9999';
        notificacao.style.maxWidth = '400px';
        notificacao.style.width = '90%';
        notificacao.style.boxShadow = '0 5px 20px rgba(0,0,0,0.3)';
        notificacao.style.borderRadius = '8px';
        
        document.body.appendChild(notificacao);
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (notificacao.parentNode) notificacao.remove();
        }, 10000);
    },

    verificarNotificacoes() {
        if (window.Realtime && Realtime.socket) {
            Realtime.socket.on('caixa:aberto', () => {
                if (Auth.isFuncionario()) {
                    this.mostrarNotificacaoCaixaAberto();
                    sessionStorage.setItem('caixaNotificado', 'true');
                }
                this.carregarStatus();
                
                // Habilitar botão de venda se estiver na página de vendas
                const btnFinalizar = document.getElementById('btnFinalizarVenda');
                if (btnFinalizar) {
                    btnFinalizar.disabled = false;
                    btnFinalizar.style.opacity = '1';
                }
            });
            
            Realtime.socket.on('caixa:fechado', () => {
                const notificacao = document.getElementById('alerta-caixa-aberto');
                if (notificacao) notificacao.remove();
                
                if (Auth.isFuncionario()) {
                    if (window.Notificacao) {
                        Notificacao.mostrar('🔒 Caixa foi fechado', 'info');
                    }
                    
                    // Desabilitar botão de venda
                    const btnFinalizar = document.getElementById('btnFinalizarVenda');
                    if (btnFinalizar) {
                        btnFinalizar.disabled = true;
                        btnFinalizar.style.opacity = '0.5';
                        this.mostrarAlertaCaixaFechado();
                    }
                }
                sessionStorage.removeItem('caixaNotificado');
                this.carregarStatus();
            });
        }
    },

    configurarAtualizacao() {
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.carregarStatus();
            }
        }, 30000);
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('caixa.html') || 
        window.location.pathname.includes('vendas.html')) {
        Caixa.init();
    }
});

window.Caixa = Caixa;