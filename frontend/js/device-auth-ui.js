/**
 * Gerenciador de autenticação de dispositivos para a interface do usuário
 * Controla a exibição de diferentes estados de autenticação na tela da máquina
 */

// Elementos da UI para os diferentes estados de autenticação
let authOverlay = null;
let authContent = null;
let deviceIdDisplay = null;
let authMessage = null;
let authIcon = null;
let authButton = null;
let deviceNameInput = null;
let deviceModelInput = null;
let registrationForm = null;
let autoRefreshStatus = null;

// Cores para os diferentes estados
const AUTH_COLORS = {
    checking: '#f39c12',        // Laranja
    awaiting_approval: '#3498db', // Azul
    access_denied: '#e74c3c',   // Vermelho
    authorized: '#2ecc71',      // Verde
    error: '#e74c3c',           // Vermelho
    no_device_id: '#3498db',    // Azul
    registration: '#3498db'     // Azul
};

// Ícones para os diferentes estados
const AUTH_ICONS = {
    checking: 'hourglass_empty',
    awaiting_approval: 'pending',
    access_denied: 'block',
    authorized: 'check_circle',
    error: 'error',
    no_device_id: 'devices',
    registration: 'app_registration'
};

// Mensagens para os diferentes estados
const AUTH_MESSAGES = {
    checking: 'Verificando autorização do dispositivo...',
    awaiting_approval: 'Dispositivo registrado! Aguardando aprovação do administrador. O sistema verificará automaticamente quando for autorizado.',
    access_denied: 'Acesso negado. Este dispositivo não está autorizado. O sistema verificará automaticamente quando for autorizado.',
    authorized: 'Dispositivo autorizado! Carregando...',
    error: 'Erro ao verificar autorização. O sistema continuará tentando automaticamente.',
    no_device_id: 'Novo dispositivo detectado. Registrando...',
    registration: 'Preencha as informações abaixo para registrar este dispositivo.'
};

/**
 * Detecta o modelo do dispositivo a partir do User-Agent
 * @returns {string} - Modelo do dispositivo detectado
 */
function detectDeviceModel() {
    const ua = navigator.userAgent;
    let deviceModel = '';

    // Detecta se é um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    if (isMobile) {
        // Tenta detectar dispositivos específicos
        if (ua.match(/iPad/i)) {
            deviceModel = 'iPad';

            // Tenta obter a versão do iPad
            const iPadVersion = ua.match(/iPad; CPU OS ([\d_]+)/i);
            if (iPadVersion && iPadVersion[1]) {
                deviceModel += ` (iOS ${iPadVersion[1].replace(/_/g, '.')})`;
            }
        } else if (ua.match(/iPhone/i)) {
            deviceModel = 'iPhone';

            // Tenta obter a versão do iPhone
            const iPhoneVersion = ua.match(/iPhone OS ([\d_]+)/i);
            if (iPhoneVersion && iPhoneVersion[1]) {
                deviceModel += ` (iOS ${iPhoneVersion[1].replace(/_/g, '.')})`;
            }
        } else if (ua.match(/Android/i)) {
            // Para dispositivos Android, tenta obter a marca e modelo
            deviceModel = 'Android';

            // Tenta obter a versão do Android
            const androidVersion = ua.match(/Android ([\d\.]+)/i);
            if (androidVersion && androidVersion[1]) {
                deviceModel += ` ${androidVersion[1]}`;
            }

            // Tenta obter o modelo específico
            const model = ua.match(/; ([^;)]+) Build\//i) || ua.match(/; ([^;)]+)\)/i);
            if (model && model[1]) {
                deviceModel += ` - ${model[1].trim()}`;
            }
        } else if (ua.match(/Windows Phone/i)) {
            deviceModel = 'Windows Phone';
        } else {
            deviceModel = 'Dispositivo Móvel';
        }
    } else {
        // Para desktops, detecta o sistema operacional
        if (ua.match(/Windows/i)) {
            deviceModel = 'Windows';

            // Tenta obter a versão do Windows
            const winVersion = ua.match(/Windows NT ([\d\.]+)/i);
            if (winVersion && winVersion[1]) {
                const versionMap = {
                    '10.0': '10',
                    '6.3': '8.1',
                    '6.2': '8',
                    '6.1': '7',
                    '6.0': 'Vista',
                    '5.2': 'XP x64',
                    '5.1': 'XP'
                };
                deviceModel += ` ${versionMap[winVersion[1]] || winVersion[1]}`;
            }
        } else if (ua.match(/Macintosh/i)) {
            deviceModel = 'Mac';

            // Tenta obter a versão do macOS
            const macVersion = ua.match(/Mac OS X ([\d_\.]+)/i);
            if (macVersion && macVersion[1]) {
                deviceModel += ` (macOS ${macVersion[1].replace(/_/g, '.')})`;
            }
        } else if (ua.match(/Linux/i)) {
            deviceModel = 'Linux';
        } else {
            deviceModel = 'Desktop';
        }
    }

    // Adiciona informações do navegador
    if (ua.match(/Chrome/i) && !ua.match(/Edg/i) && !ua.match(/OPR/i)) {
        deviceModel += ' - Chrome';
    } else if (ua.match(/Firefox/i)) {
        deviceModel += ' - Firefox';
    } else if (ua.match(/Safari/i) && !ua.match(/Chrome/i)) {
        deviceModel += ' - Safari';
    } else if (ua.match(/Edg/i)) {
        deviceModel += ' - Edge';
    } else if (ua.match(/OPR/i)) {
        deviceModel += ' - Opera';
    }

    return deviceModel;
}

