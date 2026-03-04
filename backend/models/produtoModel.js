const { db } = require('./database');

class ProdutoModel {
    static async findAll(filters = {}) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM produtos WHERE 1=1';
            const params = [];

            if (filters.categoria) {
                query += ' AND categoria = ?';
                params.push(filters.categoria);
            }

            if (filters.busca) {
                query += ' AND nome LIKE ?';
                params.push(`%${filters.busca}%`);
            }

            query += ' ORDER BY nome';

            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM produtos WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    static async create(data) {
        return new Promise((resolve, reject) => {
            const { nome, categoria, tipo, preco_custo, preco_venda, quantidade } = data;
            db.run(
                `INSERT INTO produtos (nome, categoria, tipo, preco_custo, preco_venda, quantidade) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [nome, categoria, tipo, preco_custo, preco_venda, quantidade || 0],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    static async update(id, data) {
        return new Promise((resolve, reject) => {
            const { nome, categoria, tipo, preco_custo, preco_venda } = data;
            db.run(
                `UPDATE produtos 
                 SET nome = ?, categoria = ?, tipo = ?, preco_custo = ?, preco_venda = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [nome, categoria, tipo, preco_custo, preco_venda, id],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        });
    }

    static async updateStock(id, quantidade) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE produtos SET quantidade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [quantidade, id],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        });
    }

    static async delete(id) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM produtos WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                resolve(this.changes);
            });
        });
    }

    static async getLowStock(limit = 5) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM produtos WHERE quantidade < ? ORDER BY quantidade', [limit], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }
}

module.exports = ProdutoModel;