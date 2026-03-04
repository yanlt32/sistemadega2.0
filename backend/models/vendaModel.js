const { db } = require('./database');

class VendaModel {
    static async create(vendaData, itens) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                db.run(
                    `INSERT INTO vendas (total, lucro, forma_pagamento, usuario_id) 
                     VALUES (?, ?, ?, ?)`,
                    [vendaData.total, vendaData.lucro, vendaData.forma_pagamento, vendaData.usuario_id],
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        const venda_id = this.lastID;
                        let itensProcessados = 0;

                        itens.forEach((item, index) => {
                            db.run(
                                `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, preco_custo_unitario) 
                                 VALUES (?, ?, ?, ?, ?)`,
                                [venda_id, item.produto_id, item.quantidade, item.preco_unitario, item.preco_custo_unitario],
                                (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        reject(err);
                                        return;
                                    }

                                    itensProcessados++;
                                    if (itensProcessados === itens.length) {
                                        db.run('COMMIT');
                                        resolve(venda_id);
                                    }
                                }
                            );
                        });
                    }
                );
            });
        });
    }

    static async findAll(filters = {}) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT v.*, u.nome as usuario_nome 
                FROM vendas v
                LEFT JOIN usuarios u ON v.usuario_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.data_inicio && filters.data_fim) {
                query += ' AND DATE(data_venda) BETWEEN DATE(?) AND DATE(?)';
                params.push(filters.data_inicio, filters.data_fim);
            }

            query += ' ORDER BY data_venda DESC';

            db.all(query, params, (err, vendas) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Buscar itens de cada venda
                const promises = vendas.map(venda => {
                    return new Promise((resolveItem, rejectItem) => {
                        db.all(
                            `SELECT iv.*, p.nome as produto_nome 
                             FROM itens_venda iv
                             JOIN produtos p ON iv.produto_id = p.id
                             WHERE iv.venda_id = ?`,
                            [venda.id],
                            (err, itens) => {
                                if (err) rejectItem(err);
                                venda.itens = itens;
                                resolveItem();
                            }
                        );
                    });
                });

                Promise.all(promises)
                    .then(() => resolve(vendas))
                    .catch(err => reject(err));
            });
        });
    }

    static async getDailyProfit(date) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                 FROM vendas 
                 WHERE DATE(data_venda) = DATE(?)`,
                [date],
                (err, result) => {
                    if (err) reject(err);
                    resolve(result);
                }
            );
        });
    }

    static async getMonthlyProfit(year, month) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                 FROM vendas 
                 WHERE strftime('%Y', data_venda) = ? 
                 AND strftime('%m', data_venda) = ?`,
                [year, month],
                (err, result) => {
                    if (err) reject(err);
                    resolve(result);
                }
            );
        });
    }
}

module.exports = VendaModel;