/**
 * Módulo de integração com Google Sheets para o Backend
 * Este arquivo contém as funções necessárias para o servidor backend
 */

// Cache para dados de autenticação
let authCache = {
    data: null,
    timestamp: null
};

// Tempo de validade do cache (5 minutos)
const CACHE_VALIDITY = 5 * 60 * 1000;

/**
 * Limpa o cache de autenticação
 */
function clearAuthCache() {
    authCache.data = null;
    authCache.timestamp = null;
    console.log('🧹 Cache de autenticação limpo no backend');
}

/**
 * Verifica se o serviço está configurado
 */
function isConfigured() {
    // Por enquanto retorna true, pode ser expandido futuramente
    return true;
}

/**
 * Obtém dados de autenticação (placeholder)
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Promise<Array>} Lista de dispositivos autorizados
 */
async function getAuthenticationData(forceRefresh = false) {
    try {
        // Verifica se o cache é válido
        const now = Date.now();
        if (!forceRefresh && authCache.data && authCache.timestamp && 
            (now - authCache.timestamp) < CACHE_VALIDITY) {
            console.log('📋 Retornando dados de autenticação do cache');
            return authCache.data;
        }

        // Dados padrão de dispositivos autorizados (pode ser expandido futuramente)
        const defaultDevices = [
            {
                deviceId: 'TAB-JJHN-AQ4G-MEHWWD',
                authorized: true,
                deviceName: 'Tablet Produção 1',
                lastAccess: new Date().toISOString()
            }
        ];

        // Atualiza o cache
        authCache.data = defaultDevices;
        authCache.timestamp = now;

        console.log('🔐 Dados de autenticação atualizados no backend');
        return defaultDevices;

    } catch (error) {
        console.error('❌ Erro ao obter dados de autenticação:', error);
        return [];
    }
}

/**
 * Verifica se um dispositivo está autorizado
 * @param {string} deviceId - ID do dispositivo
 * @returns {Promise<Object>} Resultado da verificação
 */
async function checkDeviceAuthorization(deviceId) {
    try {
        const devices = await getAuthenticationData();
        const device = devices.find(d => d.deviceId === deviceId);
        
        if (device?.authorized) {
            return {
                authorized: true,
                deviceId: deviceId,
                message: 'Dispositivo autorizado',
                device: device
            };
        } else {
            return {
                authorized: false,
                deviceId: deviceId,
                message: 'Dispositivo não autorizado ou não encontrado'
            };
        }
    } catch (error) {
        console.error('❌ Erro ao verificar autorização:', error);
        return {
            authorized: false,
            deviceId: deviceId,
            message: 'Erro ao verificar autorização: ' + error.message
        };
    }
}

/**
 * Atualiza status de autorização de um dispositivo (placeholder)
 * @param {string} deviceId - ID do dispositivo
 * @param {boolean} authorized - Status de autorização
 * @returns {Promise<Object>} Resultado da atualização
 */
async function updateDeviceAuthorization(deviceId, authorized) {
    try {
        console.log(`🔄 Atualizando autorização do dispositivo ${deviceId}: ${authorized}`);
        
        // Por enquanto apenas simula a atualização
        // Futuramente pode integrar com Google Sheets ou banco de dados
        
        return {
            success: true,
            message: 'Status de autorização atualizado com sucesso',
            deviceId: deviceId,
            authorized: authorized
        };
    } catch (error) {
        console.error('❌ Erro ao atualizar autorização:', error);
        return {
            success: false,
            message: 'Erro ao atualizar autorização: ' + error.message
        };
    }
}

/**
 * Registra um novo dispositivo (placeholder)
 * @param {Object} deviceData - Dados do dispositivo
 * @returns {Promise<Object>} Resultado do registro
 */
async function registerDevice(deviceData) {
    try {
        console.log('📱 Registrando novo dispositivo:', deviceData);
        
        // Por enquanto apenas simula o registro
        // Futuramente pode integrar com Google Sheets ou banco de dados
        
        return {
            success: true,
            message: 'Dispositivo registrado com sucesso',
            device: deviceData
        };
    } catch (error) {
        console.error('❌ Erro ao registrar dispositivo:', error);
        return {
            success: false,
            message: 'Erro ao registrar dispositivo: ' + error.message
        };
    }
}

module.exports = {
    clearAuthCache,
    isConfigured,
    getAuthenticationData,
    checkDeviceAuthorization,
    updateDeviceAuthorization,
    registerDevice
};
