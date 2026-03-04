// Middleware de validação para prevenir XSS e sanitizar entradas
exports.sanitizeInput = (req, res, next) => {
    // Sanitizar strings no body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Remover caracteres perigosos
                req.body[key] = req.body[key]
                    .replace(/[<>]/g, '') // Remover < e >
                    .trim();
            }
        });
    }
    next();
};

// Validar campos obrigatórios
exports.validateRequired = (fields) => {
    return (req, res, next) => {
        const missing = fields.filter(field => !req.body[field]);
        
        if (missing.length > 0) {
            return res.status(400).json({ 
                error: `Campos obrigatórios: ${missing.join(', ')}` 
            });
        }
        
        next();
    };
};

// Validar números
exports.validateNumbers = (fields) => {
    return (req, res, next) => {
        const errors = [];
        
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                const value = parseFloat(req.body[field]);
                if (isNaN(value) || value < 0) {
                    errors.push(`${field} deve ser um número válido maior ou igual a zero`);
                }
            }
        });
        
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        next();
    };
};