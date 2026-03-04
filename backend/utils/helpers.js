// Funções auxiliares
exports.formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
};

exports.formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

exports.calculateProfit = (salePrice, costPrice, quantity = 1) => {
    return (salePrice - costPrice) * quantity;
};

exports.generateReportId = () => {
    return 'REL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};