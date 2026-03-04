const { db } = require('../models/database');

// Exportar todas as funções como um objeto
const relatorioController = {
    lucroDiario: (req, res) => {
        const hoje = new Date().toISOString().split('T')[0];
        
        db.get(
            `SELECT 
                COALESCE(SUM(total), 0) as total_vendas,
                COALESCE(SUM(lucro), 0) as total_lucro,
                COUNT(*) as quantidade_vendas
             FROM vendas 
             WHERE DATE(data_venda) = DATE(?)
             AND status = 'concluida'`,
            [hoje],
            (err, result) => {
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
            }
        );
    },

    lucroMensal: (req, res) => {
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        
        db.get(
            `SELECT 
                COALESCE(SUM(total), 0) as total_vendas,
                COALESCE(SUM(lucro), 0) as total_lucro,
                COUNT(*) as quantidade_vendas
             FROM vendas 
             WHERE strftime('%Y-%m', data_venda) = ?
             AND status = 'concluida'`,
            [mesAtual],
            (err, result) => {
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
            }
        );
    },

    produtoMaisVendido: (req, res) => {
        db.get(
            `SELECT 
                p.id,
                p.nome,
                SUM(iv.quantidade) as total_vendido,
                COUNT(DISTINCT iv.venda_id) as numero_vendas,
                AVG(p.preco_venda) as preco_medio
             FROM itens_venda iv
             JOIN produtos p ON iv.produto_id = p.id
             JOIN vendas v ON iv.venda_id = v.id
             WHERE v.status = 'concluida'
             GROUP BY p.id, p.nome
             ORDER BY total_vendido DESC
             LIMIT 1`,
            (err, produto) => {
                if (err) {
                    console.error('Erro produto mais vendido:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (!produto) {
                    return res.json({ message: 'Nenhuma venda encontrada' });
                }
                
                res.json(produto);
            }
        );
    },

    categoriaMaisVendida: (req, res) => {
        db.get(
            `SELECT 
                c.nome as categoria,
                c.id as categoria_id,
                SUM(iv.quantidade) as total_vendido,
                SUM(iv.quantidade * iv.preco_unitario) as valor_total
             FROM itens_venda iv
             JOIN produtos p ON iv.produto_id = p.id
             JOIN categorias c ON p.categoria_id = c.id
             JOIN vendas v ON iv.venda_id = v.id
             WHERE v.status = 'concluida'
             GROUP BY c.id, c.nome
             ORDER BY total_vendido DESC
             LIMIT 1`,
            (err, categoria) => {
                if (err) {
                    console.error('Erro categoria mais vendida:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (!categoria) {
                    return res.json({ message: 'Nenhuma venda encontrada' });
                }
                
                res.json(categoria);
            }
        );
    },

    vendasPorPeriodo: (req, res) => {
        const { periodo = 'dia' } = req.query;
        let groupBy;
        let select;

        switch(periodo) {
            case 'dia':
                select = `DATE(data_venda) as periodo,
                         strftime('%d/%m/%Y', data_venda) as periodo_formatado`;
                groupBy = 'DATE(data_venda)';
                break;
            case 'mes':
                select = `strftime('%Y-%m', data_venda) as periodo,
                         strftime('%m/%Y', data_venda) as periodo_formatado`;
                groupBy = 'strftime("%Y-%m", data_venda)';
                break;
            case 'ano':
                select = `strftime('%Y', data_venda) as periodo,
                         strftime('%Y', data_venda) as periodo_formatado`;
                groupBy = 'strftime("%Y", data_venda)';
                break;
            default:
                select = `DATE(data_venda) as periodo,
                         strftime('%d/%m/%Y', data_venda) as periodo_formatado`;
                groupBy = 'DATE(data_venda)';
        }

        db.all(
            `SELECT 
                ${select},
                COUNT(*) as quantidade_vendas,
                COALESCE(SUM(total), 0) as total_vendas,
                COALESCE(SUM(lucro), 0) as total_lucro
             FROM vendas
             WHERE status = 'concluida'
             GROUP BY ${groupBy}
             ORDER BY periodo DESC
             LIMIT 15`,
            (err, resultados) => {
                if (err) {
                    console.error('Erro vendas por periodo:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                // Formatar para o frontend
                const dados = (resultados || []).map(r => ({
                    periodo: r.periodo_formatado || r.periodo,
                    quantidade_vendas: r.quantidade_vendas || 0,
                    total_vendas: r.total_vendas || 0,
                    total_lucro: r.total_lucro || 0
                }));
                
                res.json(dados);
            }
        );
    }
};

module.exports = relatorioController;