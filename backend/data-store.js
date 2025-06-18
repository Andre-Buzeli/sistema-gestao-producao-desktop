/**
 * Módulo para armazenamento de dados no servidor
 * Implementa um sistema simples de armazenamento em memória
 * Em um ambiente de produção, isso seria substituído por um banco de dados
 */

const fs = require('fs');
const path = require('path');
const PRODUTOS_PATH = path.join(__dirname, 'produtos.json');

// Armazenamento em memória para produtos
const productStore = {
    // Lista de produtos configurados
    products: {
        pt: [], // Papel Toalha
        ph: [], // Papel Higiênico
        tb: [], // Toalha Bobina
        st: [], // Sacos e Talheres
        gn: []  // Guardanapos
    },

    // Ordens de produção e produtos adicionados
    orders: {},

    // Última atualização
    lastUpdate: Date.now()
};

// Inicializa com os produtos padrão do cliente
function initializeDefaultProducts() {
    // Papel Toalha (PT)
    productStore.products.pt = [
        { id: 'pt_1', name: 'PT LEVE', category: 'PT' },
        { id: 'pt_2', name: 'PT FIT', category: 'PT' },
        { id: 'pt_3', name: 'PT VIP', category: 'PT' },
        { id: 'pt_4', name: 'PT B.BRASIL', category: 'PT' },
        { id: 'pt_5', name: 'PT DUPAPEL', category: 'PT' },
        { id: 'pt_6', name: 'PT STAR', category: 'PT' },
        { id: 'pt_7', name: 'PT MAX', category: 'PT' },
        { id: 'pt_8', name: 'PT SUPREME', category: 'PT' },
        { id: 'pt_9', name: 'PT CREME', category: 'PT' },
        { id: 'pt_10', name: 'PT ESSENCE 2-A', category: 'PT' },
        { id: 'pt_11', name: 'PT TOP', category: 'PT' },
        { id: 'pt_12', name: 'PT CAI-CAI', category: 'PT' },
        { id: 'pt_13', name: 'PT CAI-CAI 22GR', category: 'PT' },
        { id: 'pt_14', name: 'PT LISSE', category: 'PT' },
        { id: 'pt_15', name: 'PT CLEAN', category: 'PT' },
        { id: 'pt_16', name: 'PT CX MAPEL', category: 'PT' }
    ];

    // Papel Higiênico (PH)
    productStore.products.ph = [
        { id: 'ph_1', name: 'PH ESSENCE', category: 'PH' },
        { id: 'ph_2', name: 'PH ESSENCE LIGHT', category: 'PH' },
        { id: 'ph_3', name: 'PH ESSENCE JR', category: 'PH' },
        { id: 'ph_4', name: 'PH CLASSIC', category: 'PH' },
        { id: 'ph_5', name: 'PH CLASSIC LIGHT', category: 'PH' },
        { id: 'ph_6', name: 'PH SENSAÇÃO 200', category: 'PH' },
        { id: 'ph_7', name: 'PH CLASSIC LIGHT 500M', category: 'PH' },
        { id: 'ph_8', name: 'PH CLAS-EVID 500M', category: 'PH' },
        { id: 'ph_9', name: 'PH CLASSIC JR', category: 'PH' },
        { id: 'ph_10', name: 'PH SENSAÇÃO 250', category: 'PH' },
        { id: 'ph_11', name: 'PH ESSENCE 500', category: 'PH' }
    ];

    // Toalha Bobina (TB)
    productStore.products.tb = [
        { id: 'tb_1', name: 'TB LEVE', category: 'TB' },
        { id: 'tb_2', name: 'TB MAX', category: 'TB' },
        { id: 'tb_3', name: 'TB FIT', category: 'TB' },
        { id: 'tb_4', name: 'TB SUPREME', category: 'TB' },
        { id: 'tb_5', name: 'TB PRÓ', category: 'TB' },
        { id: 'tb_6', name: 'TB TOP', category: 'TB' },
        { id: 'tb_7', name: 'TB B BRASIL ECO', category: 'TB' },
        { id: 'tb_8', name: 'TB B BRASIL SUP', category: 'TB' },
        { id: 'tb_9', name: 'TB ECO', category: 'TB' },
        { id: 'tb_10', name: 'TB ULTRA', category: 'TB' }
    ];

    // Sacos e Talheres (ST)
    productStore.products.st = [
        { id: 'st_1', name: 'TALHER KRAFT 16X27', category: 'ST' },
        { id: 'st_2', name: 'TALHER MONO 16X27', category: 'ST' },
        { id: 'st_3', name: 'SACO KRAFT 1 KG', category: 'ST' },
        { id: 'st_4', name: 'SACO KRAFT 2 KG', category: 'ST' },
        { id: 'st_5', name: 'SACO KRAFT 5 KG', category: 'ST' },
        { id: 'st_6', name: 'SACO KRAFT 7,5 KG', category: 'ST' },
        { id: 'st_7', name: 'SACO MIX 2KG', category: 'ST' },
        { id: 'st_8', name: 'SACO MIX 1 KG', category: 'ST' }
    ];

    // Guardanapos (GN)
    productStore.products.gn = [
        { id: 'gn_1', name: 'GUARD 32X32 SENS BR', category: 'GN' },
        { id: 'gn_2', name: 'GUARD 29X29 CLASSIC', category: 'GN' },
        { id: 'gn_3', name: 'GUARD 23X23 GOL', category: 'GN' },
        { id: 'gn_4', name: 'GUARD 40X40 FD', category: 'GN' },
        { id: 'gn_5', name: 'GUARD 29X29 ESSENCE', category: 'GN' },
        { id: 'gn_6', name: 'GUARD 18X20 ESSENCE LIGHT', category: 'GN' },
        { id: 'gn_7', name: 'GUARD 19,5X19,5 CLASSIC', category: 'GN' },
        { id: 'gn_8', name: 'GUARD 18X20 CLASSIC LIGHT', category: 'GN' },
        { id: 'gn_9', name: 'GUARD 14X14 BRASILEIRINHO', category: 'GN' }
    ];
    
    // Inicializar sem ordens de exemplo
    productStore.orders = {};
}

