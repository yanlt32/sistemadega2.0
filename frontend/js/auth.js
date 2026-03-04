class Auth {
    static async login(username, password) {
        try {
            const response = await API.login(username, password);
            
            if (response.token) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                return { success: true, user: response.user };
            }
            
            return { success: false, error: 'Erro ao fazer login' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
    
    static getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    static isAuthenticated() {
        return !!localStorage.getItem('token');
    }
    
    static async checkAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/';
            return false;
        }
        
        try {
            const response = await API.verificarToken();
            return response.valid;
        } catch (error) {
            this.logout();
            return false;
        }
    }
}

// Verificar autenticação em todas as páginas exceto login
if (!window.location.pathname.includes('index.html') && 
    window.location.pathname !== '/') {
    Auth.checkAuth().then(valid => {
        if (!valid) {
            window.location.href = '/';
        }
    });
}