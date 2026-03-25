const { db } = require('../models/database');

const gastoController = {
    // Listar todos os gastos
    listar: (req, res) => {
        try {
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
                // CORRIGIDO: usar aspas simples em vez de aspas duplas
                query += " AND strftime('%m', g.data_gasto) = ? AND strftime('%Y', g.data_gasto) = ?";
                params.push(mes.padStart(2, '0'), ano);
            }

            if (categoria) {
                query += ' AND g.categoria_id = ?';
                params.push(categoria);
            }

            query += ' ORDER BY g.data_gasto DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const gastos = db.prepare(query).all(...params);

            // Contar total para paginação
            let countQuery = 'SELECT COUNT(*) as total FROM gastos WHERE 1=1';
            let countParams = [];

            if (mes && ano) {
                // CORRIGIDO: usar aspas simples em vez de aspas duplas
                countQuery += " AND strftime('%m', data_gasto) = ? AND strftime('%Y', data_gasto) = ?";
                countParams.push(mes.padStart(2, '0'), ano);
            }

            if (categoria) {
                countQuery += ' AND categoria_id = ?';
                countParams.push(categoria);
            }

            const count = db.prepare(countQuery).get(...countParams);

            res.json({
                gastos: gastos || [],
                total: count?.total || 0,
                page: parseInt(page),
                totalPages: Math.ceil((count?.total || 0) / limit)
            });
        } catch (error) {
            console.error('Erro ao listar gastos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar gasto por ID
    buscarPorId: (req, res) => {
        try {
            const { id } = req.params;

            const gasto = db.prepare(`
                SELECT g.*, 
                       c.nome as categoria_nome,
                       f.nome as forma_pagamento_nome,
                       u.nome as usuario_nome
                FROM gastos g
                LEFT JOIN categorias_gastos c ON g.categoria_id = c.id
                LEFT JOIN formas_pagamento f ON g.forma_pagamento_id = f.id
                LEFT JOIN usuarios u ON g.usuario_id = u.id
                WHERE g.id = ?
            `).get(id);
            
            if (!gasto) {
                return res.status(404).json({ error: 'Gasto não encontrado' });
            }
            res.json(gasto);
        } catch (error) {
            console.error('Erro ao buscar gasto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar novo gasto
    criar: (req, res) => {
        try {
            const { descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao } = req.body;
            const usuario_id = req.usuario.id;

            if (!descricao || !valor || !categoria_id) {
                return res.status(400).json({ error: 'Descrição, valor e categoria são obrigatórios' });
            }

            const result = db.prepare(`
                INSERT INTO gastos (descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao, usuario_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(descricao, valor, data_gasto || new Date().toISOString(), categoria_id, forma_pagamento_id || null, observacao || null, usuario_id);

            if (req.io) {
                req.io.emit('gasto:criado', { 
                    id: result.lastInsertRowid, 
                    descricao,
                    valor,
                    mensagem: `💰 Gasto de R$ ${valor} registrado: ${descricao}`
                });
            }

            res.json({ 
                id: result.lastInsertRowid, 
                message: 'Gasto registrado com sucesso' 
            });
        } catch (error) {
            console.error('Erro ao criar gasto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar gasto
    atualizar: (req, res) => {
        try {
            const { id } = req.params;
            const { descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao } = req.body;

            const result = db.prepare(`
                UPDATE gastos 
                SET descricao = ?, valor = ?, data_gasto = ?, categoria_id = ?, forma_pagamento_id = ?, observacao = ?
                WHERE id = ?
            `).run(descricao, valor, data_gasto, categoria_id, forma_pagamento_id, observacao, id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Gasto não encontrado' });
            }

            if (req.io) {
                req.io.emit('gasto:atualizado', { id });
            }
            res.json({ message: 'Gasto atualizado com sucesso' });
        } catch (error) {
            console.error('Erro ao atualizar gasto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Excluir gasto
    excluir: (req, res) => {
        try {
            const { id } = req.params;

            const result = db.prepare('DELETE FROM gastos WHERE id = ?').run(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Gasto não encontrado' });
            }

            if (req.io) {
                req.io.emit('gasto:excluido', { id });
            }
            res.json({ message: 'Gasto excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir gasto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Listar categorias de gastos
    listarCategorias: (req, res) => {
        try {
            const categorias = db.prepare('SELECT * FROM categorias_gastos ORDER BY nome').all();
            res.json(categorias || []);
        } catch (error) {
            console.error('Erro ao listar categorias de gastos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar categoria de gasto
    criarCategoria: (req, res) => {
        try {
            const { nome, descricao, cor } = req.body;

            if (!nome) {
                return res.status(400).json({ error: 'Nome é obrigatório' });
            }

            const result = db.prepare(
                'INSERT INTO categorias_gastos (nome, descricao, cor) VALUES (?, ?, ?)'
            ).run(nome, descricao || null, cor || '#c4a747');
            
            res.json({ id: result.lastInsertRowid, message: 'Categoria criada com sucesso' });
        } catch (error) {
            console.error('Erro ao criar categoria de gasto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Excluir categoria de gasto
    excluirCategoria: (req, res) => {
        try {
            const { id } = req.params;

            // Verificar se existem gastos usando esta categoria
            const result = db.prepare('SELECT COUNT(*) as count FROM gastos WHERE categoria_id = ?').get(id);

            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível excluir categoria com gastos vinculados',
                    quantidade: result.count 
                });
            }

            const deleteResult = db.prepare('DELETE FROM categorias_gastos WHERE id = ?').run(id);
            res.json({ message: 'Categoria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Função para listar formas de pagamento
    listarFormasPagamento: (req, res) => {
        try {
            const formas = db.prepare('SELECT * FROM formas_pagamento ORDER BY nome').all();
            res.json(formas || []);
        } catch (error) {
            console.error('Erro ao listar formas de pagamento:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Resumo simplificado para o dashboard
    resumoSimplificado: (req, res) => {
        try {
            const { periodo = 'mes' } = req.query;
            const hoje = new Date();
            let dataInicio;

            if (periodo === 'semana') {
                const data = new Date(hoje);
                data.setDate(data.getDate() - 7);
                dataInicio = data;
            } else if (periodo === 'mes') {
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            } else if (periodo === 'ano') {
                dataInicio = new Date(hoje.getFullYear(), 0, 1);
            } else {
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            }

            // CORRIGIDO: usar apenas a data sem hora
            const dataInicioStr = dataInicio.toISOString().split('T')[0];

            // Total de vendas do período
            const vendas = db.prepare(`
                SELECT COALESCE(SUM(total),0) as total_vendas, COUNT(*) as qtd_vendas
                FROM vendas WHERE DATE(data_venda) >= DATE(?) AND status = 'concluida'
            `).get(dataInicioStr);

            // Total de gastos do período
            const gastos = db.prepare(`
                SELECT COALESCE(SUM(valor),0) as total_gastos, COUNT(*) as qtd_gastos
                FROM gastos WHERE DATE(data_gasto) >= DATE(?)
            `).get(dataInicioStr);

            // Vendas por forma de pagamento
            const pagamentos = db.prepare(`
                SELECT forma_pagamento, COUNT(*) as quantidade, SUM(total) as total
                FROM vendas WHERE DATE(data_venda) >= DATE(?) AND status = 'concluida'
                GROUP BY forma_pagamento
            `).all(dataInicioStr);

            res.json({
                periodo,
                vendas: vendas.total_vendas,
                gastos: gastos.total_gastos,
                saldo: vendas.total_vendas - gastos.total_gastos,
                qtd_vendas: vendas.qtd_vendas,
                qtd_gastos: gastos.qtd_gastos,
                pagamentos
            });
        } catch (error) {
            console.error('Erro no resumo simplificado:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Resumo mensal completo
    resumoMensal: (req, res) => {
        try {
            const { mes, ano } = req.query;
            const mesAtual = mes || new Date().getMonth() + 1;
            const anoAtual = ano || new Date().getFullYear();
            const mesFormatado = mesAtual.toString().padStart(2, '0');

            // Total de vendas do mês
            const vendas = db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                FROM vendas 
                WHERE strftime('%m', data_venda) = ? 
                AND strftime('%Y', data_venda) = ?
                AND status = 'concluida'
            `).get(mesFormatado, anoAtual);

            // Total de gastos do mês
            const gastos = db.prepare(`
                SELECT 
                    COALESCE(SUM(valor), 0) as total_gastos,
                    COUNT(*) as quantidade_gastos
                FROM gastos 
                WHERE strftime('%m', data_gasto) = ? 
                AND strftime('%Y', data_gasto) = ?
            `).get(mesFormatado, anoAtual);

            // Gastos por categoria
            const gastosPorCategoria = db.prepare(`
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
            `).all(mesFormatado, anoAtual);

            // Vendas por forma de pagamento
            const vendasPorPagamento = db.prepare(`
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
            `).all(mesFormatado, anoAtual);

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
        } catch (error) {
            console.error('Erro ao gerar resumo mensal:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Gerar resumo para Excel
    exportarResumo: async (req, res) => {
        try {
            const { mes, ano } = req.query;
            const mesAtual = mes || new Date().getMonth() + 1;
            const anoAtual = ano || new Date().getFullYear();
            const mesFormatado = mesAtual.toString().padStart(2, '0');

            // Buscar dados
            const vendas = db.prepare(`
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
            `).all(mesFormatado, anoAtual);

            const gastos = db.prepare(`
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
            `).all(mesFormatado, anoAtual);

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