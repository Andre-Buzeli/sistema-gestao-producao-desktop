// ===== MAQUINA.JS - FUNÇÕES ESPECÍFICAS DA PÁGINA MAQUINA =====
// Este arquivo contém todas as funções específicas para a página maquina.html
// Funções comuns como readOrderCode() estão em app.js

// ===== VARIÁVEIS GLOBAIS =====
let selectedProduct = null;
let selectedProducts = [];

// ===== FUNÇÕES DE NAVEGAÇÃO DE TELAS =====

// Função para mostrar tela de produção
function showProductionScreen() {
    // Esconde a tela de código de barras
    const barcodeContainer = document.getElementById('barcode-container');
    if (barcodeContainer) {
        barcodeContainer.style.display = 'none';
    }
    
    // Esconde o container pai da tela de código de barras
    const barcodeParent = document.querySelector('[style*="position: relative; height: calc(100vh - 60px)"]');
    if (barcodeParent) {
        barcodeParent.style.display = 'none';
    }
    
    // Mostra a tela principal de produção
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen) {
        mainScreen.style.display = 'block';
    }
    
    // Carrega os produtos se ainda não foram carregados
    if (typeof loadProducts === 'function') {
        loadProducts();
    }
    
    // Carrega a categoria padrão se a função existir
    if (typeof displayProductsByCategory === 'function') {
        displayProductsByCategory('PT');
    }
}

// Função para mostrar tela de código de barras
function showBarcodeScreen() {
    // Mostra a tela de código de barras
    const barcodeContainer = document.getElementById('barcode-container');
    if (barcodeContainer) {
        barcodeContainer.style.display = 'block';
    }
    
    // Mostra o container pai da tela de código de barras
    const barcodeParent = document.querySelector('[style*="position: relative; height: calc(100vh - 60px)"]');
    if (barcodeParent) {
        barcodeParent.style.display = 'block';
    }
    
    // Esconde a tela principal de produção
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen) {
        mainScreen.style.display = 'none';
    }
    
    // Limpa o campo de input
    const orderInput = document.getElementById('order-code-input');
    if (orderInput) {
        orderInput.value = '';
        orderInput.focus();
    }
}

// ===== FUNÇÕES DE INPUT E TECLADO =====

// Função para capturar Enter no campo de input
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        readOrderCode();
    }
}

// ===== FUNÇÕES DE CÂMERA =====

function openCamera() {
    console.log('Função de câmera ainda não implementada');
    // Placeholder para implementação futura da câmera
}

function closeCamera() {
    const cameraContainer = document.getElementById('camera-container');
    if (cameraContainer) {
        cameraContainer.style.display = 'none';
    }
}

function captureBarcode() {
    console.log('Função de captura ainda não implementada');
    // Placeholder para implementação futura da captura
}

// ===== FUNÇÕES DE MODAL DE PRODUTO =====

