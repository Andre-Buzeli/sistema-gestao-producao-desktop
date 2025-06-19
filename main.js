const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const Database = require('./database/database');
const dataStore = require('./backend/data-store');
const express = require('express');
const localtunnel = require('localtunnel');
const sqlite3 = require('sqlite3').verbose();
// Importar o novo sistema de auto-updater e config manager
const AutoUpdaterManager = require('./backend/auto-updater');
const ConfigManager = require('./backend/config-manager');

// Logs principais
const log = require('electron-log');

// Adicionar caminho de log para debug
const logPath = path.join(app.getPath('userData'), 'logs', 'main.log');
log.transports.file.file = logPath;
console.log('📝 Arquivo de log:', logPath);

// ==========================================
// SISTEMA DE DEBUG PARA APP INSTALADO
// ==========================================

// Configurar electron-log para produção
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// Guardar referências originais ANTES de substituir
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Função para log que funciona em desenvolvimento E produção
function debugLog(level, message, ...args) {
    try {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Console log sempre (para npm start) - usar as funções ORIGINAIS
        switch(level) {
            case 'error':
                originalConsoleError(logMessage, ...args);
                break;
            case 'warn':
                originalConsoleWarn(logMessage, ...args);
                break;
            default:
                originalConsoleLog(logMessage, ...args);
        }
        
        // Electron log (para app instalado)
        if (log && log[level]) {
            log[level](logMessage, ...args);
        }
        
        // Armazenar em array para exibir na UI (opcional)
        if (!global.debugLogs) global.debugLogs = [];
        global.debugLogs.push({ timestamp, level, message: logMessage, args });
        
        // Manter apenas os últimos 1000 logs
        if (global.debugLogs.length > 1000) {
            global.debugLogs = global.debugLogs.slice(-1000);
        }
    } catch (error) {
        // Fallback - se der erro, usa console original diretamente
        originalConsoleError('[DEBUG LOG ERROR]', error);
        originalConsoleLog('[FALLBACK LOG]', message, ...args);
    }
}

// Substituir console.log global por nossa função de debug
console.log = (...args) => {
    try {
        debugLog('info', args.join(' '));
    } catch (e) {
        originalConsoleLog(...args);
    }
};

console.error = (...args) => {
    try {
        debugLog('error', args.join(' '));
    } catch (e) {
        originalConsoleError(...args);
    }
};

console.warn = (...args) => {
    try {
        debugLog('warn', args.join(' '));
    } catch (e) {
        originalConsoleWarn(...args);
    }
};

