const { app, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');

class AutoUpdaterManager {
    constructor() {
        this.isUpdating = false;
        this.updateInfo = null;
        this.progressInfo = null;
        this.listeners = new Map();
        this.configuration = {
            autoDownload: false,
            autoInstallOnAppQuit: true,
            allowDowngrade: false,
            allowPrerelease: false,
            checkInterval: 4 * 60 * 60 * 1000, // 4 horas
            initialCheckDelay: 5000 // 5 segundos após inicialização
        };
        
        this.setupLogger();
        this.setupAutoUpdater();
    }

    setupLogger() {
        // Configurar logger do electron-log
        log.transports.file.level = 'info';
        log.transports.console.level = 'info';
        log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
        log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
        
        // Definir caminho do log
        const logPath = path.join(app.getPath('userData'), 'logs', 'updater.log');
        log.transports.file.file = logPath;
        
        // Configurar logger do autoUpdater
        autoUpdater.logger = log;
        autoUpdater.logger.transports.file.level = 'info';
        
        this.log = log;
        this.log.info('🔄 AutoUpdaterManager inicializado');
    }

    setupAutoUpdater() {
        // Configurações básicas
        autoUpdater.autoDownload = this.configuration.autoDownload;
        autoUpdater.autoInstallOnAppQuit = this.configuration.autoInstallOnAppQuit;
        autoUpdater.allowDowngrade = this.configuration.allowDowngrade;
        autoUpdater.allowPrerelease = this.configuration.allowPrerelease;

        // Desabilitar em desenvolvimento
        if (!app.isPackaged) {
            this.log.warn('🔧 Modo desenvolvimento - auto-updater desabilitado');
            return;
        }

        // Configurar eventos
        this.setupEvents();
        
        // Agendar verificações automáticas
        this.scheduleChecks();
    }

    setupEvents() {
        autoUpdater.on('checking-for-update', () => {
            this.log.info('🔍 Verificando atualizações...');
            this.emit('checking-for-update');
        });

        autoUpdater.on('update-available', (info) => {
            this.log.info('📥 Atualização disponível:', JSON.stringify(info, null, 2));
            this.updateInfo = info;
            this.emit('update-available', info);
            this.handleUpdateAvailable(info);
        });

        autoUpdater.on('update-not-available', (info) => {
            this.log.info('✅ Aplicação está atualizada');
            this.emit('update-not-available', info);
        });

        autoUpdater.on('error', (error) => {
            this.log.error('❌ Erro no auto-updater:', error);
            this.isUpdating = false;
            this.emit('error', error);
            this.handleError(error);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            this.progressInfo = progressObj;
            const message = `📥 Baixando atualização: ${Math.round(progressObj.percent)}% (${this.formatBytes(progressObj.transferred)}/${this.formatBytes(progressObj.total)})`;
            this.log.info(message);
            this.emit('download-progress', progressObj);
        });

        autoUpdater.on('update-downloaded', (info) => {
            this.log.info('✅ Atualização baixada com sucesso');
            this.emit('update-downloaded', info);
            this.handleUpdateDownloaded(info);
        });
    }

    async handleUpdateAvailable(info) {
        try {
            const isPortable = this.isPortableVersion();
            
            if (isPortable) {
                await this.handlePortableUpdate(info);
            } else {
                await this.handleInstalledUpdate(info);
            }
        } catch (error) {
            this.log.error('❌ Erro ao processar atualização disponível:', error);
        }
    }

    async handlePortableUpdate(info) {
        const result = await dialog.showMessageBox(null, {
            type: 'info',
            title: 'Atualização Disponível (Versão Portável)',
            message: `Nova versão ${info.version} disponível!`,
            detail: `Versão atual: ${app.getVersion()}\nNova versão: ${info.version}\n\nComo você está usando a versão portável, é necessário baixar a nova versão manualmente.\n\nDeseja abrir a página de download?`,
            buttons: ['Abrir Download', 'Ver Detalhes', 'Mais Tarde'],
            defaultId: 0,
            cancelId: 2
        });

        if (result.response === 0) {
            await shell.openExternal(this.getReleasesUrl());
        } else if (result.response === 1) {
            await this.showUpdateDetails(info);
        }
    }

    async handleInstalledUpdate(info) {
        const result = await dialog.showMessageBox(null, {
            type: 'info',
            title: 'Atualização Disponível',
            message: `Nova versão ${info.version} disponível!`,
            detail: `Versão atual: ${app.getVersion()}\nNova versão: ${info.version}\n\nEscolha como deseja proceder:`,
            buttons: ['Baixar e Instalar', 'Ver Detalhes', 'Mais Tarde'],
            defaultId: 0,
            cancelId: 2
        });

        switch (result.response) {
            case 0:
                await this.downloadAndInstall();
                break;
            case 1:
                await this.showUpdateDetails(info);
                break;
            default:
                this.log.info('👤 Usuário optou por atualizar mais tarde');
                break;
        }
    }

    async handleUpdateDownloaded(info) {
        const result = await dialog.showMessageBox(null, {
            type: 'info',
            title: 'Atualização Pronta para Instalação',
            message: 'Atualização baixada com sucesso!',
            detail: `A versão ${info.version} foi baixada e está pronta para instalação.\n\nReiniciar o aplicativo agora para aplicar a atualização?`,
            buttons: ['Reiniciar Agora', 'Reiniciar ao Fechar', 'Mais Tarde'],
            defaultId: 0,
            cancelId: 2
        });

        switch (result.response) {
            case 0:
                this.installUpdate();
                break;
            case 1:
                autoUpdater.autoInstallOnAppQuit = true;
                this.log.info('🔄 Atualização será instalada ao fechar o aplicativo');
                break;
            default:
                this.log.info('👤 Usuário optou por instalar a atualização mais tarde');
                break;
        }
    }

    async handleError(error) {
        const isPortable = this.isPortableVersion();
        
        if (isPortable) {
            const result = await dialog.showMessageBox(null, {
                type: 'warning',
                title: 'Erro na Verificação de Atualizações',
                message: 'Não foi possível verificar atualizações automaticamente.',
                detail: `Erro: ${error.message}\n\nDeseja verificar manualmente na página de releases?`,
                buttons: ['Abrir Página', 'Tentar Novamente', 'Cancelar'],
                defaultId: 0,
                cancelId: 2
            });

            if (result.response === 0) {
                await shell.openExternal(this.getReleasesUrl());
            } else if (result.response === 1) {
                setTimeout(() => this.checkForUpdates(), 5000);
            }
        } else {
            // Para versão instalada, apenas logar o erro sem mostrar diálogo
            this.log.error('❌ Falha na verificação de atualizações, tentando novamente em 1 hora');
            setTimeout(() => this.checkForUpdates(), 60 * 60 * 1000); // 1 hora
        }
    }

    async showUpdateDetails(info) {
        const releaseNotes = info.releaseNotes || 'Nenhuma nota de versão disponível.';
        const details = `Versão: ${info.version}\nData: ${info.releaseDate || 'Não informado'}\n\nNotas da versão:\n${releaseNotes}`;
        
        await dialog.showMessageBox(null, {
            type: 'info',
            title: 'Detalhes da Atualização',
            message: `Detalhes da versão ${info.version}`,
            detail: details,
            buttons: ['OK']
        });
    }

    async downloadAndInstall() {
        try {
            this.isUpdating = true;
            this.log.info('🔄 Iniciando download da atualização...');
            this.emit('download-started');
            
            await autoUpdater.downloadUpdate();
        } catch (error) {
            this.log.error('❌ Erro ao baixar atualização:', error);
            this.isUpdating = false;
            
            await dialog.showMessageBox(null, {
                type: 'error',
                title: 'Erro no Download',
                message: 'Falha ao baixar a atualização',
                detail: `Erro: ${error.message}\n\nTente novamente mais tarde ou baixe manualmente do GitHub.`,
                buttons: ['OK']
            });
        }
    }

    installUpdate() {
        try {
            this.log.info('🔄 Instalando atualização...');
            this.saveApplicationState();
            this.emit('install-started');
            
            // Dar tempo para salvar o estado antes de fechar
            setTimeout(() => {
                autoUpdater.quitAndInstall(false, true);
            }, 1000);
        } catch (error) {
            this.log.error('❌ Erro ao instalar atualização:', error);
        }
    }

    async checkForUpdates() {
        if (!app.isPackaged) {
            this.log.info('🔧 Desenvolvimento - verificação de updates desabilitada');
            return null;
        }

        if (this.isUpdating) {
            this.log.info('🔄 Verificação já em andamento, ignorando...');
            return null;
        }

        try {
            this.log.info('🔍 Iniciando verificação de atualizações...');
            return await autoUpdater.checkForUpdatesAndNotify();
        } catch (error) {
            this.log.error('❌ Erro ao verificar atualizações:', error);
            throw error;
        }
    }

    scheduleChecks() {
        // Verificação inicial
        setTimeout(() => {
            this.checkForUpdates();
        }, this.configuration.initialCheckDelay);

        // Verificações periódicas
        setInterval(() => {
            this.checkForUpdates();
        }, this.configuration.checkInterval);

        this.log.info(`⏰ Verificações agendadas: inicial em ${this.configuration.initialCheckDelay}ms, depois a cada ${this.configuration.checkInterval}ms`);
    }

    saveApplicationState() {
        try {
            const appState = {
                timestamp: new Date().toISOString(),
                version: app.getVersion(),
                updateInfo: this.updateInfo,
                lastCheck: new Date().toISOString(),
                platform: process.platform,
                arch: process.arch
            };
            
            const userDataPath = app.getPath('userData');
            const statePath = path.join(userDataPath, 'update-state.json');
            
            fs.writeFileSync(statePath, JSON.stringify(appState, null, 2));
            this.log.info('💾 Estado da aplicação salvo antes da atualização');
            
        } catch (error) {
            this.log.error('❌ Erro ao salvar estado da aplicação:', error);
        }
    }

    isPortableVersion() {
        return process.env.PORTABLE_EXECUTABLE_DIR || 
               app.getPath('exe').includes('portable') ||
               !app.getPath('userData').includes('AppData');
    }

    getReleasesUrl() {
        return 'https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Sistema de eventos
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(listener);
    }

    off(event, listener) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, ...args) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    this.log.error(`❌ Erro no listener do evento ${event}:`, error);
                }
            });
        }
    }

    // Getters para informações do estado
    getUpdateInfo() {
        return this.updateInfo;
    }

    getProgressInfo() {
        return this.progressInfo;
    }

    getIsUpdating() {
        return this.isUpdating;
    }

    // Método para forçar verificação manual
    async forceCheckForUpdates() {
        this.isUpdating = false; // Reset flag para permitir verificação manual
        return await this.checkForUpdates();
    }
}

module.exports = AutoUpdaterManager; 