const { db } = require('./database');

class CategoriaModel {
    static async findAll() {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT c.*, 
                       COUNT(p.id) as total_produtos,
                       SUM(p.quantidade) as estoque_total
                FROM categorias c
                LEFT JOIN produtos p ON c.id = p.categoria_id
                GROUP BY c.id
                ORDER BY c.nome
            `, [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM categorias WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    static async create(nome, tipo) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO categorias (nome, tipo) VALUES (?, ?)',
                [nome, tipo],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async update(id, nome, tipo) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE categorias SET nome = ?, tipo = ? WHERE id = ?',
                [nome, tipo, id],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        });
    }

    static async delete(id) {
        return new Promise((resolve, reject) => {
            // Verificar se existem produtos usando esta categoria
            db.get('SELECT COUNT(*) as count FROM produtos WHERE categoria_id = ?', [id], (err, result) => {
                if (err) reject(err);
                
                if (result.count > 0) {
                    reject(new Error('Não é possível excluir categoria com produtos vinculados'));
                    return;
                }

                db.run('DELETE FROM categorias WHERE id = ?', [id], function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                });
            });
        });
    }

    static async getTipos(categoriaId) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT DISTINCT tipo FROM produtos WHERE categoria_id = ? ORDER BY tipo',
                [categoriaId],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows.map(r => r.tipo));
                }
            );
        });
    }
}

module.exports = CategoriaModel;