// Função para salvar produtos em arquivo
function saveProductsToFile() {
    try {
        fs.writeFileSync(PRODUTOS_PATH, JSON.stringify(productStore.products, null, 2), 'utf8');
    } catch (err) {
        console.error('Erro ao salvar produtos em arquivo:', err);
    }
}

// Função para carregar produtos do arquivo
function loadProductsFromFile() {
    try {
        if (fs.existsSync(PRODUTOS_PATH)) {
            const data = fs.readFileSync(PRODUTOS_PATH, 'utf8');
            productStore.products = JSON.parse(data);
        } else {
            initializeDefaultProducts();
            saveProductsToFile();
        }
    } catch (err) {
        console.error('Erro ao carregar produtos do arquivo:', err);
        initializeDefaultProducts();
    }
}

// Substitui a chamada direta para initializeDefaultProducts
loadProductsFromFile();

/**
 * Obtém todos os produtos de uma categoria
 * @param {string} category - Categoria dos produtos (pt, ph, tb, st, gd)
 * @returns {Array} - Lista de produtos da categoria
 */
function getProducts(category) {
    return productStore.products[category.toLowerCase()] || [];
}

/**
 * Obtém todos os produtos
 * @returns {Object} - Objeto com todos os produtos por categoria
 */
function getAllProducts() {
    return productStore.products;
}

/**
 * Adiciona um produto a uma categoria
 * @param {string} category - Categoria do produto (pt, ph, tb, st, gd)
 * @param {string} name - Nome do produto
 * @returns {Object} - Produto adicionado
 */
function addProduct(category, name) {
    const catKey = category.toLowerCase();

    // Verifica se a categoria existe
    if (!productStore.products[catKey]) {
        throw new Error(`Categoria ${category} não encontrada`);
    }

    // Cria um ID único para o produto
    const id = `${catKey}_${Date.now()}`;

    // Cria o objeto do produto
    const product = {
        id,
        name,
        category: category.toUpperCase()
    };

    // Adiciona o produto à categoria
    productStore.products[catKey].push(product);

    // Atualiza o timestamp
    productStore.lastUpdate = Date.now();

    saveProductsToFile(); // Salva após adicionar

    return product;
}

/**
 * Remove um produto de uma categoria
 * @param {string} category - Categoria do produto (pt, ph, tb, st, gd)
 * @param {string} productId - ID do produto
 * @returns {boolean} - true se o produto foi removido, false caso contrário
 */
function removeProduct(category, productId) {
    const catKey = category.toLowerCase();

    // Verifica se a categoria existe
    if (!productStore.products[catKey]) {
        return false;
    }

    // Busca o índice do produto
    const index = productStore.products[catKey].findIndex(p => p.id === productId);

    // Se o produto não foi encontrado, retorna false
    if (index === -1) {
        return false;
    }

    // Remove o produto
    productStore.products[catKey].splice(index, 1);

    // Atualiza o timestamp
    productStore.lastUpdate = Date.now();

    saveProductsToFile(); // Salva após remover

    return true;
}

