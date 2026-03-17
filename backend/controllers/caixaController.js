const { db } = require('../models/database');
const bcrypt = require('bcryptjs');

const caixaController = {
    // Abrir caixa (sempre com R$ 200,00)
    abrirCaixa: (req, res) => {
        const { observacao } = req.body;
        const usuario_id = req.usuario.id;
        const valor_inicial = 200.00;

        db.get("SELECT * FROM caixa WHERE status = 'aberto'", [], (err, caixaAberto) => {
            if (err) {
                console.error('Erro ao verificar caixa:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (caixaAberto) {
                return res.status(400).json({ error: 'Já existe um caixa aberto' });
            }

            db.run(
                `INSERT INTO caixa (valor_inicial, observacao, status, usuario_id) VALUES (?, ?, 'aberto', ?)`,
                [valor_inicial, observacao || `Caixa aberto com R$ 200,00`, usuario_id],
                function(err) {
                    if (err) {
                        console.error('Erro ao abrir caixa:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (req.io) {
                        req.io.emit('caixa:aberto', { 
                            id: this.lastID, 
                            mensagem: '🔓 Caixa foi aberto pelo administrador com R$ 200,00'
                        });
                    }
                    
                    res.json({ 
                        id: this.lastID, 
                        message: 'Caixa aberto com sucesso',
                        valor_inicial 
                    });
                }
            );
        });
    },

    // Status do caixa
    statusCaixa: (req, res) => {
        db.get("SELECT * FROM caixa WHERE status = 'aberto'", [], (err, caixa) => {
            if (err) {
                console.error('Erro ao buscar caixa:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (!caixa) {
                return res.json({ 
                    aberto: false,
                    message: 'Caixa fechado'
                });
            }
            
            // Calcular vendas do período
            db.all(`
                SELECT 
                    forma_pagamento,
                    COUNT(*) as quantidade,
                    COALESCE(SUM(total), 0) as total_esperado
                FROM vendas 
                WHERE data_venda >= ? AND status = 'concluida'
                GROUP BY forma_pagamento
            `, [caixa.data_abertura], (err, pagamentosEsperados) => {
                if (err) {
                    console.error('Erro ao buscar pagamentos:', err);
                    return res.status(500).json({ error: err.message });
                }

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
                        total_vendas: totais?.total_vendas || 0,
                        total_lucro: totais?.total_lucro || 0,
                        quantidade_vendas: totais?.quantidade_vendas || 0,
                        pagamentos_esperados: pagamentosEsperados || [],
                        saldo_esperado: caixa.valor_inicial + (totais?.total_vendas || 0)
                    });
                });
            });
        });
    },

    // Fechar caixa com conferência de valores
    fecharCaixa: (req, res) => {
        const { senha_admin, valores_reais, observacao } = req.body;
        const usuario_id = req.usuario.id;

        if (!valores_reais || !Array.isArray(valores_reais)) {
            return res.status(400).json({ 
                error: 'É necessário informar os valores reais de cada forma de pagamento' 
            });
        }

        db.get('SELECT password FROM usuarios WHERE id = ? AND role = ?', [usuario_id, 'admin'], async (err, user) => {
            if (err) {
                console.error('Erro ao buscar usuário:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Usuário não encontrado' });
            }

            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Senha de administrador inválida' });
            }

            db.get("SELECT * FROM caixa WHERE status = 'aberto'", [], (err, caixa) => {
                if (err) {
                    console.error('Erro ao buscar caixa:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                if (!caixa) {
                    return res.status(400).json({ error: 'Nenhum caixa aberto' });
                }

                db.all(`
                    SELECT 
                        forma_pagamento,
                        COALESCE(SUM(total), 0) as total_esperado
                    FROM vendas 
                    WHERE data_venda >= ? AND status = 'concluida'
                    GROUP BY forma_pagamento
                `, [caixa.data_abertura], (err, pagamentosEsperados) => {
                    if (err) {
                        console.error('Erro ao buscar pagamentos:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    const diferencas = [];
                    let totalEsperado = 0;
                    let totalReal = 0;

                    valores_reais.forEach(real => {
                        const esperado = pagamentosEsperados.find(e => e.forma_pagamento === real.forma) || { total_esperado: 0 };
                        const diferenca = real.valor - esperado.total_esperado;
                        
                        totalEsperado += esperado.total_esperado;
                        totalReal += real.valor;
                        
                        if (Math.abs(diferenca) > 0.01) {
                            diferencas.push({
                                forma: real.forma,
                                esperado: esperado.total_esperado,
                                real: real.valor,
                                diferenca
                            });
                        }
                    });

                    pagamentosEsperados.forEach(esperado => {
                        const encontrado = valores_reais.find(r => r.forma === esperado.forma_pagamento);
                        if (!encontrado) {
                            diferencas.push({
                                forma: esperado.forma_pagamento,
                                esperado: esperado.total_esperado,
                                real: 0,
                                diferenca: -esperado.total_esperado
                            });
                        }
                    });

                    db.get(`
                        SELECT COALESCE(SUM(total), 0) as total_vendas, COALESCE(SUM(lucro), 0) as total_lucro
                        FROM vendas WHERE data_venda >= ? AND status = 'concluida'
                    `, [caixa.data_abertura], (err, totais) => {
                        if (err) {
                            console.error('Erro ao calcular totais:', err);
                            return res.status(500).json({ error: err.message });
                        }

                        const totalVendas = totais?.total_vendas || 0;
                        const totalLucro = totais?.total_lucro || 0;
                        const valorFinal = caixa.valor_inicial + totalReal;

                        let obsCompleta = observacao || '';
                        if (diferencas.length > 0) {
                            obsCompleta += '\n\n📊 DIFERENÇAS ENCONTRADAS:\n';
                            diferencas.forEach(d => {
                                const sinal = d.diferenca > 0 ? '+' : '';
                                obsCompleta += `${d.forma}: Esperado R$ ${d.esperado.toFixed(2)} | Real R$ ${d.real.toFixed(2)} | Diferença ${sinal}${d.diferenca.toFixed(2)}\n`;
                            });
                        }

                        db.run(
                            `UPDATE caixa SET 
                                data_fechamento = CURRENT_TIMESTAMP, 
                                valor_final = ?, 
                                total_vendas = ?, 
                                total_lucro = ?,
                                observacao = ?,
                                status = 'fechado'
                             WHERE id = ?`,
                            [valorFinal, totalVendas, totalLucro, obsCompleta, caixa.id],
                            function(err) {
                                if (err) {
                                    console.error('Erro ao fechar caixa:', err);
                                    return res.status(500).json({ error: err.message });
                                }

                                if (req.io) {
                                    req.io.emit('caixa:fechado', { 
                                        id: caixa.id,
                                        mensagem: '🔒 Caixa foi fechado pelo administrador',
                                        diferencas
                                    });
                                }

                                res.json({ 
                                    message: 'Caixa fechado com sucesso',
                                    dados: {
                                        valor_inicial: caixa.valor_inicial,
                                        total_vendas: totalVendas,
                                        valores_reais,
                                        diferencas,
                                        valor_final: valorFinal
                                    }
                                });
                            }
                        );
                    });
                });
            });
        });
    },

    // ✅ NOVA FUNÇÃO: Recalcular caixa após alterações
    recalcularCaixa: (req, res) => {
        const { id } = req.params;
        const { senha_admin } = req.body;
        const usuario_id = req.usuario.id;

        db.get('SELECT password FROM usuarios WHERE id = ? AND role = ?', [usuario_id, 'admin'], async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) return res.status(401).json({ error: 'Senha de administrador inválida' });

            db.get('SELECT * FROM caixa WHERE id = ?', [id], (err, caixa) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!caixa) return res.status(404).json({ error: 'Caixa não encontrado' });

                // Recalcular com base nas vendas do período
                db.get(`
                    SELECT COALESCE(SUM(total), 0) as total_vendas, COALESCE(SUM(lucro), 0) as total_lucro
                    FROM vendas 
                    WHERE data_venda BETWEEN ? AND ? AND status = 'concluida'
                `, [caixa.data_abertura, caixa.data_fechamento], (err, totais) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const novoValorFinal = caixa.valor_inicial + (totais?.total_vendas || 0);

                    db.run(
                        `UPDATE caixa SET 
                            total_vendas = ?, 
                            total_lucro = ?,
                            valor_final = ?,
                            observacao = observacao || '\n🔄 Caixa recalculado automaticamente'
                         WHERE id = ?`,
                        [totais?.total_vendas || 0, totais?.total_lucro || 0, novoValorFinal, id],
                        function(err) {
                            if (err) return res.status(500).json({ error: err.message });

                            res.json({ 
                                message: 'Caixa recalculado com sucesso',
                                dados: {
                                    valor_inicial: caixa.valor_inicial,
                                    total_vendas: totais?.total_vendas || 0,
                                    total_lucro: totais?.total_lucro || 0,
                                    valor_final: novoValorFinal
                                }
                            });
                        }
                    );
                });
            });
        });
    },

    // ✅ NOVA FUNÇÃO: Excluir caixa (apenas admin)
    excluirCaixa: (req, res) => {
        const { id } = req.params;
        const { senha_admin } = req.body;
        const usuario_id = req.usuario.id;

        db.get('SELECT password FROM usuarios WHERE id = ? AND role = ?', [usuario_id, 'admin'], async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) return res.status(401).json({ error: 'Senha de administrador inválida' });

            db.run('DELETE FROM caixa WHERE id = ?', [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Caixa não encontrado' });

                res.json({ message: 'Caixa excluído com sucesso' });
            });
        });
    },

    // Resetar caixa (apagar todo histórico)
    resetarCaixa: (req, res) => {
        const { senha_admin } = req.body;
        const usuario_id = req.usuario.id;

        db.get('SELECT password FROM usuarios WHERE id = ? AND role = ?', [usuario_id, 'admin'], async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) return res.status(401).json({ error: 'Senha de administrador inválida' });

            db.run('DELETE FROM caixa', [], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                if (req.io) {
                    req.io.emit('caixa:resetado', { 
                        mensagem: '⚠️ Histórico de caixa foi resetado pelo administrador'
                    });
                }
                
                res.json({ message: 'Caixa resetado com sucesso' });
            });
        });
    },

    // Histórico de caixas
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
            if (err) return res.status(500).json({ error: err.message });

            db.get('SELECT COUNT(*) as total FROM caixa WHERE status = "fechado"', [], (err, count) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    caixas: caixas || [],
                    total: count?.total || 0,
                    page: parseInt(page),
                    totalPages: Math.ceil((count?.total || 0) / limit)
                });
            });
        });
    }
};

module.exports = caixaController;