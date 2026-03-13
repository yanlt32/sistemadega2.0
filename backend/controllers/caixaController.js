const { db } = require('../models/database');

const caixaController = {
    // Abrir caixa
    abrir: (req, res) => {
        const { valor_inicial, observacao } = req.body;
        const usuario_id = req.usuario.id;

        // Verificar se já existe caixa aberto
        db.get("SELECT * FROM caixa WHERE status = 'aberto'", [], (err, caixaAberto) => {
            if (err) {
                console.error('Erro ao verificar caixa:', err);
                return res.status(500).json({ error: err.message });
            }

            if (caixaAberto) {
                return res.status(400).json({ error: 'Já existe um caixa aberto' });
            }

            db.run(
                `INSERT INTO caixa (valor_inicial, observacao, status, usuario_id) 
                 VALUES (?, ?, 'aberto', ?)`,
                [valor_inicial || 0, observacao || null, usuario_id],
                function(err) {
                    if (err) {
                        console.error('Erro ao abrir caixa:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    // Atualizar configuração
                    db.run(
                        `UPDATE configuracoes SET valor = 'true' WHERE chave = 'caixa_aberto'`
                    );

                    // Emitir evento
                    req.io.emit('caixa:aberto', { 
                        id: this.lastID,
                        mensagem: `🔓 Caixa aberto com R$ ${valor_inicial || 0}`
                    });

                    res.json({ 
                        id: this.lastID, 
                        message: 'Caixa aberto com sucesso',
                        valor_inicial: valor_inicial || 0
                    });
                }
            );
        });
    },

    // Fechar caixa
    fechar: (req, res) => {
        const { observacao } = req.body;
        const usuario_id = req.usuario.id;

        db.get("SELECT * FROM caixa WHERE status = 'aberto'", [], (err, caixa) => {
            if (err) {
                console.error('Erro ao buscar caixa:', err);
                return res.status(500).json({ error: err.message });
            }

            if (!caixa) {
                return res.status(400).json({ error: 'Nenhum caixa aberto' });
            }

            // Calcular totais do período
            const dataAbertura = caixa.data_abertura;

            db.get(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                FROM vendas 
                WHERE data_venda >= ? AND status = 'concluida'
            `, [dataAbertura], (err, totais) => {
                if (err) {
                    console.error('Erro ao calcular totais:', err);
                    return res.status(500).json({ error: err.message });
                }

                const totalVendas = totais.total_vendas || 0;
                const totalLucro = totais.total_lucro || 0;
                const valorFinal = caixa.valor_inicial + totalVendas;

                db.run(
                    `UPDATE caixa 
                     SET data_fechamento = CURRENT_TIMESTAMP, 
                         valor_final = ?, 
                         total_vendas = ?, 
                         total_lucro = ?,
                         observacao = CASE WHEN observacao IS NULL THEN ? ELSE observacao || ' | ' || ? END,
                         status = 'fechado'
                     WHERE id = ?`,
                    [valorFinal, totalVendas, totalLucro, observacao, observacao, caixa.id],
                    function(err) {
                        if (err) {
                            console.error('Erro ao fechar caixa:', err);
                            return res.status(500).json({ error: err.message });
                        }

                        // Atualizar configuração
                        db.run(
                            `UPDATE configuracoes SET valor = 'false' WHERE chave = 'caixa_aberto'`
                        );

                        db.run(
                            `UPDATE configuracoes SET valor = ? WHERE chave = 'ultimo_fechamento'`,
                            [new Date().toISOString()]
                        );

                        // Emitir evento
                        req.io.emit('caixa:fechado', { 
                            id: caixa.id,
                            mensagem: `🔒 Caixa fechado! Total: R$ ${totalVendas.toFixed(2)}`
                        });

                        res.json({ 
                            message: 'Caixa fechado com sucesso',
                            dados: {
                                valor_inicial: caixa.valor_inicial,
                                total_vendas: totalVendas,
                                total_lucro: totalLucro,
                                valor_final: valorFinal,
                                quantidade_vendas: totais.quantidade_vendas
                            }
                        });
                    }
                );
            });
        });
    },

    // Status do caixa
    status: (req, res) => {
        db.get("SELECT * FROM caixa WHERE status = 'aberto'", [], (err, caixa) => {
            if (err) {
                console.error('Erro ao buscar status do caixa:', err);
                return res.status(500).json({ error: err.message });
            }

            if (!caixa) {
                return res.json({ 
                    aberto: false,
                    message: 'Caixa fechado'
                });
            }

            // Calcular vendas do período
            db.get(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                FROM vendas 
                WHERE data_venda >= ? AND status = 'concluida'
            `, [caixa.data_abertura], (err, totais) => {
                if (err) {
                    console.error('Erro ao calcular totais:', err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    aberto: true,
                    id: caixa.id,
                    data_abertura: caixa.data_abertura,
                    valor_inicial: caixa.valor_inicial,
                    total_vendas: totais.total_vendas || 0,
                    total_lucro: totais.total_lucro || 0,
                    quantidade_vendas: totais.quantidade_vendas || 0,
                    saldo_atual: caixa.valor_inicial + (totais.total_vendas || 0)
                });
            });
        });
    },

    // Histórico de caixas (apenas admin)
    historico: (req, res) => {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        db.all(`
            SELECT c.*, u.nome as usuario_nome
            FROM caixa c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.status = 'fechado'
            ORDER BY c.data_fechamento DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)], (err, caixas) => {
            if (err) {
                console.error('Erro ao buscar histórico:', err);
                return res.status(500).json({ error: err.message });
            }

            db.get('SELECT COUNT(*) as total FROM caixa WHERE status = "fechado"', [], (err, count) => {
                if (err) {
                    console.error('Erro ao contar caixas:', err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    caixas: caixas || [],
                    total: count?.total || 0,
                    page: parseInt(page),
                    totalPages: Math.ceil((count?.total || 0) / limit)
                });
            });
        });
    },

    // Relatório semanal (apenas admin)
    relatorioSemanal: (req, res) => {
        db.all(`
            SELECT 
                strftime('%Y-%W', data_venda) as semana,
                MIN(DATE(data_venda)) as data_inicio,
                MAX(DATE(data_venda)) as data_fim,
                COUNT(*) as total_vendas,
                COALESCE(SUM(total), 0) as total,
                COALESCE(SUM(lucro), 0) as lucro,
                AVG(total) as ticket_medio
            FROM vendas 
            WHERE status = 'concluida'
            AND data_venda >= DATE('now', '-3 months')
            GROUP BY strftime('%Y-%W', data_venda)
            ORDER BY semana DESC
        `, [], (err, rows) => {
            if (err) {
                console.error('Erro ao gerar relatório semanal:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        });
    },

    // Relatório mensal (apenas admin)
    relatorioMensal: (req, res) => {
        db.all(`
            SELECT 
                strftime('%Y-%m', data_venda) as mes,
                strftime('%m/%Y', data_venda) as mes_formatado,
                COUNT(*) as total_vendas,
                COALESCE(SUM(total), 0) as total,
                COALESCE(SUM(lucro), 0) as lucro,
                AVG(total) as ticket_medio
            FROM vendas 
            WHERE status = 'concluida'
            AND data_venda >= DATE('now', '-12 months')
            GROUP BY strftime('%Y-%m', data_venda)
            ORDER BY mes DESC
        `, [], (err, rows) => {
            if (err) {
                console.error('Erro ao gerar relatório mensal:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        });
    }
};

module.exports = caixaController;