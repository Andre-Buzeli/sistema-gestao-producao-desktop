/**
 * Middleware para autenticação de dispositivos
 * Verifica se um dispositivo está autorizado a acessar determinadas rotas
 */

const deviceAuth = require('./device-auth');
const sheetsIntegration = require('./sheets-integration');

/**
 * Gera um ID único para o dispositivo
 * @returns {string} - ID único do dispositivo
 */
function generateDeviceId() {
    // Combinação de timestamp, random e data atual para criar um ID único
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    const date = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);

    return `${timestamp}-${randomStr}-${date}`;
}

/**
 * Middleware para verificar a autenticação de dispositivos
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função para continuar o fluxo
 */
async function deviceAuthMiddleware(req, res, next) {
    // Obtém o ID do dispositivo do cookie, query parameter ou header
    let deviceId = req.cookies?.device_id || req.query?.device_id || req.headers['x-device-id'];

    // Registra a tentativa de acesso para debug
    console.log(`Verificando autenticação para rota: ${req.originalUrl}, DeviceID: ${deviceId || 'Não fornecido'}`);

    // Adiciona informações de autenticação ao objeto req para uso posterior
    req.deviceAuth = {
        deviceId: deviceId || null,
        authorized: false,
        status: deviceId ? 'checking' : 'no_device_id',
        message: deviceId ? 'Verificando autorização...' : 'ID do dispositivo não fornecido'
    };

    // Se não há ID, gera um novo ID e registra o dispositivo automaticamente
    if (!deviceId) {
        console.log(`Sem ID de dispositivo. Gerando ID automaticamente.`);

        // Gera um ID único para o dispositivo
        deviceId = generateDeviceId();
        console.log(`Novo ID gerado: ${deviceId}`);

        // Atualiza o objeto de autenticação com o novo ID
        req.deviceAuth.deviceId = deviceId;
        req.deviceAuth.status = 'new_device';
        req.deviceAuth.message = 'Novo dispositivo detectado. Registrando automaticamente...';

        // Define o cookie para futuras requisições
        res.cookie('device_id', deviceId, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
            httpOnly: false, // Permite acesso via JavaScript
            path: '/',
            sameSite: 'lax'
        });
    }

    try {
        // Verifica a autorização do dispositivo
        const authResult = await deviceAuth.checkDeviceAuthorization(deviceId, sheetsIntegration, req);

        // Atualiza as informações de autenticação no objeto req
        req.deviceAuth.authorized = authResult.authorized;
        req.deviceAuth.message = authResult.message;
        req.deviceAuth.newDevice = authResult.newDevice;
        req.deviceAuth.deviceExists = authResult.deviceExists;

        if (authResult.authorized) {
            // Se o dispositivo está autorizado, define o cookie e continua o fluxo
            console.log(`Dispositivo ${deviceId} autorizado. Continuando.`);

            // Define o cookie para futuras requisições (válido por 30 dias)
            res.cookie('device_id', deviceId, {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
                httpOnly: false, // Permite acesso via JavaScript
                path: '/',
                sameSite: 'lax'
            });

            req.deviceAuth.status = 'authorized';
        } else if (authResult.newDevice) {
            // Se é um dispositivo novo, mostra mensagem de aguardando autorização
            console.log(`Dispositivo ${deviceId} registrado automaticamente. Aguardando autorização.`);
            req.deviceAuth.status = 'awaiting_approval';
        } else {
            // Se não está autorizado, mostra mensagem de acesso bloqueado
            console.log(`Dispositivo ${deviceId} não autorizado: ${authResult.message}`);
            req.deviceAuth.status = 'access_denied';
        }

        // Continua o fluxo em todos os casos
        return next();
    } catch (error) {
        console.error('Erro ao verificar autorização do dispositivo:', error);

        // Em caso de erro, atualiza as informações de autenticação e continua
        req.deviceAuth.status = 'error';
        req.deviceAuth.message = 'Erro ao verificar autorização. Tente novamente mais tarde.';

        return next();
    }
}

module.exports = deviceAuthMiddleware;
