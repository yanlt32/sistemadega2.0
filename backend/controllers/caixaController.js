const { db } = require('../models/database');
const bcrypt = require('bcryptjs');

const caixaController = {
    // Abrir caixa (sempre com R$ 200,00)
    abrirCaixa: (req, res) => {
        try {
            const { observacao } = req.body;
            const usuario_id = req.usuario.id;
            const valor_inicial = 200.00;

            // Verificar se já existe caixa aberto
            const caixaAberto = db.prepare("SELECT * FROM caixa WHERE status = 'aberto'").get();
            
            if (caixaAberto) {
                return res.status(400).json({ error: 'Já existe um caixa aberto' });
            }

            // Inserir novo caixa
            const result = db.prepare(`
                INSERT INTO caixa (valor_inicial, observacao, status, usuario_id) 
                VALUES (?, ?, 'aberto', ?)
            `).run(valor_inicial, observacao || `Caixa aberto com R$ 200,00`, usuario_id);
            
            if (req.io) {
                req.io.emit('caixa:aberto', { 
                    id: result.lastInsertRowid, 
                    mensagem: '🔓 Caixa foi aberto pelo administrador com R$ 200,00'
                });
            }
            
            res.json({ 
                id: result.lastInsertRowid, 
                message: 'Caixa aberto com sucesso',
                valor_inicial 
            });
        } catch (error) {
            console.error('Erro ao abrir caixa:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Status do caixa
    statusCaixa: (req, res) => {
        try {
            const caixa = db.prepare("SELECT * FROM caixa WHERE status = 'aberto'").get();
            
            if (!caixa) {
                return res.json({ 
                    aberto: false,
                    message: 'Caixa fechado'
                });
            }
            
            // Buscar pagamentos por forma
            const pagamentosEsperados = db.prepare(`
                SELECT 
                    forma_pagamento,
                    COUNT(*) as quantidade,
                    COALESCE(SUM(total), 0) as total_esperado
                FROM vendas 
                WHERE data_venda >= ? AND status = 'concluida'
                GROUP BY forma_pagamento
            `).all(caixa.data_abertura);

            // Buscar totais
            const totais = db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as total_vendas,
                    COALESCE(SUM(lucro), 0) as total_lucro,
                    COUNT(*) as quantidade_vendas
                FROM vendas 
                WHERE data_venda >= ? AND status = 'concluida'
            `).get(caixa.data_abertura);
            
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
        } catch (error) {
            console.error('Erro ao buscar status do caixa:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Fechar caixa com conferência de valores
    fecharCaixa: async (req, res) => {
        try {
            const { senha_admin, valores_reais, observacao } = req.body;
            const usuario_id = req.usuario.id;

            if (!valores_reais || !Array.isArray(valores_reais)) {
                return res.status(400).json({ 
                    error: 'É necessário informar os valores reais de cada forma de pagamento' 
                });
            }

            // Verificar senha do admin
            const user = db.prepare('SELECT password FROM usuarios WHERE id = ? AND role = ?').get(usuario_id, 'admin');
            
            if (!user) {
                return res.status(401).json({ error: 'Usuário não encontrado' });
            }

            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Senha de administrador inválida' });
            }

            // Buscar caixa aberto
            const caixa = db.prepare("SELECT * FROM caixa WHERE status = 'aberto'").get();
            
            if (!caixa) {
                return res.status(400).json({ error: 'Nenhum caixa aberto' });
            }

            // Buscar pagamentos esperados
            const pagamentosEsperados = db.prepare(`
                SELECT 
                    forma_pagamento,
                    COALESCE(SUM(total), 0) as total_esperado
                FROM vendas 
                WHERE data_venda >= ? AND status = 'concluida'
                GROUP BY forma_pagamento
            `).all(caixa.data_abertura);

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

            // Buscar totais de vendas
            const totais = db.prepare(`
                SELECT COALESCE(SUM(total), 0) as total_vendas, COALESCE(SUM(lucro), 0) as total_lucro
                FROM vendas WHERE data_venda >= ? AND status = 'concluida'
            `).get(caixa.data_abertura);

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

            // Fechar caixa
            const result = db.prepare(`
                UPDATE caixa SET 
                    data_fechamento = CURRENT_TIMESTAMP, 
                    valor_final = ?, 
                    total_vendas = ?, 
                    total_lucro = ?,
                    observacao = ?,
                    status = 'fechado'
                WHERE id = ?
            `).run(valorFinal, totalVendas, totalLucro, obsCompleta, caixa.id);

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
        } catch (error) {
            console.error('Erro ao fechar caixa:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Recalcular caixa após alterações
    recalcularCaixa: async (req, res) => {
        try {
            const { id } = req.params;
            const { senha_admin } = req.body;
            const usuario_id = req.usuario.id;

            // Verificar senha do admin
            const user = db.prepare('SELECT password FROM usuarios WHERE id = ? AND role = ?').get(usuario_id, 'admin');
            
            if (!user) {
                return res.status(401).json({ error: 'Usuário não encontrado' });
            }

            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Senha de administrador inválida' });
            }

            // Buscar caixa
            const caixa = db.prepare('SELECT * FROM caixa WHERE id = ?').get(id);
            if (!caixa) {
                return res.status(404).json({ error: 'Caixa não encontrado' });
            }

            // Recalcular com base nas vendas do período
            const totais = db.prepare(`
                SELECT COALESCE(SUM(total), 0) as total_vendas, COALESCE(SUM(lucro), 0) as total_lucro
                FROM vendas 
                WHERE data_venda BETWEEN ? AND ? AND status = 'concluida'
            `).get(caixa.data_abertura, caixa.data_fechamento);

            const novoValorFinal = caixa.valor_inicial + (totais?.total_vendas || 0);

            // Atualizar caixa
            db.prepare(`
                UPDATE caixa SET 
                    total_vendas = ?, 
                    total_lucro = ?,
                    valor_final = ?,
                    observacao = observacao || '\n🔄 Caixa recalculado automaticamente'
                WHERE id = ?
            `).run(totais?.total_vendas || 0, totais?.total_lucro || 0, novoValorFinal, id);

            res.json({ 
                message: 'Caixa recalculado com sucesso',
                dados: {
                    valor_inicial: caixa.valor_inicial,
                    total_vendas: totais?.total_vendas || 0,
                    total_lucro: totais?.total_lucro || 0,
                    valor_final: novoValorFinal
                }
            });
        } catch (error) {
            console.error('Erro ao recalcular caixa:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Excluir caixa (apenas admin)
    excluirCaixa: async (req, res) => {
        try {
            const { id } = req.params;
            const { senha_admin } = req.body;
            const usuario_id = req.usuario.id;

            // Verificar senha do admin
            const user = db.prepare('SELECT password FROM usuarios WHERE id = ? AND role = ?').get(usuario_id, 'admin');
            
            if (!user) {
                return res.status(401).json({ error: 'Usuário não encontrado' });
            }

            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Senha de administrador inválida' });
            }

            // Excluir caixa
            const result = db.prepare('DELETE FROM caixa WHERE id = ?').run(id);
            
            if (result.changes === 0) {
                return res.status(404).json({ error: 'Caixa não encontrado' });
            }

            res.json({ message: 'Caixa excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir caixa:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Resetar caixa (apagar todo histórico)
    resetarCaixa: async (req, res) => {
        try {
            const { senha_admin } = req.body;
            const usuario_id = req.usuario.id;

            // Verificar senha do admin
            const user = db.prepare('SELECT password FROM usuarios WHERE id = ? AND role = ?').get(usuario_id, 'admin');
            
            if (!user) {
                return res.status(401).json({ error: 'Usuário não encontrado' });
            }

            const senhaValida = await bcrypt.compare(senha_admin, user.password);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Senha de administrador inválida' });
            }

            // Resetar caixa
            db.prepare('DELETE FROM caixa').run();
            
            if (req.io) {
                req.io.emit('caixa:resetado', { 
                    mensagem: '⚠️ Histórico de caixa foi resetado pelo administrador'
                });
            }
            
            res.json({ message: 'Caixa resetado com sucesso' });
        } catch (error) {
            console.error('Erro ao resetar caixa:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Histórico de caixas
    historico: (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const caixas = db.prepare(`
                SELECT c.*, u.nome as usuario_nome
                FROM caixa c
                LEFT JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.status = 'fechado'
                ORDER BY c.data_fechamento DESC
                LIMIT ? OFFSET ?
            `).all(parseInt(limit), parseInt(offset));

            const count = db.prepare("SELECT COUNT(*) as total FROM caixa WHERE status = 'fechado'").get();

            res.json({
                caixas: caixas || [],
                total: count?.total || 0,
                page: parseInt(page),
                totalPages: Math.ceil((count?.total || 0) / limit)
            });
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = caixaController;