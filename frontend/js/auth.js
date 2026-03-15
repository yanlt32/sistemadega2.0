const Auth = {
    currentUser: null,
    
    async login(username, password) {
        try {
            const response = await API.login(username, password);
            
            if (response.token) {
                this.currentUser = response.user;
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                return { success: true };
            }
            return { success: false, error: 'Erro no login' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        window.location.href = '/';
    },
    
    getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        const user = localStorage.getItem('user');
        if (user) {
            try {
                this.currentUser = JSON.parse(user);
                return this.currentUser;
            } catch (e) {
                return null;
            }
        }
        return null;
    },
    
    getUserRole() {
        const user = this.getCurrentUser();
        return user?.role || 'funcionario';
    },

    isAdmin() {
        return this.getUserRole() === 'admin';
    },

    isFuncionario() {
        return this.getUserRole() === 'funcionario';
    },
    
    async checkAuth() {
        const token = localStorage.getItem('token');
        
        if (!token) {
            if (!window.location.pathname.includes('index.html') && 
                window.location.pathname !== '/') {
                window.location.href = '/';
            }
            return false;
        }
        
        try {
            const response = await API.verificarToken();
            
            if (response.valid) {
                this.currentUser = response.user;
                this.updateUserInfo();
                this.updateMenuByRole();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return false;
        }
    },
    
    updateUserInfo() {
        const user = this.getCurrentUser();
        const elements = document.querySelectorAll('#userNome');
        const roleElements = document.querySelectorAll('#userRole');
        
        elements.forEach(el => {
            if (el) el.textContent = user?.nome || user?.username || 'Usuário';
        });
        
        roleElements.forEach(el => {
            if (el) {
                const role = user?.role || 'funcionario';
                el.textContent = role === 'admin' ? 'Admin' : 'Funcionário';
                el.className = `badge ${role === 'admin' ? 'badge-success' : 'badge-info'}`;
            }
        });
    },

    updateMenuByRole() {
        const isAdmin = this.isAdmin();
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        const currentPath = window.location.pathname;
        
        menuItems.forEach(item => {
            const text = item.textContent || '';
            
            if (isAdmin) {
                // ADMIN - mostra todos os itens
                item.style.display = 'flex';
            } else {
                // FUNCIONÁRIO - mostra apenas Produtos, Vendas, Histórico
                if (text.includes('Dashboard') || 
                    text.includes('Categorias') || 
                    text.includes('Relatórios') || 
                    text.includes('Gastos') || 
                    text.includes('Financeiro')) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'flex';
                }
            }
        });

        // Se for funcionário e estiver na página de dashboard, redireciona para vendas
        if (!isAdmin && currentPath.includes('dashboard.html')) {
            window.location.href = '/vendas.html';
            return;
        }

        // Esconder botões de ação para funcionário em produtos
        if (!isAdmin && currentPath.includes('produtos.html')) {
            const btnNovo = document.getElementById('btnNovoProduto');
            if (btnNovo) btnNovo.style.display = 'none';
        }
    }
}; // <-- FECHA O OBJETO AQUI!