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
            }
        });
    },

    updateMenuByRole() {
        const isAdmin = this.isAdmin();
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        
        menuItems.forEach(item => {
            const text = item.textContent || '';
            if (text.includes('Relatórios') || text.includes('Categorias')) {
                item.style.display = isAdmin ? 'flex' : 'none';
            }
            if (text.includes('Caixa')) {
                item.style.display = 'flex';
            }
        });
    }
};