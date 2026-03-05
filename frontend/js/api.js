const API = {
    // Detectar ambiente (desenvolvimento ou produção)
    get baseURL() {
        // Se estiver no Render (produção)
        if (window.location.hostname.includes('onrender.com')) {
            return `https://${window.location.hostname}/api`;
        }
        // Se estiver em desenvolvimento local
        return `http://${window.location.hostname}:3000/api`;
    },
    
    getToken() {
        return localStorage.getItem('token');
    },
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('index.html') && 
                    window.location.pathname !== '/') {
                    window.location.href = '/';
                }
                throw new Error('Sessão expirada');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // ===== AUTH =====
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    async verificarToken() {
        return this.request('/auth/verificar');
    },
    
    // ===== PRODUTOS =====
    async listarProdutos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/produtos${queryString ? '?' + queryString : ''}`);
    },
    
    async criarProduto(produto) {
        return this.request('/produtos', {
            method: 'POST',
            body: JSON.stringify(produto)
        });
    },
    
    async atualizarProduto(id, produto) {
        return this.request(`/produtos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(produto)
        });
    },
    
    async atualizarEstoque(id, data) {
        return this.request(`/produtos/${id}/estoque`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    async excluirProduto(id) {
        return this.request(`/produtos/${id}`, {
            method: 'DELETE'
        });
    },
    
    async estoqueBaixo() {
        return this.request('/produtos/estoque-baixo');
    },
    
    // ===== VENDAS =====
    async criarVenda(venda) {
        return this.request('/vendas', {
            method: 'POST',
            body: JSON.stringify(venda)
        });
    },
    
    async listarVendas(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/vendas${queryString ? '?' + queryString : ''}`);
    },
    
    async buscarVenda(id) {
        return this.request(`/vendas/${id}`);
    },
    
    async atualizarVenda(id, dados) {
        return this.request(`/vendas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });
    },
    
    async excluirVenda(id) {
        return this.request(`/vendas/${id}`, {
            method: 'DELETE'
        });
    },
    
    async cancelarVenda(id, motivo) {
        return this.request(`/vendas/${id}/cancelar`, {
            method: 'PUT',
            body: JSON.stringify({ motivo })
        });
    },
    
    // ===== CATEGORIAS =====
    async listarCategorias() {
        return this.request('/categorias');
    },
    
    async criarCategoria(categoria) {
        return this.request('/categorias', {
            method: 'POST',
            body: JSON.stringify(categoria)
        });
    },
    
    async atualizarCategoria(id, categoria) {
        return this.request(`/categorias/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoria)
        });
    },
    
    async excluirCategoria(id) {
        return this.request(`/categorias/${id}`, {
            method: 'DELETE'
        });
    },
    
    // ===== TIPOS =====
    async listarTipos() {
        return this.request('/tipos');
    },
    
    async listarTiposPorCategoria(categoriaId) {
        return this.request(`/tipos/categoria/${categoriaId}`);
    },
    
    async criarTipo(tipo) {
        return this.request('/tipos', {
            method: 'POST',
            body: JSON.stringify(tipo)
        });
    },
    
    async atualizarTipo(id, tipo) {
        return this.request(`/tipos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tipo)
        });
    },
    
    async excluirTipo(id) {
        return this.request(`/tipos/${id}`, {
            method: 'DELETE'
        });
    },
    
    // ===== RELATÓRIOS =====
    async lucroDiario() {
        return this.request('/relatorios/lucro-diario');
    },
    
    async lucroMensal() {
        return this.request('/relatorios/lucro-mensal');
    },
    
    async produtoMaisVendido() {
        return this.request('/relatorios/produto-mais-vendido');
    },
    
    async categoriaMaisVendida() {
        return this.request('/relatorios/categoria-mais-vendida');
    },
    
    async vendasPorPeriodo(periodo) {
        return this.request(`/relatorios/vendas-por-periodo?periodo=${periodo}`);
    }
};