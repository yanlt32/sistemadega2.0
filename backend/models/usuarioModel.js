const { db } = require('./database');
const bcrypt = require('bcryptjs');

class UsuarioModel {
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT id, username, nome, email, created_at FROM usuarios WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    static async create(userData) {
        return new Promise(async (resolve, reject) => {
            const { username, password, nome, email } = userData;
            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                `INSERT INTO usuarios (username, password, nome, email) 
                 VALUES (?, ?, ?, ?)`,
                [username, hashedPassword, nome, email],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }

    static async updateLastLogin(id) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        });
    }
}

module.exports = UsuarioModel;