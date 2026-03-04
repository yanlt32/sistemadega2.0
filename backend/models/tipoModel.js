const { db } = require('./database');

class TipoModel {
    static async findAll() {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT t.*, 
                       c.nome as categoria_nome,
                       COUNT(p.id) as total_produtos
                FROM tipos t
                LEFT JOIN categorias c ON t.categoria_id = c.id
                LEFT JOIN produtos p ON t.id = p.tipo_id
                GROUP BY t.id
                ORDER BY t.nome
            `, [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static async findByCategoria(categoriaId) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM tipos WHERE categoria_id = ? ORDER BY nome',
                [categoriaId],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    static async create(nome, categoriaId) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO tipos (nome, categoria_id) VALUES (?, ?)',
                [nome, categoriaId],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async update(id, nome, categoriaId) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE tipos SET nome = ?, categoria_id = ? WHERE id = ?',
                [nome, categoriaId, id],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        });
    }

    static async delete(id) {
        return new Promise((resolve, reject) => {
            // Verificar se existem produtos usando este tipo
            db.get('SELECT COUNT(*) as count FROM produtos WHERE tipo_id = ?', [id], (err, result) => {
                if (err) reject(err);
                
                if (result.count > 0) {
                    reject(new Error('Não é possível excluir tipo com produtos vinculados'));
                    return;
                }

                db.run('DELETE FROM tipos WHERE id = ?', [id], function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                });
            });
        });
    }
}

module.exports = TipoModel;