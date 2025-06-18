/**
 * Módulo de integração com o Google Sheets
 * Este arquivo contém funções para enviar dados para o Google Sheets
 * e verificar autenticação de dispositivos
 */

// Chave para armazenar o buffer offline no localStorage
const OFFLINE_BUFFER_KEY = 'gestao-producao-offline-buffer';

// Chave para armazenar o cache de autenticação no localStorage
const AUTH_CACHE_KEY = 'gestao-producao-auth-cache';
const AUTH_CACHE_TIME_KEY = 'gestao-producao-auth-cache-time';

// Tempo de validade do cache de autenticação (5 minutos)
const AUTH_CACHE_VALIDITY = 5 * 60 * 1000;

// Variável para armazenar o buffer offline
let offlineBuffer = [];

/**
 * Inicializa o módulo de integração com o Google Sheets
 */
function initSheetsIntegration() {
    // Carrega o buffer offline do localStorage
    loadOfflineBuffer();

    // Adiciona listeners para eventos de conexão
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    // Atualiza o status de conexão inicial
    updateConnectionStatus();
    
    console.log('Módulo de integração com Google Sheets inicializado');
}

/**
 * Carrega o buffer offline do localStorage
 */
function loadOfflineBuffer() {
    try {
        const storedBuffer = localStorage.getItem(OFFLINE_BUFFER_KEY);
        if (storedBuffer) {
            offlineBuffer = JSON.parse(storedBuffer);
            console.log(`Buffer offline carregado: ${offlineBuffer.length} item(s)`);
        }
    } catch (error) {
        console.error('Erro ao carregar buffer offline:', error);
        offlineBuffer = [];
    }

    updateBufferIndicator();
}

/**
 * Salva o buffer offline no localStorage
 */
function saveOfflineBuffer() {
    try {
        localStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(offlineBuffer));
    } catch (error) {
        console.error('Erro ao salvar buffer offline:', error);
    }

    updateBufferIndicator();
}

/**
 * Atualiza o indicador de buffer na interface
 */
function updateBufferIndicator() {
    const bufferCount = document.getElementById('buffer-count');
    const bufferContainer = document.getElementById('buffer-container');
    
    if (bufferCount && bufferContainer) {
        if (offlineBuffer.length > 0) {
            bufferCount.textContent = offlineBuffer.length;
            bufferContainer.style.display = 'flex';
        } else {
            bufferContainer.style.display = 'none';
        }
    }
}

/**
 * Manipula mudanças no estado da conexão
 */
function handleConnectionChange() {
    updateConnectionStatus();

    // Se ficou online e há dados no buffer, tenta enviá-los
    if (navigator.onLine && offlineBuffer.length > 0) {
        sendBufferedData();
    }
}

/**
 * Atualiza o status de conexão na interface
 */
