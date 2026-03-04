const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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
                    return res.status(500).json({ error: 'Erro no servidor' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
                }

                const senhaValida = await bcrypt.compare(password, user.password);
                
                if (!senhaValida) {
                    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
                }

                const token = jwt.sign(
                    { id: user.id, username: user.username, nome: user.nome },
                    SECRET_KEY,
                    { expiresIn: '8h' }
                );

                res.json({ 
                    token, 
                    user: { 
                        id: user.id, 
                        username: user.username, 
                        nome: user.nome 
                    } 
                });
            });
        } catch (error) {
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
    }
};

module.exports = authController;