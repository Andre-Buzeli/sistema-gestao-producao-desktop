// Configuração e variáveis globais
let serverStatus = 'stopped';
let tunnelUrl = null;

// Inicialização quando DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicação carregada');
    
    // Verificar se temos acesso ao Electron API
    if (window.electronAPI) {
        console.log('✅ Electron API disponível');
        setupElectronListeners();
    } else {
        console.log('⚠️ Electron API não disponível, usando modo fallback');
        initializeFallbackMode();
    }
    
    initializeUI();
});

// Configurar listeners do Electron
function setupElectronListeners() {
    // Listener para quando servidor estiver pronto
    window.electronAPI.on('server:ready', (event, data) => {
        console.log('✅ Servidor pronto:', data);
        serverStatus = 'running';
        updateServerStatus();
        showNotification('Servidor local iniciado com sucesso!', 'success');
    });

    // Listener para quando tunnel estiver pronto
    window.electronAPI.on('server:tunnel-ready', (event, data) => {
        const { url, type } = data;
        const externalAccessElement = document.getElementById('external-access');
        if (externalAccessElement) {
            externalAccessElement.innerHTML = `
                <div class="tunnel-info">
                    <a href="${url}" target="_blank" class="tunnel-url">${url}</a>
                    <div class="tunnel-type">via LocalTunnel</div>
                    <div class="tunnel-status online">🟢 Online</div>
                </div>
            `;
            
            // Adicionar click para copiar
            const urlElement = externalAccessElement.querySelector('.tunnel-url');
            if (urlElement) {
                urlElement.addEventListener('click', function(e) {
                    e.preventDefault();
                    navigator.clipboard.writeText(url).then(() => {
                        showNotification('URL copiada para área de transferência!', 'success');
                    });
                });
            }
        }
        tunnelUrl = url;
        showNotification('Acesso externo disponível!', 'success');
    });

    // Listener para tentativas de tunnel
    window.electronAPI.on('server:tunnel-attempting', (event, data) => {
        const { service } = data;
        const externalAccessElement = document.getElementById('external-access');
        if (externalAccessElement) {
            externalAccessElement.innerHTML = `
                <div class="tunnel-attempting">
                    <div class="spinner">⟳</div>
                    <div class="attempt-text">Conectando ${service}...</div>
                </div>
            `;
        }
    });

    // Listener para erros de tunnel
    window.electronAPI.on('server:tunnel-error', (event, data) => {
        const { error, details } = data;
        const externalAccessElement = document.getElementById('external-access');
        if (externalAccessElement) {
            externalAccessElement.innerHTML = `
                <div class="tunnel-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <div class="error-title">${error}</div>
                        <div class="error-details">${details}</div>
                    </div>
                    <button onclick="retryTunnel()" class="retry-btn">🔄 Tentar Novamente</button>
                </div>
            `;
        }
        showNotification('Erro no acesso externo: ' + error, 'warning');
    });

    // Listener para erros do servidor
    window.electronAPI.on('server:error', (event, data) => {
        console.error('❌ Erro do servidor:', data);
        serverStatus = 'error';
        updateServerStatus();
        showNotification('Erro no servidor: ' + data.error, 'error');
    });
}

// Função para retry manual
function retryTunnel() {
    if (window.electronAPI) {
        window.electronAPI.send('retry-tunnel');
        const externalAccessElement = document.getElementById('external-access');
        if (externalAccessElement) {
            externalAccessElement.innerHTML = `
                <div class="tunnel-attempting">
                    <div class="spinner">⟳</div>
                    <div class="attempt-text">Reconectando...</div>
                </div>
            `;
        }
    }
}

// Inicializar interface
function initializeUI() {
    updateServerStatus();
    loadDashboardData();
}

