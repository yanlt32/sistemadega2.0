const API = {
    // Detectar ambiente (desenvolvimento ou produção)
    get baseURL() {
        // Se estiver no Render (produção)
        if (window.location.hostname.includes('onrender.com')) {
            // Usar a mesma origem (protocolo e hostname)
            return `${window.location.protocol}//${window.location.hostname}/api`;
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
        
        console.log('📡 Requisição:', {
            url,
            method: options.method || 'GET',
            hasToken: !!token
        });
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'same-origin'
            });
            
            // Tratar erros de rede
            if (!response.ok) {
                // Tentar parsear o erro como JSON
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: response.statusText };
                }
                
                // Se for 401 (não autorizado)
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    if (!window.location.pathname.includes('index.html') && 
                        window.location.pathname !== '/') {
                        window.location.href = '/';
                    }
                    throw new Error(errorData.error || 'Sessão expirada');
                }
                
                // Outros erros
                throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
            }
            
            // Se não houver conteúdo, retornar vazio
            if (response.status === 204) {
                return { success: true };
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ API Error:', error);
            // Se for erro de rede (CORS, servidor offline)
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Erro de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde.');
            }
            throw error;
        }
    },

    // ============================================
    // AUTH
    // ============================================
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    },
    
    async verificarToken() {
        return this.request('/auth/verificar');
    },

    // ============================================
    // PRODUTOS
    // ============================================
    async listarProdutos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/produtos${queryString ? '?' + queryString : ''}`);
    },
    
    async buscarProduto(id) {
        return this.request(`/produtos/${id}`);
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

    // ============================================
    // VENDAS
    // ============================================
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

    // ============================================
    // CATEGORIAS
    // ============================================
    async listarCategorias() {
        return this.request('/categorias');
    },
    
    async buscarCategoria(id) {
        return this.request(`/categorias/${id}`);
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
    
    async listarTiposCategorias() {
        return this.request('/categorias/tipos');
    },

    // ============================================
    // TIPOS
    // ============================================
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

    // ============================================
    // RELATÓRIOS
    // ============================================
    async lucroDiario() {
        return this.request('/relatorios/lucro-diario');
    },
    
    async lucroMensal() {
        return this.request('/relatorios/lucro-mensal');
    },
    
    async relatorioCompleto(dataInicio, dataFim) {
        return this.request(`/relatorios/completo?data_inicio=${dataInicio}&data_fim=${dataFim}`);
    },
    
    async relatorioMensalDetalhado(mes, ano) {
        return this.request(`/relatorios/mensal-detalhado?mes=${mes}&ano=${ano}`);
    },
    
    async relatorioAnual(ano) {
        return this.request(`/relatorios/anual?ano=${ano}`);
    },
    
    async produtosMaisVendidos(dataInicio, dataFim, limit = 20) {
        let url = `/relatorios/produtos-mais-vendidos?limit=${limit}`;
        if (dataInicio && dataFim) {
            url += `&data_inicio=${dataInicio}&data_fim=${dataFim}`;
        }
        return this.request(url);
    },
    
    async faturamentoPeriodo(dataInicio, dataFim) {
        return this.request(`/relatorios/faturamento-periodo?data_inicio=${dataInicio}&data_fim=${dataFim}`);
    },

    // ============================================
    // CAIXA
    // ============================================
    async statusCaixa() {
        return this.request('/caixa/status');
    },

    async abrirCaixa(dados) {
        return this.request('/caixa/abrir', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    },

    async fecharCaixa(dados) {
        return this.request('/caixa/fechar', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    },

    async resetarCaixa(dados) {
        return this.request('/caixa/resetar', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    },

    async excluirCaixa(id, dados) {
        return this.request(`/caixa/${id}`, {
            method: 'DELETE',
            body: JSON.stringify(dados)
        });
    },

    async recalcularCaixa(id, dados) {
        return this.request(`/caixa/recalcular/${id}`, {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    },

    async historicoCaixa(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/caixa/historico${queryString ? '?' + queryString : ''}`);
    },

    async relatorioSemanal() {
        return this.request('/caixa/relatorio/semanal');
    },

    async relatorioMensal() {
        return this.request('/caixa/relatorio/mensal');
    },

    // ============================================
    // GASTOS
    // ============================================
    async listarGastos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/gastos${queryString ? '?' + queryString : ''}`);
    },

    async buscarGasto(id) {
        return this.request(`/gastos/${id}`);
    },

    async criarGasto(gasto) {
        return this.request('/gastos', {
            method: 'POST',
            body: JSON.stringify(gasto)
        });
    },

    async atualizarGasto(id, gasto) {
        return this.request(`/gastos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(gasto)
        });
    },

    async excluirGasto(id) {
        return this.request(`/gastos/${id}`, {
            method: 'DELETE'
        });
    },

    async listarCategoriasGastos() {
        return this.request('/gastos/categorias');
    },

    async criarCategoriaGasto(categoria) {
        return this.request('/gastos/categorias', {
            method: 'POST',
            body: JSON.stringify(categoria)
        });
    },

    async excluirCategoriaGasto(id) {
        return this.request(`/gastos/categorias/${id}`, {
            method: 'DELETE'
        });
    },

    async listarFormasPagamento() {
        return this.request('/gastos/formas-pagamento');
    },

    async resumoMensalGastos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/gastos/resumo/mensal${queryString ? '?' + queryString : ''}`);
    },

    async resumoSimplificado(periodo = 'mes') {
        return this.request(`/gastos/resumo/simplificado?periodo=${periodo}`);
    },

    async exportarResumoGastos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseURL}/gastos/exportar/resumo${queryString ? '?' + queryString : ''}`;
        const token = this.getToken();
        window.open(url + `&token=${token}`, '_blank');
        return { success: true };
    },

    // ============================================
    // EXPORTAÇÃO EXCEL
    // ============================================
    async exportarVendas(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseURL}/exportar/vendas${queryString ? '?' + queryString : ''}`;
        const token = this.getToken();
        window.open(url + `&token=${token}`, '_blank');
        return { success: true };
    },

    async exportarProdutos() {
        const url = `${this.baseURL}/exportar/produtos`;
        const token = this.getToken();
        window.open(url + `?token=${token}`, '_blank');
        return { success: true };
    },

    async exportarCaixa(periodo = 'mes') {
        const url = `${this.baseURL}/exportar/caixa?periodo=${periodo}`;
        const token = this.getToken();
        window.open(url + `&token=${token}`, '_blank');
        return { success: true };
    },

    // ============================================
    // DOSES
    // ============================================
    async listarDoses() {
        return this.request('/doses');
    },

    async buscarDose(id) {
        return this.request(`/doses/${id}`);
    },

    async criarDose(dose) {
        return this.request('/doses', {
            method: 'POST',
            body: JSON.stringify(dose)
        });
    },

    async atualizarDose(id, dose) {
        return this.request(`/doses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dose)
        });
    },

    async atualizarEstoqueDose(id, data) {
        return this.request(`/doses/${id}/estoque`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async excluirDose(id) {
        return this.request(`/doses/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // COMBOS
    // ============================================
    async listarCombos() {
        return this.request('/combos');
    },

    async buscarCombo(id) {
        return this.request(`/combos/${id}`);
    },

    async criarCombo(combo) {
        return this.request('/combos', {
            method: 'POST',
            body: JSON.stringify(combo)
        });
    },

    async atualizarCombo(id, combo) {
        return this.request(`/combos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(combo)
        });
    },

    async excluirCombo(id) {
        return this.request(`/combos/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // DASHBOARD
    // ============================================
    async dashboardResumo() {
        return this.request('/dashboard/resumo');
    },

    async dashboardVendasHoje() {
        return this.request('/dashboard/vendas-hoje');
    },

    async dashboardProdutosEsgotando() {
        return this.request('/dashboard/produtos-esgotando');
    },

    // ============================================
    // DOWNLOAD DE ARQUIVOS
    // ============================================
    async downloadFile(url, filename) {
        const token = this.getToken();
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Erro ao baixar arquivo');
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            
            return { success: true };
        } catch (error) {
            console.error('Erro no download:', error);
            throw error;
        }
    }
};

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}