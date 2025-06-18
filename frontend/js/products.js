// Produtos por categoria
let ptProducts = [];
let phProducts = [];
let tbProducts = [];
let stProducts = [];
let gnProducts = [];

// Categoria atual selecionada
let currentCategory = 'PT';

// Função para criar um card de produto
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Criar o conteúdo do card
    const cardContent = document.createElement('div');
    cardContent.className = 'product-card-content';
    
    // Ícone do produto
    const iconElement = document.createElement('div');
    iconElement.className = 'product-icon';
    iconElement.innerHTML = product.icone || '<i class="material-icons">inventory</i>';
    
    // Nome do produto
    const nameElement = document.createElement('div');
    nameElement.className = 'product-name';
    nameElement.textContent = product.nome || product.name;
    
    // Adicionar elementos ao card
    cardContent.appendChild(iconElement);
    cardContent.appendChild(nameElement);
    card.appendChild(cardContent);
    
    return card;
}

// Função para inicializar os produtos padrão
function initializeDefaultProducts() {
    ptProducts = [
        { id: 'pt1', name: 'PT LEVE', category: 'PT' },
        { id: 'pt2', name: 'PT FIT', category: 'PT' },
        { id: 'pt3', name: 'PT VIP', category: 'PT' },
        { id: 'pt4', name: 'PT B.BRASIL', category: 'PT' },
        { id: 'pt5', name: 'PT DUPAPEL', category: 'PT' },
        { id: 'pt6', name: 'PT STAR', category: 'PT' },
        { id: 'pt7', name: 'PT MAX', category: 'PT' },
        { id: 'pt8', name: 'PT SUPREME', category: 'PT' },
        { id: 'pt9', name: 'PT CREME', category: 'PT' },
        { id: 'pt10', name: 'PT ESSENCE 2-A', category: 'PT' },
        { id: 'pt11', name: 'PT TOP', category: 'PT' },
        { id: 'pt12', name: 'PT CAI-CAI', category: 'PT' },
        { id: 'pt13', name: 'PT CAI-CAI 22GR', category: 'PT' },
        { id: 'pt14', name: 'PT LISSE', category: 'PT' },
        { id: 'pt15', name: 'PT CLEAN', category: 'PT' },
        { id: 'pt16', name: 'PT CX MAPEL', category: 'PT' }
    ];

    phProducts = [
        { id: 'ph1', name: 'PH ESSENCE', category: 'PH' },
        { id: 'ph2', name: 'PH ESSENCE LIGHT', category: 'PH' },
        { id: 'ph3', name: 'PH ESSENCE JR', category: 'PH' },
        { id: 'ph4', name: 'PH CLASSIC', category: 'PH' },
        { id: 'ph5', name: 'PH CLASSIC LIGHT', category: 'PH' },
        { id: 'ph6', name: 'PH SENSAÇÃO 200', category: 'PH' },
        { id: 'ph7', name: 'PH CLASSIC LIGHT 500M', category: 'PH' },
        { id: 'ph8', name: 'PH CLAS-EVID 500M', category: 'PH' },
        { id: 'ph9', name: 'PH CLASSIC JR', category: 'PH' },
        { id: 'ph10', name: 'PH SENSAÇÃO 250', category: 'PH' },
        { id: 'ph11', name: 'PH ESSENCE 500', category: 'PH' }
    ];

    tbProducts = [
        { id: 'tb1', name: 'TB LEVE', category: 'TB' },
        { id: 'tb2', name: 'TB MAX', category: 'TB' },
        { id: 'tb3', name: 'TB FIT', category: 'TB' },
        { id: 'tb4', name: 'TB SUPREME', category: 'TB' },
        { id: 'tb5', name: 'TB PRÓ', category: 'TB' },
        { id: 'tb6', name: 'TB TOP', category: 'TB' },
        { id: 'tb7', name: 'TB B BRASIL ECO', category: 'TB' },
        { id: 'tb8', name: 'TB B BRASIL SUP', category: 'TB' },
        { id: 'tb9', name: 'TB ECO', category: 'TB' },
        { id: 'tb10', name: 'TB ULTRA', category: 'TB' }
    ];

    stProducts = [
        { id: 'st1', name: 'TALHER KRAFT 16X27', category: 'ST' },
        { id: 'st2', name: 'TALHER MONO 16X27', category: 'ST' },
        { id: 'st3', name: 'SACO KRAFT 1 KG', category: 'ST' },
        { id: 'st4', name: 'SACO KRAFT 2 KG', category: 'ST' },
        { id: 'st5', name: 'SACO KRAFT 5 KG', category: 'ST' },
        { id: 'st6', name: 'SACO KRAFT 7,5 KG', category: 'ST' },
        { id: 'st7', name: 'SACO MIX 2KG', category: 'ST' },
        { id: 'st8', name: 'SACO MIX 1 KG', category: 'ST' }
    ];

    gnProducts = [
        { id: 'gn1', name: 'GUARD 32X32 SENS BR', category: 'GN' },
        { id: 'gn2', name: 'GUARD 29X29 CLASSIC', category: 'GN' },
        { id: 'gn3', name: 'GUARD 23X23 GOL', category: 'GN' },
        { id: 'gn4', name: 'GUARD 40X40 FD', category: 'GN' },
        { id: 'gn5', name: 'GUARD 29X29 ESSENCE', category: 'GN' },
        { id: 'gn6', name: 'GUARD 18X20 ESSENCE LIGHT', category: 'GN' },
        { id: 'gn7', name: 'GUARD 19,5X19,5 CLASSIC', category: 'GN' },
        { id: 'gn8', name: 'GUARD 18X20 CLASSIC LIGHT', category: 'GN' },
        { id: 'gn9', name: 'GUARD 14X14 BRASILEIRINHO', category: 'GN' }
    ];
}

