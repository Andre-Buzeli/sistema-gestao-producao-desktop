/**
 * Sistema de autenticação de dispositivos
 * Gerencia IDs únicos para cada tablet e verifica autorização
 */

// Chave para armazenar o ID do dispositivo no localStorage
const DEVICE_ID_KEY = 'device_id';

// Função para gerar um ID único para o dispositivo
function generateDeviceId() {
    // Combina informações do navegador com timestamp para criar um ID único
    const browserInfo = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        window.screen.width,
        window.screen.height,
        new Date().getTimezoneOffset()
    ].join('|');
    
    // Cria um hash simples do browserInfo
    let hash = 0;
    for (let i = 0; i < browserInfo.length; i++) {
        const char = browserInfo.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Converte para um inteiro de 32 bits
    }
    
    // Combina o hash com um timestamp para garantir unicidade
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    
    // Formata o ID para ser legível e fácil de compartilhar
    return `TAB-${Math.abs(hash).toString(36).substring(0, 4)}-${timestamp.substring(timestamp.length - 4)}-${randomPart}`.toUpperCase();
}

// Função para obter o ID do dispositivo (gera um novo se não existir)
function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
}

// Função para verificar se o dispositivo está autorizado
async function checkDeviceAuthorization() {
    const deviceId = getDeviceId();
    
    try {
        // Verifica se o dispositivo está autorizado no servidor
        const response = await fetch(`/api/auth/device?id=${encodeURIComponent(deviceId)}`);
        
        if (response.ok) {
            const data = await response.json();
            return {
                authorized: data.authorized,
                deviceId: deviceId,
                message: data.message || ''
            };
        }
        
        return {
            authorized: false,
            deviceId: deviceId,
            message: 'Erro ao verificar autorização'
        };
    } catch (error) {
        console.error('Erro ao verificar autorização do dispositivo:', error);
        
        // Fallback: verifica no localStorage se já foi autorizado anteriormente
        const cachedAuth = localStorage.getItem('device_auth_cache');
        if (cachedAuth) {
            try {
                return JSON.parse(cachedAuth);
            } catch (e) {
                // Ignora erro de parsing
            }
        }
        
        return {
            authorized: false,
            deviceId: deviceId,
            message: 'Erro de conexão. Tente novamente mais tarde.'
        };
    }
}

// Função para salvar o status de autorização no cache local
function saveAuthorizationCache(authData) {
    localStorage.setItem('device_auth_cache', JSON.stringify(authData));
    localStorage.setItem('device_auth_cache_time', Date.now().toString());
}

// Função para limpar o cache de autorização
function clearAuthorizationCache() {
    localStorage.removeItem('device_auth_cache');
    localStorage.removeItem('device_auth_cache_time');
}

// Exporta as funções
window.deviceAuth = {
    getDeviceId,
    checkDeviceAuthorization,
    saveAuthorizationCache,
    clearAuthorizationCache
};
