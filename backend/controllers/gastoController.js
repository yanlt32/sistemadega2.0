const { db } = require('../models/database');

const gastoController = {
    // Listar todos os gastos
    listar: (req, res) => {
        const { mes, ano, categoria, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT g.*, 
                   c.nome as categoria_nome,
                   c.cor as categoria_cor,
                   f.nome as forma_pagamento_nome,
                   u.nome as usuario_nome
            FROM gastos g
            LEFT JOIN categorias_gastos c ON g.categoria_id = c.id
            LEFT JOIN formas_pagamento f ON g.forma_pagamento_id = f.id
            LEFT JOIN usuarios u ON g.usuario_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (mes && ano) {
            query += ' AND strftime("%m", g.data_gasto) = ? AND strftime("%Y", g.data_gasto) = ?';
            params.push(mes.padStart(2, '0'), ano);
        }

        if (categoria) {
            query += ' AND g.categoria_id = ?';
            params.push(categoria);
        }

        query += ' ORDER BY g.data_gasto DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        db.all(query, params, (err, gastos) => {
            if (err) {
                console.error('Erro ao listar gastos:', err);
                return res.status(500).json({ error: err.message });
            }

            // Contar total para paginação
            let countQuery = 'SELECT COUNT(*) as total FROM gastos WHERE 1=1';
            let countParams = [];

            if (mes && ano) {
                countQuery += ' AND strftime("%m", data_gasto) = ? AND strftime("%Y", data_gasto) = ?';
                countParams.push(mes.padStart(2, '0'), ano);
            }

            if (categoria) {
                countQuery += ' AND categoria_id = ?';
                countParams.push(categoria);
            }

            db.get(countQuery, countParams, (err, count) => {
                if (err) {
                    console.error('Erro ao contar gastos:', err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    gastos: gastos || [],
                    total: count?.total || 0,
                    page: parseInt(page),
                    totalPages: Math.ceil((count?.total || 0) / limit)
                });
            });
        });
    },

    // Buscar gasto por ID
    buscarPorId: (req, res) => {
        const { id } = req.params;

        db.get(`
            SELECT g.*, 
                   c.nome as categoria_nome,
                   f.nome as forma_pagamento_nome,
                   u.nome as usuario_nome
            FROM gastos g
            LEFT JOIN categorias_gastos c ON g.categoria_id = c.id
            LEFT JOIN formas_pagamento f ON g.forma_pagamento_id = f.id
            LEFT JOIN usuarios u ON g.usuario_id = u.id
            WHERE g.id = ?
        `, [id], (err, gasto) => {
            if (err) {
                console.error('Erro ao buscar gasto:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!gasto) {
                return res.status(404).json({ error: 'Gasto não encontrado' });
            }
            res.json(gasto);
        });
    },

    // Criar novo gasto
    criar: (req, res) => {
        const { descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao } = req.body;
        const usuario_id = req.usuario.id;

        if (!descricao || !valor || !categoria_id) {
            return res.status(400).json({ error: 'Descrição, valor e categoria são obrigatórios' });
        }

        db.run(
            `INSERT INTO gastos (descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [descricao, valor, data_gasto || new Date().toISOString(), categoria_id, forma_pagamento_id || null, observacao || null, usuario_id],
            function(err) {
                if (err) {
                    console.error('Erro ao criar gasto:', err);
                    return res.status(500).json({ error: err.message });
                }

                if (req.io) {
                    req.io.emit('gasto:criado', { 
                        id: this.lastID, 
                        descricao,
                        valor,
                        mensagem: `💰 Gasto de R$ ${valor} registrado: ${descricao}`
                    });
                }

                res.json({ 
                    id: this.lastID, 
                    message: 'Gasto registrado com sucesso' 
                });
            }
        );
    },

    // Atualizar gasto
    atualizar: (req, res) => {
        const { id } = req.params;
        const { descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao } = req.body;

        db.run(
            `UPDATE gastos 
             SET descricao = ?, valor = ?, data_gasto = ?, categoria_id = ?, forma_pagamento_id = ?, observacao = ?
             WHERE id = ?`,
            [descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao, id],
            function(err) {
                if (err) {
                    console.error('Erro ao atualizar gasto:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Gasto não encontrado' });
                }

                if (req.io) {
                    req.io.emit('gasto:atualizado', { id });
                }
                res.json({ message: 'Gasto atualizado com sucesso' });
            }
        );
    },

    // Excluir gasto
    excluir: (req, res) => {
        const { id } = req.params;

        db.run('DELETE FROM gastos WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Erro ao excluir gasto:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Gasto não encontrado' });
            }

            if (req.io) {
                req.io.emit('gasto:excluido', { id });
            }
            res.json({ message: 'Gasto excluído com sucesso' });
        });
    },

    // Listar categorias de gastos
    listarCategorias: (req, res) => {
        db.all('SELECT * FROM categorias_gastos ORDER BY nome', [], (err, categorias) => {
            if (err) {
                console.error('Erro ao listar categorias de gastos:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(categorias || []);
        });
    },

    // Criar categoria de gasto
    criarCategoria: (req, res) => {
        const { nome, descricao, cor } = req.body;

        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        db.run(
            'INSERT INTO categorias_gastos (nome, descricao, cor) VALUES (?, ?, ?)',
            [nome, descricao || null, cor || '#c4a747'],
            function(err) {
                if (err) {
                    console.error('Erro ao criar categoria de gasto:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ id: this.lastID, message: 'Categoria criada com sucesso' });
            }
        );
    },

    // Excluir categoria de gasto
    excluirCategoria: (req, res) => {
        const { id } = req.params;

        // Verificar se existem gastos usando esta categoria
        db.get('SELECT COUNT(*) as count FROM gastos WHERE categoria_id = ?', [id], (err, result) => {
            if (err) {
                console.error('Erro ao verificar gastos:', err);
                return res.status(500).json({ error: err.message });
            }

            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível excluir categoria com gastos vinculados',
                    quantidade: result.count 
                });
            }

            db.run('DELETE FROM categorias_gastos WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Erro ao excluir categoria:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Categoria excluída com sucesso' });
            });
        });
    },

    // ✅ CORREÇÃO: Função para listar formas de pagamento
    listarFormasPagamento: (req, res) => {
        db.all('SELECT * FROM formas_pagamento ORDER BY nome', [], (err, formas) => {
            if (err) {
                console.error('Erro ao listar formas de pagamento:', err);
                return res.status(500).json({ error: err.message });
            }
            // Retornar array vazio se não houver formas, não erro
            res.json(formas || []);
        });
    },

    // ✅ NOVA FUNÇÃO: Resumo simplificado para o dashboard
    resumoSimplificado: (req, res) => {
        const { periodo = 'mes' } = req.query;
        const hoje = new Date();
        let dataInicio;

        if (periodo === 'semana') {
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 7));
        } else if (periodo === 'mes') {
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        } else if (periodo === 'ano') {
            dataInicio = new Date(hoje.getFullYear(), 0, 1);
        }

        Promise.all([
            // Total de vendas do período
            new Promise((resolve) => {
                db.get(`
                    SELECT COALESCE(SUM(total),0) as total_vendas, COUNT(*) as qtd_vendas
                    FROM vendas WHERE data_venda >= ? AND status = 'concluida'
                `, [dataInicio.toISOString()], (err, result) => {
                    resolve(result || { total_vendas: 0, qtd_vendas: 0 });
                });
            }),
            // Total de gastos do período
            new Promise((resolve) => {
                db.get(`
                    SELECT COALESCE(SUM(valor),0) as total_gastos, COUNT(*) as qtd_gastos
                    FROM gastos WHERE data_gasto >= ?
                `, [dataInicio.toISOString()], (err, result) => {
                    resolve(result || { total_gastos: 0, qtd_gastos: 0 });
                });
            }),
            // Vendas por forma de pagamento
            new Promise((resolve) => {
                db.all(`
                    SELECT forma_pagamento, COUNT(*) as quantidade, SUM(total) as total
                    FROM vendas WHERE data_venda >= ? AND status = 'concluida'
                    GROUP BY forma_pagamento
                `, [dataInicio.toISOString()], (err, result) => {
                    resolve(result || []);
                });
            })
        ]).then(([vendas, gastos, pagamentos]) => {
            res.json({
                periodo,
                vendas: vendas.total_vendas,
                gastos: gastos.total_gastos,
                saldo: vendas.total_vendas - gastos.total_gastos,
                qtd_vendas: vendas.qtd_vendas,
                qtd_gastos: gastos.qtd_gastos,
                pagamentos
            });
        }).catch(err => {
            console.error('Erro no resumo simplificado:', err);
            res.status(500).json({ error: err.message });
        });
    },

    // Resumo mensal completo
    resumoMensal: (req, res) => {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();
        const mesFormatado = mesAtual.toString().padStart(2, '0');

        Promise.all([
            // Total de vendas do mês
            new Promise((resolve) => {
                db.get(`
                    SELECT 
                        COALESCE(SUM(total), 0) as total_vendas,
                        COALESCE(SUM(lucro), 0) as total_lucro,
                        COUNT(*) as quantidade_vendas
                    FROM vendas 
                    WHERE strftime('%m', data_venda) = ? 
                    AND strftime('%Y', data_venda) = ?
                    AND status = 'concluida'
                `, [mesFormatado, anoAtual], (err, result) => {
                    resolve(result || { total_vendas: 0, total_lucro: 0, quantidade_vendas: 0 });
                });
            }),

            // Total de gastos do mês
            new Promise((resolve) => {
                db.get(`
                    SELECT 
                        COALESCE(SUM(valor), 0) as total_gastos,
                        COUNT(*) as quantidade_gastos
                    FROM gastos 
                    WHERE strftime('%m', data_gasto) = ? 
                    AND strftime('%Y', data_gasto) = ?
                `, [mesFormatado, anoAtual], (err, result) => {
                    resolve(result || { total_gastos: 0, quantidade_gastos: 0 });
                });
            }),

            // Gastos por categoria
            new Promise((resolve) => {
                db.all(`
                    SELECT 
                        COALESCE(c.nome, 'Sem categoria') as categoria,
                        c.cor,
                        COALESCE(SUM(g.valor), 0) as total,
                        COUNT(*) as quantidade
                    FROM gastos g
                    LEFT JOIN categorias_gastos c ON g.categoria_id = c.id
                    WHERE strftime('%m', g.data_gasto) = ? 
                    AND strftime('%Y', g.data_gasto) = ?
                    GROUP BY g.categoria_id
                    ORDER BY total DESC
                `, [mesFormatado, anoAtual], (err, result) => {
                    resolve(result || []);
                });
            }),

            // Vendas por forma de pagamento
            new Promise((resolve) => {
                db.all(`
                    SELECT 
                        forma_pagamento,
                        COUNT(*) as quantidade,
                        COALESCE(SUM(total), 0) as total
                    FROM vendas 
                    WHERE strftime('%m', data_venda) = ? 
                    AND strftime('%Y', data_venda) = ?
                    AND status = 'concluida'
                    GROUP BY forma_pagamento
                    ORDER BY total DESC
                `, [mesFormatado, anoAtual], (err, result) => {
                    resolve(result || []);
                });
            })
        ])
        .then(([vendas, gastos, gastosPorCategoria, vendasPorPagamento]) => {
            const saldoFinal = (vendas.total_vendas || 0) - (gastos.total_gastos || 0);
            
            res.json({
                mes: parseInt(mesAtual),
                ano: parseInt(anoAtual),
                vendas: {
                    total: vendas.total_vendas || 0,
                    lucro: vendas.total_lucro || 0,
                    quantidade: vendas.quantidade_vendas || 0
                },
                gastos: {
                    total: gastos.total_gastos || 0,
                    quantidade: gastos.quantidade_gastos || 0,
                    por_categoria: gastosPorCategoria || []
                },
                vendas_por_pagamento: vendasPorPagamento || [],
                saldo_final: saldoFinal
            });
        })
        .catch(err => {
            console.error('Erro ao gerar resumo mensal:', err);
            res.status(500).json({ error: err.message });
        });
    },

    // Gerar resumo para Excel
    exportarResumo: async (req, res) => {
        try {
            const { mes, ano } = req.query;
            const mesAtual = mes || new Date().getMonth() + 1;
            const anoAtual = ano || new Date().getFullYear();
            const mesFormatado = mesAtual.toString().padStart(2, '0');

            // Buscar dados
            const vendas = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        v.id,
                        v.data_venda,
                        v.total,
                        v.lucro,
                        v.forma_pagamento,
                        COALESCE(u.nome, 'Sistema') as vendedor
                    FROM vendas v
                    LEFT JOIN usuarios u ON v.usuario_id = u.id
                    WHERE strftime('%m', v.data_venda) = ? 
                    AND strftime('%Y', v.data_venda) = ?
                    AND v.status = 'concluida'
                    ORDER BY v.data_venda DESC
                `, [mesFormatado, anoAtual], (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                });
            });

            const gastos = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        g.id,
                        g.descricao,
                        g.valor,
                        g.data_gasto,
                        COALESCE(c.nome, 'Sem categoria') as categoria,
                        COALESCE(f.nome, 'N/A') as forma_pagamento
                    FROM gastos g
                    LEFT JOIN categorias_gastos c ON g.categoria_id = c.id
                    LEFT JOIN formas_pagamento f ON g.forma_pagamento_id = f.id
                    WHERE strftime('%m', g.data_gasto) = ? 
                    AND strftime('%Y', g.data_gasto) = ?
                    ORDER BY g.data_gasto DESC
                `, [mesFormatado, anoAtual], (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                });
            });

            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            
            // Planilha de Resumo
            const sheetResumo = workbook.addWorksheet('Resumo Mensal');
            
            sheetResumo.addRow(['RESUMO DO MÊS']);
            sheetResumo.addRow([`Mês/Ano: ${mesAtual}/${anoAtual}`]);
            sheetResumo.addRow([]);
            
            const totalVendas = vendas.reduce((acc, v) => acc + v.total, 0);
            const totalLucro = vendas.reduce((acc, v) => acc + v.lucro, 0);
            const totalGastos = gastos.reduce((acc, g) => acc + g.valor, 0);
            
            sheetResumo.addRow(['VENDAS']);
            sheetResumo.addRow(['Total de Vendas:', `R$ ${totalVendas.toFixed(2)}`]);
            sheetResumo.addRow(['Lucro Total:', `R$ ${totalLucro.toFixed(2)}`]);
            sheetResumo.addRow(['Quantidade de Vendas:', vendas.length]);
            sheetResumo.addRow([]);
            
            sheetResumo.addRow(['GASTOS']);
            sheetResumo.addRow(['Total de Gastos:', `R$ ${totalGastos.toFixed(2)}`]);
            sheetResumo.addRow(['Quantidade de Gastos:', gastos.length]);
            sheetResumo.addRow([]);
            
            sheetResumo.addRow(['SALDO FINAL:', `R$ ${(totalVendas - totalGastos).toFixed(2)}`]);

            // Planilha de Vendas
            const sheetVendas = workbook.addWorksheet('Vendas');
            sheetVendas.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Data', key: 'data', width: 20 },
                { header: 'Total', key: 'total', width: 15 },
                { header: 'Lucro', key: 'lucro', width: 15 },
                { header: 'Pagamento', key: 'pagamento', width: 15 },
                { header: 'Vendedor', key: 'vendedor', width: 20 }
            ];

            vendas.forEach(v => {
                sheetVendas.addRow({
                    id: v.id,
                    data: new Date(v.data_venda).toLocaleString('pt-BR'),
                    total: v.total,
                    lucro: v.lucro,
                    pagamento: v.forma_pagamento || 'N/A',
                    vendedor: v.vendedor || 'Sistema'
                });
            });

            // Planilha de Gastos
            const sheetGastos = workbook.addWorksheet('Gastos');
            sheetGastos.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Descrição', key: 'descricao', width: 30 },
                { header: 'Categoria', key: 'categoria', width: 20 },
                { header: 'Valor', key: 'valor', width: 15 },
                { header: 'Data', key: 'data', width: 20 },
                { header: 'Pagamento', key: 'pagamento', width: 15 }
            ];

            gastos.forEach(g => {
                sheetGastos.addRow({
                    id: g.id,
                    descricao: g.descricao,
                    categoria: g.categoria || 'N/A',
                    valor: g.valor,
                    data: new Date(g.data_gasto).toLocaleString('pt-BR'),
                    pagamento: g.forma_pagamento || 'N/A'
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=resumo_${mesAtual}_${anoAtual}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Erro ao exportar resumo:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = gastoController;