// Função para carregar produtos do servidor
async function loadProducts() {
    try {
        console.log('🔍 Carregando produtos...');
        
        // Verificar se temos acesso ao Electron API (interface desktop)
        if (window.electronAPI) {
            console.log('📱 Carregando produtos via Electron API...');
            const products = await window.electronAPI.invoke('products:list');
            console.log('📦 Produtos carregados do banco:', products);
            
            organizeProductsByCategory(products);
            return;
        }
        
        // Se não tiver Electron API, tentar carregar via HTTP (interface web)
        console.log('🌐 Carregando produtos via HTTP API...');
        const response = await fetch('/api/products');
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.products) {
                console.log('📦 Produtos carregados via HTTP:', data.products);
                organizeProductsByCategory(data.products);
                return;
            }
        }
        
        // Fallback: usar produtos padrão
        console.log('⚠️ APIs não disponíveis, usando produtos padrão');
        initializeDefaultProducts();
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        // Em caso de erro, inicializa com os padrões
        initializeDefaultProducts();
    }
}

// Função para organizar produtos por categoria
function organizeProductsByCategory(products) {
    // Limpar arrays existentes
    ptProducts = [];
    phProducts = [];
    tbProducts = [];
    stProducts = [];
    gnProducts = [];
    
    // Organizar produtos por categoria
    products.forEach(product => {
        const formattedProduct = {
            id: product.id,
            name: product.name,
            category: product.category,
            code: product.code,
            description: product.description
        };
        
        switch(product.category) {
            case 'PT':
                ptProducts.push(formattedProduct);
                break;
            case 'PH':
                phProducts.push(formattedProduct);
                break;
            case 'TB':
                tbProducts.push(formattedProduct);
                break;
            case 'ST':
                stProducts.push(formattedProduct);
                break;
            case 'GN':
                gnProducts.push(formattedProduct);
                break;
        }
    });
    
    console.log('📊 Produtos organizados por categoria:');
    console.log('PT:', ptProducts.length);
    console.log('PH:', phProducts.length);
    console.log('TB:', tbProducts.length);
    console.log('ST:', stProducts.length);
    console.log('GN:', gnProducts.length);
    
    // Atualizar a exibição se estiver na tela de produção
    if (typeof currentCategory !== 'undefined' && currentCategory) {
        displayProductsByCategory(currentCategory);
    }
}

// Exibe os produtos da categoria selecionada
function displayProductsByCategory(category) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    // Seleciona a lista de produtos correta com base na categoria
    let productList;
    switch(category) {
        case 'PT':
            productList = ptProducts;
            break;
        case 'PH':
            productList = phProducts;
            break;
        case 'TB':
            productList = tbProducts;
            break;
        case 'ST':
            productList = stProducts;
            break;
        case 'GN':
            productList = gnProducts;
            break;
        default:
            productList = [];
    }

    productList.forEach(product => {
        // Define o ícone com base na categoria
        let iconName;
        switch(category) {
            case 'PT':
                iconName = 'receipt_long';
                break;
            case 'PH':
                iconName = 'sanitizer';
                break;
            case 'TB':
                iconName = 'cleaning_services';
                break;
            case 'ST':
                iconName = 'shopping_bag';
                break;
            case 'GN':
                iconName = 'table_restaurant';
                break;
            default:
                iconName = 'inventory';
        }
        
        // Cria um objeto com formato adequado para o createProductCard
        const formattedProduct = {
            id: product.id,
            nome: product.name,
            categoria: product.category,
            icone: `<i class="material-icons">${iconName}</i>`
        };
        
        // Usa a função createProductCard para criar o card
        const card = createProductCard(formattedProduct);
        
        // Substitui o evento de clique para abrir o modal do produto
        card.onclick = () => openProductModal(product);
        
        container.appendChild(card);
    });

    // Atualiza a marcação visual do produto selecionado
    if (typeof updateSelectedProductVisual === 'function') {
        updateSelectedProductVisual();
    }
}

