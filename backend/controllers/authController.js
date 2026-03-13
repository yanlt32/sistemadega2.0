const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');

const SECRET_KEY = 'sua_chave_secreta_super_segura_2024';

const authController = {
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
            }

            db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, user) => {
                if (err) {
                    console.error('Erro no banco:', err);
                    return res.status(500).json({ error: 'Erro no servidor' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
                }

                const senhaValida = await bcrypt.compare(password, user.password);
                
                if (!senhaValida) {
                    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
                }

                // Atualizar último login
                db.run('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

                const token = jwt.sign(
                    { 
                        id: user.id, 
                        username: user.username, 
                        nome: user.nome,
                        role: user.role 
                    },
                    SECRET_KEY,
                    { expiresIn: '8h' }
                );

                res.json({ 
                    token, 
                    user: { 
                        id: user.id, 
                        username: user.username, 
                        nome: user.nome,
                        role: user.role
                    } 
                });
            });
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({ error: 'Erro no servidor' });
        }
    },

    logout: (req, res) => {
        res.json({ message: 'Logout realizado com sucesso' });
    },

    verificarToken: (req, res) => {
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ valid: false });
        }

        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(401).json({ valid: false });
            }
            res.json({ valid: true, user: decoded });
        });
    },

    // Nova função para verificar permissões
    verificarPermissao: (req, res, next, permissoesNecessarias = []) => {
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Não autorizado' });
        }

        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Token inválido' });
            }

            // Admin tem todas as permissões
            if (decoded.role === 'admin') {
                req.usuario = decoded;
                return next();
            }

            // Verificar permissões específicas para funcionário
            if (decoded.role === 'funcionario') {
                // Funcionário só pode acessar rotas básicas
                const rotaAtual = req.baseUrl + req.route.path;
                const rotasPermitidas = [
                    '/api/produtos',
                    '/api/vendas',
                    '/api/caixa/status',
                    '/api/caixa/abrir',
                    '/api/caixa/fechar'
                ];

                const permitido = rotasPermitidas.some(rota => rotaAtual.startsWith(rota));
                
                if (!permitido && permissoesNecessarias.length > 0) {
                    return res.status(403).json({ error: 'Acesso negado para funcionário' });
                }
            }

            req.usuario = decoded;
            next();
        });
    }
};

module.exports = authController;