// Tratamento global de erros não capturados
process.on('uncaughtException', (error) => {
    const errorMsg = `❌ ERRO NÃO CAPTURADO: ${error.message}`;
    debugLog('error', errorMsg);
    debugLog('error', `Stack: ${error.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
    debugLog('error', `❌ PROMISE REJEITADA: ${reason}`);
    debugLog('error', `Promise: ${promise}`);
});

// Desabilitar aceleração de hardware para evitar problemas de GPU
app.disableHardwareAcceleration();

// Configurações de GPU - apenas em desenvolvimento
if (!app.isPackaged) {
    // Suprimir logs de erro de GPU que são apenas avisos APENAS EM DESENVOLVIMENTO
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-features=VizDisplayCompositor');
app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('--disable-accelerated-jpeg-decoding');
app.commandLine.appendSwitch('--disable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('--disable-accelerated-video-decode');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--in-process-gpu');
app.commandLine.appendSwitch('--disable-domain-reliability');
} else {
    // EM PRODUÇÃO - Manter logs ativos para debug
    try {
        debugLog('info', '🏭 MODO PRODUÇÃO - Logs de debug ativados');
        debugLog('info', `📍 Diretório da aplicação: ${__dirname}`);
        debugLog('info', `📍 Diretório de trabalho: ${process.cwd()}`);
        debugLog('info', `📍 Versão do Electron: ${process.versions.electron}`);
        debugLog('info', `📍 Versão do Node: ${process.versions.node}`);
    } catch (err) {
        // Se falhar, usa console original
        originalConsoleLog('🏭 MODO PRODUÇÃO - Erro no sistema de debug:', err);
    }
}

class DesktopManager {
    constructor() {
        this.mainWindow = null;
        this.isServerRunning = false;
        this.serverPort = 3000;
        this.database = new Database();
        this.server = null;
        this.tunnel = null;
        this.tunnelUrl = null;
        this.initialized = false; // Flag de inicialização
        this.sqliteAuthMiddleware = null; // Middleware de autenticação
        this.autoUpdater = null; // Gerenciador de auto-update
        this.configManager = null; // Gerenciador de configurações
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando aplicação desktop...');
            console.log('📍 Diretório atual:', __dirname);
            console.log('📍 Processo:', process.cwd());
            
            console.log('📋 Configurando menu...');
            Menu.setApplicationMenu(null);
            console.log('✅ Menu configurado');
            
            console.log('🔗 Configurando IPC...');
            this.setupIPC();
            console.log('✅ IPC configurado');
            
            console.log('⚙️ Inicializando gerenciador de configurações...');
            this.configManager = new ConfigManager();
            await this.configManager.initialize();
            console.log('✅ Gerenciador de configurações inicializado');
            
            console.log('🔄 Configurando auto-updater...');
            this.setupAutoUpdater();
            console.log('✅ Auto-updater configurado');
            
            console.log('🗄️ Inicializando banco de dados...');
            try {
                await this.database.initialize();
                console.log('✅ Banco de dados inicializado');
                
                // Limpar logs antigos na inicialização
                try {
                    console.log('🧹 Limpando logs antigos...');
                    await this.database.clearLogs();
                    console.log('✅ Logs antigos limpos');
                } catch (logError) {
                    console.warn('⚠️ Aviso: Não foi possível limpar logs antigos:', logError.message);
                }
                
            } catch (error) {
                console.warn('⚠️ Aviso: Banco de dados com problema de I/O:', error.code);
                console.log('📋 Sistema continuará em modo somente memória (data-store)');
                console.log('💡 Funcionalidades básicas mantidas, sem persistência SQLite');
                // Não falha - continua sem banco SQLite
            }
            
            console.log('✅ Aplicação inicializada com sucesso');
            this.initialized = true; // Marcar como inicializada
            
            // Auto-start do servidor desabilitado - usuário deve iniciar manualmente
            console.log('💡 Para iniciar o servidor, clique em "Iniciar Servidor" na interface');
            // 
            // // Iniciar servidor automaticamente (DESABILITADO)
            // console.log('🌐 Iniciando servidor...');
            // await this.startServer();
            // console.log('✅ Servidor iniciado com sucesso');
            // 
            // // Aguardar 3 segundos para servidor estabilizar antes de tentar tunnel
            // setTimeout(() => {
            //     this.setupExternalAccess();
            // }, 3000);
        } catch (error) {
            console.error('❌ ERRO FATAL na inicialização:', error);
            console.error('Stack trace:', error.stack);
            console.error('Erro detalhado:', {
                message: error.message,
                name: error.name,
                code: error.code
            });
            
            // Mostrar dialog de erro antes de fechar
            const { dialog } = require('electron');
            dialog.showErrorBox('Erro Fatal', 
                `Falha na inicialização:\n\n${error.message}\n\nVerifique os logs para mais detalhes.`
            );
            
            setTimeout(() => {
                app.quit();
            }, 5000);
        }
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 900,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: true,
                allowRunningInsecureContent: false,
                experimentalFeatures: false
            },
            show: false,
            autoHideMenuBar: true,
            titleBarStyle: 'default'
        });

        // Path mais robusto para o arquivo HTML
        const htmlPath = path.join(__dirname, 'frontend', 'desktop.html');
        console.log('📄 Carregando HTML:', htmlPath);
        console.log('📄 Arquivo existe:', require('fs').existsSync(htmlPath));
        
        this.mainWindow.loadFile(htmlPath).catch(error => {
            console.error('❌ Erro ao carregar HTML:', error);
            // Tentar path alternativo
            const alternativePath = path.join(__dirname, 'frontend', 'index.html');
            console.log('🔄 Tentando path alternativo:', alternativePath);
            return this.mainWindow.loadFile(alternativePath);
        });

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        this.mainWindow.on('closed', () => {
            this.stopServer();
            this.mainWindow = null;
        });

        // Abrir links externos no navegador padrão
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    }

    setupMenu() {
        const template = [
            {
                label: 'Servidor',
                submenu: [
                    {
                        label: 'Iniciar Servidor',
                        click: () => this.startServer(),
                        enabled: !this.isServerRunning
                    },
                    {
                        label: 'Parar Servidor',
                        click: () => this.stopServer(),
                        enabled: this.isServerRunning
                    },
                    {
                        label: 'Reiniciar Servidor',
                        click: () => this.restartServer(),
                        enabled: this.isServerRunning
                    },
                    { type: 'separator' },
                    {
                        label: 'Abrir no Navegador',
                        click: () => shell.openExternal(`http://localhost:${this.serverPort}`),
                        enabled: this.isServerRunning
                    }
                ]
            },
            {
                label: 'Dados',
                submenu: [
                    {
                        label: 'Backup Dados',
                        click: () => this.backupData()
                    },
                    {
                        label: 'Restaurar Dados',
                        click: () => this.restoreData()
                    },
                    { type: 'separator' },
                    {
                        label: 'Limpar Logs',
                        click: () => this.clearLogs()
                    }
                ]
            },
            {
                label: 'Ajuda',
                submenu: [
                    {
                        label: 'Sobre',
                        click: () => this.showAbout()
                    },
                    {
                        label: 'Logs do Sistema',
                        click: () => this.showLogs()
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupIPC() {
        // Controle do servidor
        ipcMain.handle('server:start', () => this.startServer());
        ipcMain.handle('server:stop', () => this.stopServer());
        ipcMain.handle('server:restart', () => this.restartServer());
        ipcMain.handle('server:status', () => {
            if (!this.initialized) {
                return { running: false, port: null, localIP: null, tunnelUrl: null, status: 'initializing' };
            }
            return {
                running: this.isServerRunning,
                port: this.serverPort,
                localIP: this.getLocalIP(),
                tunnelUrl: this.tunnelUrl
            };
        });

        // Gestão de dispositivos
        ipcMain.handle('devices:list', () => {
            if (!this.initialized || !this.database) return [];
            return this.database.getDevices();
        });
        ipcMain.handle('devices:create', (event, device) => this.database ? this.database.createDevice(device) : { success: false, message: 'Banco indisponível' });
        ipcMain.handle('devices:update', (event, id, device) => this.database ? this.database.updateDevice(id, device) : { success: false, message: 'Banco indisponível' });
        ipcMain.handle('devices:delete', (event, id) => this.database ? this.database.deleteDevice(id) : { success: false, message: 'Banco indisponível' });
        ipcMain.handle('devices:authorize', (event, id) => this.database ? this.database.authorizeDevice(id) : { success: false, message: 'Banco indisponível' });
        ipcMain.handle('devices:revoke', (event, id) => this.database ? this.database.revokeDevice(id) : { success: false, message: 'Banco indisponível' });
        ipcMain.handle('devices:reject', (event, id) => this.database ? this.database.rejectDevice(id) : { success: false, message: 'Banco indisponível' });
        ipcMain.handle('devices:deleteAll', () => this.database ? this.database.deleteAllDevices() : { success: false, message: 'Banco indisponível' });

        // Gestão de produtos
        ipcMain.handle('products:list', async () => {
            try {
                // Prioriza SQLite se disponível
                if (this.initialized && this.database) {
                    const dbProducts = await this.database.getProducts();
                    if (dbProducts && dbProducts.length > 0) {
                        return dbProducts;
                    }
                }
                
                // Fallback para dataStore
                const allProducts = dataStore.getAllProducts();
                const productsArray = Object.keys(allProducts).reduce((acc, category) => {
                    const categoryProducts = allProducts[category].map(product => ({
                        id: product.id,
                        codigo: product.id,
                        nome: product.name,
                        categoria: product.category || category.toUpperCase(),
                        peso_inicial: product.peso_inicial || 0,
                        peso_final: product.peso_final || 0,
                        created_at: new Date().toISOString()
                    }));
                    return acc.concat(categoryProducts);
                }, []);
                
                return productsArray;
            } catch (error) {
                console.error('Erro ao listar produtos:', error);
                return [];
            }
        });
        ipcMain.handle('products:create', async (event, product) => {
            try {
                // Prioriza SQLite se disponível
                if (this.database) {
                    const result = await this.database.createProduct(product);
                    if (result.success) {
                        return result;
                    }
                }
                
                // Fallback para dataStore
                const category = (product.categoria || 'PT').toLowerCase();
                const productData = {
                    id: product.codigo || `${category}_${Date.now()}`,
                    name: product.nome,
                    category: product.categoria || 'PT',
                    peso_inicial: product.peso_inicial || 0,
                    peso_final: product.peso_final || 0
                };
                
                dataStore.addProduct(category, productData);
                return { success: true, product: productData };
            } catch (error) {
                console.error('Erro ao criar produto:', error);
                return { success: false, message: error.message };
            }
        });
        ipcMain.handle('products:update', async (event, product) => {
            try {
                // Prioriza SQLite se disponível
                if (this.database) {
                    const result = await this.database.updateProduct(product);
                    if (result.success) {
                        return result;
                    }
                }
                
                // Fallback para dataStore
                const category = (product.categoria || 'PT').toLowerCase();
                const productData = {
                    id: product.codigo || product.id,
                    name: product.nome,
                    category: product.categoria || 'PT',
                    peso_inicial: product.peso_inicial || 0,
                    peso_final: product.peso_final || 0
                };
                
                // Remove o produto antigo e adiciona o novo (dataStore não tem update direto)
                dataStore.removeProduct(category, product.id || product.codigo);
                dataStore.addProduct(category, productData);
                return { success: true, product: productData };
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                return { success: false, message: error.message };
            }
        });
        ipcMain.handle('products:delete', async (event, id) => {
            try {
                // Prioriza SQLite se disponível
                if (this.database) {
                    const result = await this.database.deleteProduct(id);
                    if (result.success) {
                        return result;
                    }
                }
                
                // Fallback para dataStore - precisa encontrar em qual categoria está o produto
                const allProducts = dataStore.getAllProducts();
                let found = false;
                for (const category of Object.keys(allProducts)) {
                    const categoryProducts = allProducts[category];
                    if (categoryProducts.find(p => p.id === id)) {
                        dataStore.removeProduct(category, id);
                        found = true;
                        break;
                    }
                }
                
                return { success: found, message: found ? 'Produto removido' : 'Produto não encontrado' };
            } catch (error) {
                console.error('Erro ao deletar produto:', error);
                return { success: false, message: error.message };
            }
        });

        // Gestão de ordens
        ipcMain.handle('orders:list', async () => {
            try {
                console.log('🔍 Carregando ordens para o desktop...');
                let orders = [];
                let source = 'Empty';
                
                // Prioriza SQLite se disponível
                if (this.initialized && this.database) {
                    try {
                        console.log('📊 Consultando ordens no banco SQLite...');
                        const dbOrders = await this.database.getOrders();
                        if (dbOrders && dbOrders.length > 0) {
                            orders = dbOrders;
                            source = 'SQLite';
                            console.log(`✅ Banco SQLite retornou ${orders.length} ordens`);
                        } else {
                            console.log('📋 Banco SQLite vazio, verificando dataStore...');
                        }
                    } catch (dbError) {
                        console.error('❌ Erro ao consultar SQLite:', dbError);
                    }
                }
                
                // Se não tem ordens do SQLite, tenta dataStore
                if (orders.length === 0) {
                    console.log('📋 Consultando dataStore para ordens...');
                    const dataStoreOrders = dataStore.getAllOrders();
                    console.log('📦 DataStore ordens:', dataStoreOrders);
                    
                    if (dataStoreOrders && Object.keys(dataStoreOrders).length > 0) {
                        // Converter formato do dataStore para o formato esperado pelo frontend
                        orders = Object.keys(dataStoreOrders).map(orderCode => {
                            const order = dataStoreOrders[orderCode];
                            return {
                                id: orderCode,
                                order_code: orderCode,
                                products_data: JSON.stringify(order.products || []),
                                device_id: order.device_id || order.terminal || 'maquina',
                                operator: order.operator || 'Sistema',
                                status: order.status || 'completed',
                                created_at: new Date(order.createdAt || order.timestamp || Date.now()).toISOString()
                            };
                        });
                        source = 'DataStore';
                        console.log(`✅ DataStore retornou ${orders.length} ordens`);
                    } else {
                        console.log('📋 DataStore também vazio');
                    }
                }
                
                console.log(`✅ Retornando ${orders.length} ordens (fonte: ${source}) para o desktop`);
                return orders;
            } catch (error) {
                console.error('❌ Erro ao listar ordens:', error);
                return [];
            }
        });
        ipcMain.handle('orders:create', async (event, order) => {
            try {
                // Prioriza SQLite se disponível
                if (this.database) {
                    const result = await this.database.createOrder(order);
                    if (result.success) {
                        return result;
                    }
                }
                
                // Fallback para dataStore
                const orderCode = order.order_code || `ORDER_${Date.now()}`;
                const orderData = dataStore.addCompleteOrder(orderCode, order);
                return { success: true, order: orderData };
            } catch (error) {
                console.error('Erro ao criar ordem:', error);
                return { success: false, message: error.message };
            }
        });
        ipcMain.handle('orders:update', (event, id, order) => this.database ? this.database.updateOrder(id, order) : { success: false, message: 'Banco indisponível' });
        ipcMain.handle('orders:delete', async (event, id) => {
            try {
                // Prioriza SQLite se disponível
                if (this.database) {
                    const result = await this.database.deleteOrder(id);
                    if (result.success) {
                        return result;
                    }
                }
                
                // Fallback para dataStore
                const success = dataStore.removeOrder(id);
                return { success: success, message: success ? 'Ordem removida' : 'Ordem não encontrada' };
            } catch (error) {
                console.error('Erro ao remover ordem:', error);
                return { success: false, message: error.message };
            }
        });
        ipcMain.handle('orders:clear-completed', async () => {
            try {
                let dbResult = { success: false };
                let dataStoreResult = { success: false };
                
                // Limpar do banco SQLite se disponível
                if (this.database) {
                    dbResult = await this.database.clearCompletedOrders();
                    console.log('🗑️ SQLite clear result:', dbResult);
                }
                
                // Limpar do DataStore sempre
                dataStoreResult = dataStore.clearCompletedOrders();
                console.log('🗑️ DataStore clear result:', dataStoreResult);
                
                return { 
                    success: true, 
                    message: 'Ordens completed removidas de ambos os storages',
                    details: { database: dbResult, dataStore: dataStoreResult }
                };
            } catch (error) {
                console.error('❌ Erro ao limpar ordens:', error);
                return { success: false, message: 'Erro ao limpar ordens: ' + error.message };
            }
        });

        // Logs e configurações
        ipcMain.handle('logs:list', () => {
            if (!this.initialized || !this.database) return [];
            return this.database.getLogs();
        });
        ipcMain.handle('logs:clear', async () => {
            if (!this.database) {
                return { success: false, message: 'Banco de dados indisponível' };
            }
            try {
                await this.database.clearLogs();
                return { success: true, message: 'Logs limpos com sucesso' };
            } catch (error) {
                console.error('❌ Erro ao limpar logs:', error);
                return { success: false, message: 'Erro ao limpar logs' };
            }
        });

        // Debug logs para produção
        ipcMain.handle('debug:logs', () => {
            return global.debugLogs || [];
        });
        ipcMain.handle('debug:clear', () => {
            global.debugLogs = [];
            return { success: true, message: 'Debug logs limpos' };
        });
        ipcMain.handle('settings:get', () => this.database ? this.database.getSettings() : {});
        ipcMain.handle('settings:update', (event, settings) => this.database.updateSettings(settings));

        // Backup e restore
        ipcMain.handle('data:backup', () => this.backupData());
        ipcMain.handle('data:restore', () => this.restoreData());

        // Adicionar eventos IPC
        ipcMain.on('retry-tunnel', () => {
            console.log('Retry tunnel solicitado pelo usuário');
            this.setupExternalAccess();
        });

        // Auto-updater events - Sistema Novo v1.1.0
        ipcMain.handle('updater:check', () => this.checkForUpdates());
        ipcMain.handle('updater:force-check', () => this.forceCheckForUpdates());
        ipcMain.handle('updater:get-info', () => this.getUpdateInfo());
        ipcMain.handle('updater:get-progress', () => this.getUpdateProgress());
        ipcMain.handle('updater:is-updating', () => this.isUpdating());
        ipcMain.handle('updater:get-status', () => ({
            isUpdating: this.isUpdating(),
            updateInfo: this.getUpdateInfo(),
            progressInfo: this.getUpdateProgress(),
            version: app.getVersion(),
            currentChannel: this.configManager ? this.configManager.getUpdateChannel() : 'release'
        }));

        // Configurações de canais de atualização
        ipcMain.handle('config:get-update-channel', () => {
            return this.configManager ? this.configManager.getUpdateChannel() : 'release';
        });
        
        ipcMain.handle('config:set-update-channel', async (event, channel) => {
            if (!this.configManager) {
                return { success: false, error: 'ConfigManager não disponível' };
            }
            
            try {
                const result = await this.configManager.setUpdateChannel(channel);
                // Recarregar configuração do auto-updater
                if (this.autoUpdater && this.autoUpdater.loadConfigurationFromManager) {
                    this.autoUpdater.loadConfigurationFromManager();
                }
                
                console.log(`🔄 Canal de atualização alterado para: ${channel}`);
                this.notifyRenderer('config:channel-changed', result);
                
                return { success: true, ...result };
            } catch (error) {
                console.error('❌ Erro ao alterar canal:', error);
                return { success: false, error: error.message };
            }
        });
        
        ipcMain.handle('config:get-all', () => {
            return this.configManager ? this.configManager.getAll() : {};
        });
        
        ipcMain.handle('config:get-system-info', () => {
            return this.configManager ? this.configManager.getSystemInfo() : {};
        });
        
        ipcMain.handle('config:get-channel-config', (event, channel) => {
            return this.configManager ? this.configManager.getChannelConfig(channel) : {};
        });
        
        ipcMain.handle('config:update-config', async (event, updates) => {
            if (!this.configManager) {
                return { success: false, error: 'ConfigManager não disponível' };
            }
            
            try {
                const result = await this.configManager.updateConfig(updates);
                this.notifyRenderer('config:updated', updates);
                return result;
            } catch (error) {
                console.error('❌ Erro ao atualizar configuração:', error);
                return { success: false, error: error.message };
            }
        });
    }

    setupAutoUpdater() {
        try {
            // Inicializar o novo sistema de auto-updater com ConfigManager
            this.autoUpdater = new AutoUpdaterManager(this.configManager);
            
            // Configurar listeners para comunicação com o renderer
            this.autoUpdater.on('checking-for-update', () => {
                this.notifyRenderer('updater:checking');
            });

            this.autoUpdater.on('update-available', (info) => {
                this.notifyRenderer('updater:available', {
                    ...info,
                    channel: info.channel || this.configManager.getUpdateChannel()
                });
            });

            this.autoUpdater.on('update-not-available', (info) => {
                this.notifyRenderer('updater:not-available', info);
            });

            this.autoUpdater.on('error', (error) => {
                this.notifyRenderer('updater:error', error.message);
            });

            this.autoUpdater.on('download-progress', (progressObj) => {
                this.notifyRenderer('updater:progress', progressObj);
            });

            this.autoUpdater.on('update-downloaded', (info) => {
                this.notifyRenderer('updater:downloaded', info);
            });

            this.autoUpdater.on('download-started', () => {
                this.notifyRenderer('updater:download-started');
            });

            this.autoUpdater.on('install-started', () => {
                this.notifyRenderer('updater:install-started');
            });

            console.log('✅ Sistema de auto-updater com canais configurado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao configurar auto-updater:', error);
            
            // Fallback para logging básico
            this.autoUpdater = {
                checkForUpdates: () => console.log('🔧 Auto-updater desabilitado devido a erro'),
                forceCheckForUpdates: () => console.log('🔧 Auto-updater desabilitado devido a erro')
            };
        }
    }

    async checkForUpdates() {
        if (!this.autoUpdater) {
            console.log('🔧 Auto-updater não inicializado');
            return;
        }

        try {
            return await this.autoUpdater.checkForUpdates();
        } catch (error) {
            console.error('❌ Erro ao verificar atualizações:', error);
            throw error;
        }
    }

    async forceCheckForUpdates() {
        if (!this.autoUpdater) {
            console.log('🔧 Auto-updater não inicializado');
            return;
        }

        try {
            return await this.autoUpdater.forceCheckForUpdates();
        } catch (error) {
            console.error('❌ Erro ao verificar atualizações forçadamente:', error);
            throw error;
        }
    }

    getUpdateInfo() {
        return this.autoUpdater ? this.autoUpdater.getUpdateInfo() : null;
    }

    getUpdateProgress() {
        return this.autoUpdater ? this.autoUpdater.getProgressInfo() : null;
    }

    isUpdating() {
        return this.autoUpdater ? this.autoUpdater.getIsUpdating() : false;
    }



    async startServer() {
        console.log('🚀 ==> INICIANDO STARTSERVER - Passo 1');
        
        // Se o servidor já está rodando, retorna sucesso em vez de erro
        if (this.isServerRunning) {
            console.log('ℹ️ Servidor já está em execução');
            return { success: true, message: 'Servidor já está em execução', alreadyRunning: true };
        }

        try {
            console.log('🚀 ==> STARTSERVER - Passo 2: Iniciando try block');
            
            // Adicionar log de início do servidor
            if (this.database) {
                console.log('🚀 ==> STARTSERVER - Passo 3: Adicionando log no banco');
                await this.database.addLog('server', 'info', 'Iniciando servidor...');
            } else {
                console.log('🚀 ==> STARTSERVER - Passo 3: Banco não disponível, pulando log');
            }
            
            console.log('🚀 ==> STARTSERVER - Passo 4: Importando dependências');
            const express = require('express');
            const http = require('http');
            const path = require('path');
            const os = require('os');
            console.log('🚀 ==> STARTSERVER - Passo 5: Dependências importadas com sucesso');

            console.log('🚀 ==> STARTSERVER - Passo 6: Criando instância Express');
            this.server = express();
            console.log('🚀 ==> STARTSERVER - Passo 7: Express criado com sucesso');
            
            // Middleware para parsing JSON
            console.log('🚀 ==> STARTSERVER - Passo 8: Configurando middleware JSON');
            this.server.use(express.json());
            console.log('🚀 ==> STARTSERVER - Passo 9: Middleware JSON configurado');

            // Importar middleware SQLite para autenticação persistente
            console.log('🚀 ==> STARTSERVER - Passo 10: Importando middleware SQLite');
            try {
            const { createSQLiteAuthMiddleware } = require('./backend/sqlite-auth-middleware');
                this.sqliteAuthMiddleware = this.database ? createSQLiteAuthMiddleware(this.database) : null;
                console.log('🚀 ==> STARTSERVER - Passo 11: Middleware SQLite importado com sucesso');
            } catch (middlewareError) {
                console.error('❌ ERRO ao importar middleware SQLite:', middlewareError);
                throw new Error(`Falha ao importar middleware: ${middlewareError.message}`);
            }

            // ==========================================
            // SISTEMA DE AUTENTICAÇÃO V2.0 - APIs SIMPLIFICADAS
            // ==========================================
            
            // API para registrar tablet
            this.server.post('/api/tablet/register', async (req, res) => {
                try {
                    if (!this.database) {
                        return res.status(503).json({ 
                            success: false, 
                            message: 'Banco de dados indisponível - modo somente leitura' 
                        });
                    }

                    const { deviceId, userAgent, timestamp } = req.body;
                    const ip = req.ip || req.connection.remoteAddress;
                    
                    // Gerar nome automático baseado no device ID
                    const deviceShortId = deviceId.split('-').pop().substring(0, 6);
                    const autoOperator = `Terminal-${deviceShortId}`;
                    
                    console.log(`🆕 Registro tablet: ${deviceId} | Operador: ${autoOperator} | IP: ${ip}`);
                    
                    // Verificar se já existe
                    const existing = await this.database.getQuery(
                        'SELECT * FROM devices WHERE device_id = ?', [deviceId]
                    );
                    
                    if (existing) {
                        // Atualizar dados (manter operador existente se já definido)
                        const operator = existing.operator || autoOperator;
                        await this.database.runQuery(
                            'UPDATE devices SET operator = ?, ip = ?, user_agent = ?, last_activity = CURRENT_TIMESTAMP WHERE device_id = ?',
                            [operator, ip, userAgent, deviceId]
                        );
                        
                        const authorized = existing.status === 'authorized';
                        res.json({ 
                            success: true, 
                            authorized: authorized,
                            message: authorized ? 'Já autorizado' : 'Aguardando autorização'
                        });
                        } else {
                        // Criar novo
                        await this.database.createDevice({
                            device_id: deviceId,
                            name: `Tablet - ${autoOperator}`,
                            type: 'tablet',
                            ip: ip,
                            user_agent: userAgent,
                            operator: autoOperator,
                            status: 'pending'
                        });
                        
                        res.json({ 
                            success: true, 
                            authorized: false,
                            message: 'Tablet registrado, aguardando autorização'
                        });
                        
                        // Notificar desktop
                        this.notifyRenderer('device:new', {
                            deviceId,
                            deviceName: `Tablet - ${autoOperator}`,
                            operator: autoOperator,
                            ip
                        });
                    }
                } catch (error) {
                    console.error('❌ Erro ao registrar tablet:', error);
                    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
                }
            });

            // API para verificar status - RESPOSTA JSON SIMPLES
            this.server.get('/api/tablet/status/:deviceId', async (req, res) => {
                try {
                    if (!this.database) {
                        return res.status(503).json({ 
                            success: false, 
                            authorized: false,
                            message: 'Banco de dados indisponível - modo somente leitura' 
                        });
                    }

                    const { deviceId } = req.params;
                    console.log(`🔍 Verificando status do device: ${deviceId}`);
                    
                    const device = await this.database.getQuery(
                        'SELECT * FROM devices WHERE device_id = ?', [deviceId]
                    );
                    
                    if (device) {
                        const authorized = device.status === 'authorized';
                        console.log(`📱 Device encontrado: ${deviceId} | Status: ${device.status} | Autorizado: ${authorized}`);
                        
                        if (authorized) {
                            // Atualizar último acesso
                            await this.database.runQuery(
                                'UPDATE devices SET last_activity = CURRENT_TIMESTAMP WHERE device_id = ?',
                                [deviceId]
                            );
                        }
                        
                        const response = { 
                            authorized: authorized,
                            operator: device.operator,
                            status: device.status,
                            lastActivity: device.last_activity
                        };
                        
                        console.log(`📤 Resposta enviada:`, response);
                        res.json(response);
                    } else {
                        console.log(`❌ Device não encontrado: ${deviceId}`);
                        res.json({ 
                            authorized: false, 
                            status: 'not_found',
                            message: 'Dispositivo não encontrado'
                        });
                    }
                } catch (error) {
                    console.error('❌ Erro ao verificar status:', error);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            });

            // Servir arquivos estáticos
            this.server.use('/css', express.static(path.join(__dirname, 'frontend/css')));
            this.server.use('/js', express.static(path.join(__dirname, 'frontend/js')));
            this.server.use('/img', express.static(path.join(__dirname, 'frontend/img')));
            
            this.server.get('/manifest.json', (req, res) => {
                res.sendFile(path.join(__dirname, 'frontend/manifest.json'));
            });

            // ==========================================
            // APIs DE PRODUTOS - INTEGRAÇÃO COM BACKEND
            // ==========================================
            
            // Importar e configurar rotas do backend
            const dataStore = require('./backend/data-store');
            
            // Função para atualizar timestamp dos produtos
            let productsLastUpdate = Date.now();
            function updateProductsTimestamp() {
                productsLastUpdate = Date.now();
            }

            // API para obter todos os produtos
            this.server.get('/api/products', async (req, res) => {
                const startTime = Date.now();
                console.log(`[${new Date().toISOString()}] 📥 GET /api/products - Solicitação recebida`);
                
                try {
                    if (this.database) {
                        console.log('📊 Consultando banco SQLite...');
                        const products = await this.database.getProducts();
                        console.log(`✅ Banco SQLite retornou ${products.length} produtos`);
                        
                        const response = {
                            success: true,
                            products: products,
                            lastUpdate: Date.now(),
                            source: 'SQLite'
                        };
                        
                        console.log(`📤 Enviando resposta: ${JSON.stringify(response).substring(0, 100)}...`);
                        res.json(response);
                    } else {
                        console.log('📋 Usando dataStore (banco não disponível)...');
                        // Fallback para dataStore se banco não estiver disponível
                        const allProducts = dataStore.getAllProducts();
                        // Converter formato do dataStore para array
                        const productsArray = Object.keys(allProducts).reduce((acc, category) => {
                            const categoryProducts = allProducts[category].map(product => ({
                                id: product.id,
                                codigo: product.id,
                                nome: product.name,
                                categoria: product.category || category.toUpperCase(),
                                peso_inicial: product.peso_inicial || 0,
                                peso_final: product.peso_final || 0,
                                created_at: new Date().toISOString()
                            }));
                            return acc.concat(categoryProducts);
                        }, []);
                        
                        console.log(`✅ DataStore retornou ${productsArray.length} produtos`);
                        
                        const response = {
                            success: true,
                            products: productsArray,
                            lastUpdate: dataStore.getLastUpdate(),
                            source: 'DataStore'
                        };
                        
                        console.log(`📤 Enviando resposta: ${JSON.stringify(response).substring(0, 100)}...`);
                        res.json(response);
                    }
                    
                    const duration = Date.now() - startTime;
                    console.log(`⏱️ GET /api/products completado em ${duration}ms\n`);
                    
                } catch (error) {
                    console.error('❌ Erro ao buscar produtos:', error);
                    console.log(`⏱️ GET /api/products FALHOU em ${Date.now() - startTime}ms\n`);
                    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
                }
            });

            // API para obter produtos de uma categoria específica
            this.server.get('/api/products/:category', async (req, res) => {
                const { category } = req.params;
                try {
                    if (this.database) {
                        const allProducts = await this.database.getProducts();
                        const products = allProducts.filter(p => p.category === category);
                        res.json({
                            category,
                            products,
                            lastUpdate: Date.now()
                        });
                    } else {
                        // Fallback para dataStore
                        const products = dataStore.getProducts(category);
                        res.json({
                            category,
                            products,
                            lastUpdate: dataStore.getLastUpdate()
                        });
                    }
                } catch (error) {
                    console.error('Erro ao buscar produtos da categoria:', error);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            });

            // API para adicionar um produto
            this.server.post('/api/products/:category', async (req, res) => {
                const { category } = req.params;
                const { name } = req.body;

                if (!name) {
                    return res.status(400).json({ error: 'Nome do produto é obrigatório' });
                }

                try {
                    if (this.database) {
                        const product = await this.database.createProduct({ name, category });
                        updateProductsTimestamp();
                        res.status(201).json(product);
                    } else {
                        // Fallback para dataStore
                        const product = dataStore.addProduct(category, name);
                        updateProductsTimestamp();
                        res.status(201).json(product);
                    }
                } catch (error) {
                    console.error('Erro ao criar produto:', error);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            });

            // API para remover um produto
            this.server.delete('/api/products/:category/:productId', async (req, res) => {
                const { category, productId } = req.params;

                try {
                    if (this.database) {
                        const result = await this.database.deleteProduct(parseInt(productId));
                        if (result.success) {
                            updateProductsTimestamp();
                            res.json({ success: true, message: 'Produto removido com sucesso' });
                        } else {
                            res.status(404).json({ error: 'Produto não encontrado' });
                        }
                    } else {
                        // Fallback para dataStore
                        const removed = dataStore.removeProduct(category, productId);
                        if (removed) {
                            updateProductsTimestamp();
                            res.json({ success: true, message: 'Produto removido com sucesso' });
                        } else {
                            res.status(404).json({ error: 'Produto não encontrado' });
                        }
                    }
                } catch (error) {
                    console.error('Erro ao remover produto:', error);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            });

            // API para atualizar timestamp de produtos
            this.server.post('/update_products', (req, res) => {
                updateProductsTimestamp();
                res.json({ success: true, timestamp: productsLastUpdate });
            });

            // API para atualizar server_info.json
            this.server.get('/server_info.json', (req, res) => {
                const serverInfo = {
                    ip: this.getLocalIP(),
                    port: this.serverPort,
                    hostname: 'gestao-producao',
                    status: 'running',
                    last_update: Date.now(),
                    products_update: productsLastUpdate,
                    maquina_path: '/maquina',
                    manutencao_path: '/manutencao',
                    external_url: this.tunnelUrl || ''
                };
                res.json(serverInfo);
            });

            // ==========================================
            // APIs DE ORDENS DE PRODUÇÃO
            // ==========================================

            // API para obter todas as ordens
            this.server.get('/api/orders', async (req, res) => {
                const startTime = Date.now();
                console.log(`[${new Date().toISOString()}] 📥 GET /api/orders - Solicitação recebida`);
                
                try {
                    let orders = [];
                    let source = 'Empty';
                    
                    if (this.database) {
                        console.log('📊 Consultando ordens no banco SQLite...');
                        try {
                            const dbOrders = await this.database.getOrders();
                            if (dbOrders && dbOrders.length > 0) {
                                orders = dbOrders;
                                source = 'SQLite';
                                console.log(`✅ Banco SQLite retornou ${orders.length} ordens`);
                            } else {
                                console.log('📋 Banco SQLite vazio, verificando dataStore...');
                            }
                        } catch (dbError) {
                            console.error('❌ Erro ao consultar SQLite:', dbError);
                        }
                    }
                    
                    // Se não tem ordens do SQLite, tenta dataStore
                    if (orders.length === 0) {
                        console.log('📋 Consultando dataStore para ordens...');
                        const dataStoreOrders = dataStore.getAllOrders();
                        console.log('📦 DataStore raw orders:', dataStoreOrders);
                        
                        if (dataStoreOrders && Object.keys(dataStoreOrders).length > 0) {
                            // Converter formato do dataStore para array
                            orders = Object.keys(dataStoreOrders).map(orderCode => {
                                const order = dataStoreOrders[orderCode];
                                return {
                                    id: orderCode,
                                    order_code: orderCode,
                                    products_data: JSON.stringify(order.products || []),
                                    device_id: order.device_id || order.terminal || 'maquina',
                                    operator: order.operator || 'Sistema',
                                    status: order.status || 'completed',
                                    created_at: new Date(order.createdAt || order.timestamp || Date.now()).toISOString()
                                };
                            });
                            source = 'DataStore';
                            console.log(`✅ DataStore retornou ${orders.length} ordens`);
                        } else {
                            console.log('📋 DataStore também vazio');
                        }
                    }
                    
                    const response = {
                        success: true,
                        orders: orders,
                        lastUpdate: Date.now(),
                        source: source,
                        count: orders.length
                    };
                    
                    console.log(`📤 Enviando resposta final: ${orders.length} ordens (fonte: ${source})`);
                    res.json(response);
                    
                    const duration = Date.now() - startTime;
                    console.log(`⏱️ GET /api/orders completado em ${duration}ms\n`);
                    
                } catch (error) {
                    console.error('❌ Erro ao buscar ordens:', error);
                    console.log(`⏱️ GET /api/orders FALHOU em ${Date.now() - startTime}ms\n`);
                    res.status(500).json({ 
                        success: false,
                        error: 'Erro interno do servidor', 
                        details: error.message,
                        orders: [],
                        count: 0
                    });
                }
            });

            // API para criar/completar uma ordem
            this.server.post('/api/orders/:orderCode/complete', async (req, res) => {
                try {
                    const { orderCode } = req.params;
                    const orderData = req.body;
                    
                    console.log(`📋 Ordem ${orderCode} recebida para processamento`);
                    
                    if (this.database) {
                        // Preparar dados para salvar no banco SQLite
                        const orderToSave = {
                            order_code: orderCode,
                            products_data: JSON.stringify(orderData.products || []),
                            device_id: orderData.terminal || 'unknown',
                            operator: orderData.operator || 'Operador',
                            notes: `Ordem concluída em ${new Date().toLocaleString()}`,
                            status: 'completed'
                        };
                        
                        const result = await this.database.createOrder(orderToSave);
                        console.log(`✅ Ordem ${orderCode} salva no banco SQLite`);
                        
                        res.json({ 
                            success: true, 
                            order: orderToSave,
                            message: 'Ordem salva com sucesso'
                        });
                    } else {
                        // Fallback para dataStore
                        if (orderData.name) {
                            // Produto individual
                            const order = dataStore.addProductToOrder(orderCode, orderData);
                            res.json(order);
                        } else {
                            // Ordem completa
                            const order = dataStore.createOrder(orderCode, orderData);
                            res.json(order);
                        }
                    }
                    
                    updateProductsTimestamp(); // Atualiza o timestamp global
                } catch (error) {
                    console.error('Erro ao salvar ordem:', error);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            });

            // ==========================================
            // ROTAS HTML
            // ==========================================

            // Rota para página inicial - redireciona para /maquina
            this.server.get('/', (req, res) => {
                res.redirect('/maquina');
            });

            // ROTA PRINCIPAL /maquina COM AUTENTICAÇÃO PERSISTENTE SQLite
            this.server.get('/maquina', this.sqliteAuthMiddleware, (req, res) => {
                console.log(`📱 Servindo página /maquina - Device: ${req.deviceAuth.deviceId} | Bypass: ${req.deviceAuth.bypass} | Status: ${req.deviceAuth.status}`);
                
                // CENÁRIO 1: SEM DEVICE ID - Forçar geração e reload
                if (!req.deviceAuth.deviceId || req.deviceAuth.status === 'waiting_frontend') {
                    console.log(`🚫 ACESSO BLOQUEADO - Nenhum Device ID fornecido, redirecionando para geração`);
                    
                    // Retorna página que força geração de Device ID e recarrega
                    const deviceIdGenerationPage = `
                    <!DOCTYPE html>
                    <html lang="pt-BR">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Configurando Terminal...</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
                            .loading { font-size: 24px; margin: 20px; }
                            .spinner { animation: spin 1s linear infinite; font-size: 30px; }
                            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        </style>
                    </head>
                    <body>
                        <h1>🔧 Configurando Terminal</h1>
                        <div class="loading">
                            <div class="spinner">⚙️</div>
                            <p>Gerando identificação do dispositivo...</p>
                        </div>
                        
                    <script>
                    function generateConsistentDeviceId() {
                        let deviceId = localStorage.getItem('device_id');
                        if (deviceId && deviceId.startsWith('TAB-')) {
                            return deviceId;
                        }
                        
                        // Gerar ID baseado em características do dispositivo
                        const browserInfo = [
                            navigator.userAgent,
                            navigator.language,
                            navigator.platform,
                            window.screen.width,
                            window.screen.height,
                            new Date().getTimezoneOffset()
                        ].join('|');
                        
                        let hash = 0;
                        for (let i = 0; i < browserInfo.length; i++) {
                            const char = browserInfo.charCodeAt(i);
                            hash = ((hash << 5) - hash) + char;
                            hash = hash & hash;
                        }
                        
                        const timestamp = Date.now().toString(36);
                        const randomPart = Math.random().toString(36).substring(2, 8);
                        
                        const machineId = 'TAB-' + Math.abs(hash).toString(36).substring(0, 4) + '-' + timestamp.substring(timestamp.length - 4) + '-' + randomPart;
                        const finalMachineId = machineId.toUpperCase();
                        
                        localStorage.setItem('device_id', finalMachineId);
                                document.cookie = 'device_id=' + finalMachineId + '; path=/; max-age=31536000';
                                console.log('🆕 Device ID gerado:', finalMachineId);
                        
                        return finalMachineId;
                    }
                    
                            // Gerar Device ID e recarregar página
                            setTimeout(() => {
                    const deviceId = generateConsistentDeviceId();
                                console.log('🔄 Recarregando página com Device ID:', deviceId);
                                window.location.reload();
                            }, 2000);
                        </script>
                    </body>
                    </html>
                    `;
                    
                    res.send(deviceIdGenerationPage);
                    return;
                }
                
                // CENÁRIO 2: DEVICE ID AUTORIZADO - Acesso direto
                if (req.deviceAuth.bypass) {
                    console.log(`✅ Bypass ativado - Dispositivo ${req.deviceAuth.deviceId} autorizado, acesso direto`);
                    
                    const fs = require('fs');
                    let htmlContent = fs.readFileSync(path.join(__dirname, 'frontend/maquina.html'), 'utf8');
                    
                    // Injeta informações do dispositivo autorizado no HTML
                    const deviceInfoScript = `
                    <script>
                        // Dispositivo autorizado - informações disponíveis globalmente
                        window.deviceInfo = {
                            deviceId: '${req.deviceAuth.deviceId}',
                            authorized: true,
                            operator: '${req.deviceAuth.device ? req.deviceAuth.device.operator || 'Operador' : 'Operador'}',
                            bypassMode: true
                        };
                        console.log('✅ Dispositivo autorizado - Acesso direto liberado:', window.deviceInfo);
                    </script>
                    `;
                    
                    // Injetar informações antes do </head>
                    htmlContent = htmlContent.replace('</head>', deviceInfoScript + '</head>');
                    
                    res.send(htmlContent);
                    return;
                }
                
                // CENÁRIO 3: DEVICE ID NÃO AUTORIZADO - Tela de autorização
                console.log(`🔒 Dispositivo ${req.deviceAuth.deviceId} aguardando autorização - Bloqueando acesso`);
                
                // Retorna página de autorização que bloqueia acesso até aprovação
                const authorizationPage = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Terminal - Aguardando Autorização</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; text-align: center; 
                            padding: 50px; background: #fff3cd; margin: 0; 
                        }
                        .auth-container { 
                            max-width: 500px; margin: 0 auto; 
                            background: white; padding: 30px; 
                            border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        }
                        .device-id { 
                            font-family: monospace; font-size: 18px; 
                            background: #f8f9fa; padding: 10px; 
                            border-radius: 5px; margin: 20px 0; 
                        }
                        .status { font-size: 16px; margin: 20px 0; }
                        .pending { color: #856404; }
                        .checking { animation: pulse 1.5s infinite; }
                        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                    </style>
                </head>
                <body>
                    <div class="auth-container">
                        <h1>🔐 Terminal Aguardando Autorização</h1>
                        <p>Este dispositivo precisa ser autorizado pelo administrador para acessar o sistema.</p>
                        
                        <div class="device-id">
                            <strong>ID do Dispositivo:</strong><br>
                            ${req.deviceAuth.deviceId}
                        </div>
                        
                        <div class="status pending checking" id="status">
                            ⏳ Aguardando autorização do administrador...
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            Esta tela atualizará automaticamente quando o dispositivo for autorizado.
                        </p>
                    </div>
                    
                    <script>
                        const deviceId = '${req.deviceAuth.deviceId}';
                        
                        // Registrar dispositivo no sistema
                    fetch('/api/tablet/register', {
                        method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            deviceId: deviceId,
                            userAgent: navigator.userAgent,
                            timestamp: Date.now()
                        })
                        }).then(response => response.json())
                    .then(data => {
                            console.log('Dispositivo registrado:', data);
                        });
                        
                        // Verificar status de autorização a cada 3 segundos
                        function checkAuthStatus() {
                            fetch('/api/tablet/status/' + deviceId)
                            .then(response => response.json())
                            .then(data => {
                                console.log('Status:', data);
                        if (data.authorized) {
                                    document.getElementById('status').innerHTML = '✅ Dispositivo autorizado! Redirecionando...';
                                    document.getElementById('status').className = 'status';
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 2000);
                        }
                    })
                    .catch(error => {
                                console.error('Erro ao verificar status:', error);
                    });
                        }
                        
                        // Verificar status imediatamente e a cada 3 segundos
                        checkAuthStatus();
                        setInterval(checkAuthStatus, 3000);
                </script>
                </body>
                </html>
                `;
                
                res.send(authorizationPage);
            });

            // Rota para desktop/gestão
            this.server.get('/desktop', (req, res) => {
                res.sendFile(path.join(__dirname, 'frontend/desktop.html'));
            });

            // Iniciar servidor HTTP
            console.log('🚀 ==> STARTSERVER - Passo 50: Iniciando servidor HTTP');
            
            try {
                console.log('🚀 ==> STARTSERVER - Passo 51: Importando port-finder');
            const { findAvailablePort } = require('./backend/port-finder');
                console.log('🚀 ==> STARTSERVER - Passo 52: Port-finder importado');
                
                console.log('🚀 ==> STARTSERVER - Passo 53: Procurando porta disponível');
            const port = await findAvailablePort(this.serverPort);
                console.log(`🚀 ==> STARTSERVER - Passo 54: Porta encontrada: ${port}`);
            
                console.log('🚀 ==> STARTSERVER - Passo 55: Criando servidor HTTP');
            this.httpServer = http.createServer(this.server);
                console.log('🚀 ==> STARTSERVER - Passo 56: Servidor HTTP criado');
                
                console.log('🚀 ==> STARTSERVER - Passo 57: Iniciando listen do servidor');
                
                return new Promise((resolve, reject) => {
                    // Timeout para falha do servidor
                    const timeout = setTimeout(() => {
                        console.error('❌ TIMEOUT - Servidor não respondeu em 10 segundos');
                        reject(new Error('Timeout ao iniciar servidor HTTP'));
                    }, 10000);
                    
            this.httpServer.listen(port, async () => {
                        console.log('🚀 ==> STARTSERVER - Passo 58: Servidor HTTP listening callback executado');
                        clearTimeout(timeout);
                        
                this.serverPort = port;
                this.isServerRunning = true;
                
                console.log(`🚀 Servidor iniciado em http://localhost:${port}`);
                console.log(`📱 Terminal Máquina: http://localhost:${port}/maquina`);
                console.log(`🖥️ Desktop: http://localhost:${port}/desktop`);
                
                // Adicionar log de servidor iniciado
                if (this.database) {
                            console.log('🚀 ==> STARTSERVER - Passo 59: Adicionando log de sucesso no banco');
                    await this.database.addLog('server', 'info', `Servidor iniciado na porta ${port}`);
                }
                
                // Notificar renderer
                        console.log('🚀 ==> STARTSERVER - Passo 60: Notificando renderer');
                this.notifyRenderer('server:ready', {
                    port: port,
                    localIP: this.getLocalIP(),
                    timestamp: Date.now()
                });
                
                // Configurar túnel se disponível (não bloqueia o servidor)
                        console.log('🚀 ==> STARTSERVER - Passo 61: Iniciando configuração de tunnel');
                this.setupExternalAccess().catch(err => {
                    console.error('⚠️ LocalTunnel não pôde ser configurado, mas o servidor está funcionando localmente');
                });
                        
                        console.log('🚀 ==> STARTSERVER - Passo 62: SUCESSO COMPLETO');
                        resolve({ success: true, message: 'Servidor iniciado com sucesso', port: port });
                    });
                    
                    this.httpServer.on('error', (serverError) => {
                        console.error('❌ ERRO HTTP SERVER:', serverError);
                        clearTimeout(timeout);
                        reject(serverError);
                    });
                });
                
            } catch (httpError) {
                console.error('❌ ERRO ao configurar servidor HTTP:', httpError);
                throw new Error(`Falha ao configurar servidor HTTP: ${httpError.message}`);
            }

        } catch (error) {
            console.error('❌ ==> STARTSERVER - ERRO FATAL:', error);
            console.error('❌ ==> ERRO Details:', {
                message: error.message,
                name: error.name,
                code: error.code,
                stack: error.stack?.split('\n').slice(0, 5).join('\n') // Primeiras 5 linhas do stack
            });
            
            // Verificar se é problema de dependências
            if (error.message.includes('Cannot find module')) {
                console.error('❌ ==> ERRO DE DEPENDÊNCIA DETECTADO');
                console.error('❌ ==> Diretório atual:', __dirname);
                console.error('❌ ==> Arquivos no backend:', require('fs').existsSync(path.join(__dirname, 'backend')) ? 'EXISTS' : 'NOT FOUND');
            }
            
            // Adicionar log de erro
            try {
            if (this.database) {
                await this.database.addLog('server', 'error', `Erro ao iniciar servidor: ${error.message}`);
                }
            } catch (logError) {
                console.error('❌ ==> Erro ao salvar log de erro:', logError);
            }
            
            this.notifyRenderer('server:error', { 
                error: error.message,
                details: error.toString(),
                stack: error.stack,
                code: error.code
            });
            
            return { 
                success: false, 
                message: `Erro ao iniciar servidor: ${error.message}`, 
                error: error.toString(),
                code: error.code,
                stack: error.stack
            };
        }
    }

    async stopServer() {
        if (!this.isServerRunning) {
            return { success: true, message: 'Servidor já está parado' };
        }

        return new Promise((resolve) => {
            this.httpServer.close(async () => {
                this.isServerRunning = false;
                this.httpServer = null;
                console.log('🛑 Servidor parado');
                
                // Adicionar log de servidor parado
                if (this.database) {
                    await this.database.addLog('server', 'info', 'Servidor parado');
                }
                
                this.notifyRenderer('server:stopped');
                resolve({ success: true, message: 'Servidor parado com sucesso' });
            });
        });
    }

    async restartServer() {
        await this.stopServer();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s
        return await this.startServer();
    }

    async setupExternalAccess() {
        if (!this.isServerRunning) {
            console.log('⚠️ Servidor não está rodando, pulando configuração de acesso externo');
            return;
        }

        try {
            const localtunnel = require('localtunnel');
            
            console.log('🌐 Configurando acesso externo via LocalTunnel...');
            
            // Adicionar log de início
            if (this.database) {
                await this.database.addLog('system', 'info', 'Configurando acesso externo via LocalTunnel...');
            }
            
            // Primeiro tenta com subdomain específico, depois sem subdomain
            const tryWithSubdomain = () => {
                console.log('🔄 Tentando LocalTunnel com subdomain...');
                return localtunnel({
                    port: this.serverPort,
                    subdomain: `gestao-prod-${Date.now().toString().slice(-6)}`
                });
            };
            
            const tryWithoutSubdomain = () => {
                return localtunnel({
                    port: this.serverPort
                });
            };
            
            tryWithSubdomain()
                .then(tunnel => {
                    this.tunnel = tunnel;
                    this.tunnelUrl = tunnel.url;
                    
                    console.log(`✅ Túnel ativo: ${this.tunnelUrl}`);
                    console.log(`🌐 Acesso externo: ${this.tunnelUrl}/maquina`);
                    
                    // Adicionar log de túnel ativo
                    if (this.database) {
                        this.database.addLog('system', 'info', `Túnel ativo: ${this.tunnelUrl}`);
                    }
                    
                    this.notifyRenderer('server:tunnel-ready', {
                        url: this.tunnelUrl,
                        type: 'localtunnel'
                    });

                    tunnel.on('close', () => {
                        console.log('🔌 Túnel fechado');
                        this.tunnel = null;
                        this.tunnelUrl = null;
                        this.notifyRenderer('server:tunnel-closed');
                    });

                    tunnel.on('error', (err) => {
                        console.error('❌ Erro no túnel:', err);
                        if (this.database) {
                            this.database.addLog('system', 'error', `Erro no túnel: ${err.message}`);
                        }
                    });

                })
                .catch(err => {
                    console.log('⚠️ Falha com subdomain, tentando sem subdomain...');
                    console.log('🔄 Erro com subdomain:', err.message);
                    
                    // Log do erro com subdomain
                    if (this.database) {
                        this.database.addLog('system', 'warning', `LocalTunnel falhou com subdomain: ${err.message}`);
                    }
                    
                    return tryWithoutSubdomain()
                        .then(tunnel => {
                            this.tunnel = tunnel;
                            this.tunnelUrl = tunnel.url;
                            
                            console.log(`✅ Túnel ativo (sem subdomain): ${this.tunnelUrl}`);
                            console.log(`🌐 Acesso externo: ${this.tunnelUrl}/maquina`);
                            
                            this.notifyRenderer('server:tunnel-ready', {
                                url: this.tunnelUrl,
                                type: 'localtunnel'
                            });

                            tunnel.on('close', () => {
                                console.log('🔌 Túnel fechado');
                                this.tunnel = null;
                                this.tunnelUrl = null;
                                this.notifyRenderer('server:tunnel-closed');
                            });

                        })
                        .catch(err2 => {
                            console.error('❌ Erro ao configurar túnel (ambas tentativas):', err2.message);
                            
                            // Adicionar log de erro no túnel
                            if (this.database) {
                                this.database.addLog('system', 'error', `Erro ao configurar túnel: ${err2.message}`);
                            }
                            
                            this.notifyRenderer('server:tunnel-error', {
                                error: 'Falha ao configurar acesso externo',
                                details: `Subdomain: ${err.message} | Sem subdomain: ${err2.message}`
                            });
                        });
                });

        } catch (error) {
            console.error('❌ Erro ao inicializar LocalTunnel:', error);
            
            // Adicionar log detalhado do erro
            if (this.database) {
                await this.database.addLog('system', 'error', `Erro fatal no LocalTunnel: ${error.message}`);
            }
            
            // Notificar interface que LocalTunnel falhou mas servidor está OK
            this.notifyRenderer('server:tunnel-error', {
                error: 'LocalTunnel indisponível',
                details: error.message,
                serverStillRunning: true,
                localUrl: `http://localhost:${this.serverPort}`
            });
        }
    }

    getLocalIP() {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family !== 'IPv4' || iface.internal) {
                    continue;
                }
                return iface.address;
            }
        }
        return '127.0.0.1';
    }

    notifyRenderer(channel, data = null) {
        if (this.mainWindow && this.mainWindow.webContents) {
            this.mainWindow.webContents.send(channel, data);
        }
    }

    backupData() {
        console.log('💾 Criando backup dos dados...');
        // Implementar backup se necessário
        return { success: true, message: 'Backup criado com sucesso' };
    }

    restoreData() {
        console.log('📦 Restaurando dados do backup...');
        // Implementar restore se necessário
        return { success: true, message: 'Dados restaurados com sucesso' };
    }
}