// Função para mudar de aba/categoria
function changeTab(category) {
    console.log(`🔄 Mudando para categoria: ${category}`);
    
    // Atualizar categoria atual
    currentCategory = category;
    
    // Atualizar visual das abas
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-category="${category}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Atualizar descrição da categoria
    const descriptions = {
        'PT': 'Papel Toalha',
        'PH': 'Papel Higiênico', 
        'TB': 'Toalha Bobina',
        'ST': 'Sacos e Talheres',
        'GN': 'Guardanapos'
    };
    
    const categoryDescription = document.getElementById('category-description');
    if (categoryDescription) {
        categoryDescription.textContent = descriptions[category] || category;
    }
    
    // Exibir produtos da categoria
    displayProductsByCategory(category);
}

// Inicializar produtos quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando produtos...');
    
    // Carregar produtos do banco/servidor
    loadProducts();
    
    // Definir categoria inicial como PT
    setTimeout(() => {
        changeTab('PT');
    }, 500);
});

// Funções para gerenciar produtos
function loadProductsIntoSettings() {
    // Carrega os produtos nas listas de configuração
    displayProductsInSettings('pt', ptProducts);
    displayProductsInSettings('ph', phProducts);
    displayProductsInSettings('tb', tbProducts);
    displayProductsInSettings('st', stProducts);
    displayProductsInSettings('gn', gnProducts);
}

function displayProductsInSettings(category, products) {
    const container = document.getElementById(`${category}-products`);
    container.innerHTML = '';

    products.forEach((product, index) => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <span>${product.name}</span>
            <button class="remove-button" onclick="removeProduct('${category}', ${index})">
                <i class="material-icons">delete</i>
            </button>
        `;
        container.appendChild(productItem);
    });
}

async function addNewProduct(category) {
    const input = document.getElementById(`new-${category}-product`);
    const productName = input.value.trim();

    if (!productName) {
        alert('Digite um nome para o produto');
        return;
    }

    // Adiciona o produto à categoria correta
    let productList;
    let prefix;
    let categoryCode;

    switch(category) {
        case 'pt':
            productList = ptProducts;
            prefix = 'pt';
            categoryCode = 'pt';
            break;
        case 'ph':
            productList = phProducts;
            prefix = 'ph';
            categoryCode = 'ph';
            break;
        case 'tb':
            productList = tbProducts;
            prefix = 'tb';
            categoryCode = 'tb';
            break;
        case 'st':
            productList = stProducts;
            prefix = 'st';
            categoryCode = 'st';
            break;
        case 'gn':
            productList = gnProducts;
            prefix = 'gn';
            categoryCode = 'gn';
            break;
    }

    try {
        // Tenta adicionar o produto no servidor primeiro
        if (navigator.onLine) {
            const response = await fetch(`/api/products/${categoryCode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: productName })
            });

            if (response.ok) {
                const newProduct = await response.json();
                console.log('Produto adicionado no servidor:', newProduct);

                // Recarrega os produtos do servidor
                await loadProducts();

                // Atualiza a exibição
                displayProductsInSettings(category, productList);

                // Limpa o campo de entrada
                input.value = '';

                // Atualiza os produtos na tela principal
                displayProductsByCategory(currentCategory);

                return;
            }
        }

        // Fallback: adiciona localmente se o servidor não estiver disponível
        // Gera um ID único para o novo produto
        const newId = prefix + (productList.length + 1);

        // Adiciona o novo produto
        productList.push({
            id: newId,
            name: productName,
            category: category.toUpperCase() === 'GD' ? 'GN' : category.toUpperCase()
        });

        // Atualiza a exibição
        displayProductsInSettings(category, productList);

        // Limpa o campo de entrada
        input.value = '';

        // Salva as alterações
        saveProductsToLocalStorage();

        // Atualiza os produtos na tela principal
        displayProductsByCategory(currentCategory);

        console.log('Produto adicionado localmente (fallback)');
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        alert('Erro ao adicionar produto. Tente novamente.');
    }
}

