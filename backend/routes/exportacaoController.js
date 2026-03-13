const ExcelJS = require('exceljs');
const { db } = require('../models/database');

const exportacaoController = {
    // Exportar vendas para Excel
    exportarVendas: async (req, res) => {
        try {
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
                    console.error('Erro ao buscar vendas para exportação:', err);
                    return res.status(500).json({ error: err.message });
                }

                // Criar workbook
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Vendas');

                // Definir colunas
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

                // Adicionar linhas
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

                // Adicionar linha de total
                const totalVendas = vendas.reduce((acc, v) => acc + v.total, 0);
                const totalLucro = vendas.reduce((acc, v) => acc + v.lucro, 0);
                
                worksheet.addRow({});
                worksheet.addRow({
                    data: 'TOTAIS:',
                    total: totalVendas,
                    lucro: totalLucro
                });

                // Estilizar cabeçalho
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4CAF50' }
                };

                // Configurar resposta
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
                    console.error('Erro ao buscar produtos para exportação:', err);
                    return res.status(500).json({ error: err.message });
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Produtos');

                worksheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Nome', key: 'nome', width: 30 },
                    { header: 'Categoria', key: 'categoria', width: 20 },
                    { header: 'Tipo', key: 'tipo', width: 20 },
                    { header: 'Preço Custo (R$)', key: 'preco_custo', width: 15 },
                    { header: 'Preço Venda (R$)', key: 'preco_venda', width: 15 },
                    { header: 'Estoque', key: 'quantidade', width: 10 },
                    { header: 'Valor Total Estoque (R$)', key: 'valor_estoque', width: 20 }
                ];

                produtos.forEach(p => {
                    worksheet.addRow({
                        id: p.id,
                        nome: p.nome,
                        categoria: p.categoria_nome || '-',
                        tipo: p.tipo_nome || '-',
                        preco_custo: p.preco_custo,
                        preco_venda: p.preco_venda,
                        quantidade: p.quantidade,
                        valor_estoque: p.preco_custo * p.quantidade
                    });
                });

                // Totais
                const totalEstoque = produtos.reduce((acc, p) => acc + (p.preco_custo * p.quantidade), 0);
                
                worksheet.addRow({});
                worksheet.addRow({
                    nome: 'VALOR TOTAL EM ESTOQUE:',
                    valor_estoque: totalEstoque
                });

                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2196F3' }
                };

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=produtos_${new Date().toISOString().split('T')[0]}.xlsx`);

                await workbook.xlsx.write(res);
                res.end();
            });
        } catch (error) {
            console.error('Erro ao exportar produtos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Exportar caixa para Excel
    exportarCaixa: async (req, res) => {
        try {
            const { periodo } = req.query;
            let dataInicio, dataFim;

            if (periodo === 'semana') {
                dataInicio = new Date();
                dataInicio.setDate(dataInicio.getDate() - 7);
            } else if (periodo === 'mes') {
                dataInicio = new Date();
                dataInicio.setMonth(dataInicio.getMonth() - 1);
            } else {
                dataInicio = new Date(0);
            }

            db.all(`
                SELECT 
                    c.*,
                    u.nome as usuario_nome
                FROM caixa c
                LEFT JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.data_fechamento >= ? OR c.data_fechamento IS NULL
                ORDER BY c.data_abertura DESC
            `, [dataInicio.toISOString()], async (err, caixas) => {
                if (err) {
                    console.error('Erro ao buscar caixas para exportação:', err);
                    return res.status(500).json({ error: err.message });
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Caixa');

                worksheet.columns = [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Abertura', key: 'abertura', width: 20 },
                    { header: 'Fechamento', key: 'fechamento', width: 20 },
                    { header: 'Operador', key: 'operador', width: 20 },
                    { header: 'Valor Inicial (R$)', key: 'inicial', width: 15 },
                    { header: 'Total Vendas (R$)', key: 'vendas', width: 15 },
                    { header: 'Total Lucro (R$)', key: 'lucro', width: 15 },
                    { header: 'Valor Final (R$)', key: 'final', width: 15 },
                    { header: 'Status', key: 'status', width: 10 }
                ];

                caixas.forEach(c => {
                    worksheet.addRow({
                        id: c.id,
                        abertura: new Date(c.data_abertura).toLocaleString('pt-BR'),
                        fechamento: c.data_fechamento ? new Date(c.data_fechamento).toLocaleString('pt-BR') : '-',
                        operador: c.usuario_nome || '-',
                        inicial: c.valor_inicial,
                        vendas: c.total_vendas || 0,
                        lucro: c.total_lucro || 0,
                        final: c.valor_final || '-',
                        status: c.status
                    });
                });

                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF9800' }
                };

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=caixa_${periodo}_${new Date().toISOString().split('T')[0]}.xlsx`);

                await workbook.xlsx.write(res);
                res.end();
            });
        } catch (error) {
            console.error('Erro ao exportar caixa:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = exportacaoController;