/**
 * Adiciona um produto a uma ordem de produção
 * @param {string} orderCode - Código da ordem de produção
 * @param {Object} productData - Dados do produto
 * @returns {Object} - Dados da ordem atualizada
 */
function addProductToOrder(orderCode, productData) {
    // Se a ordem não existe, cria uma nova
    if (!productStore.orders[orderCode]) {
        productStore.orders[orderCode] = {
            code: orderCode,
            products: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    // Adiciona o produto à ordem
    productStore.orders[orderCode].products = [productData]; // Substitui produtos existentes (apenas um produto por ordem)
    productStore.orders[orderCode].updatedAt = Date.now();

    // Atualiza o timestamp
    productStore.lastUpdate = Date.now();

    return productStore.orders[orderCode];
}

/**
 * Adiciona uma ordem completa (com múltiplos produtos e dados adicionais)
 * @param {string} orderCode - Código da ordem de produção
 * @param {Object} orderData - Dados completos da ordem
 * @returns {Object} - Dados da ordem atualizada
 */
function addCompleteOrder(orderCode, orderData) {
    // Cria ou atualiza a ordem
    productStore.orders[orderCode] = {
        code: orderCode,
        products: orderData.products || [],
        timestamp: orderData.timestamp || new Date().toISOString(),
        terminal: orderData.terminal || 'unknown',
        status: orderData.status || 'completed',
        createdAt: productStore.orders[orderCode]?.createdAt || Date.now(),
        updatedAt: Date.now(),
        // Calcula peso total das bobinas se disponível
        totalWeight: orderData.products ? 
            orderData.products.reduce((total, product) => {
                return total + (parseFloat(product.totalWeight) || 0);
            }, 0) : 0
    };

    // Atualiza o timestamp
    productStore.lastUpdate = Date.now();

    return productStore.orders[orderCode];
}

/**
 * Cria uma nova ordem de produção (alias para addCompleteOrder)
 * @param {string} orderCode - Código da ordem de produção
 * @param {Object} orderData - Dados da ordem
 * @returns {Object} - Dados da ordem criada
 */
function createOrder(orderCode, orderData) {
    return addCompleteOrder(orderCode, orderData);
}

/**
 * Obtém uma ordem de produção
 * @param {string} orderCode - Código da ordem de produção
 * @returns {Object|null} - Dados da ordem ou null se não encontrada
 */
function getOrder(orderCode) {
    return productStore.orders[orderCode] || null;
}

/**
 * Obtém todas as ordens de produção
 * @returns {Object} - Objeto com todas as ordens
 */
function getAllOrders() {
    return productStore.orders;
}

/**
 * Remove uma ordem de produção
 * @param {string} orderCode - Código da ordem de produção
 * @returns {boolean} - true se a ordem foi removida, false caso contrário
 */
function removeOrder(orderCode) {
    if (!productStore.orders[orderCode]) {
        return false;
    }

    delete productStore.orders[orderCode];

    // Atualiza o timestamp
    productStore.lastUpdate = Date.now();

    return true;
}

/**
 * Remove todas as ordens com status 'completed'
 * @returns {Object} - Resultado da operação
 */
function clearCompletedOrders() {
    let removedCount = 0;
    
    // Percorre todas as ordens e remove as que têm status 'completed'
    for (const orderCode in productStore.orders) {
        const order = productStore.orders[orderCode];
        if (order.status === 'completed') {
            delete productStore.orders[orderCode];
            removedCount++;
        }
    }
    
    // Atualiza o timestamp
    productStore.lastUpdate = Date.now();
    
    console.log(`🗑️ DataStore: ${removedCount} ordens completed removidas`);
    return { success: true, removedCount, message: `${removedCount} ordens completed removidas do DataStore` };
}

/**
 * Obtém o timestamp da última atualização
 * @returns {number} - Timestamp da última atualização
 */
function getLastUpdate() {
    return productStore.lastUpdate;
}

// Exporta as funções
module.exports = {
    getProducts,
    getAllProducts,
    addProduct,
    removeProduct,
    addProductToOrder,
    addCompleteOrder,
    createOrder,
    getOrder,
    getAllOrders,
    removeOrder,
    clearCompletedOrders,
    getLastUpdate,
    saveProductsToFile,
    loadProductsFromFile
};

// Inicializar produtos padrão ao carregar o módulo
console.log('🚀 Inicializando data-store...');
initializeDefaultProducts();
