const { app, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');
const https = require('https');
const ConfigManager = require('./config-manager');

class AutoUpdaterManager {
    constructor(configManager = null) {
        this.configManager = configManager;
        this.isUpdating = false;
        this.updateInfo = null;
        this.progressInfo = null;
        this.listeners = new Map();
        this.lastCheckTime = null;
        this.availableReleases = new Map(); // Cache de releases disponíveis por canal
        
        // Configuração será carregada do ConfigManager
        this.configuration = {
            autoDownload: false,
            autoInstallOnAppQuit: true,
            allowDowngrade: false,
            allowPrerelease: false,
            checkInterval: 4 * 60 * 60 * 1000, // 4 horas
            initialCheckDelay: 5000, // 5 segundos após inicialização
            githubRepo: 'Andre-Buzeli/sistema-gestao-producao-desktop'
        };
        
        this.setupLogger();
        this.initializeWithConfig();
    }

    async initializeWithConfig() {
        // Se não foi passado ConfigManager, criar um temporário
        if (!this.configManager) {
            this.configManager = new ConfigManager();
            await this.configManager.initialize();
        }
        
        // Carregar configurações do canal
        this.loadConfigurationFromManager();
        
        this.setupLogger();
        this.setupAutoUpdater();
    }

    loadConfigurationFromManager() {
        if (!this.configManager) return;
        
        const config = this.configManager.getAll();
        
        // Atualizar configuração baseada no ConfigManager
        this.configuration.autoDownload = config.autoUpdate && config.channelConfig[config.updateChannel]?.autoInstall;
        this.configuration.autoInstallOnAppQuit = config.autoInstallOnQuit;
        this.configuration.allowPrerelease = config.channelConfig[config.updateChannel]?.acceptPrerelease || false;
        this.configuration.checkInterval = config.checkUpdateInterval;
        
        this.log && this.log.info('🔧 Configuração carregada do ConfigManager:', {
            channel: config.updateChannel,
            autoDownload: this.configuration.autoDownload,
            allowPrerelease: this.configuration.allowPrerelease
        });
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
        
        this.log = log.scope('AutoUpdater');
        this.log.info('🔄 AutoUpdaterManager inicializado com suporte a canais');
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
            this.lastCheckTime = new Date();
            this.log.info('🔍 Iniciando verificação inteligente de atualizações...');
            
            // Recarregar configuração antes de verificar
            this.loadConfigurationFromManager();
            
            const currentChannel = this.configManager.getUpdateChannel();
            this.log.info(`📡 Verificando canal: ${currentChannel}`);
            
            // Verificar releases do GitHub primeiro
            const githubReleases = await this.fetchGitHubReleases();
            const channelUpdate = this.findUpdateForChannel(githubReleases, currentChannel);
            
            if (channelUpdate) {
                this.log.info('📥 Atualização encontrada via GitHub:', {
                    version: channelUpdate.tag_name,
                    channel: currentChannel,
                    prerelease: channelUpdate.prerelease
                });
                
                this.updateInfo = this.convertGitHubReleaseToUpdateInfo(channelUpdate);
                this.emit('update-available', this.updateInfo);
                await this.handleUpdateAvailable(this.updateInfo);
                return this.updateInfo;
            }
            
            // Fallback para electron-updater padrão se não encontrou no GitHub
            this.log.info('🔄 Fallback para electron-updater padrão...');
            return await autoUpdater.checkForUpdatesAndNotify();
            
        } catch (error) {
            this.log.error('❌ Erro ao verificar atualizações:', error);
            // Fallback para método padrão em caso de erro
            try {
                return await autoUpdater.checkForUpdatesAndNotify();
            } catch (fallbackError) {
                this.log.error('❌ Erro também no fallback:', fallbackError);
                throw error;
            }
        }
    }

    async fetchGitHubReleases() {
        return new Promise((resolve, reject) => {
            const url = `https://api.github.com/repos/${this.configuration.githubRepo}/releases`;
            
            this.log.info('🌐 Buscando releases do GitHub:', url);
            
            const req = https.get(url, {
                headers: {
                    'User-Agent': 'Sistema-Gestao-Producao-Desktop',
                    'Accept': 'application/vnd.github.v3+json'
                }
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const releases = JSON.parse(data);
                            this.log.info(`✅ ${releases.length} releases encontradas no GitHub`);
                            resolve(releases);
                        } else {
                            this.log.error(`❌ Erro HTTP ${res.statusCode} ao buscar releases`);
                            reject(new Error(`HTTP ${res.statusCode}`));
                        }
                    } catch (parseError) {
                        this.log.error('❌ Erro ao parsear resposta do GitHub:', parseError);
                        reject(parseError);
                    }
                });
            });
            
            req.on('error', (error) => {
                this.log.error('❌ Erro de rede ao buscar releases:', error);
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout na requisição do GitHub'));
            });
        });
    }

    findUpdateForChannel(releases, channel) {
        if (!releases || releases.length === 0) {
            this.log.info('📭 Nenhuma release encontrada');
            return null;
        }
        
        const currentVersion = app.getVersion();
        const channelConfig = this.configManager.getChannelConfig(channel);
        
        this.log.info('🔍 Procurando atualização:', {
            currentVersion,
            channel,
            acceptPrerelease: channelConfig.acceptPrerelease,
            tagPattern: channelConfig.tagPattern.toString()
        });
        
        // Filtrar releases baseado no canal
        const validReleases = releases.filter(release => {
            // Verificar se é o tipo correto de release para o canal
            if (channel === 'release') {
                return !release.prerelease && !release.draft;
            } else {
                // Para alpha e beta, precisa ser prerelease
                if (!release.prerelease || release.draft) return false;
                
                // Verificar se a tag corresponde ao padrão do canal
                return channelConfig.tagPattern.test(release.tag_name);
            }
        });
        
        this.log.info(`📋 ${validReleases.length} releases válidas para canal ${channel}`);
        
        if (validReleases.length === 0) {
            return null;
        }
        
        // Encontrar a release mais recente que seja superior à versão atual
        const newerReleases = validReleases.filter(release => {
            return this.isVersionNewer(release.tag_name, currentVersion);
        });
        
        if (newerReleases.length === 0) {
            this.log.info('✅ Versão atual está atualizada para o canal');
            return null;
        }
        
        // Retornar a release mais recente
        const latestRelease = newerReleases[0]; // Releases já vêm ordenadas por data
        this.log.info('🎯 Atualização encontrada:', {
            from: currentVersion,
            to: latestRelease.tag_name,
            channel,
            url: latestRelease.html_url
        });
        
        return latestRelease;
    }

    isVersionNewer(newVersion, currentVersion) {
        // Remover 'v' do início se presente
        const cleanNew = newVersion.replace(/^v/, '');
        const cleanCurrent = currentVersion.replace(/^v/, '');
        
        // Split em partes (major.minor.patch)
        const newParts = cleanNew.split('.').map(part => {
            // Extrair apenas números (ignorar sufixos como -alpha, -beta)
            const match = part.match(/^\d+/);
            return match ? parseInt(match[0]) : 0;
        });
        
        const currentParts = cleanCurrent.split('.').map(part => {
            const match = part.match(/^\d+/);
            return match ? parseInt(match[0]) : 0;
        });
        
        // Garantir que ambas tenham 3 partes
        while (newParts.length < 3) newParts.push(0);
        while (currentParts.length < 3) currentParts.push(0);
        
        // Comparar parte por parte
        for (let i = 0; i < 3; i++) {
            if (newParts[i] > currentParts[i]) return true;
            if (newParts[i] < currentParts[i]) return false;
        }
        
        // Se chegou aqui, as versões são iguais em major.minor.patch
        // Para alpha/beta, considerar como "newer" se a tag for diferente
        if (newVersion !== currentVersion) {
            // Se a nova versão tem sufixo e a atual não, não é "newer"
            if (cleanNew.includes('-') && !cleanCurrent.includes('-')) {
                return false;
            }
            // Se a atual tem sufixo e a nova não, é "newer"
            if (!cleanNew.includes('-') && cleanCurrent.includes('-')) {
                return true;
            }
            // Ambas têm ou não têm sufixo, considerar different como newer para pre-releases
            return cleanNew !== cleanCurrent;
        }
        
        return false;
    }

    convertGitHubReleaseToUpdateInfo(release) {
        return {
            version: release.tag_name.replace(/^v/, ''),
            files: release.assets ? release.assets.map(asset => ({
                url: asset.browser_download_url,
                size: asset.size
            })) : [],
            path: null,
            sha512: null,
            releaseDate: release.published_at,
            releaseNotes: release.body || 'Nenhuma nota de versão disponível.',
            releaseName: release.name || release.tag_name,
            releaseNotesFile: null,
            stagingPercentage: 100,
            githubArtifactUrl: release.html_url,
            prerelease: release.prerelease,
            channel: this.determineChannelFromRelease(release)
        };
    }

    determineChannelFromRelease(release) {
        if (!release.prerelease) return 'release';
        
        const tagName = release.tag_name.toLowerCase();
        if (/alpha|preview|experimental/.test(tagName)) return 'alpha';
        if (/beta|rc|candidate/.test(tagName)) return 'beta';
        
        return 'release';
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