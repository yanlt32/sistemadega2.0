const CategoriasManager = {
    categoriaEditando: null,
    tipoEditando: null,
    
    async init() {
        await Auth.checkAuth();
        
        if (!Auth.isAdmin()) {
            window.location.href = '/dashboard.html';
            return;
        }
        
        await this.carregarCategorias();
        await this.carregarTipos();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        // Filtro de tipos
        const filtro = document.getElementById('filtroTipoCategoria');
        if (filtro) {
            filtro.addEventListener('change', () => {
                this.carregarTipos();
            });
        }
        
        // Formulários
        const formCategoria = document.getElementById('formCategoria');
        if (formCategoria) {
            formCategoria.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarCategoria();
            });
        }
        
        const formTipo = document.getElementById('formTipo');
        if (formTipo) {
            formTipo.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarTipo();
            });
        }
        
        // Fechar modais com clique no X
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Fechar modais com clique fora
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    },
    
    async carregarCategorias() {
        try {
            UI.showLoading();
            const categorias = await API.listarCategorias();
            this.renderizarCategorias(categorias);
            this.carregarSelectCategorias(categorias);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            if (window.Notificacao) {
                Notificacao.mostrar('Erro ao carregar categorias', 'danger');
            }
        } finally {
            UI.hideLoading();
        }
    },
    
    renderizarCategorias(categorias) {
        const tbody = document.getElementById('tabelaCategorias');
        if (!tbody) return;
        
        if (categorias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 50px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🏷️</div>
                        <h3>Nenhuma categoria cadastrada</h3>
                        <p style="color: var(--text-muted);">Clique em "Nova Categoria" para começar</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = categorias.map(c => `
            <tr>
                <td>
                    <span style="display: inline-block; width: 20px; height: 20px; 
                               background-color: ${c.cor || '#c4a747'}; border-radius: 4px; 
                               margin-right: 10px; vertical-align: middle;"></span>
                    ${c.nome || 'Sem nome'}
                </td>
                <td>
                    <span class="badge" style="background: ${c.cor || '#c4a747'}20; color: var(--text-primary);">
                        ${c.tipo || 'outro'}
                    </span>
                </td>
                <td>${c.total_produtos || 0}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="CategoriasManager.editarCategoria(${c.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="CategoriasManager.excluirCategoria(${c.id})" 
                            ${c.total_produtos > 0 ? 'disabled' : ''}>🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    carregarSelectCategorias(categorias) {
        const select = document.getElementById('tipoCategoria');
        const filtro = document.getElementById('filtroTipoCategoria');
        
        const options = categorias.map(c => 
            `<option value="${c.id}">${c.nome}</option>`
        ).join('');
        
        if (select) {
            select.innerHTML = '<option value="">Selecione uma categoria</option>' + options;
        }
        
        if (filtro) {
            filtro.innerHTML = '<option value="todas">Todas as categorias</option>' + options;
        }
    },
    
    async carregarTipos() {
        try {
            const filtro = document.getElementById('filtroTipoCategoria')?.value;
            let tipos;
            
            if (filtro && filtro !== 'todas') {
                tipos = await API.listarTiposPorCategoria(filtro);
            } else {
                tipos = await API.listarTipos();
            }
            
            this.renderizarTipos(tipos || []);
        } catch (error) {
            console.error('Erro ao carregar tipos:', error);
        }
    },
    
    renderizarTipos(tipos) {
        const tbody = document.getElementById('tabelaTipos');
        if (!tbody) return;
        
        if (tipos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px;">
                        Nenhum tipo cadastrado
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = tipos.map(t => `
            <tr>
                <td>${t.nome || '-'}</td>
                <td>${t.categoria_nome || '-'}</td>
                <td>${t.total_produtos || 0}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="CategoriasManager.editarTipo(${t.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="CategoriasManager.excluirTipo(${t.id})"
                            ${t.total_produtos > 0 ? 'disabled' : ''}>🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    // ===== FUNÇÕES DE CATEGORIA =====
    abrirModalCategoria(categoria = null) {
        this.categoriaEditando = categoria;
        
        const modal = document.getElementById('modalCategoria');
        const titulo = document.getElementById('modalCategoriaTitulo');
        
        if (!modal) return;
        
        titulo.textContent = categoria ? '✏️ Editar Categoria' : '➕ Nova Categoria';
        
        if (categoria) {
            document.getElementById('categoriaId').value = categoria.id || '';
            document.getElementById('categoriaNome').value = categoria.nome || '';
            document.getElementById('categoriaTipo').value = categoria.tipo || 'outro';
            document.getElementById('categoriaCor').value = categoria.cor || '#c4a747';
        } else {
            document.getElementById('categoriaId').value = '';
            document.getElementById('categoriaNome').value = '';
            document.getElementById('categoriaTipo').value = 'outro';
            document.getElementById('categoriaCor').value = '#c4a747';
        }
        
        modal.style.display = 'block';
    },
    
    fecharModalCategoria() {
        document.getElementById('modalCategoria').style.display = 'none';
        this.categoriaEditando = null;
    },
    
    async salvarCategoria() {
        try {
            UI.showLoading();
            
            const nome = document.getElementById('categoriaNome')?.value?.trim();
            let tipo = document.getElementById('categoriaTipo')?.value;
            
            if (!nome) throw new Error('Nome é obrigatório');
            if (!tipo) throw new Error('Tipo é obrigatório');
            
            // Se for "outro", pedir para digitar
            if (tipo === 'outro') {
                const novoTipo = prompt('Digite o tipo da categoria (ex: cigarro, eletrônicos, etc):');
                if (!novoTipo) throw new Error('Tipo é obrigatório');
                tipo = novoTipo.toLowerCase().trim();
            }
            
            const cor = document.getElementById('categoriaCor')?.value || '#c4a747';
            
            const categoria = { nome, tipo, cor };
            
            let resultado;
            if (this.categoriaEditando) {
                resultado = await API.atualizarCategoria(this.categoriaEditando.id, categoria);
                if (window.Notificacao) {
                    Notificacao.mostrar('✅ Categoria atualizada!', 'success');
                }
            } else {
                resultado = await API.criarCategoria(categoria);
                if (window.Notificacao) {
                    Notificacao.mostrar('✅ Categoria criada!', 'success');
                }
            }
            
            this.fecharModalCategoria();
            await this.carregarCategorias();
            await this.carregarTipos();
            
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            
            let mensagem = error.message;
            if (error.message.includes('UNIQUE constraint')) {
                mensagem = '❌ Já existe uma categoria com este nome!';
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
    
    async editarCategoria(id) {
        try {
            const categorias = await API.listarCategorias();
            const categoria = categorias.find(c => c.id === id);
            if (categoria) {
                this.abrirModalCategoria(categoria);
            }
        } catch (error) {
            console.error('Erro ao carregar categoria:', error);
            if (window.Notificacao) {
                Notificacao.mostrar('Erro ao carregar categoria', 'danger');
            }
        }
    },
    
    async excluirCategoria(id) {
        if (!confirm('⚠️ Tem certeza que deseja excluir esta categoria?')) return;
        
        try {
            UI.showLoading();
            await API.excluirCategoria(id);
            
            if (window.Notificacao) {
                Notificacao.mostrar('✅ Categoria excluída!', 'success');
            }
            
            await this.carregarCategorias();
            await this.carregarTipos();
            
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            
            let mensagem = error.message;
            if (error.message.includes('produtos vinculados')) {
                mensagem = '❌ Não é possível excluir categoria com produtos vinculados!';
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
    
    // ===== FUNÇÕES DE TIPO =====
    abrirModalTipo(tipo = null) {
        this.tipoEditando = tipo;
        
        const modal = document.getElementById('modalTipo');
        const titulo = document.getElementById('modalTipoTitulo');
        
        if (!modal) return;
        
        titulo.textContent = tipo ? '✏️ Editar Tipo' : '➕ Novo Tipo';
        
        if (tipo) {
            document.getElementById('tipoId').value = tipo.id || '';
            document.getElementById('tipoNome').value = tipo.nome || '';
            document.getElementById('tipoCategoria').value = tipo.categoria_id || '';
        } else {
            document.getElementById('tipoId').value = '';
            document.getElementById('tipoNome').value = '';
            document.getElementById('tipoCategoria').value = '';
        }
        
        modal.style.display = 'block';
    },
    
    fecharModalTipo() {
        document.getElementById('modalTipo').style.display = 'none';
        this.tipoEditando = null;
    },
    
    async salvarTipo() {
        try {
            UI.showLoading();
            
            const nome = document.getElementById('tipoNome')?.value?.trim();
            const categoria_id = document.getElementById('tipoCategoria')?.value;
            
            if (!nome) throw new Error('Nome é obrigatório');
            if (!categoria_id) throw new Error('Categoria é obrigatória');
            
            const tipo = { nome, categoria_id };
            
            if (this.tipoEditando) {
                await API.atualizarTipo(this.tipoEditando.id, tipo);
                if (window.Notificacao) {
                    Notificacao.mostrar('✅ Tipo atualizado!', 'success');
                }
            } else {
                await API.criarTipo(tipo);
                if (window.Notificacao) {
                    Notificacao.mostrar('✅ Tipo criado!', 'success');
                }
            }
            
            this.fecharModalTipo();
            await this.carregarTipos();
            
        } catch (error) {
            console.error('Erro ao salvar tipo:', error);
            
            let mensagem = error.message;
            if (error.message.includes('UNIQUE constraint')) {
                mensagem = '❌ Já existe um tipo com este nome nesta categoria!';
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
    
    async editarTipo(id) {
        try {
            const tipos = await API.listarTipos();
            const tipo = tipos.find(t => t.id === id);
            if (tipo) {
                this.abrirModalTipo(tipo);
            }
        } catch (error) {
            console.error('Erro ao carregar tipo:', error);
            if (window.Notificacao) {
                Notificacao.mostrar('Erro ao carregar tipo', 'danger');
            }
        }
    },
    
    async excluirTipo(id) {
        if (!confirm('⚠️ Tem certeza que deseja excluir este tipo?')) return;
        
        try {
            UI.showLoading();
            await API.excluirTipo(id);
            
            if (window.Notificacao) {
                Notificacao.mostrar('✅ Tipo excluído!', 'success');
            }
            
            await this.carregarTipos();
            
        } catch (error) {
            console.error('Erro ao excluir tipo:', error);
            
            let mensagem = error.message;
            if (error.message.includes('produtos vinculados')) {
                mensagem = '❌ Não é possível excluir tipo com produtos vinculados!';
            }
            
            if (window.Notificacao) {
                Notificacao.mostrar(mensagem, 'danger');
            } else {
                alert(mensagem);
            }
        } finally {
            UI.hideLoading();
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('categorias.html')) {
        CategoriasManager.init();
    }
});

window.CategoriasManager = CategoriasManager;