function openProductModal(product) {
    selectedProduct = product;
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-product-name');
    const modalIcon = document.getElementById('modal-product-icon');
    
    // Configura o modal com os dados do produto
    if (modalTitle) modalTitle.textContent = product.name || product.nome;
    if (modalIcon) modalIcon.textContent = product.icon || 'inventory';
    
    // Limpa os campos do formulário
    resetProductForm();
    
    // Mostra o modal
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function resetProductForm() {
    const fields = [
        'product-code', 'product-counter', 'product-supplier', 
        'product-gm2', 'product-production', 'product-losses'
    ];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    // Reset weight fields
    for (let i = 1; i <= 10; i++) {
        const weightField = document.getElementById(`product-weight-${i}`);
        if (weightField) weightField.value = '';
        
        const weightGroup = document.getElementById(`weight-group-${i}`);
        if (weightGroup) {
            weightGroup.style.display = i === 1 ? 'block' : 'none';
        }
    }
    
    // Reset total weight
    const totalField = document.getElementById('product-weight-total');
    if (totalField) {
        totalField.value = '';
        const weightTotalEl = document.getElementById('weight-total');
        if (weightTotalEl) weightTotalEl.style.display = 'none';
    }
}

function checkWeightInput(weightNumber) {
    const currentField = document.getElementById(`product-weight-${weightNumber}`);
    const nextGroup = document.getElementById(`weight-group-${weightNumber + 1}`);
    const totalGroup = document.getElementById('weight-total');
    
    if (currentField && currentField.value.trim() !== '') {
        // Mostra o próximo campo de peso se existir
        if (nextGroup && weightNumber < 10) {
            nextGroup.style.display = 'block';
        }
        
        // Calcula e mostra o peso total
        calculateTotalWeight();
        if (totalGroup) {
            totalGroup.style.display = 'block';
        }
    }
}

function calculateTotalWeight() {
    let total = 0;
    for (let i = 1; i <= 10; i++) {
        const weightField = document.getElementById(`product-weight-${i}`);
        if (weightField && weightField.value) {
            total += parseFloat(weightField.value) || 0;
        }
    }
    
    const totalField = document.getElementById('product-weight-total');
    if (totalField) {
        totalField.value = total.toFixed(2);
    }
    
    return total;
}

function saveProduct() {
    if (!selectedProduct) return;
    
    // Coleta dados do formulário
    const productData = {
        id: selectedProduct.id || Date.now(),
        name: selectedProduct.name || selectedProduct.nome,
        category: selectedProduct.category,
        code: document.getElementById('product-code').value,
        counter: document.getElementById('product-counter').value,
        supplier: document.getElementById('product-supplier').value,
        gm2: document.getElementById('product-gm2').value,
        production: document.getElementById('product-production').value,
        losses: document.getElementById('product-losses').value,
        totalWeight: calculateTotalWeight(),
        timestamp: new Date().toISOString(),
        orderCode: document.getElementById('order-code-display') ? document.getElementById('order-code-display').textContent : ''
    };
    
    // Validação básica
    if (!productData.code || !productData.counter) {
        alert('Por favor, preencha pelo menos o código do produto e o contador.');
        return;
    }
    
    // Adiciona à lista de produtos selecionados
    const existingIndex = selectedProducts.findIndex(p => p.id === productData.id);
    if (existingIndex >= 0) {
        selectedProducts[existingIndex] = productData;
    } else {
        selectedProducts.push(productData);
    }
    
    // Atualiza visual do card
    updateProductCardVisual(selectedProduct, true);
    
    // Fecha o modal
    closeProductModal();
    
    // Mostra notificação
    showNotification('Produto adicionado com sucesso!', 'success');
    
    console.log('Produto salvo:', productData);
}

function updateProductCardVisual(product, isSelected) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const cardName = card.querySelector('.product-name');
        if (cardName && cardName.textContent === product.name) {
            if (isSelected) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    });
}

function fillProductForm(product) {
    const fields = {
        'product-code': product.code,
        'product-counter': product.counter,
        'product-supplier': product.supplier,
        'product-gm2': product.gm2,
        'product-production': product.production,
        'product-losses': product.losses
    };
    
    Object.keys(fields).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && fields[fieldId]) {
            field.value = fields[fieldId];
        }
    });
}

// ===== FUNÇÕES DE MODAL DE CONFIRMAÇÃO =====