function updateConnectionStatus() {
    const isOnline = navigator.onLine;
    const statusElement = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');

    if (statusElement && statusText) {
        if (isOnline) {
            statusElement.classList.remove('offline');
            statusElement.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            statusElement.classList.remove('online');
            statusElement.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }
}

/**
 * Envia dados para o Google Sheets
 * @param {Object} data - Dados a serem enviados
 * @returns {Promise} - Promise que resolve quando os dados são enviados
 */
function sendDataToSheets(data) {
    return new Promise((resolve, reject) => {
        // Verifica se está online
        if (!navigator.onLine) {
            // Adiciona ao buffer offline
            addToOfflineBuffer(data);
            showNotification('Dados salvos no buffer offline. Serão enviados quando houver conexão.');
            resolve({ status: 'offline', message: 'Dados salvos no buffer offline' });
            return;
        }

        // Obtém a URL do webapp do localStorage
        const webappLink = localStorage.getItem('webappLink');
        if (!webappLink) {
            showNotification('URL do Web App não configurada!', 'error');
            reject(new Error('URL do Web App não configurada'));
            return;
        }

        console.log('Enviando dados para o Google Sheets usando URL:', webappLink);

        // Cria um FormData para envio
        const formData = new FormData();
        formData.append('action', 'saveProductionData');
        formData.append('data', JSON.stringify(data));

        // Envia os dados para o Google Sheets usando FormData
        fetch(webappLink, {
            method: 'POST',
            body: formData,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na resposta: ${response.status}`);
            }
            return response.text().then(text => {
                try {
                    // Tenta analisar a resposta como JSON
                    const data = JSON.parse(text);
                    console.log('Resposta do servidor:', data);

                    if (data.status === 'success') {
                        showNotification('Dados enviados com sucesso!');
                        resolve({ status: 'success', message: 'Dados enviados com sucesso', data });
                    } else {
                        console.error('Erro retornado pelo servidor:', data);
                        showNotification('Erro ao enviar dados: ' + (data.message || 'Erro desconhecido'));
                        reject(new Error(data.message || 'Erro desconhecido'));
                    }
                } catch (e) {
                    // Se não for JSON válido, usa o texto como está
                    console.log('Resposta do servidor (texto):', text);
                    showNotification('Dados enviados com sucesso!');
                    resolve({ status: 'success', message: 'Dados enviados com sucesso', text });
                }
            });
        })
        .catch(error => {
            console.error('Erro:', error);

            // Adiciona ao buffer offline em caso de erro
            addToOfflineBuffer(data);
            showNotification('Erro ao enviar dados. Salvos no buffer offline.');

            reject(error);
        });
    });
}

/**
 * Adiciona dados ao buffer offline
 * @param {Object} data - Dados a serem adicionados ao buffer
 */
function addToOfflineBuffer(data) {
    // Adiciona ao buffer
    offlineBuffer.push({
        ...data,
        timestamp: new Date().toISOString(),
        attempt: 0
    });

    // Salva o buffer no localStorage
    saveOfflineBuffer();

    console.log(`Dados adicionados ao buffer offline. Total: ${offlineBuffer.length}`);
}

/**
 * Envia dados do buffer offline
 */
function sendBufferedData() {
    if (offlineBuffer.length === 0) return;

    console.log(`Tentando enviar ${offlineBuffer.length} item(s) do buffer...`);

    // Obtém a URL do webapp do localStorage
    const webappLink = localStorage.getItem('webappLink');
    if (!webappLink) {
        showNotification('URL do Web App não configurada!', 'error');
        return;
    }

    // Cria uma cópia do buffer atual
    const currentBuffer = [...offlineBuffer];

    // Limpa o buffer
    offlineBuffer = [];
    saveOfflineBuffer();

    // Envia cada item do buffer
    let successCount = 0;

    const sendPromises = currentBuffer.map(data => {
        // Cria um FormData para envio
        const formData = new FormData();
        formData.append('action', 'saveProductionData');
        formData.append('data', JSON.stringify(data));

        // Envia os dados para o Google Sheets usando FormData
        return fetch(webappLink, {
            method: 'POST',
            body: formData,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na resposta: ${response.status}`);
            }
            successCount++;
            return response;
        })
        .catch(error => {
            console.error(`Erro ao enviar item do buffer: ${error.message}`);
            
            // Incrementa o contador de tentativas
            data.attempt = (data.attempt || 0) + 1;
            
            // Se o número de tentativas for menor que 3, readiciona ao buffer
            if (data.attempt < 3) {
                offlineBuffer.push(data);
            } else {
                console.warn('Número máximo de tentativas excedido. Item descartado:', data);
            }
            
            return null;
        });
    });

    // Aguarda todas as requisições terminarem
    Promise.allSettled(sendPromises)
        .then(() => {
            if (successCount > 0) {
                showNotification(`${successCount} item(s) do buffer enviado(s) com sucesso!`);
            }
            
            if (offlineBuffer.length > 0) {
                saveOfflineBuffer();
                showNotification(`${offlineBuffer.length} item(s) permanecem no buffer.`, 'warning');
            }
        });
}

/**
 * Verifica se um dispositivo está autorizado a acessar o sistema
 * @param {string} deviceId - ID único do dispositivo
 * @returns {Promise<Object>} - Objeto com status de autorização
 */
async function checkDeviceAuthorization(deviceId) {
    try {
        // Verifica se há um cache válido
        const cachedAuth = localStorage.getItem(AUTH_CACHE_KEY);
        const cachedTime = localStorage.getItem(AUTH_CACHE_TIME_KEY);

        if (cachedAuth && cachedTime) {
            const cacheAge = Date.now() - parseInt(cachedTime);

            // Se o cache ainda é válido, usa-o
            if (cacheAge < AUTH_CACHE_VALIDITY) {
                const authData = JSON.parse(cachedAuth);
                return authData;
            }
        }

        // Prepara os parâmetros para a requisição
        const params = new URLSearchParams({
            action: 'checkAuth',
            deviceId: deviceId
        });

        // Faz a requisição para o Google Apps Script
        const webappLink = localStorage.getItem('webappLink');
        if (!webappLink) {
            throw new Error('URL do Web App não configurada');
        }

        const response = await fetch(`${webappLink}?${params.toString()}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na resposta: ${response.status}`);
        }

        const authData = await response.json();
        
        // Salva o resultado no cache
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(authData));
        localStorage.setItem(AUTH_CACHE_TIME_KEY, Date.now().toString());

        return authData;
    } catch (error) {
        console.error('Erro ao verificar autorização do dispositivo:', error);
        throw error;
    }
}

/**
 * Limpa o cache de autorização
 */
function clearAuthCache() {
    localStorage.removeItem(AUTH_CACHE_KEY);
    localStorage.removeItem(AUTH_CACHE_TIME_KEY);
}

/**
 * Verifica se o serviço de planilhas está configurado
 * @returns {boolean} - true se o serviço está configurado
 */
function isSheetsServiceConfigured() {
    const webappLink = localStorage.getItem('webappLink');
    return webappLink && webappLink.includes('script.google.com');
}

/**
 * Função auxiliar para mostrar notificação
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação (success, error, warning)
 */
function showNotification(message, type = 'success') {
    // Verifica se a função global showNotification existe
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Implementação básica de notificação caso a função global não exista
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Cria uma notificação simples se o elemento existir
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        if (notification && notificationMessage) {
            notificationMessage.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'flex';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    }
}

// Exporta as funções para uso global
window.sheetsService = {
    sendDataToSheets,
    sendBufferedData,
    checkDeviceAuthorization,
    clearAuthCache,
    isConfigured: isSheetsServiceConfigured
};

// Inicializa o módulo quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', initSheetsIntegration);
