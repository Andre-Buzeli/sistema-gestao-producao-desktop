const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const Database = require('./database/database');
const express = require('express');
const localtunnel = require('localtunnel');
const sqlite3 = require('sqlite3').verbose();
const { autoUpdater } = require('electron-updater');

// Configuração do auto-updater
autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Andre-Buzeli',
    repo: 'sistema-gestao-producao-desktop'
});

// Logs do auto-updater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Desabilitar aceleração de hardware para evitar problemas de GPU
app.disableHardwareAcceleration();
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

class DesktopManager {
    constructor() {
        this.mainWindow = null;
        this.isServerRunning = false;
        this.serverPort = 3000;
        this.database = new Database();
        this.server = null;
        this.tunnel = null;
        this.tunnelUrl = null;
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando aplicação desktop...');
            await app.whenReady();
            console.log('✅ Electron pronto');
            
            console.log('🗄️ Inicializando banco de dados...');
            await this.database.initialize();
            console.log('✅ Banco de dados inicializado');
            
            console.log('📋 Configurando menu...');
            // Menu removido conforme solicitado
            Menu.setApplicationMenu(null);
            console.log('✅ Menu configurado');
            
            console.log('🔗 Configurando IPC...');
            this.setupIPC();
            console.log('✅ IPC configurado');
            
            console.log('🖥️ Criando janela principal...');
            this.createMainWindow();
            console.log('✅ Janela criada');
            
            console.log('🔄 Configurando auto-updater...');
            this.setupAutoUpdater();
            console.log('✅ Auto-updater configurado');
            
            console.log('✅ Aplicação inicializada com sucesso');
            
            // Iniciar servidor automaticamente
            console.log('🌐 Iniciando servidor...');
            await this.startServer();
            console.log('✅ Servidor iniciado com sucesso');
            
            // Aguardar 3 segundos para servidor estabilizar antes de tentar tunnel
            setTimeout(() => {
                this.setupExternalAccess();
            }, 3000);
        } catch (error) {
            console.error('❌ ERRO FATAL na inicialização:', error);
            console.error('Stack trace:', error.stack);
            app.quit();
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

        this.mainWindow.loadFile('frontend/desktop.html');

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

    setupIPC() {
        // Controle do servidor
        ipcMain.handle('server:start', () => this.startServer());
        ipcMain.handle('server:stop', () => this.stopServer());
        ipcMain.handle('server:restart', () => this.restartServer());
        ipcMain.handle('server:status', () => ({
            running: this.isServerRunning,
            port: this.serverPort,
            localIP: this.getLocalIP(),
            tunnelUrl: this.tunnelUrl
        }));

        // Gestão de dispositivos
        ipcMain.handle('devices:list', () => this.database.getDevices());
        ipcMain.handle('devices:create', (event, device) => this.database.createDevice(device));
        ipcMain.handle('devices:update', (event, id, device) => this.database.updateDevice(id, device));
        ipcMain.handle('devices:delete', (event, id) => this.database.deleteDevice(id));
        ipcMain.handle('devices:authorize', (event, id) => this.database.authorizeDevice(id));
        ipcMain.handle('devices:revoke', (event, id) => this.database.revokeDevice(id));

        // Gestão de produtos
        ipcMain.handle('products:list', () => this.database.getProducts());
        ipcMain.handle('products:create', (event, product) => this.database.createProduct(product));
        ipcMain.handle('products:update', (event, product) => this.database.updateProduct(product));
        ipcMain.handle('products:delete', (event, id) => this.database.deleteProduct(id));

        // Gestão de ordens
        ipcMain.handle('orders:list', () => this.database.getOrders());
        ipcMain.handle('orders:create', (event, order) => this.database.createOrder(order));
        ipcMain.handle('orders:update', (event, id, order) => this.database.updateOrder(id, order));
        ipcMain.handle('orders:delete', (event, id) => this.database.deleteOrder(id));
        ipcMain.handle('orders:clear-completed', () => this.database.clearCompletedOrders());

        // Logs e configurações
        ipcMain.handle('logs:list', () => this.database.getLogs());
        ipcMain.handle('logs:clear', () => this.clearLogs());
        ipcMain.handle('settings:get', () => this.database.getSettings());
        ipcMain.handle('settings:update', (event, settings) => this.database.updateSettings(settings));

        // Backup e restore
        ipcMain.handle('data:backup', () => this.backupData());
        ipcMain.handle('data:restore', () => this.restoreData());

        // Adicionar eventos IPC
        ipcMain.on('retry-tunnel', () => {
            console.log('Retry tunnel solicitado pelo usuário');
            this.setupExternalAccess();
        });

        // Auto-updater events
        ipcMain.handle('updater:check', () => this.checkForUpdates());
        ipcMain.handle('updater:download', () => this.downloadUpdate());
        ipcMain.handle('updater:install', () => this.installUpdate());
    }

    setupAutoUpdater() {
        // Auto-updater events
        autoUpdater.on('checking-for-update', () => {
            console.log('🔍 Verificando atualizações...');
            this.notifyRenderer('updater:checking');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('📥 Atualização disponível:', info.version);
            this.notifyRenderer('updater:available', info);
            
            // Perguntar ao usuário se quer baixar
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Atualização Disponível',
                message: `Nova versão ${info.version} disponível!`,
                detail: 'Deseja baixar e instalar agora?',
                buttons: ['Sim', 'Mais tarde'],
                defaultId: 0
            }).then(result => {
                if (result.response === 0) {
                    autoUpdater.downloadUpdate();
                }
            });
        });