async function removeProduct(category, index) {
    if (!confirm('Tem certeza que deseja remover este produto?')) {
        return;
    }

    // Remove o produto da categoria correta
    let productList;
    let categoryCode;

    switch(category) {
        case 'pt':
            productList = ptProducts;
            categoryCode = 'pt';
            break;
        case 'ph':
            productList = phProducts;
            categoryCode = 'ph';
            break;
        case 'tb':
            productList = tbProducts;
            categoryCode = 'tb';
            break;
        case 'st':
            productList = stProducts;
            categoryCode = 'st';
            break;
        case 'gn':
            productList = gnProducts;
            categoryCode = 'gn';
            break;
    }

    try {
        // Obtém o ID do produto a ser removido
        const productId = productList[index].id;

        // Tenta remover o produto no servidor primeiro
        if (navigator.onLine) {
            const response = await fetch(`/api/products/${categoryCode}/${productId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log('Produto removido no servidor:', productId);

                // Recarrega os produtos do servidor
                await loadProducts();

                // Atualiza a exibição
                displayProductsInSettings(category, productList);

                // Atualiza os produtos na tela principal
                displayProductsByCategory(currentCategory);

                return;
            }
        }

        // Fallback: remove localmente se o servidor não estiver disponível
        // Remove o produto
        productList.splice(index, 1);

        // Atualiza a exibição
        displayProductsInSettings(category, productList);

        // Salva as alterações
        saveProductsToLocalStorage();

        // Atualiza os produtos na tela principal
        displayProductsByCategory(currentCategory);

        console.log('Produto removido localmente (fallback)');
    } catch (error) {
        console.error('Erro ao remover produto:', error);
        alert('Erro ao remover produto. Tente novamente.');
    }
}

async function saveProductsToLocalStorage() {
    // Salva no localStorage como backup
    localStorage.setItem('ptProducts', JSON.stringify(ptProducts));
    localStorage.setItem('phProducts', JSON.stringify(phProducts));
    localStorage.setItem('tbProducts', JSON.stringify(tbProducts));
    localStorage.setItem('stProducts', JSON.stringify(stProducts));
    localStorage.setItem('gnProducts', JSON.stringify(gnProducts));

    // Atualiza o timestamp da última atualização
    const timestamp = Date.now();
    localStorage.setItem('products_last_update', timestamp);

    // Notifica o servidor sobre a atualização dos produtos
    await notifyProductsUpdate();

    // Verifica se há outros dispositivos conectados e atualiza a ordem atual
    if (addedProducts.length > 0) {
        const orderCode = document.getElementById('order-code-display')?.textContent;
        if (orderCode) {
            try {
                // Envia a ordem atual para o servidor para sincronização
                const productData = addedProducts[0];
                await fetch(`/api/orders/${orderCode}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });
                console.log('Ordem sincronizada com o servidor:', orderCode);
            } catch (error) {
                console.error('Erro ao sincronizar ordem com o servidor:', error);
            }
        }
    }
}

// Função para notificar o servidor sobre a atualização dos produtos
async function notifyProductsUpdate() {
    try {
        if (navigator.onLine) {
            const response = await fetch('/update_products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ timestamp: Date.now() })
            });

            const data = await response.json();
            console.log('Servidor notificado sobre atualização de produtos:', data);
            return data;
        }
    } catch (error) {
        console.error('Erro ao notificar servidor:', error);
    }
    return null;
}

// Funções para importar/exportar produtos
function exportProducts() {
    const productsData = {
        ptProducts: ptProducts,
        phProducts: phProducts,
        tbProducts: tbProducts,
        stProducts: stProducts,
        gnProducts: gnProducts
    };

    const dataStr = JSON.stringify(productsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'produtos_gestao_producao.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showNotification('Lista de produtos exportada com sucesso!');
}

function importProducts(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Verifica se o arquivo tem o formato correto
            if (!data.ptProducts || !data.phProducts || !data.tbProducts || !data.stProducts || !data.gnProducts) {
                throw new Error('Formato de arquivo inválido');
            }

            // Atualiza as listas de produtos
            ptProducts = data.ptProducts;
            phProducts = data.phProducts;
            tbProducts = data.tbProducts;
            stProducts = data.stProducts;
            gnProducts = data.gnProducts;

            // Salva no localStorage
            saveProductsToLocalStorage();

            // Atualiza a exibição
            loadProductsIntoSettings();
            displayProductsByCategory(currentCategory);

            showNotification('Lista de produtos importada com sucesso!');
        } catch (error) {
            alert('Erro ao importar arquivo: ' + error.message);
        }

        // Limpa o campo de arquivo
        event.target.value = '';
    };
    reader.readAsText(file);
}

function resetToDefaultProducts() {
    if (!confirm('Tem certeza que deseja restaurar a lista padrão de produtos? Isso substituirá todos os produtos atuais.')) {
        return;
    }

    // Restaura as listas padrão
    initializeDefaultProducts();

    // Salva no localStorage
    saveProductsToLocalStorage();

    // Atualiza a exibição
    loadProductsIntoSettings();
    displayProductsByCategory(currentCategory);

    showNotification('Lista padrão de produtos restaurada com sucesso!');
}