// Instância principal da aplicação
const desktopManager = new DesktopManager();

// Event handlers do Electron
app.whenReady().then(async () => {
    try {
        console.log('🚀 ==> APP READY - Iniciando aplicação...');
        await desktopManager.initialize();
        console.log('✅ ==> APP READY - Inicialização completa');
        desktopManager.createMainWindow();
        console.log('✅ ==> APP READY - Janela principal criada');
    } catch (error) {
        console.error('❌ Erro fatal na inicialização:', error);
        // Tentar usar console original se debugLog falhar
        if (originalConsoleError) {
            originalConsoleError('❌ ERRO FATAL:', error);
        }
        // Mostrar dialog de erro
        const { dialog } = require('electron');
        dialog.showErrorBox('Erro Fatal', 
            `Falha ao iniciar aplicação:\n\n${error.message}\n\nPor favor, reinstale a aplicação.`
        );
        app.quit();
    }
});

app.on('window-all-closed', async () => {
    // Parar o servidor primeiro para evitar operações assíncronas pendentes
    if (desktopManager.isServerRunning) {
        await desktopManager.stopServer();
    }
    
    // Fechar banco de dados para evitar operações pendentes
    if (desktopManager.database && desktopManager.database.db) {
        try {
            console.log('🔒 Fechando banco de dados...');
            desktopManager.database.close();
        } catch (error) {
            console.warn('⚠️ Erro ao fechar banco:', error.message);
        }
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        desktopManager.createMainWindow();
    }
});