function showConfirmationModal() {
    if (selectedProducts.length === 0) {
        alert('Nenhum produto foi selecionado ainda.');
        return;
    }
    
    const modal = document.getElementById('confirmation-modal');
    const dataContainer = document.getElementById('confirmation-data');
    
    // Gera HTML com os dados dos produtos
    let html = '';
    selectedProducts.forEach((product, index) => {
        html += `
            <div class="confirmation-item" data-index="${index}">
                <div class="confirmation-header">
                    <strong>${product.name}</strong>
                    <span class="confirmation-category">(${product.category})</span>
                </div>
                <div class="confirmation-details">
                    <div class="confirmation-row">
                        <span class="confirmation-label">Código:</span>
                        <span class="confirmation-value">${product.code}</span>
                    </div>
                    <div class="confirmation-row">
                        <span class="confirmation-label">Contador:</span>
                        <span class="confirmation-value">${product.counter}</span>
                    </div>
                    <div class="confirmation-row">
                        <span class="confirmation-label">Peso Total:</span>
                        <span class="confirmation-value">${product.totalWeight} kg</span>
                    </div>
                    <div class="confirmation-row">
                        <span class="confirmation-label">Fornecedor:</span>
                        <span class="confirmation-value">${product.supplier || 'N/A'}</span>
                    </div>
                    <div class="confirmation-row">
                        <span class="confirmation-label">Produção Real:</span>
                        <span class="confirmation-value">${product.production || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (dataContainer) {
        dataContainer.innerHTML = html;
    }
    
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function finishOrder() {
    if (selectedProducts.length === 0) {
        alert('Nenhum produto foi selecionado.');
        return;
    }
    
    // Prepara dados para envio
    const orderCode = document.getElementById('order-code-display') ? 
        document.getElementById('order-code-display').textContent : '';
    
    const orderData = {
        orderCode: orderCode,
        products: selectedProducts,
        timestamp: new Date().toISOString(),
        terminal: 'maquina',
        status: 'completed'
    };
    
    // Envia dados para o servidor/app desktop
    sendOrderToDesktop(orderData);
    
    // Salva localmente
    saveOrderLocally(orderData);
    
    // Fecha modal de confirmação
    closeConfirmationModal();
    
    // Mostra sucesso e volta para tela inicial
    showNotification('Ordem concluída com sucesso!', 'success');
    
    // Limpa dados e volta para tela de código de barras
    setTimeout(() => {
        resetOrderData();
        showBarcodeScreen();
    }, 2000);
}

function deleteSelectedProduct() {
    const selectedItem = document.querySelector('.confirmation-item.selected');
    if (selectedItem) {
        const index = parseInt(selectedItem.dataset.index);
        const product = selectedProducts[index];
        
        // Remove da lista
        selectedProducts.splice(index, 1);
        
        // Atualiza visual
        updateProductCardVisual(product, false);
        
        // Atualiza modal de confirmação
        showConfirmationModal();
    } else {
        alert('Selecione um produto para deletar.');
    }
}

function editSelectedProduct() {
    const selectedItem = document.querySelector('.confirmation-item.selected');
    if (selectedItem) {
        const index = parseInt(selectedItem.dataset.index);
        const product = selectedProducts[index];
        
        // Abre modal de produto com dados preenchidos
        selectedProduct = product;
        openProductModal(product);
        
        // Preenche formulário com dados existentes
        fillProductForm(product);
        
        // Fecha modal de confirmação
        closeConfirmationModal();
    } else {
        alert('Selecione um produto para editar.');
    }
}

// ===== FUNÇÕES DE CONFIGURAÇÕES =====

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function openSettingsTab(tabName) {
    // Esconder todas as abas
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.style.display = 'none');
    
    // Remover classe active de todos os botões
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Mostrar aba selecionada
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Adicionar classe active ao botão
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

function openCategoryTab(category) {
    // Esconder todas as seções
    const sections = document.querySelectorAll('.category-section');
    sections.forEach(section => section.style.display = 'none');
    
    // Remover classe active de todos os botões
    const categoryButtons = document.querySelectorAll('.category-tab');
    categoryButtons.forEach(button => button.classList.remove('active'));
    
    // Mostrar seção selecionada
    const selectedSection = document.getElementById(category + '-section');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Adicionar classe active ao botão
    const selectedButton = document.querySelector(`[data-category="${category}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

function saveLinks() {
    const driveLink = document.getElementById('drive-link').value;
    const webappLink = document.getElementById('webapp-link').value;
    
    // Salvar no localStorage
    localStorage.setItem('drive-link', driveLink);
    localStorage.setItem('webapp-link', webappLink);
    
    console.log('Links salvos:', { driveLink, webappLink });
    alert('Links salvos com sucesso!');
}

function loadSettings() {
    // Carregar links salvos
    const driveLink = localStorage.getItem('drive-link') || '';
    const webappLink = localStorage.getItem('webapp-link') || '';
    const updateInterval = localStorage.getItem('update_interval') || '5000';
    
    const driveLinkInput = document.getElementById('drive-link');
    const webappLinkInput = document.getElementById('webapp-link');
    const updateIntervalInput = document.getElementById('update-interval');
    
    if (driveLinkInput) driveLinkInput.value = driveLink;
    if (webappLinkInput) webappLinkInput.value = webappLink;
    if (updateIntervalInput) updateIntervalInput.value = updateInterval;
}

function saveAdvancedSettings() {
    const updateInterval = document.getElementById('update-interval').value;
    
    // Validação do intervalo (mínimo 1s, máximo 60s)
    const intervalMs = parseInt(updateInterval) || 5000;
    const validInterval = Math.max(1000, Math.min(60000, intervalMs));
    
    localStorage.setItem('update_interval', validInterval.toString());
    
    console.log('⚙️ Configurações avançadas salvas:', { updateInterval: validInterval });
    showNotification(`Intervalo de atualização definido para ${validInterval/1000}s`, 'success');
    
    // Sugerir recarga da página para aplicar novo intervalo
    if (confirm('Para aplicar o novo intervalo de atualização, é recomendado recarregar a página. Recarregar agora?')) {
        window.location.reload();
    }
}

// ===== FUNÇÕES AUXILIARES =====

async function sendOrderToDesktop(orderData) {
    try {
        const response = await fetch(`/api/orders/${orderData.orderCode}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Ordem enviada para o desktop com sucesso:', result);
            showNotification('Ordem sincronizada com o desktop!', 'success');
        } else {
            const error = await response.json();
            console.error('Erro ao enviar ordem para o desktop:', error);
            showNotification('Erro ao sincronizar com o desktop', 'error');
        }
    } catch (error) {
        console.error('Erro de conexão ao enviar ordem:', error);
        showNotification('Erro de conexão - ordem salva localmente', 'warning');
    }
}

function saveOrderLocally(orderData) {
    try {
        let orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(orders));
        console.log('Ordem salva localmente');
    } catch (error) {
        console.error('Erro ao salvar ordem localmente:', error);
    }
}

function resetOrderData() {
    selectedProducts = [];
    selectedProduct = null;
    
    // Remove seleção visual dos cards
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => card.classList.remove('selected'));
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notification-message');
    
    if (notification && messageEl) {
        messageEl.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'flex';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// ===== VARIÁVEIS PARA CONTROLE DE UPDATES =====
let updateDebounceTimer = null;
let retryCount = 0;
let maxRetries = 3;
let baseRetryDelay = 5000; // 5 segundos base

// Função para atualizar status de conexão visual
function updateConnectionStatus(status, message = '') {
    const connectionStatus = document.getElementById('connection-status');
    const connectionText = document.getElementById('connection-text');
    
    if (connectionStatus && connectionText) {
        connectionStatus.className = `connection-status ${status}`;
        
        switch(status) {
            case 'online':
                connectionText.textContent = 'Online';
                break;
            case 'offline':
                connectionText.textContent = 'Offline';
                break;
            case 'syncing':
                connectionText.textContent = 'Sincronizando...';
                break;
            case 'error':
                connectionText.textContent = 'Erro de Conexão';
                break;
        }
    }
}

function checkForProductUpdates() {
    // Armazena o timestamp da última atualização
    const lastUpdate = localStorage.getItem('products_last_update') || 0;

    // Atualiza status para sincronizando
    updateConnectionStatus('syncing');

    // Faz uma requisição para verificar se há atualizações
    fetch('/server_info.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Reset retry count em caso de sucesso
            retryCount = 0;
            updateConnectionStatus('online');
            
            if (data.products_update && data.products_update > lastUpdate) {
                // Implementa debounce para evitar múltiplas atualizações simultâneas
                if (updateDebounceTimer) {
                    clearTimeout(updateDebounceTimer);
                }
                
                updateDebounceTimer = setTimeout(() => {
                    console.log('🔄 Atualizando produtos detectados...');
                    
                    // Se há uma atualização mais recente, recarrega os produtos
                    if (typeof loadProducts === 'function') {
                        loadProducts();
                    }
                    
                    // Atualiza a exibição se estiver na tela de produção e currentCategory estiver definida
                    if (typeof currentCategory !== 'undefined' && currentCategory && typeof displayProductsByCategory === 'function') {
                        displayProductsByCategory(currentCategory);
                    }
                    
                    // Atualiza o timestamp da última atualização
                    localStorage.setItem('products_last_update', data.products_update);
                    
                    console.log('✅ Produtos atualizados com sucesso');
                    showNotification('Produtos atualizados!', 'success');
                }, 1000); // Debounce de 1 segundo
            }
        })
        .catch(error => {
            retryCount++;
            console.warn(`⚠️ Erro ao verificar atualizações (tentativa ${retryCount}/${maxRetries}):`, error.message);
            
            updateConnectionStatus('error');
            
            // Implementa retry exponencial backoff
            if (retryCount < maxRetries) {
                const retryDelay = baseRetryDelay * Math.pow(2, retryCount - 1); // 5s, 10s, 20s
                console.log(`🔄 Tentando reconectar em ${retryDelay/1000} segundos...`);
                
                setTimeout(() => {
                    checkForProductUpdates();
                }, retryDelay);
            } else {
                console.error('❌ Máximo de tentativas excedido. Voltando ao ciclo normal.');
                updateConnectionStatus('offline');
                retryCount = 0; // Reset para próximo ciclo
            }
        });
}

// ===== INICIALIZAÇÃO =====

document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    const isGestao = path.includes('/manutencao');
    const isMaquina = path.includes('/maquina');

    // Verifica autenticação para a área de gestão
    if (isGestao) {
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
            window.location.href = '/login';
            return;
        }
    }

    // Configura o modo tela cheia
    function requestFullScreen() {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    // Tenta entrar em modo tela cheia quando o usuário interage com a página
    document.addEventListener('click', function() {
        requestFullScreen();
    }, { once: true });

    // Adiciona um botão para voltar à página inicial
    const header = document.querySelector('header');
    if (header) {
        const homeButton = document.createElement('i');
        homeButton.className = 'material-icons';
        homeButton.style.position = 'absolute';
        homeButton.style.left = '15px';
        homeButton.style.cursor = 'pointer';
        homeButton.textContent = 'home';
        homeButton.onclick = function() {
            window.location.href = '/tablet';
        };
        header.appendChild(homeButton);
    }

    if (isGestao) {
        // Interface de gestão
        const barcodeScreen = document.getElementById('barcode-screen');
        if (barcodeScreen && barcodeScreen.parentElement) {
            barcodeScreen.parentElement.style.display = 'none';
        }

        const headerTitle = document.getElementById('header-title');
        if (headerTitle) {
            headerTitle.textContent = 'TERMINAL GESTÃO';
        }

        // Adiciona botão de logout
        if (header) {
            const logoutButton = document.createElement('i');
            logoutButton.className = 'material-icons';
            logoutButton.style.position = 'absolute';
            logoutButton.style.right = '15px';
            logoutButton.style.cursor = 'pointer';
            logoutButton.textContent = 'logout';
            logoutButton.title = 'Sair';
            logoutButton.onclick = function() {
                localStorage.removeItem('auth_token');
                window.location.href = '/login';
            };
            header.appendChild(logoutButton);
        }

        const mainScreen = document.getElementById('main-screen');
        if (mainScreen) {
            mainScreen.style.display = 'none';
        }

        document.body.classList.add('gestao-mode');

        // Abre o modal de configurações automaticamente
        setTimeout(function() {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                settingsModal.style.display = 'flex';
                const closeButton = settingsModal.querySelector('.close');
                if (closeButton) {
                    closeButton.style.display = 'none';
                }
            }

            loadSettings();
            if (typeof loadProductsIntoSettings === 'function') {
                loadProductsIntoSettings();
            }
            openSettingsTab('products');
            openCategoryTab('pt');
        }, 100);
    } else if (isMaquina) {
        // Interface de máquina
        const headerTitle = document.getElementById('header-title');
        if (headerTitle) {
            headerTitle.textContent = 'TERMINAL MÁQUINA';
        }
    }

    // Configura a atualização automática dos produtos com intervalo configurável
    const updateInterval = localStorage.getItem('update_interval') || 5000; // Default 5s
    console.log(`🔄 Configurando auto-update para ${updateInterval/1000}s`);
    
    setInterval(function() {
        checkForProductUpdates();
    }, parseInt(updateInterval));
    
    // Executa verificação inicial imediatamente
    checkForProductUpdates();
});
