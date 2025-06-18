/**
 * Módulo para autenticação de dispositivos
 * Verifica se um dispositivo está autorizado a acessar o sistema
 * Utiliza a planilha do Google Sheets para armazenar as autorizações
 */

/**
 * Detecta o modelo do dispositivo a partir do User-Agent
 * @param {string} ua - User-Agent do navegador
 * @returns {string} - Modelo do dispositivo detectado
 */
function detectDeviceModel(ua) {
    if (!ua) return 'Desconhecido';

    let deviceModel = '';

    // Detecta se é um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    if (isMobile) {
        // Tenta detectar dispositivos específicos
        if (ua.match(/iPad/i)) {
            deviceModel = 'iPad';
        } else if (ua.match(/iPhone/i)) {
            deviceModel = 'iPhone';
        } else if (ua.match(/Android/i)) {
            deviceModel = 'Android';

            // Tenta obter o modelo específico
            const model = ua.match(/; ([^;)]+) Build\//i) || ua.match(/; ([^;)]+)\)/i);
            if (model && model[1]) {
                deviceModel += ` - ${model[1].trim()}`;
            }
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
                    '6.1': '7'
                };
                deviceModel += ` ${versionMap[winVersion[1]] || winVersion[1]}`;
            }
        } else if (ua.match(/Macintosh/i)) {
            deviceModel = 'Mac';
        } else if (ua.match(/Linux/i)) {
            deviceModel = 'Linux';
        } else {
            deviceModel = 'Desktop';
        }
    }

    // Adiciona informações do navegador
    if (ua.match(/Chrome/i) && !ua.match(/Edg/i)) {
        deviceModel += ' - Chrome';
    } else if (ua.match(/Firefox/i)) {
        deviceModel += ' - Firefox';
    } else if (ua.match(/Safari/i) && !ua.match(/Chrome/i)) {
        deviceModel += ' - Safari';
    } else if (ua.match(/Edg/i)) {
        deviceModel += ' - Edge';
    }

    return deviceModel;
}

/**
 * Verifica se um dispositivo está autorizado
 * @param {string} deviceId - ID único do dispositivo
 * @param {Object} sheetsService - Serviço de integração com o Google Sheets
 * @param {Object} req - Objeto de requisição Express (opcional)
 * @returns {Promise<Object>} - Objeto com status de autorização
 */
async function checkDeviceAuthorization(deviceId, sheetsService, req) {
    try {
        const forceUpdate = req?.query?.force === 'true';

        if (!sheetsService || !sheetsService.isConfigured()) {
            console.log('Serviço de planilhas não configurado. Autorizando dispositivo em modo de desenvolvimento.');
            return {
                authorized: true,
                message: 'Autorizado (modo de desenvolvimento)',
                deviceExists: true
            };
        }

        // Obtém dados da planilha, tratando erros como lista vazia para registrar novo dispositivo
        sheetsService.clearAuthCache();
        console.log(`Buscando dados de autenticação para o dispositivo ${deviceId}`);
        let authData = [];
        try {
            authData = await sheetsService.getAuthenticationData(true);
        } catch (e) {
            console.error('Falha ao obter dados da planilha:', e);
            authData = [];
        }

        // Localiza dinamicamente o campo de ID na planilha
        const idKey = Object.keys(authData[0] || {}).find(key => key.toLowerCase().includes('id'));
        // Se não encontrou o ID, trata como dispositivo não encontrado para registrar automaticamente
        if (!idKey) {
            console.log('Chave de ID não encontrada na planilha de autenticação. Registrando dispositivo automaticamente.');
        }
        // Procura o dispositivo na lista usando a chave dinâmica (ou undefined para cadastrar)
        let deviceEntry = idKey ? authData.find(entry => entry[idKey] === deviceId) : undefined;
        // Fallback: caso não encontre por chave, procura em qualquer valor (ID em outro cabeçalho)
        if (!deviceEntry) {
            deviceEntry = authData.find(entry => Object.values(entry).includes(deviceId));
            if (deviceEntry) console.log('Dispositivo encontrado via fallback de valor de célula.');
        }

        // FLUXO 1: Dispositivo não encontrado na planilha - Registra automaticamente
        if (!deviceEntry) {
            console.log(`Dispositivo ${deviceId} não encontrado na planilha. Registrando automaticamente.`);
            console.log(`Possível causa: Dispositivo foi apagado da planilha ou é um novo acesso.`);

            // Limpa o cache para garantir que estamos usando dados atualizados
            sheetsService.clearAuthCache();

            try {
                // Detecta o modelo do dispositivo a partir do User-Agent
                const userAgent = req?.headers?.['user-agent'] || '';
                const deviceModel = detectDeviceModel(userAgent);

                // Adiciona a data e hora atual à descrição
                const now = new Date();
                const dateStr = now.toLocaleDateString('pt-BR');
                const timeStr = now.toLocaleTimeString('pt-BR');

                // Adiciona o dispositivo à planilha com status "NAO" por padrão
                const description = deviceModel
                    ? `Dispositivo Automático | ${deviceModel} | ${dateStr} ${timeStr}`
                    : `Dispositivo Automático | ${dateStr} ${timeStr}`;

                const addResult = await sheetsService.addDevice(deviceId, description);
                console.log('Dispositivo adicionado automaticamente:', addResult);

                // Retorna o resultado
                return {
                    authorized: false,
                    message: 'Dispositivo registrado automaticamente. Aguardando autorização do administrador.',
                    deviceExists: true,
                    newDevice: true,
                    deviceModel: deviceModel
                };
            } catch (addError) {
                console.error('Erro ao adicionar dispositivo automaticamente:', addError);

                return {
                    authorized: false,
                    message: 'Dispositivo não cadastrado. Erro ao registrar automaticamente.',
                    deviceExists: false
                };
            }
        }

        // FLUXO 2: Dispositivo encontrado na planilha - Verifica autorização
        console.log(`Dispositivo ${deviceId} encontrado na planilha:`, JSON.stringify(deviceEntry));

        // Localiza o campo de autorização, suportando 'autorizado' ou 'autorizacao' (case-insensitive)
        const authKey = Object.keys(deviceEntry).find(key => key.toLowerCase().startsWith('autoriz'));
        let isAuthorized = false;
        if (authKey && deviceEntry[authKey] !== undefined && deviceEntry[authKey] !== null) {
            const authValue = String(deviceEntry[authKey]).toUpperCase().trim();
            isAuthorized = authValue === 'SIM';
            console.log(`Status de autorização (${authKey}): key="${authKey}", valor="${deviceEntry[authKey]}" => normalizado="${authValue}" => ${isAuthorized ? 'Autorizado' : 'Não autorizado'}`);
        } else {
            console.log(`ALERTA: Campo de autorização (autorizacao/autorizado) não encontrado ou inválido para o dispositivo ${deviceId}`);
        }
        // Prepara o resultado
        return {
            authorized: isAuthorized,
            message: isAuthorized
                ? 'Dispositivo autorizado'
                : 'Acesso negado. Entre em contato com o administrador.',
            deviceExists: true
        };
    } catch (error) {
        console.error('Erro ao verificar autorização do dispositivo:', error);

        // Em caso de erro, nega acesso
        return {
            authorized: false,
            message: 'Erro ao verificar autorização. Tente novamente mais tarde.',
            deviceExists: false
        };
    }
}

// Exporta as funções
module.exports = {
    checkDeviceAuthorization,
    detectDeviceModel
};