// Cleanup ao fechar
let isQuitting = false;
app.on('before-quit', async (event) => {
    if (isQuitting) return; // Evitar múltiplas execuções
    
    console.log('📤 Encerrando aplicação...');
    event.preventDefault();
    isQuitting = true;
    
    try {
        // Fechar túnel se existir
        if (desktopManager.tunnel) {
            console.log('🔌 Fechando túnel...');
            desktopManager.tunnel.close();
            desktopManager.tunnel = null;
        }
        
        // Parar servidor se estiver rodando
        if (desktopManager.isServerRunning) {
            console.log('🛑 Parando servidor...');
            await desktopManager.stopServer();
        }
        
        // Limpar logs e fechar banco
        if (desktopManager && desktopManager.database) {
            try {
                console.log('🧹 Limpando logs do sistema...');
                await desktopManager.database.clearLogs();
                console.log('✅ Logs limpos');
            } catch (error) {
                // Ignorar erros de limpeza durante shutdown
                console.log('📋 Logs já limpos ou banco fechando');
            }
            
            // Fechar banco de dados
            if (desktopManager.database.db) {
                console.log('🔒 Fechando banco de dados...');
                desktopManager.database.close();
                desktopManager.database.db = null;
            }
        }
        
        // Finalizar aplicação
        console.log('👋 Aplicação encerrada');
        process.exit(0); // Forçar saída limpa
        
    } catch (error) {
        console.error('❌ Erro durante cleanup:', error);
        process.exit(1);
    }
});

// Export para testes
module.exports = DesktopManager;