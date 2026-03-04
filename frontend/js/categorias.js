const Categorias = {
    async init() {
        await this.carregar();
        await Tipos.carregarCategorias();
    },
    
    async carregar() {
        try {
            const categorias = await API.listarCategorias();
            this.renderizar(categorias);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    },
    
    renderizar(categorias) {
        const tbody = document.getElementById('tabelaCategorias');
        if (!tbody) return;
        
        tbody.innerHTML = categorias.map(c => `
            <tr>
                <td>
                    <span style="display: inline-block; width: 12px; height: 12px; background-color: ${c.cor}; border-radius: 50%; margin-right: 8px;"></span>
                    ${c.nome}
                </td>
                <td>${c.tipo}</td>
                <td>${c.total_produtos || 0}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Categorias.editar(${c.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="Categorias.excluir(${c.id})" ${c.total_produtos > 0 ? 'disabled' : ''}>🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    abrirModal(categoria = null) {
        this.categoriaEditando = categoria;
        
        const modal = document.getElementById('modalCategoria');
        const titulo = document.getElementById('modalCategoriaTitulo');
        
        titulo.textContent = categoria ? 'Editar Categoria' : 'Nova Categoria';
        
        if (categoria) {
            document.getElementById('categoriaId').value = categoria.id;
            document.getElementById('categoriaNome').value = categoria.nome;
            document.getElementById('categoriaTipo').value = categoria.tipo;
            document.getElementById('categoriaCor').value = categoria.cor || '#4CAF50';
        } else {
            document.getElementById('formCategoria').reset();
        }
        
        modal.style.display = 'block';
    },
    
    fecharModal() {
        document.getElementById('modalCategoria').style.display = 'none';
        this.categoriaEditando = null;
    },
    
    async salvar() {
        try {
            const categoria = {
                nome: document.getElementById('categoriaNome').value,
                tipo: document.getElementById('categoriaTipo').value,
                cor: document.getElementById('categoriaCor').value
            };
            
            if (this.categoriaEditando) {
                await API.atualizarCategoria(this.categoriaEditando.id, categoria);
                alert('Categoria atualizada com sucesso!');
            } else {
                await API.criarCategoria(categoria);
                alert('Categoria criada com sucesso!');
            }
            
            this.fecharModal();
            this.carregar();
            Tipos.carregarCategorias();
        } catch (error) {
            alert('Erro: ' + error.message);
        }
    },
    
    async editar(id) {
        try {
            const categorias = await API.listarCategorias();
            const categoria = categorias.find(c => c.id === id);
            if (categoria) {
                this.abrirModal(categoria);
            }
        } catch (error) {
            alert('Erro ao carregar categoria: ' + error.message);
        }
    },
    
    async excluir(id) {
        if (confirm('Tem certeza que deseja excluir esta categoria?')) {
            try {
                await API.excluirCategoria(id);
                alert('Categoria excluída com sucesso!');
                this.carregar();
                Tipos.carregarCategorias();
            } catch (error) {
                alert('Erro: ' + error.message);
            }
        }
    }
};

const Tipos = {
    async init() {
        await this.carregarCategorias();
        await this.carregar();
    },
    
    async carregarCategorias() {
        try {
            const categorias = await API.listarCategorias();
            const select = document.getElementById('filtroTipoCategoria');
            const selectModal = document.getElementById('tipoCategoria');
            
            if (select) {
                select.innerHTML = '<option value="todas">Todas</option>' + 
                    categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            }
            
            if (selectModal) {
                selectModal.innerHTML = categorias.map(c => 
                    `<option value="${c.id}">${c.nome}</option>`
                ).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    },
    
    async carregar() {
        try {
            const filtro = document.getElementById('filtroTipoCategoria')?.value;
            let tipos;
            
            if (filtro && filtro !== 'todas') {
                tipos = await API.listarTiposPorCategoria(filtro);
            } else {
                tipos = await API.listarTipos();
            }
            
            this.renderizar(tipos);
        } catch (error) {
            console.error('Erro ao carregar tipos:', error);
        }
    },
    
    renderizar(tipos) {
        const tbody = document.getElementById('tabelaTipos');
        if (!tbody) return;
        
        tbody.innerHTML = tipos.map(t => `
            <tr>
                <td>${t.nome}</td>
                <td>${t.categoria_nome || '-'}</td>
                <td>${t.total_produtos || 0}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Tipos.editar(${t.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="Tipos.excluir(${t.id})" ${t.total_produtos > 0 ? 'disabled' : ''}>🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    abrirModal(tipo = null) {
        this.tipoEditando = tipo;
        
        const modal = document.getElementById('modalTipo');
        const titulo = document.getElementById('modalTipoTitulo');
        
        titulo.textContent = tipo ? 'Editar Tipo' : 'Novo Tipo';
        
        if (tipo) {
            document.getElementById('tipoId').value = tipo.id;
            document.getElementById('tipoNome').value = tipo.nome;
            document.getElementById('tipoCategoria').value = tipo.categoria_id;
        } else {
            document.getElementById('formTipo').reset();
        }
        
        modal.style.display = 'block';
    },
    
    fecharModal() {
        document.getElementById('modalTipo').style.display = 'none';
        this.tipoEditando = null;
    },
    
    async salvar() {
        try {
            const tipo = {
                nome: document.getElementById('tipoNome').value,
                categoria_id: document.getElementById('tipoCategoria').value
            };
            
            if (this.tipoEditando) {
                await API.atualizarTipo(this.tipoEditando.id, tipo);
                alert('Tipo atualizado com sucesso!');
            } else {
                await API.criarTipo(tipo);
                alert('Tipo criado com sucesso!');
            }
            
            this.fecharModal();
            this.carregar();
        } catch (error) {
            alert('Erro: ' + error.message);
        }
    },
    
    async editar(id) {
        try {
            const tipos = await API.listarTipos();
            const tipo = tipos.find(t => t.id === id);
            if (tipo) {
                this.abrirModal(tipo);
            }
        } catch (error) {
            alert('Erro ao carregar tipo: ' + error.message);
        }
    },
    
    async excluir(id) {
        if (confirm('Tem certeza que deseja excluir este tipo?')) {
            try {
                await API.excluirTipo(id);
                alert('Tipo excluído com sucesso!');
                this.carregar();
            } catch (error) {
                alert('Erro: ' + error.message);
            }
        }
    }
};

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    Categorias.init();
    Tipos.init();
});