/**
 * Gera um ID único para o dispositivo
 * @returns {string} - ID único do dispositivo
 */
function generateDeviceId() {
    // Combinação de timestamp, random e informações do navegador para criar um ID único
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    const userAgent = navigator.userAgent.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
    }, 0).toString(36);

    return `${timestamp}-${randomStr}-${userAgent}`;
}

/**
 * Obtém o ID do dispositivo ou gera um novo se não existir
 * @returns {string} - ID do dispositivo
 */
function getOrCreateDeviceId() {
    // Verifica se já temos um ID armazenado
    let deviceId = localStorage.getItem('device_id');

    // Se não temos um ID, gera um novo
    if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem('device_id', deviceId);
        console.log('Novo ID de dispositivo gerado:', deviceId);
    } else {
        console.log('ID de dispositivo existente:', deviceId);
    }

    return deviceId;
}

/**
 * Inicializa o gerenciador de autenticação
 */
function initDeviceAuth() {
    // Verifica se as informações de autenticação estão disponíveis
    if (!window.deviceAuthInfo) {
        console.error('Informações de autenticação não disponíveis');
        return;
    }

    // Se não temos um ID de dispositivo, obtém ou cria um
    if (!window.deviceAuthInfo.deviceId) {
        const deviceId = getOrCreateDeviceId();
        window.deviceAuthInfo.deviceId = deviceId;

        // Verifica se o dispositivo já tem nome e modelo registrados
        const deviceName = localStorage.getItem('device_name');
        const deviceModel = localStorage.getItem('device_model');

        if (!deviceName || !deviceModel) {
            // Se não tem nome ou modelo, mostra o formulário de registro
            window.deviceAuthInfo.status = 'registration';

            // Detecta automaticamente o modelo do dispositivo
            window.deviceAuthInfo.detectedModel = detectDeviceModel();
        } else {
            // Se já tem nome e modelo, verifica a autenticação
            window.deviceAuthInfo.status = 'checking';
            window.deviceAuthInfo.deviceName = deviceName;
            window.deviceAuthInfo.deviceModel = deviceModel;

            // Verifica a autenticação imediatamente com o ID existente
            setTimeout(() => {
                checkAuthStatus();
            }, 500);
        }
    }

    // Cria os elementos da UI se ainda não existirem
    createAuthUI();

    // Atualiza a UI com base no status de autenticação
    updateAuthUI(window.deviceAuthInfo.status);

    // Inicia a verificação automática em todos os casos
    startAuthCheck();
}

/**
 * Cria os elementos da UI para a autenticação
 */