        autoUpdater.on('update-not-available', () => {
            console.log('✅ Aplicação está atualizada');
            this.notifyRenderer('updater:not-available');
        });

        autoUpdater.on('error', (err) => {
            console.error('❌ Erro no auto-updater:', err);
            this.notifyRenderer('updater:error', err.message);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            const msg = `Baixando ${Math.round(progressObj.percent)}%`;
            console.log('📥', msg);
            this.notifyRenderer('updater:progress', progressObj);
        });

        autoUpdater.on('update-downloaded', () => {
            console.log('✅ Atualização baixada');
            this.notifyRenderer('updater:downloaded');
            
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Atualização Pronta',
                message: 'Atualização baixada com sucesso!',
                detail: 'Reiniciar agora para aplicar a atualização?',
                buttons: ['Reiniciar', 'Mais tarde'],
                defaultId: 0
            }).then(result => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });

        // Verificar atualizações automaticamente (apenas em produção)
        if (!app.isPackaged) {
            console.log('🔧 Modo desenvolvimento - auto-updater desabilitado');
            return;
        }

        // Verificar atualizações na inicialização
        setTimeout(() => {
            this.checkForUpdates();
        }, 5000);

        // Verificar atualizações a cada 4 horas
        setInterval(() => {
            this.checkForUpdates();
        }, 4 * 60 * 60 * 1000);
    }

    async checkForUpdates() {
        if (!app.isPackaged) {
            console.log('🔧 Desenvolvimento - verificação de updates desabilitada');
            return;
        }

        try {
            return await autoUpdater.checkForUpdatesAndNotify();
        } catch (error) {
            console.error('❌ Erro ao verificar atualizações:', error);
            throw error;
        }
    }

    async downloadUpdate() {
        try {
            return await autoUpdater.downloadUpdate();
        } catch (error) {
            console.error('❌ Erro ao baixar atualização:', error);
            throw error;
        }
    }

    installUpdate() {
        autoUpdater.quitAndInstall();
    }

    async startServer() {
        if (this.isServerRunning) {
            return { success: false, message: 'Servidor já está rodando' };
        }

        try {
            const express = require('express');
            const http = require('http');
            const path = require('path');
            const os = require('os');

            this.server = express();
            
            // Middleware para parsing JSON
            this.server.use(express.json());

            // Rota para autorização de dispositivos
            this.server.post('/api/device/register', async (req, res) => {
                try {
                    const { deviceId, deviceName, userAgent } = req.body;
                    const ip = req.ip || req.connection.remoteAddress;
                    
                    console.log(`📱 Tentativa de registro: ${deviceId} (${deviceName}) de ${ip}`);
                    
                    // Verificar se dispositivo já existe
                    const existingDevice = await this.database.getQuery(
                        'SELECT * FROM devices WHERE device_id = ?', [deviceId]
                    );
                    
                    if (existingDevice) {
                        if (existingDevice.status === 'authorized') {
                            res.json({ authorized: true, message: 'Dispositivo já autorizado' });
                        } else {
                            res.json({ authorized: false, message: 'Dispositivo pendente de autorização' });
                        }
                    } else {
                        // Criar novo dispositivo
                        await this.database.createDevice({
                            device_id: deviceId,
                            name: deviceName || `Dispositivo ${deviceId}`,
                            type: 'tablet',
                            ip: ip,
                            user_agent: userAgent
                        });
                        
                        res.json({ authorized: false, message: 'Dispositivo registrado, aguardando autorização' });
                        
                        // Notificar interface desktop
                        this.notifyRenderer('device:new', {
                            deviceId,
                            deviceName,
                            ip
                        });
                    }
                } catch (error) {
                    console.error('Erro ao registrar dispositivo:', error);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            });

            // Rota para verificar status de autorização
            this.server.get('/api/device/status/:deviceId', async (req, res) => {
                try {
                    const { deviceId } = req.params;
                    const device = await this.database.getQuery(
                        'SELECT * FROM devices WHERE device_id = ?', [deviceId]
                    );
                    
                    if (device && device.status === 'authorized') {
                        res.json({ authorized: true });
                    } else {
                        res.json({ authorized: false });
                    }
                } catch (error) {
                    console.error('Erro ao verificar status:', error);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            });

            // Middleware de autenticação global - protege todas as rotas exceto /auth e /api
            this.server.use((req, res, next) => {
                // Permitir apenas rotas de autenticação e API
                if (req.path === '/auth' || req.path.startsWith('/api/')) {
                    return next();
                }
                
                // Para qualquer outra rota (incluindo /), redirecionar para auth
                res.redirect('/auth');
            });

            // Rota para página inicial - sempre redireciona para autorização
            this.server.get('/', (req, res) => {
                res.redirect('/auth');
            });

            // Rota para página de autorização
            this.server.get('/auth', (req, res) => {
                res.sendFile(path.join(__dirname, 'frontend/auth.html'));
            });

            // Servir arquivos estáticos APENAS para arquivos específicos de autorização
            this.server.use('/css', express.static(path.join(__dirname, 'frontend/css')));
            this.server.use('/js', express.static(path.join(__dirname, 'frontend/js')));
            this.server.use('/img', express.static(path.join(__dirname, 'frontend/img')));

            // Middleware de autorização para /maquina - APENAS para verificação de autorização
            async function checkMaquinaAuth(req, res, next) {
                const deviceId = req.query.deviceId || req.params.deviceId;
                
                if (!deviceId) {
                    return res.redirect('/auth');
                }
                
                try {
                    const device = await this.database.getQuery(
                        'SELECT * FROM devices WHERE device_id = ?', [deviceId]
                    );
                    
                    if (!device || device.status !== 'authorized') {
                        return res.redirect('/auth');
                    }
                    
                    // Atualizar último acesso
                    await this.database.runQuery(
                        'UPDATE devices SET last_activity = CURRENT_TIMESTAMP WHERE device_id = ?',
                        [deviceId]
                    );
                    
                    next();
                } catch (error) {
                    console.error('Erro na verificação de autorização:', error);
                    res.status(500).send('Erro interno do servidor');
                }
            }

            // Rota para servir o terminal máquina (só para dispositivos autorizados)
            this.server.get('/maquina', checkMaquinaAuth.bind(this), (req, res) => {
                // Ler o arquivo index.html e modificar os caminhos dos recursos
                const fs = require('fs');
                let htmlContent = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');
                
                // Substituir os caminhos relativos pelos caminhos absolutos corretos para /maquina
                htmlContent = htmlContent.replace(/href="css\//g, 'href="/maquina/css/');
                htmlContent = htmlContent.replace(/src="js\//g, 'src="/maquina/js/');
                htmlContent = htmlContent.replace(/src="img\//g, 'src="/maquina/img/');
                htmlContent = htmlContent.replace(/href="manifest\.json"/g, 'href="/maquina/manifest.json"');
                
                res.send(htmlContent);
            });

            // Servir arquivos estáticos para rotas autenticadas - aplica middleware às rotas estáticas também
            this.server.use('/maquina/css', checkMaquinaAuth.bind(this), express.static(path.join(__dirname, 'frontend/css')));
            this.server.use('/maquina/js', checkMaquinaAuth.bind(this), express.static(path.join(__dirname, 'frontend/js')));
            this.server.use('/maquina/img', checkMaquinaAuth.bind(this), express.static(path.join(__dirname, 'frontend/img')));
            this.server.use('/maquina/manifest.json', checkMaquinaAuth.bind(this), (req, res) => {
                res.sendFile(path.join(__dirname, 'frontend/manifest.json'));
            });

            // API para receber dados de ordens concluídas
            this.server.post('/api/order/complete', async (req, res) => {
                try {
                    const { orderCode, products, operator, deviceId } = req.body;
                    
                    console.log(`📋 Ordem concluída recebida: ${orderCode}`);
                    
                    // Salvar ordem no banco
                    const result = await this.database.createOrder({
                        order_code: orderCode,
                        products_data: products,
                        device_id: deviceId,
                        operator: operator,
                        notes: `Ordem concluída em ${new Date().toLocaleString()}`
                    });
                    
                    if (result.success) {
                        // Notificar interface desktop
                        this.notifyRenderer('order:completed', {
                            orderCode,
                            products,
                            operator
                        });
                        
                        res.json({ success: true, message: 'Ordem registrada com sucesso' });
                    } else {
                        res.status(500).json({ success: false, message: 'Erro ao salvar ordem' });
                    }
                } catch (error) {
                    console.error('Erro ao processar ordem:', error);
                    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
                }
            });

            // Iniciar servidor HTTP
            this.httpServer = http.createServer(this.server);
            
            await new Promise((resolve, reject) => {
                this.httpServer.listen(this.serverPort, '0.0.0.0', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            this.isServerRunning = true;
            
            // Obter IP da rede local
            const localIP = this.getLocalIP();
            
            await this.database.addLog('system', 'info', `Servidor HTTP iniciado em http://${localIP}:${this.serverPort}`);
            this.notifyRenderer('server:status', { 
                running: true, 
                port: this.serverPort,
                localIP: localIP
            });
            
            console.log(`✅ Servidor HTTP iniciado: http://${localIP}:${this.serverPort}`);
            console.log(`📱 Terminal máquina: http://${localIP}:${this.serverPort}/maquina`);
            
            // Iniciar localtunnel
            this.startTunnel();
            
            return { success: true, message: 'Servidor iniciado com sucesso' };
        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
            this.isServerRunning = false;
            try {
                await this.database.addLog('system', 'error', `Erro ao iniciar servidor: ${error.message}`);
            } catch (logError) {
                console.error('Erro ao fazer log:', logError);
            }
            return { success: false, message: `Erro: ${error.message}` };
        }
    }

    getLocalIP() {
        const interfaces = require('os').networkInterfaces();
        for (const interfaceName in interfaces) {
            const interfaceInfo = interfaces[interfaceName];
            for (const info of interfaceInfo) {
                if (info.family === 'IPv4' && !info.internal) {
                    return info.address;
                }
            }
        }
        return 'localhost';
    }

    async stopServer() {
        if (!this.isServerRunning) {
            return { success: false, message: 'Servidor não está rodando' };
        }

        try {
            // Fechar localtunnel se existir
            if (this.tunnel) {
                this.tunnel.close();
                this.tunnel = null;
                this.tunnelUrl = null;
                console.log('🔌 Localtunnel fechado');
            }
            
            // Fechar servidor HTTP se existir
            if (this.httpServer) {
                await new Promise((resolve) => {
                    this.httpServer.close(() => {
                        console.log('🛑 Servidor HTTP fechado');
                        resolve();
                    });
                });
                this.httpServer = null;
            }
            
            this.isServerRunning = false;
            await this.database.addLog('system', 'info', 'Servidor HTTP parado');
            this.notifyRenderer('server:status', { running: false });
            
            console.log('✅ Servidor parado com sucesso');
            return { success: true, message: 'Servidor parado com sucesso' };
        } catch (error) {
            console.error('❌ Erro ao parar servidor:', error);
            try {
                await this.database.addLog('system', 'error', `Erro ao parar servidor: ${error.message}`);
            } catch (logError) {
                console.error('Erro ao fazer log:', logError);
            }
            return { success: false, message: `Erro: ${error.message}` };
        }
    }

    async restartServer() {
        await this.stopServer();
        setTimeout(() => this.startServer(), 2000);
    }

    notifyRenderer(event, data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(event, data);
        }
    }

    async backupData() {
        // Implementar backup dos dados SQLite
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(__dirname, 'backups', `backup-${timestamp}.db`);
        
        // Criar pasta de backup se não existir
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Copiar arquivo de banco
        fs.copyFileSync(this.database.dbPath, backupPath);
        await this.database.addLog('system', 'info', `Backup criado: ${backupPath}`);
        
        return { success: true, path: backupPath };
    }

    async restoreData() {
        // Implementar restore dos dados
        // Por enquanto, apenas log
        await this.database.addLog('system', 'info', 'Função de restore será implementada');
    }

    async clearLogs() {
        await this.database.clearLogs();
        this.notifyRenderer('logs:cleared');
    }

    showAbout() {
        // Implementar modal sobre
        this.notifyRenderer('show:about');
    }

    showLogs() {
        // Implementar visualizador de logs
        this.notifyRenderer('show:logs');
    }

    async startTunnel() {
        setTimeout(async () => {
            try {
                console.log('🌐 Iniciando localtunnel...');
                
                // Tentar com subdomínio primeiro (timeout 10s)
                try {
                    this.tunnel = await Promise.race([
                        localtunnel({ 
                            port: this.serverPort,
                            subdomain: 'acesso-producao'
                        }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout')), 10000)
                        )
                    ]);
                    console.log(`🌍 Acesso externo (subdomínio): ${this.tunnel.url}`);
                } catch (subdomainError) {
                    console.log('⚠️ Subdomínio falhou, tentando URL aleatória...');
                    
                    // Tentar sem subdomínio (timeout 10s)
                    try {
                        this.tunnel = await Promise.race([
                            localtunnel({ port: this.serverPort }),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Timeout')), 10000)
                            )
                        ]);
                        console.log(`🌍 Acesso externo (aleatório): ${this.tunnel.url}`);
                    } catch (randomError) {
                        throw new Error('Ambas tentativas falharam');
                    }
                }
                
                this.tunnelUrl = this.tunnel.url;
                await this.database.addLog('system', 'info', `Localtunnel iniciado: ${this.tunnelUrl}`);
                
                this.tunnel.on('close', () => {
                    console.log('🔌 Localtunnel fechado');
                    this.tunnelUrl = null;
                    this.notifyRenderer('server:tunnel-closed', {});
                });
                
                this.tunnel.on('error', (err) => {
                    console.error('❌ Erro no localtunnel:', err);
                    this.tunnelUrl = null;
                    this.notifyRenderer('server:tunnel-error', { error: err.message });
                });
                
                // Notificar interface com URLs
                this.notifyRenderer('server:tunnel-ready', { 
                    tunnelUrl: this.tunnelUrl
                });
                
            } catch (tunnelError) {
                console.warn('⚠️ Tunnel externo indisponível:', tunnelError.message);
                await this.database.addLog('system', 'warning', `Tunnel externo indisponível: ${tunnelError.message}`);
                
                // Notificar interface que tunnel falhou
                this.notifyRenderer('server:tunnel-error', { 
                    error: 'Serviço indisponível'
                });
            }
        }, 3000); // Aguardar 3s para estabilizar servidor
    }

    async setupExternalAccess() {
        // Verificar se mainWindow existe antes de enviar mensagens
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            console.log('⚠️ MainWindow não disponível para tunnel');
            return;
        }
        
        // Notificar que está tentando LocalTunnel
        this.mainWindow.webContents.send('server:tunnel-attempting', {
            service: 'LocalTunnel',
            attempt: 1
        });
        
        try {
            console.log('Tentando LocalTunnel...');
            const url = await this.tryLocaltunnel();
            
            this.mainWindow.webContents.send('server:tunnel-ready', {
                url,
                type: 'localtunnel'
            });
            
            console.log(`LocalTunnel ativo: ${url}`);
            
        } catch (error) {
            console.log('LocalTunnel falhou:', error.message);
            
            this.mainWindow.webContents.send('server:tunnel-error', {
                error: 'LocalTunnel indisponível',
                details: 'Não foi possível estabelecer conexão com localtunnel.me'
            });
        }
    }

    async tryLocaltunnel() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('LocalTunnel timeout (10s)'));
            }, 10000); // 10 segundos timeout

            const tunnel = localtunnel({
                port: this.serverPort,
                subdomain: 'acesso-producao'
            });

            tunnel.then((tunnelInstance) => {
                clearTimeout(timeout);
                this.tunnel = tunnelInstance;
                
                tunnelInstance.on('close', () => {
                    console.log('LocalTunnel fechado');
                    this.tunnel = null;
                });

                tunnelInstance.on('error', (err) => {
                    console.error('Erro no LocalTunnel:', err);
                    if (this.tunnel) {
                        this.tunnel.close();
                    }
                });

                resolve(tunnelInstance.url);
            }).catch((err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
}

// Inicializar app
const desktopManager = new DesktopManager();

app.on('ready', async () => {
    desktopManager.createMainWindow();
    
    // Aguardar um pouco para a janela carregar completamente
    setTimeout(() => {
        desktopManager.initialize();
    }, 1000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        desktopManager.createMainWindow();
    }
});

// Prevenir multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (desktopManager.mainWindow) {
            if (desktopManager.mainWindow.isMinimized()) {
                desktopManager.mainWindow.restore();
            }
            desktopManager.mainWindow.focus();
        }
    });
}