// Atualizar status do servidor na interface
function updateServerStatus() {
    const statusElement = document.getElementById('server-status');
    const localAccessElement = document.getElementById('local-access');
    
    if (statusElement) {
        switch (serverStatus) {
            case 'running':
                statusElement.innerHTML = '🟢 Servidor Ativo';
                statusElement.className = 'status-indicator online';
                break;
            case 'error':
                statusElement.innerHTML = '🔴 Servidor com Erro';
                statusElement.className = 'status-indicator error';
                break;
            default:
                statusElement.innerHTML = '🟡 Iniciando...';
                statusElement.className = 'status-indicator starting';
                break;
        }
    }
    
    if (localAccessElement) {
        // Obter informações dinâmicas do servidor
        if (window.electronAPI) {
            window.electronAPI.invoke('server:status').then(status => {
                if (status.running) {
                    const localUrl = `http://${status.localIP}:${status.port}`;
                    localAccessElement.innerHTML = `
                        <span class="label">Acesso Local:</span>
                        <span class="value">${localUrl}</span>
                    `;
                }
            });
        } else {
            localAccessElement.innerHTML = `
                <span class="label">Acesso Local:</span>
                <span class="value">Detectando...</span>
            `;
        }
    }
}

// Carregar dados do dashboard
function loadDashboardData() {
    // Simular dados enquanto não conecta com backend
    const dashboardStats = {
        totalProducts: 0,
        pendingOrders: 0,
        productionStatus: 'Parado',
        lastUpdate: new Date().toLocaleString('pt-BR')
    };
    
    updateDashboard(dashboardStats);
}

// Atualizar dashboard
function updateDashboard(stats) {
    const elements = {
        totalProducts: document.getElementById('total-products'),
        pendingOrders: document.getElementById('pending-orders'),
        productionStatus: document.getElementById('production-status'),
        lastUpdate: document.getElementById('last-update')
    };
    
    if (elements.totalProducts) elements.totalProducts.textContent = stats.totalProducts;
    if (elements.pendingOrders) elements.pendingOrders.textContent = stats.pendingOrders;
    if (elements.productionStatus) elements.productionStatus.textContent = stats.productionStatus;
    if (elements.lastUpdate) elements.lastUpdate.textContent = stats.lastUpdate;
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Adicionar ícone baseado no tipo
    const icon = getNotificationIcon(type);
    notification.innerHTML = `${icon} ${message}`;
    
    document.body.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Modo fallback sem Electron
function initializeFallbackMode() {
    console.log('🔄 Iniciando modo fallback...');
    
    // Simular inicialização bem-sucedida
    setTimeout(() => {
        serverStatus = 'running';
        updateServerStatus();
        showNotification('Aplicação iniciada em modo demonstração', 'info');
    }, 2000);
}

// Funções utilitárias
function formatDateTime(date) {
    return new Date(date).toLocaleString('pt-BR');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ====================
// FUNÇÕES DO TERMINAL DE PRODUÇÃO 
// ====================

// Função para ler código da ordem de produção
function readOrderCode() {
    const orderInput = document.getElementById('order-code-input');
    if (!orderInput) {
        console.error('Elemento order-code-input não encontrado');
        return;
    }
    
    const orderCode = orderInput.value.trim();
    if (!orderCode) {
        showNotification('Por favor, digite ou escaneie um código de ordem', 'warning');
        return;
    }
    
    console.log('📦 Processando ordem:', orderCode);
    
    // Atualizar display da ordem
    const orderDisplay = document.getElementById('order-code-display');
    if (orderDisplay) {
        orderDisplay.textContent = orderCode;
    }
    
    // Esconder tela de entrada e mostrar tela principal
    const barcodeContainer = document.getElementById('barcode-container');
    const mainScreen = document.getElementById('main-screen');
    
    if (barcodeContainer) barcodeContainer.style.display = 'none';
    if (mainScreen) mainScreen.style.display = 'block';
    
    showNotification(`Ordem ${orderCode} carregada com sucesso!`, 'success');
}

// Função para handle de teclas
function handleKeyPress(event) {
    // Se pressionar Enter, executa readOrderCode
    if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        readOrderCode();
    }
}

// Função para abrir câmera (placeholder)
function openCamera() {
    console.log('📸 Tentando abrir câmera...');
    showNotification('Funcionalidade de câmera em desenvolvimento', 'info');
}

// Função para fechar câmera
function closeCamera() {
    const cameraContainer = document.getElementById('camera-container');
    if (cameraContainer) {
        cameraContainer.style.display = 'none';
    }
}

// Função para capturar código de barras
function captureBarcode() {
    console.log('📊 Capturando código de barras...');
    showNotification('Funcionalidade de código de barras em desenvolvimento', 'info');
} 