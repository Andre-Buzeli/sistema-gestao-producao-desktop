const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const log = require('electron-log');

class ConfigManager {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'app-config.json');
        this.config = null;
        this.defaultConfig = {
            // Sistema de atualizações
            updateChannel: 'release', // 'alpha', 'beta', 'release'
            autoUpdate: true,
            autoInstallOnQuit: true,
            checkUpdateInterval: 4 * 60 * 60 * 1000, // 4 horas
            
            // Configurações do servidor
            serverPort: 3000,
            autoStartServer: false,
            enableTunnel: true,
            
            // Configurações de segurança
            deviceAuthRequired: true,
            maxDevices: 10,
            sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
            
            // Configurações da UI
            theme: 'dark',
            showAdvancedOptions: false,
            enableDebugMode: false,
            
            // Configurações de dados
            backupInterval: 7 * 24 * 60 * 60 * 1000, // 7 dias
            maxLogSize: 10 * 1024 * 1024, // 10MB
            dataRetentionDays: 90,
            
            // Configurações de rede
            networkTimeout: 30000,
            retryAttempts: 3,
            
            // Configurações específicas do canal
            channelConfig: {
                alpha: {
                    enabled: false,
                    acceptPrerelease: true,
                    tagPattern: /alpha|preview|experimental/i,
                    autoInstall: false,
                    warningShown: false
                },
                beta: {
                    enabled: false,
                    acceptPrerelease: true,
                    tagPattern: /beta|rc|candidate/i,
                    autoInstall: false,
                    warningShown: false
                },
                release: {
                    enabled: true,
                    acceptPrerelease: false,
                    tagPattern: /^v?\d+\.\d+\.\d+$/,
                    autoInstall: true,
                    warningShown: false
                }
            },
            
            // Metadados
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            installationId: this.generateInstallationId()
        };
        
        this.log = log.scope('ConfigManager');
    }

    generateInstallationId() {
        return `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async initialize() {
        try {
            await this.loadConfig();
            this.log.info('✅ ConfigManager inicializado');
        } catch (error) {
            this.log.error('❌ Erro ao inicializar ConfigManager:', error);
            throw error;
        }
    }

    async loadConfig() {
        try {
            const configExists = await this.fileExists(this.configPath);
            
            if (configExists) {
                const configData = await fs.readFile(this.configPath, 'utf8');
                const loadedConfig = JSON.parse(configData);
                
                // Merge com configurações padrão para garantir que novos campos existam
                this.config = this.mergeConfigs(this.defaultConfig, loadedConfig);
                
                // Migrar configurações antigas se necessário
                await this.migrateConfig();
                
                this.log.info('📋 Configuração carregada do arquivo');
            } else {
                this.config = { ...this.defaultConfig };
                await this.saveConfig();
                this.log.info('📋 Configuração padrão criada');
            }
            
            // Validar configuração
            this.validateConfig();
            
        } catch (error) {
            this.log.error('❌ Erro ao carregar configuração:', error);
            this.log.info('🔄 Usando configuração padrão');
            this.config = { ...this.defaultConfig };
        }
    }

    async saveConfig() {
        try {
            this.config.lastUpdated = new Date().toISOString();
            
            // Criar diretório se não existir
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
            this.log.info('💾 Configuração salva');
        } catch (error) {
            this.log.error('❌ Erro ao salvar configuração:', error);
            throw error;
        }
    }

    mergeConfigs(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (typeof defaultConfig[key] === 'object' && defaultConfig[key] !== null && !Array.isArray(defaultConfig[key])) {
                merged[key] = this.mergeConfigs(defaultConfig[key], userConfig[key]);
            } else {
                merged[key] = userConfig[key];
            }
        }
        
        return merged;
    }

    validateConfig() {
        // Validar canal de atualização
        const validChannels = ['alpha', 'beta', 'release'];
        if (!validChannels.includes(this.config.updateChannel)) {
            this.log.warn(`⚠️ Canal inválido: ${this.config.updateChannel}, usando 'release'`);
            this.config.updateChannel = 'release';
        }
        
        // Validar porta do servidor
        if (this.config.serverPort < 1024 || this.config.serverPort > 65535) {
            this.log.warn(`⚠️ Porta inválida: ${this.config.serverPort}, usando 3000`);
            this.config.serverPort = 3000;
        }
        
        // Outras validações...
        this.log.info('✅ Configuração validada');
    }

    async migrateConfig() {
        let migrated = false;
        
        // Exemplo de migração - adicionar novos campos se não existirem
        if (!this.config.channelConfig) {
            this.config.channelConfig = this.defaultConfig.channelConfig;
            migrated = true;
        }
        
        if (!this.config.installationId) {
            this.config.installationId = this.generateInstallationId();
            migrated = true;
        }
        
        if (migrated) {
            await this.saveConfig();
            this.log.info('🔄 Configuração migrada');
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Getters para configurações específicas
    getUpdateChannel() {
        return this.config.updateChannel;
    }

    getChannelConfig(channel = null) {
        const targetChannel = channel || this.config.updateChannel;
        return this.config.channelConfig[targetChannel] || this.config.channelConfig.release;
    }

    isChannelEnabled(channel) {
        const channelConfig = this.getChannelConfig(channel);
        return channelConfig.enabled;
    }

    getServerConfig() {
        return {
            port: this.config.serverPort,
            autoStart: this.config.autoStartServer,
            enableTunnel: this.config.enableTunnel
        };
    }

    getSecurityConfig() {
        return {
            deviceAuthRequired: this.config.deviceAuthRequired,
            maxDevices: this.config.maxDevices,
            sessionTimeout: this.config.sessionTimeout
        };
    }

    // Setters para configurações específicas
    async setUpdateChannel(channel) {
        if (!['alpha', 'beta', 'release'].includes(channel)) {
            throw new Error(`Canal inválido: ${channel}`);
        }
        
        const oldChannel = this.config.updateChannel;
        this.config.updateChannel = channel;
        
        // Habilitar/desabilitar canais conforme necessário
        this.config.channelConfig.alpha.enabled = (channel === 'alpha');
        this.config.channelConfig.beta.enabled = (channel === 'beta');
        this.config.channelConfig.release.enabled = true; // Release sempre habilitado
        
        await this.saveConfig();
        
        this.log.info(`🔄 Canal de atualização alterado: ${oldChannel} → ${channel}`);
        
        return {
            oldChannel,
            newChannel: channel,
            config: this.getChannelConfig(channel)
        };
    }

    async updateConfig(updates) {
        try {
            // Aplicar atualizações
            for (const [key, value] of Object.entries(updates)) {
                if (key in this.config) {
                    this.config[key] = value;
                }
            }
            
            // Validar e salvar
            this.validateConfig();
            await this.saveConfig();
            
            this.log.info('✅ Configuração atualizada:', Object.keys(updates));
            return { success: true };
            
        } catch (error) {
            this.log.error('❌ Erro ao atualizar configuração:', error);
            return { success: false, error: error.message };
        }
    }

    // Métodos utilitários
    get(key, defaultValue = null) {
        return this.config[key] !== undefined ? this.config[key] : defaultValue;
    }

    async set(key, value) {
        this.config[key] = value;
        await this.saveConfig();
    }

    getAll() {
        return { ...this.config };
    }

    // Configurações específicas de desenvolvimento/produção
    isDevelopment() {
        return !app.isPackaged;
    }

    isDebugMode() {
        return this.config.enableDebugMode || this.isDevelopment();
    }

    shouldShowAdvancedOptions() {
        return this.config.showAdvancedOptions || this.isDevelopment();
    }

    // Informações do sistema
    getSystemInfo() {
        return {
            version: app.getVersion(),
            electronVersion: process.versions.electron,
            nodeVersion: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            installationId: this.config.installationId,
            updateChannel: this.config.updateChannel,
            isDevelopment: this.isDevelopment(),
            configPath: this.configPath
        };
    }

    // Reset de configurações
    async resetToDefault() {
        this.config = { ...this.defaultConfig };
        this.config.installationId = this.generateInstallationId();
        await this.saveConfig();
        this.log.info('🔄 Configuração resetada para padrão');
    }

    // Backup e restore
    async createBackup() {
        const backupPath = this.configPath + '.backup.' + Date.now();
        await fs.copyFile(this.configPath, backupPath);
        this.log.info('💾 Backup da configuração criado:', backupPath);
        return backupPath;
    }

    async restoreBackup(backupPath) {
        await fs.copyFile(backupPath, this.configPath);
        await this.loadConfig();
        this.log.info('🔄 Configuração restaurada do backup');
    }
}

module.exports = ConfigManager; 