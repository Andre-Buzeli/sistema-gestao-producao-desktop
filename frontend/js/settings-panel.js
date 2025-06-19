// Settings Panel para Sistema de Gestão de Produção
// Configurações de Canais de Atualização

class SettingsPanel {
    constructor() {
        this.currentChannel = 'release';
        this.systemInfo = {};
        this.channelConfigs = {};
        
        this.init();
    }

    async init() {
        await this.loadCurrentSettings();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadCurrentSettings() {
        try {
            // Carregar canal atual
            this.currentChannel = await window.electronAPI?.invoke('config:get-update-channel') || 'release';
            
            // Carregar informações do sistema
            this.systemInfo = await window.electronAPI?.invoke('config:get-system-info') || {};
            
            // Carregar configurações dos canais
            for (const channel of ['alpha', 'beta', 'release']) {
                this.channelConfigs[channel] = await window.electronAPI?.invoke('config:get-channel-config', channel) || {};
            }
            
            console.log('⚙️ Configurações carregadas:', {
                currentChannel: this.currentChannel,
                systemInfo: this.systemInfo
            });
            
        } catch (error) {
            console.error('❌ Erro ao carregar configurações:', error);
        }
    }

    setupEventListeners() {
        // Listener para mudanças de canal
        if (window.electronAPI?.on) {
            window.electronAPI.on('config:channel-changed', (data) => {
                console.log('🔄 Canal alterado:', data);
                this.currentChannel = data.newChannel;
                this.updateUI();
                this.showChannelChangeNotification(data);
            });
        }

        // Event listeners dos elementos UI
        document.addEventListener('DOMContentLoaded', () => {
            this.setupUIEventListeners();
        });
    }

    setupUIEventListeners() {
        // Radio buttons dos canais
        const channelRadios = document.querySelectorAll('input[name="update-channel"]');
        channelRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.changeChannel(e.target.value);
                }
            });
        });

        // Botão verificar atualizações
        const checkUpdateBtn = document.getElementById('check-updates-btn');
        if (checkUpdateBtn) {
            checkUpdateBtn.addEventListener('click', () => {
                this.checkForUpdates();
            });
        }

        // Botão forçar verificação
        const forceCheckBtn = document.getElementById('force-check-btn');
        if (forceCheckBtn) {
            forceCheckBtn.addEventListener('click', () => {
                this.forceCheckForUpdates();
            });
        }
    }

    async changeChannel(newChannel) {
        try {
            // Mostrar aviso para canais de desenvolvimento
            if ((newChannel === 'alpha' || newChannel === 'beta') && !await this.showChannelWarning(newChannel)) {
                // Usuário cancelou, reverter para canal atual
                this.updateChannelRadios();
                return;
            }

            console.log(`🔄 Alterando canal de ${this.currentChannel} para ${newChannel}`);
            
            const result = await window.electronAPI?.invoke('config:set-update-channel', newChannel);
            
            if (result?.success) {
                this.currentChannel = newChannel;
                this.updateUI();
                this.showSuccessMessage(`Canal alterado para ${this.getChannelDisplayName(newChannel)}`);
                
                // Verificar atualizações automaticamente após mudança de canal
                setTimeout(() => {
                    this.checkForUpdates();
                }, 1000);
            } else {
                console.error('❌ Erro ao alterar canal:', result?.error);
                this.showErrorMessage(`Erro ao alterar canal: ${result?.error || 'Erro desconhecido'}`);
                this.updateChannelRadios(); // Reverter UI
            }
            
        } catch (error) {
            console.error('❌ Erro ao alterar canal:', error);
            this.showErrorMessage(`Erro ao alterar canal: ${error.message}`);
            this.updateChannelRadios(); // Reverter UI
        }
    }

    async showChannelWarning(channel) {
        const warnings = {
            alpha: {
                title: '⚠️ Canal Alpha - Atenção!',
                message: `O canal Alpha contém versões experimentais e não estáveis que podem conter bugs sérios, falhas de segurança e podem causar perda de dados.

• Versões podem ser instáveis e não funcionais
• Possibilidade de bugs críticos e perda de dados  
• Recursos podem ser removidos sem aviso
• Não recomendado para uso em produção

Realmente deseja continuar?`,
                confirmText: 'Sim, usar Alpha',
                cancelText: 'Cancelar'
            },
            beta: {
                title: '⚠️ Canal Beta - Cuidado!',
                message: `O canal Beta contém versões em teste que podem conter bugs e instabilidades.

• Versões em fase de teste e validação
• Possibilidade de bugs e problemas menores
• Recursos podem ser alterados
• Mais estável que Alpha, mas menos que Release

Deseja continuar?`,
                confirmText: 'Sim, usar Beta',
                cancelText: 'Cancelar'
            }
        };

        const warning = warnings[channel];
        if (!warning) return true;

        return new Promise((resolve) => {
            const modal = this.createWarningModal(warning);
            document.body.appendChild(modal);

            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const closeBtn = modal.querySelector('.close-btn');

            const cleanup = () => {
                document.body.removeChild(modal);
            };

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            closeBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            // Fechar com ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    cleanup();
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    createWarningModal(warning) {
        const modal = document.createElement('div');
        modal.className = 'warning-modal-overlay';
        modal.innerHTML = `
            <div class="warning-modal">
                <div class="warning-header">
                    <h3>${warning.title}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="warning-content">
                    <p>${warning.message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="warning-buttons">
                    <button class="cancel-btn">${warning.cancelText}</button>
                    <button class="confirm-btn warning-btn">${warning.confirmText}</button>
                </div>
            </div>
        `;

        // Adicionar estilos
        const style = document.createElement('style');
        style.textContent = `
            .warning-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .warning-modal {
                background: #1a1a1a;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                border: 2px solid #f39c12;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s ease;
            }
            
            .warning-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #2a2a2a;
                background: #f39c12;
                color: #000;
                border-radius: 10px 10px 0 0;
            }
            
            .warning-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .close-btn {
                background: none;
                border: none;
                color: #000;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }
            
            .close-btn:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .warning-content {
                padding: 20px;
                color: #ffffff;
                line-height: 1.6;
            }
            
            .warning-content p {
                margin: 0;
            }
            
            .warning-buttons {
                display: flex;
                gap: 10px;
                padding: 20px;
                justify-content: flex-end;
            }
            
            .warning-buttons button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
            }
            
            .cancel-btn {
                background: #6c757d;
                color: white;
            }
            
            .cancel-btn:hover {
                background: #5a6268;
            }
            
            .warning-btn {
                background: #dc3545;
                color: white;
            }
            
            .warning-btn:hover {
                background: #c82333;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        
        modal.appendChild(style);
        return modal;
    }

    updateUI() {
        this.updateChannelRadios();
        this.updateChannelInfo();
        this.updateSystemInfo();
    }

    updateChannelRadios() {
        const channelRadios = document.querySelectorAll('input[name="update-channel"]');
        channelRadios.forEach(radio => {
            radio.checked = (radio.value === this.currentChannel);
        });
    }

    updateChannelInfo() {
        const channelInfo = document.getElementById('channel-info');
        if (channelInfo) {
            const info = this.getChannelInfo(this.currentChannel);
            channelInfo.innerHTML = `
                <div class="channel-current">
                    <strong>Canal Atual:</strong> ${info.displayName}
                    <span class="channel-badge ${info.class}">${info.label}</span>
                </div>
                <div class="channel-description">
                    ${info.description}
                </div>
            `;
        }
    }

    updateSystemInfo() {
        const systemInfo = document.getElementById('system-info');
        if (systemInfo && this.systemInfo) {
            systemInfo.innerHTML = `
                <div class="system-item">
                    <span>Versão Atual:</span>
                    <span>${this.systemInfo.version || 'N/A'}</span>
                </div>
                <div class="system-item">
                    <span>Plataforma:</span>
                    <span>${this.systemInfo.platform || 'N/A'} ${this.systemInfo.arch || ''}</span>
                </div>
                <div class="system-item">
                    <span>Electron:</span>
                    <span>${this.systemInfo.electronVersion || 'N/A'}</span>
                </div>
                <div class="system-item">
                    <span>Desenvolvimento:</span>
                    <span>${this.systemInfo.isDevelopment ? 'Sim' : 'Não'}</span>
                </div>
            `;
        }
    }

    getChannelInfo(channel) {
        const channels = {
            alpha: {
                displayName: 'Alpha',
                label: 'EXPERIMENTAL',
                class: 'alpha',
                description: 'Versões experimentais com as últimas funcionalidades. Pode conter bugs críticos e instabilidades.'
            },
            beta: {
                displayName: 'Beta',
                label: 'TESTE',
                class: 'beta',
                description: 'Versões em fase de teste. Mais estável que Alpha, mas ainda pode conter bugs.'
            },
            release: {
                displayName: 'Release',
                label: 'ESTÁVEL',
                class: 'release',
                description: 'Versões estáveis e testadas. Recomendado para uso em produção.'
            }
        };

        return channels[channel] || channels.release;
    }

    getChannelDisplayName(channel) {
        return this.getChannelInfo(channel).displayName;
    }

    async checkForUpdates() {
        try {
            this.showInfoMessage('Verificando atualizações...');
            const result = await window.electronAPI?.invoke('updater:check');
            console.log('🔍 Resultado da verificação:', result);
        } catch (error) {
            console.error('❌ Erro ao verificar atualizações:', error);
            this.showErrorMessage(`Erro ao verificar atualizações: ${error.message}`);
        }
    }

    async forceCheckForUpdates() {
        try {
            this.showInfoMessage('Forçando verificação de atualizações...');
            const result = await window.electronAPI?.invoke('updater:force-check');
            console.log('🔍 Resultado da verificação forçada:', result);
        } catch (error) {
            console.error('❌ Erro ao verificar atualizações:', error);
            this.showErrorMessage(`Erro ao verificar atualizações: ${error.message}`);
        }
    }

    showChannelChangeNotification(data) {
        const message = `Canal alterado de ${this.getChannelDisplayName(data.oldChannel)} para ${this.getChannelDisplayName(data.newChannel)}`;
        this.showSuccessMessage(message);
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showInfoMessage(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Implementação simples de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Estilos inline para garantir funcionamento
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            max-width: 400px;
            word-wrap: break-word;
            animation: slideInRight 0.3s ease;
            ${type === 'success' ? 'background: #28a745;' : ''}
            ${type === 'error' ? 'background: #dc3545;' : ''}
            ${type === 'info' ? 'background: #17a2b8;' : ''}
        `;

        document.body.appendChild(notification);

        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
}

// CSS adicional para notificações
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .channel-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 8px;
    }
    
    .channel-badge.alpha {
        background: #dc3545;
        color: white;
    }
    
    .channel-badge.beta {
        background: #fd7e14;
        color: white;
    }
    
    .channel-badge.release {
        background: #28a745;
        color: white;
    }
    
    .channel-current {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .channel-description {
        color: #6c757d;
        font-size: 14px;
        line-height: 1.4;
    }
    
    .system-item {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid #2a2a2a;
    }
    
    .system-item:last-child {
        border-bottom: none;
    }
    
    .system-item span:first-child {
        font-weight: 500;
        color: #adb5bd;
    }
    
    .system-item span:last-child {
        color: #ffffff;
    }
`;

document.head.appendChild(notificationStyles);

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.settingsPanel = new SettingsPanel();
    });
} else {
    window.settingsPanel = new SettingsPanel();
}

// Exportar para uso global
window.SettingsPanel = SettingsPanel; 