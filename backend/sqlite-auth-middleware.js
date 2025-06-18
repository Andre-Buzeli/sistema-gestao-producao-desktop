/**
 * Middleware para autenticação de dispositivos usando SQLite local
 * Verifica se um dispositivo está autorizado no banco de dados SQLite
 * Permite bypass automático para dispositivos já autorizados
 */

/**
 * Gera um ID único para o dispositivo usando a mesma lógica do frontend
 * Esta função só é usada como fallback se o frontend não enviar o Device ID
 * @param {Object} req - Request object com informações do navegador
 * @returns {string} - ID único do dispositivo no formato TAB-XXXX-XXXX-XXXX
 */
function generateDeviceId(req) {
    // Usa a mesma lógica do frontend (device-auth.js) para consistência
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Simula informações do browser que o frontend usa
    const browserInfo = [
        userAgent,
        acceptLanguage,
        acceptEncoding,
        'fallback-server-generation' // Identificador de que foi gerado no servidor
    ].join('|');
    
    // Usa o mesmo algoritmo de hash do frontend
    let hash = 0;
    for (let i = 0; i < browserInfo.length; i++) {
        const char = browserInfo.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Converte para inteiro 32 bits
    }
    
    // Formato similar ao frontend: TAB-XXXX-XXXX-XXXX
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    
    return `TAB-${Math.abs(hash).toString(36).substring(0, 4)}-${timestamp.substring(timestamp.length - 4)}-${randomPart}`.toUpperCase();
}

/**
 * Middleware para verificar autenticação de dispositivos no SQLite
 * @param {Object} database - Instância do banco de dados SQLite
 * @returns {Function} - Função middleware Express
 */
function createSQLiteAuthMiddleware(database) {
    return async (req, res, next) => {
        try {
            // Obtém o ID do dispositivo do cookie, localStorage ou gera um novo
            let deviceId = req.cookies?.device_id || req.query?.device_id || req.headers['x-device-id'];
            
            console.log(`🔍 SQLite Auth Middleware - Verificando rota: ${req.originalUrl}, DeviceID: ${deviceId || 'Não fornecido'}`);
            
            // Se não há ID, isso significa que o frontend não carregou ainda
            // O middleware deve aguardar o frontend enviar o Device ID
            if (!deviceId) {
                console.log(`⚠️ Device ID não fornecido pelo frontend - middleware aguardando...`);
                
                // Em vez de gerar um novo ID, vamos aguardar o frontend
                // Deixa o processamento continuar sem bypass
                req.deviceAuth = {
                    deviceId: null,
                    authorized: false,
                    status: 'waiting_frontend',
                    message: 'Aguardando Device ID do frontend',
                    bypass: false
                };
                
                next();
                return;
            }
            
            // Verifica se o dispositivo existe no banco SQLite
            const device = await database.getQuery(
                'SELECT * FROM devices WHERE device_id = ? AND status = ?', 
                [deviceId, 'authorized']
            );
            
            // Adiciona informações de autenticação ao request
            req.deviceAuth = {
                deviceId: deviceId,
                authorized: !!device,
                status: device ? 'authorized' : 'not_authorized',
                message: device ? 'Dispositivo autorizado' : 'Dispositivo não autorizado ou não encontrado',
                device: device || null
            };
            
            if (device) {
                console.log(`✅ Dispositivo ${deviceId} autorizado no SQLite - Acesso direto permitido`);
                
                // Atualiza último acesso
                await database.runQuery(
                    'UPDATE devices SET last_activity = CURRENT_TIMESTAMP WHERE device_id = ?',
                    [deviceId]
                );
                
                req.deviceAuth.bypass = true;
            } else {
                console.log(`❌ Dispositivo ${deviceId} não autorizado no SQLite - Tela de autorização necessária`);
                req.deviceAuth.bypass = false;
            }
            
            // Continua para o próximo middleware ou rota
            next();
            
        } catch (error) {
            console.error('❌ Erro no SQLite Auth Middleware:', error);
            
            // Em caso de erro, permite continuar mas sem bypass
            req.deviceAuth = {
                deviceId: deviceId || null,
                authorized: false,
                status: 'error',
                message: 'Erro ao verificar autorização',
                bypass: false,
                error: error.message
            };
            
            next();
        }
    };
}

module.exports = {
    createSQLiteAuthMiddleware,
    generateDeviceId
};
