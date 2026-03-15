const ExcelJS = require('exceljs');
const { db } = require('../models/database');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'sua_chave_secreta_super_segura_2024';

const exportacaoController = {
    // Exportar resumo de gastos
    exportarResumoGastos: async (req, res) => {
        try {
            const token = req.query.token;
            
            if (!token) {
                return res.status(401).json({ error: 'Token não fornecido' });
            }

            try {
                jwt.verify(token, SECRET_KEY);
            } catch (err) {
                return res.status(401).json({ error: 'Token inválido' });
            }

            const { mes, ano } = req.query;
            const mesAtual = mes || new Date().getMonth() + 1;
            const anoAtual = ano || new Date().getFullYear();
            const mesFormatado = mesAtual.toString().padStart(2, '0');

            // Buscar vendas do período
            const vendas = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        v.id,
                        v.data_venda,
                        v.total,
                        v.lucro,
                        v.forma_pagamento,
                        u.nome as vendedor
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

            // Buscar gastos do período
            const gastos = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        g.id,
                        g.descricao,
                        g.valor,
                        g.data_gasto,
                        c.nome as categoria
                    FROM gastos g
                    LEFT JOIN categorias_gastos c ON g.categoria_id = c.id
                    WHERE strftime('%m', g.data_gasto) = ? 
                    AND strftime('%Y', g.data_gasto) = ?
                    ORDER BY g.data_gasto DESC
                `, [mesFormatado, anoAtual], (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                });
            });

            const workbook = new ExcelJS.Workbook();
            
            // Planilha de Resumo
            const sheetResumo = workbook.addWorksheet('Resumo Mensal');
            
            sheetResumo.addRow(['RESUMO DO MÊS']);
            sheetResumo.addRow([`Período: ${mesAtual}/${anoAtual}`]);
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
                { header: 'Data', key: 'data', width: 20 }
            ];

            gastos.forEach(g => {
                sheetGastos.addRow({
                    id: g.id,
                    descricao: g.descricao,
                    categoria: g.categoria || 'N/A',
                    valor: g.valor,
                    data: new Date(g.data_gasto).toLocaleString('pt-BR')
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
    },

    // Exportar vendas para Excel
    exportarVendas: async (req, res) => {
        try {
            const token = req.query.token;
            
            if (!token) {
                return res.status(401).json({ error: 'Token não fornecido' });
            }

            try {
                jwt.verify(token, SECRET_KEY);
            } catch (err) {
                return res.status(401).json({ error: 'Token inválido' });
            }

            const { data_inicio, data_fim } = req.query;

            let query = `
                SELECT 
                    v.id,
                    v.data_venda,
                    v.total,
                    v.lucro,
                    v.forma_pagamento,
                    v.status,
                    u.nome as vendedor,
                    COUNT(iv.id) as quantidade_itens
                FROM vendas v
                LEFT JOIN usuarios u ON v.usuario_id = u.id
                LEFT JOIN itens_venda iv ON v.id = iv.venda_id
                WHERE 1=1
            `;
            let params = [];

            if (data_inicio && data_fim) {
                query += ' AND DATE(v.data_venda) BETWEEN DATE(?) AND DATE(?)';
                params.push(data_inicio, data_fim);
            }

            query += ' GROUP BY v.id ORDER BY v.data_venda DESC';

            db.all(query, params, async (err, vendas) => {
                if (err) {
                    console.error('Erro ao buscar vendas:', err);
                    return res.status(500).json({ error: err.message });
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Vendas');

                worksheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Data', key: 'data', width: 20 },
                    { header: 'Vendedor', key: 'vendedor', width: 20 },
                    { header: 'Total (R$)', key: 'total', width: 15 },
                    { header: 'Lucro (R$)', key: 'lucro', width: 15 },
                    { header: 'Forma Pagamento', key: 'forma_pagamento', width: 15 },
                    { header: 'Status', key: 'status', width: 15 },
                    { header: 'Qtd Itens', key: 'itens', width: 10 }
                ];

                vendas.forEach(v => {
                    worksheet.addRow({
                        id: v.id,
                        data: new Date(v.data_venda).toLocaleString('pt-BR'),
                        vendedor: v.vendedor || 'Sistema',
                        total: v.total,
                        lucro: v.lucro,
                        forma_pagamento: v.forma_pagamento,
                        status: v.status,
                        itens: v.quantidade_itens
                    });
                });

                const totalVendas = vendas.reduce((acc, v) => acc + v.total, 0);
                const totalLucro = vendas.reduce((acc, v) => acc + v.lucro, 0);
                
                worksheet.addRow({});
                worksheet.addRow({
                    data: 'TOTAIS:',
                    total: totalVendas,
                    lucro: totalLucro
                });

                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFc4a747' }
                };

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=vendas_${new Date().toISOString().split('T')[0]}.xlsx`);

                await workbook.xlsx.write(res);
                res.end();
            });
        } catch (error) {
            console.error('Erro ao exportar vendas:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Exportar produtos para Excel
    exportarProdutos: async (req, res) => {
        try {
            const token = req.query.token;
            
            if (!token) {
                return res.status(401).json({ error: 'Token não fornecido' });
            }

            try {
                jwt.verify(token, SECRET_KEY);
            } catch (err) {
                return res.status(401).json({ error: 'Token inválido' });
            }

            db.all(`
                SELECT 
                    p.*,
                    c.nome as categoria_nome,
                    t.nome as tipo_nome
                FROM produtos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN tipos t ON p.tipo_id = t.id
                ORDER BY p.nome
            `, [], async (err, produtos) => {
                if (err) {
                    console.error('Erro ao buscar produtos:', err);
                    return res.status(500).json({ error: err.message });
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Produtos');

                worksheet.columns = [
                    { header: 'ID', key: 'id', width: 8 },
                    { header: 'Nome', key: 'nome', width: 30 },
                    { header: 'Categoria', key: 'categoria', width: 20 },
                    { header: 'Tipo', key: 'tipo', width: 20 },
                    { header: 'Preço Custo', key: 'preco_custo', width: 15 },
                    { header: 'Preço Venda', key: 'preco_venda', width: 15 },
                    { header: 'Estoque', key: 'quantidade', width: 10 },
                    { header: 'Código Barras', key: 'codigo_barras', width: 20 }
                ];

                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFc4a747' }
                };

                produtos.forEach(p => {
                    worksheet.addRow({
                        id: p.id,
                        nome: p.nome,
                        categoria: p.categoria_nome || '-',
                        tipo: p.tipo_nome || '-',
                        preco_custo: p.preco_custo,
                        preco_venda: p.preco_venda,
                        quantidade: p.quantidade,
                        codigo_barras: p.codigo_barras || '-'
                    });
                });

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=produtos_${new Date().toISOString().split('T')[0]}.xlsx`);

                await workbook.xlsx.write(res);
                res.end();
            });
        } catch (error) {
            console.error('Erro ao exportar produtos:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = exportacaoController;