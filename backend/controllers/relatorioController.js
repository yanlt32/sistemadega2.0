const { db } = require('../models/database');

const relatorioController = {
    // Relatório diário
    lucroDiario: (req, res) => {
        const hoje = new Date().toISOString().split('T')[0];
        
        db.get(`
            SELECT 
                COALESCE(SUM(total), 0) as total_vendas,
                COALESCE(SUM(lucro), 0) as total_lucro,
                COUNT(*) as quantidade_vendas
            FROM vendas 
            WHERE DATE(data_venda) = DATE(?)
            AND status = 'concluida'
        `, [hoje], (err, result) => {
            if (err) {
                console.error('Erro lucro diario:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({
                data: hoje,
                total_vendas: result?.total_vendas || 0,
                total_lucro: result?.total_lucro || 0,
                quantidade_vendas: result?.quantidade_vendas || 0
            });
        });
    },

    // Relatório mensal
    lucroMensal: (req, res) => {
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        
        db.get(`
            SELECT 
                COALESCE(SUM(total), 0) as total_vendas,
                COALESCE(SUM(lucro), 0) as total_lucro,
                COUNT(*) as quantidade_vendas
            FROM vendas 
            WHERE strftime('%Y-%m', data_venda) = ?
            AND status = 'concluida'
        `, [mesAtual], (err, result) => {
            if (err) {
                console.error('Erro lucro mensal:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({
                mes: mesAtual,
                total_vendas: result?.total_vendas || 0,
                total_lucro: result?.total_lucro || 0,
                quantidade_vendas: result?.quantidade_vendas || 0
            });
        });
    },

    // Relatório completo por período
    relatorioCompleto: (req, res) => {
        const { data_inicio, data_fim } = req.query;
        
        if (!data_inicio || !data_fim) {
            return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
        }

        Promise.all([
            // Resumo geral
            new Promise((resolve) => {
                db.get(`
                    SELECT 
                        COALESCE(SUM(total), 0) as total_vendas,
                        COALESCE(SUM(lucro), 0) as total_lucro,
                        COUNT(*) as quantidade_vendas,
                        AVG(total) as ticket_medio
                    FROM vendas 
                    WHERE DATE(data_venda) BETWEEN DATE(?) AND DATE(?)
                    AND status = 'concluida'
                `, [data_inicio, data_fim], (err, result) => {
                    resolve(result || { total_vendas: 0, total_lucro: 0, quantidade_vendas: 0, ticket_medio: 0 });
                });
            }),

            // Vendas por dia
            new Promise((resolve) => {
                db.all(`
                    SELECT 
                        DATE(data_venda) as dia,
                        COUNT(*) as quantidade,
                        COALESCE(SUM(total), 0) as total,
                        COALESCE(SUM(lucro), 0) as lucro
                    FROM vendas 
                    WHERE DATE(data_venda) BETWEEN DATE(?) AND DATE(?)
                    AND status = 'concluida'
                    GROUP BY DATE(data_venda)
                    ORDER BY dia DESC
                `, [data_inicio, data_fim], (err, rows) => {
                    resolve(rows || []);
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
                    WHERE DATE(data_venda) BETWEEN DATE(?) AND DATE(?)
                    AND status = 'concluida'
                    GROUP BY forma_pagamento
                    ORDER BY total DESC
                `, [data_inicio, data_fim], (err, rows) => {
                    resolve(rows || []);
                });
            }),

            // Produtos mais vendidos
            new Promise((resolve) => {
                db.all(`
                    SELECT 
                        p.id,
                        p.nome,
                        p.preco_venda,
                        SUM(iv.quantidade) as quantidade_vendida,
                        SUM(iv.quantidade * iv.preco_unitario) as faturamento
                    FROM itens_venda iv
                    JOIN produtos p ON iv.produto_id = p.id
                    JOIN vendas v ON iv.venda_id = v.id
                    WHERE DATE(v.data_venda) BETWEEN DATE(?) AND DATE(?)
                    AND v.status = 'concluida'
                    GROUP BY p.id, p.nome, p.preco_venda
                    ORDER BY quantidade_vendida DESC
                    LIMIT 10
                `, [data_inicio, data_fim], (err, rows) => {
                    resolve(rows || []);
                });
            }),

            // Categorias mais vendidas
            new Promise((resolve) => {
                db.all(`
                    SELECT 
                        c.id,
                        c.nome as categoria,
                        c.cor,
                        COUNT(DISTINCT v.id) as numero_vendas,
                        SUM(iv.quantidade) as quantidade_total,
                        SUM(iv.quantidade * iv.preco_unitario) as faturamento
                    FROM categorias c
                    LEFT JOIN produtos p ON c.id = p.categoria_id
                    LEFT JOIN itens_venda iv ON p.id = iv.produto_id
                    LEFT JOIN vendas v ON iv.venda_id = v.id AND v.status = 'concluida'
                        AND DATE(v.data_venda) BETWEEN DATE(?) AND DATE(?)
                    GROUP BY c.id, c.nome, c.cor
                    ORDER BY faturamento DESC
                `, [data_inicio, data_fim], (err, rows) => {
                    resolve(rows || []);
                });
            })
        ])
        .then(([resumo, vendasPorDia, vendasPorPagamento, produtosMaisVendidos, categorias]) => {
            res.json({
                periodo: {
                    data_inicio,
                    data_fim
                },
                resumo: {
                    total_vendas: resumo.total_vendas,
                    total_lucro: resumo.total_lucro,
                    quantidade_vendas: resumo.quantidade_vendas,
                    ticket_medio: resumo.quantidade_vendas > 0 ? resumo.total_vendas / resumo.quantidade_vendas : 0,
                    margem_lucro: resumo.total_vendas > 0 ? (resumo.total_lucro / resumo.total_vendas * 100).toFixed(2) : 0
                },
                vendas_por_dia: vendasPorDia,
                vendas_por_pagamento: vendasPorPagamento,
                produtos_mais_vendidos: produtosMaisVendidos,
                categorias_mais_vendidas: categorias
            });
        })
        .catch(err => {
            console.error('Erro ao gerar relatório completo:', err);
            res.status(500).json({ error: err.message });
        });
    },

    // Relatório mensal detalhado
    relatorioMensalDetalhado: (req, res) => {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();
        const mesFormatado = mesAtual.toString().padStart(2, '0');
        const dataInicio = `${anoAtual}-${mesFormatado}-01`;
        const dataFim = new Date(anoAtual, mesAtual, 0).toISOString().split('T')[0];

        return relatorioController.relatorioCompleto({ 
            query: { data_inicio: dataInicio, data_fim: dataFim } 
        }, res);
    },

    // Relatório anual
    relatorioAnual: (req, res) => {
        const { ano } = req.query;
        const anoAtual = ano || new Date().getFullYear();
        const dataInicio = `${anoAtual}-01-01`;
        const dataFim = `${anoAtual}-12-31`;

        return relatorioController.relatorioCompleto({ 
            query: { data_inicio: dataInicio, data_fim: dataFim } 
        }, res);
    }
};

module.exports = relatorioController;