function createAuthUI() {
    // Verifica se os elementos já existem
    if (authOverlay) return;

    // Cria a sobreposição
    authOverlay = document.createElement('div');
    authOverlay.className = 'auth-overlay';
    authOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Roboto', Arial, sans-serif;
    `;

    // Cria o conteúdo
    authContent = document.createElement('div');
    authContent.className = 'auth-content';
    authContent.style.cssText = `
        background-color: white;
        border-radius: 16px;
        padding: 30px;
        width: 90%;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-height: 90vh;
        overflow-y: auto;
    `;

    // Cria o ícone
    authIcon = document.createElement('i');
    authIcon.className = 'material-icons auth-icon';
    authIcon.style.cssText = `
        font-size: 64px;
        margin-bottom: 20px;
    `;

    // Cria o título
    const authTitle = document.createElement('h2');
    authTitle.textContent = 'Verificação de Dispositivo';
    authTitle.style.cssText = `
        font-size: 24px;
        margin: 0 0 10px 0;
        color: #2c3e50;
    `;

    // Cria a exibição do ID do dispositivo
    const deviceIdContainer = document.createElement('div');
    deviceIdContainer.style.cssText = `
        margin: 20px 0;
    `;

    const deviceIdLabel = document.createElement('p');
    deviceIdLabel.textContent = 'ID deste dispositivo:';
    deviceIdLabel.style.cssText = `
        margin: 0 0 5px 0;
        color: #7f8c8d;
    `;

    deviceIdDisplay = document.createElement('div');
    deviceIdDisplay.className = 'device-id';
    deviceIdDisplay.style.cssText = `
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        font-family: monospace;
        font-size: 18px;
        color: #2c3e50;
        word-break: break-all;
        border: 1px dashed #ddd;
    `;

    // Cria o formulário de registro
    registrationForm = document.createElement('div');
    registrationForm.className = 'registration-form';
    registrationForm.style.cssText = `
        margin: 20px 0;
        display: none;
    `;

    // Campo para nome do dispositivo
    const nameGroup = document.createElement('div');
    nameGroup.style.cssText = `
        margin-bottom: 15px;
        text-align: left;
    `;

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Nome (usuário ou identificação):';
    nameLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #2c3e50;
        font-weight: 500;
    `;

    deviceNameInput = document.createElement('input');
    deviceNameInput.type = 'text';
    deviceNameInput.placeholder = 'Ex: Tablet da Produção, João Silva, etc.';
    deviceNameInput.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        box-sizing: border-box;
    `;

    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(deviceNameInput);

    // Campo para modelo do dispositivo
    const modelGroup = document.createElement('div');
    modelGroup.style.cssText = `
        margin-bottom: 15px;
        text-align: left;
    `;

    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'Modelo do aparelho:';
    modelLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #2c3e50;
        font-weight: 500;
    `;

    deviceModelInput = document.createElement('input');
    deviceModelInput.type = 'text';
    deviceModelInput.placeholder = 'Ex: Samsung Galaxy Tab, iPad, etc.';
    deviceModelInput.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        box-sizing: border-box;
    `;

    // Preenche automaticamente o modelo do dispositivo se disponível
    if (window.deviceAuthInfo && window.deviceAuthInfo.detectedModel) {
        deviceModelInput.value = window.deviceAuthInfo.detectedModel;
    }

    modelGroup.appendChild(modelLabel);
    modelGroup.appendChild(deviceModelInput);

    // Botão de registro
    const registerButton = document.createElement('button');
    registerButton.textContent = 'Registrar Dispositivo';
    registerButton.style.cssText = `
        background: linear-gradient(90deg, #3498db, #2980b9);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 15px 25px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-block;
        margin-top: 15px;
        width: 100%;
    `;
    registerButton.addEventListener('click', registerDevice);

    // Adiciona os campos ao formulário
    registrationForm.appendChild(nameGroup);
    registrationForm.appendChild(modelGroup);
    registrationForm.appendChild(registerButton);

    // Cria a mensagem de autenticação
    authMessage = document.createElement('div');
    authMessage.className = 'auth-message';
    authMessage.style.cssText = `
        margin: 20px 0;
        padding: 15px;
        border-radius: 8px;
        font-weight: 500;
    `;

    // Criamos um elemento para mostrar o status da verificação automática
    autoRefreshStatus = document.createElement('div');
    autoRefreshStatus.style.cssText = `
        margin-top: 15px;
        padding: 10px;
        background-color: rgba(52, 152, 219, 0.1);
        border-radius: 8px;
        border-left: 4px solid #3498db;
        font-size: 14px;
        color: #3498db;
        text-align: left;
    `;
    autoRefreshStatus.innerHTML = '<i class="material-icons" style="vertical-align: middle; margin-right: 8px; font-size: 16px;">autorenew</i> Verificando autorização automaticamente a cada 5 segundos...';

    // Cria um elemento de status para mostrar que está verificando automaticamente
    const statusElement = document.createElement('div');
    statusElement.className = 'auth-status';
    statusElement.style.cssText = `
        margin-top: 20px;
        font-size: 14px;
        color: #7f8c8d;
        font-style: italic;
    `;
    statusElement.textContent = 'Verificando automaticamente...';

    // Monta a estrutura
    deviceIdContainer.appendChild(deviceIdLabel);
    deviceIdContainer.appendChild(deviceIdDisplay);

    authContent.appendChild(authIcon);
    authContent.appendChild(authTitle);
    authContent.appendChild(deviceIdContainer);
    authContent.appendChild(registrationForm);
    authContent.appendChild(authMessage);
    authContent.appendChild(autoRefreshStatus);

    // Adiciona o elemento de status
    authContent.appendChild(statusElement);

    authOverlay.appendChild(authContent);

    // Adiciona ao corpo do documento
    document.body.appendChild(authOverlay);
}

/**
 * Atualiza a UI com base no status de autenticação
 * @param {string} status - Status de autenticação
 */
function updateAuthUI(status) {
    if (!authOverlay) return;

    // Atualiza o ID do dispositivo
    deviceIdDisplay.textContent = window.deviceAuthInfo.deviceId || 'Gerando ID...';

    // Atualiza o ícone
    authIcon.textContent = AUTH_ICONS[status] || 'help';
    authIcon.style.color = AUTH_COLORS[status] || '#95a5a6';

    // Atualiza a mensagem
    authMessage.textContent = window.deviceAuthInfo.message || AUTH_MESSAGES[status] || 'Status desconhecido';
    authMessage.style.backgroundColor = `${AUTH_COLORS[status]}20`; // Cor com 20% de opacidade
    authMessage.style.borderColor = `${AUTH_COLORS[status]}40`;     // Cor com 40% de opacidade
    authMessage.style.color = AUTH_COLORS[status] || '#95a5a6';

    // Mostra ou esconde o formulário de registro
    if (status === 'registration') {
        registrationForm.style.display = 'block';
        authMessage.style.display = 'block';
        // Esconde o status de verificação automática durante o registro
        autoRefreshStatus.style.display = 'none';
    } else {
        registrationForm.style.display = 'none';
        authMessage.style.display = 'block';

        // Mostra o status de verificação automática para estados que precisam de verificação
        if (status === 'awaiting_approval' || status === 'access_denied') {
            autoRefreshStatus.style.display = 'block';
            // Atualiza a mensagem para indicar que está verificando automaticamente
            if (status === 'awaiting_approval') {
                autoRefreshStatus.innerHTML = '<i class="material-icons" style="vertical-align: middle; margin-right: 8px; font-size: 16px;">autorenew</i> Verificando autorização automaticamente a cada 5 segundos. Aguarde a aprovação do administrador...';
            } else {
                autoRefreshStatus.innerHTML = '<i class="material-icons" style="vertical-align: middle; margin-right: 8px; font-size: 16px;">autorenew</i> Verificando autorização automaticamente a cada 5 segundos. Se já foi autorizado, aguarde alguns instantes...';
            }
        } else {
            autoRefreshStatus.style.display = 'none';
        }
    }
    
    // Se o status for autorizado, remove imediatamente a sobreposição
    if (status === 'authorized') {
        hideAuthOverlay();
    }
}

/**
 * Registra o dispositivo com as informações fornecidas
 */
async function registerDevice() {
    // Obtém os valores dos campos
    const deviceName = deviceNameInput.value.trim();
    const deviceModel = deviceModelInput.value.trim();

    // Valida os campos
    if (!deviceName) {
        alert('Por favor, informe um nome para o dispositivo.');
        deviceNameInput.focus();
        return;
    }

    if (!deviceModel) {
        alert('Por favor, informe o modelo do aparelho.');
        deviceModelInput.focus();
        return;
    }

    // Atualiza o status para checking
    window.deviceAuthInfo.status = 'checking';
    window.deviceAuthInfo.deviceName = deviceName;
    window.deviceAuthInfo.deviceModel = deviceModel;
    updateAuthUI('checking');

    // Salva as informações no localStorage
    localStorage.setItem('device_name', deviceName);
    localStorage.setItem('device_model', deviceModel);

    try {
        // Faz a requisição para registrar o dispositivo
        const deviceId = window.deviceAuthInfo.deviceId;
        const response = await fetch('/api/auth/register-device', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId,
                deviceName,
                deviceModel
            })
        });

        if (response.ok) {
            const result = await response.json();

            // Atualiza as informações de autenticação
            window.deviceAuthInfo = {
                ...window.deviceAuthInfo,
                ...result,
                status: result.authorized ? 'authorized' : 'awaiting_approval'
            };

            // Atualiza a UI
            updateAuthUI(window.deviceAuthInfo.status);

            // Se o dispositivo estiver autorizado, remove a sobreposição após um breve delay
            if (window.deviceAuthInfo.authorized) {
                setTimeout(() => {
                    hideAuthOverlay();
                    // Não recarrega a página, apenas esconde o overlay
                }, 1500);
            }
        } else {
            // Erro na requisição
            const error = await response.json();
            window.deviceAuthInfo.status = 'error';
            window.deviceAuthInfo.message = error.message || 'Erro ao registrar dispositivo.';
            updateAuthUI('error');
        }
    } catch (error) {
        console.error('Erro ao registrar dispositivo:', error);
        window.deviceAuthInfo.status = 'error';
        window.deviceAuthInfo.message = 'Erro ao registrar dispositivo. Tente novamente mais tarde.';
        updateAuthUI('error');
    }
}

/**
 * Esconde a sobreposição de autenticação
 */
function hideAuthOverlay() {
    if (authOverlay) {
        authOverlay.style.transition = 'opacity 0.5s ease';
        authOverlay.style.opacity = '0';

        setTimeout(() => {
            if (authOverlay && authOverlay.parentNode) {
                authOverlay.parentNode.removeChild(authOverlay);
                authOverlay = null;
            }
        }, 500);
    }
}

/**
 * Inicia a verificação periódica do status de autenticação
 */
function startAuthCheck() {
    // Verifica imediatamente
    checkAuthStatus(true);

    // Contador para controlar quando verificar
    let checkCount = 0;

    // Verifica a cada 1 segundo
    setInterval(() => {
        checkCount++;

        // Verifica a cada 2 segundos para dispositivos em estado de espera
        // e a cada 5 segundos para dispositivos já autorizados
        const shouldCheck = window.deviceAuthInfo &&
                          (window.deviceAuthInfo.status === 'awaiting_approval' ||
                           window.deviceAuthInfo.status === 'access_denied') ?
                          (checkCount % 2 === 0) : (checkCount % 5 === 0);

        if (shouldCheck) {
            // Sempre força a atualização para dispositivos em estado de espera
            const forceUpdate = window.deviceAuthInfo &&
                              (window.deviceAuthInfo.status === 'awaiting_approval' ||
                               window.deviceAuthInfo.status === 'access_denied');

            // Chama a função de verificação
            checkAuthStatus(forceUpdate);
        }
    }, 1000);
}

/**
 * Verifica o status de autenticação do dispositivo
 * @param {boolean} forceUpdate - Se deve forçar a atualização do cache
 */
async function checkAuthStatus(forceUpdate = false) {
    try {
        // Não mostra "checking" a cada verificação para não piscar a interface
        // Só mostra se for uma verificação forçada ou se não temos status ainda
        if (forceUpdate || !window.deviceAuthInfo || !window.deviceAuthInfo.status) {
            updateAuthUI('checking');
        }

        // Obtém o ID do dispositivo
        const deviceId = window.deviceAuthInfo.deviceId || localStorage.getItem('device_id');

        if (!deviceId) {
            updateAuthUI('no_device_id');
            return;
        }

        // SEMPRE limpa o cache local para garantir que estamos obtendo dados atualizados
        localStorage.removeItem('device_auth_cache');
        localStorage.removeItem('device_auth_cache_time');

        // SEMPRE limpa o cache do servidor para garantir que estamos obtendo dados atualizados
        try {
            await fetch('/api/auth/clear-cache');
            console.log('Cache do servidor limpo para verificação');
        } catch (error) {
            console.error('Erro ao limpar cache do servidor:', error);
        }

        // Faz a requisição para verificar a autenticação
        // SEMPRE usa force=true para garantir que estamos obtendo dados atualizados do Google Sheets
        const response = await fetch(`/api/auth/device?id=${encodeURIComponent(deviceId)}&force=true`);

        if (response.ok) {
            const authResult = await response.json();

            // Atualiza as informações de autenticação
            window.deviceAuthInfo = {
                ...window.deviceAuthInfo,
                ...authResult,
                status: authResult.authorized ? 'authorized' :
                       authResult.newDevice && !authResult.deviceExists ? 'registration' :
                       authResult.newDevice ? 'awaiting_approval' : 'access_denied'
            };

            // Atualiza a UI
            updateAuthUI(window.deviceAuthInfo.status);

            // Se o dispositivo estiver autorizado, remove a sobreposição após um breve delay
            if (window.deviceAuthInfo.authorized) {
                setTimeout(() => {
                    hideAuthOverlay();
                    // Não recarrega a página, apenas esconde o overlay
                }, 1500);
            }
        } else {
            // Erro na requisição
            updateAuthUI('error');
        }
    } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
        updateAuthUI('error');
    }
}

// Inicializa quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', initDeviceAuth);
