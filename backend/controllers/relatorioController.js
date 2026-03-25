const { db } = require('../models/database');

const relatorioController = {
    // Relatório diário
    lucroDiario: (req, res) => {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            
            const result = db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                FROM vendas 
                WHERE DATE(data_venda) = DATE(?)
                AND status = 'concluida'
            `).get(hoje);
            
            res.json({
                data: hoje,
                total_vendas: result?.total_vendas || 0,
                total_lucro: result?.total_lucro || 0,
                quantidade_vendas: result?.quantidade_vendas || 0
            });
        } catch (error) {
            console.error('Erro lucro diario:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Relatório mensal
    lucroMensal: (req, res) => {
        try {
            const hoje = new Date();
            const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
            
            const result = db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                FROM vendas 
                WHERE strftime('%Y-%m', data_venda) = ?
                AND status = 'concluida'
            `).get(mesAtual);
            
            res.json({
                mes: mesAtual,
                total_vendas: result?.total_vendas || 0,
                total_lucro: result?.total_lucro || 0,
                quantidade_vendas: result?.quantidade_vendas || 0
            });
        } catch (error) {
            console.error('Erro lucro mensal:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Relatório completo por período
    relatorioCompleto: (req, res) => {
        try {
            const { data_inicio, data_fim } = req.query;
            
            if (!data_inicio || !data_fim) {
                return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
            }

            // Resumo geral
            const resumo = db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas,
                    COALESCE(AVG(total), 0) as ticket_medio
                FROM vendas 
                WHERE DATE(data_venda) BETWEEN DATE(?) AND DATE(?)
                AND status = 'concluida'
            `).get(data_inicio, data_fim);

            // Vendas por dia
            const vendasPorDia = db.prepare(`
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
            `).all(data_inicio, data_fim);

            // Vendas por forma de pagamento
            const vendasPorPagamento = db.prepare(`
                SELECT 
                    forma_pagamento,
                    COUNT(*) as quantidade,
                    COALESCE(SUM(total), 0) as total
                FROM vendas 
                WHERE DATE(data_venda) BETWEEN DATE(?) AND DATE(?)
                AND status = 'concluida'
                GROUP BY forma_pagamento
                ORDER BY total DESC
            `).all(data_inicio, data_fim);

            // Produtos mais vendidos
            const produtosMaisVendidos = db.prepare(`
                SELECT 
                    p.id,
                    p.nome,
                    p.preco_venda,
                    COALESCE(SUM(iv.quantidade), 0) as quantidade_vendida,
                    COALESCE(SUM(iv.quantidade * iv.preco_unitario), 0) as faturamento
                FROM itens_venda iv
                JOIN produtos p ON iv.produto_id = p.id
                JOIN vendas v ON iv.venda_id = v.id
                WHERE DATE(v.data_venda) BETWEEN DATE(?) AND DATE(?)
                AND v.status = 'concluida'
                GROUP BY p.id, p.nome, p.preco_venda
                ORDER BY quantidade_vendida DESC
                LIMIT 10
            `).all(data_inicio, data_fim);

            // Categorias mais vendidas
            const categorias = db.prepare(`
                SELECT 
                    c.id,
                    c.nome as categoria,
                    c.cor,
                    COUNT(DISTINCT v.id) as numero_vendas,
                    COALESCE(SUM(iv.quantidade), 0) as quantidade_total,
                    COALESCE(SUM(iv.quantidade * iv.preco_unitario), 0) as faturamento
                FROM categorias c
                LEFT JOIN produtos p ON c.id = p.categoria_id
                LEFT JOIN itens_venda iv ON p.id = iv.produto_id
                LEFT JOIN vendas v ON iv.venda_id = v.id AND v.status = 'concluida'
                    AND DATE(v.data_venda) BETWEEN DATE(?) AND DATE(?)
                GROUP BY c.id, c.nome, c.cor
                ORDER BY faturamento DESC
            `).all(data_inicio, data_fim);

            res.json({
                periodo: {
                    data_inicio,
                    data_fim
                },
                resumo: {
                    total_vendas: resumo.total_vendas,
                    total_lucro: resumo.total_lucro,
                    quantidade_vendas: resumo.quantidade_vendas,
                    ticket_medio: resumo.quantidade_vendas > 0 ? Number((resumo.total_vendas / resumo.quantidade_vendas).toFixed(2)) : 0,
                    margem_lucro: resumo.total_vendas > 0 ? Number(((resumo.total_lucro / resumo.total_vendas) * 100).toFixed(2)) : 0
                },
                vendas_por_dia: vendasPorDia,
                vendas_por_pagamento: vendasPorPagamento,
                produtos_mais_vendidos: produtosMaisVendidos,
                categorias_mais_vendidas: categorias
            });
        } catch (error) {
            console.error('Erro ao gerar relatório completo:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Relatório mensal detalhado
    relatorioMensalDetalhado: (req, res) => {
        try {
            const { mes, ano } = req.query;
            const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
            const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();
            const mesFormatado = mesAtual.toString().padStart(2, '0');
            const dataInicio = `${anoAtual}-${mesFormatado}-01`;
            
            // Calcular último dia do mês
            const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
            const dataFim = `${anoAtual}-${mesFormatado}-${ultimoDia}`;

            // Chamar relatorioCompleto com os parâmetros corretos
            return relatorioController.relatorioCompleto({ 
                query: { data_inicio: dataInicio, data_fim: dataFim } 
            }, res);
        } catch (error) {
            console.error('Erro no relatório mensal detalhado:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Relatório anual
    relatorioAnual: (req, res) => {
        try {
            const { ano } = req.query;
            const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();
            const dataInicio = `${anoAtual}-01-01`;
            const dataFim = `${anoAtual}-12-31`;

            return relatorioController.relatorioCompleto({ 
                query: { data_inicio: dataInicio, data_fim: dataFim } 
            }, res);
        } catch (error) {
            console.error('Erro no relatório anual:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Relatório de produtos mais vendidos
    produtosMaisVendidos: (req, res) => {
        try {
            const { data_inicio, data_fim, limit = 20 } = req.query;
            
            let query = `
                SELECT 
                    p.id,
                    p.nome,
                    p.preco_venda,
                    COALESCE(SUM(iv.quantidade), 0) as quantidade_vendida,
                    COALESCE(SUM(iv.quantidade * iv.preco_unitario), 0) as faturamento,
                    COALESCE(SUM(iv.quantidade * (iv.preco_unitario - iv.preco_custo_unitario)), 0) as lucro_total
                FROM itens_venda iv
                JOIN produtos p ON iv.produto_id = p.id
                JOIN vendas v ON iv.venda_id = v.id
                WHERE v.status = 'concluida'
            `;
            let params = [];

            if (data_inicio && data_fim) {
                query += ` AND DATE(v.data_venda) BETWEEN DATE(?) AND DATE(?)`;
                params.push(data_inicio, data_fim);
            }

            query += ` GROUP BY p.id, p.nome, p.preco_venda
                       ORDER BY quantidade_vendida DESC
                       LIMIT ?`;
            params.push(parseInt(limit));

            const produtos = db.prepare(query).all(...params);
            
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao listar produtos mais vendidos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Relatório de faturamento por período
    faturamentoPeriodo: (req, res) => {
        try {
            const { data_inicio, data_fim } = req.query;
            
            if (!data_inicio || !data_fim) {
                return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
            }

            const dados = db.prepare(`
                SELECT 
                    DATE(data_venda) as data,
                    COUNT(*) as quantidade_vendas,
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    AVG(total) as ticket_medio
                FROM vendas 
                WHERE DATE(data_venda) BETWEEN DATE(?) AND DATE(?)
                AND status = 'concluida'
                GROUP BY DATE(data_venda)
                ORDER BY data ASC
            `).all(data_inicio, data_fim);

            const resumoGeral = db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas,
                    AVG(total) as ticket_medio
                FROM vendas 
                WHERE DATE(data_venda) BETWEEN DATE(?) AND DATE(?)
                AND status = 'concluida'
            `).get(data_inicio, data_fim);

            res.json({
                periodo: { data_inicio, data_fim },
                resumo_geral: {
                    total_vendas: resumoGeral.total_vendas,
                    total_lucro: resumoGeral.total_lucro,
                    quantidade_vendas: resumoGeral.quantidade_vendas,
                    ticket_medio: resumoGeral.quantidade_vendas > 0 ? Number((resumoGeral.total_vendas / resumoGeral.quantidade_vendas).toFixed(2)) : 0,
                    margem_lucro: resumoGeral.total_vendas > 0 ? Number(((resumoGeral.total_lucro / resumoGeral.total_vendas) * 100).toFixed(2)) : 0
                },
                dados_por_dia: dados
            });
        } catch (error) {
            console.error('Erro ao gerar faturamento por período:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = relatorioController;