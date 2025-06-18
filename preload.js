const { contextBridge, ipcRenderer } = require('electron');

// API segura para comunicação com o main process
contextBridge.exposeInMainWorld('electronAPI', {
    // Método invoke simplificado
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
      // Controle do servidor
    server: {
        start: () => ipcRenderer.invoke('server:start'),
        stop: () => ipcRenderer.invoke('server:stop'),
        restart: () => ipcRenderer.invoke('server:restart'),
        getStatus: () => ipcRenderer.invoke('server:status'),
        onStatusChange: (callback) => {
            ipcRenderer.on('server:status', callback);
            return () => ipcRenderer.removeAllListeners('server:status');
        }
    },

    // Gestão de dispositivos
    devices: {
        list: () => ipcRenderer.invoke('devices:list'),
        create: (device) => ipcRenderer.invoke('devices:create', device),
        update: (id, device) => ipcRenderer.invoke('devices:update', id, device),
        delete: (id) => ipcRenderer.invoke('devices:delete', id),
        authorize: (id) => ipcRenderer.invoke('devices:authorize', id),
        revoke: (id) => ipcRenderer.invoke('devices:revoke', id),
        reject: (id) => ipcRenderer.invoke('devices:reject', id),
        deleteAll: () => ipcRenderer.invoke('devices:deleteAll')
    },    // Gestão de produtos
    products: {
        list: () => ipcRenderer.invoke('products:list'),
        create: (product) => ipcRenderer.invoke('products:create', product),
        update: (product) => ipcRenderer.invoke('products:update', product),
        delete: (id) => ipcRenderer.invoke('products:delete', id)
    },

    // Gestão de ordens
    orders: {
        list: () => ipcRenderer.invoke('orders:list'),
        create: (order) => ipcRenderer.invoke('orders:create', order),
        update: (id, order) => ipcRenderer.invoke('orders:update', id, order),
        delete: (id) => ipcRenderer.invoke('orders:delete', id),
        clearCompleted: () => ipcRenderer.invoke('orders:clear-completed')
    },

    // Logs do sistema
    logs: {
        list: () => ipcRenderer.invoke('logs:list'),
        clear: () => ipcRenderer.invoke('logs:clear'),
        onCleared: (callback) => {
            ipcRenderer.on('logs:cleared', callback);
            return () => ipcRenderer.removeAllListeners('logs:cleared');
        }
    },

    // Debug logs para produção
    debug: {
        logs: () => ipcRenderer.invoke('debug:logs'),
        clear: () => ipcRenderer.invoke('debug:clear')
    },

    // Configurações
    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        update: (settings) => ipcRenderer.invoke('settings:update', settings)
    },    // Backup e Restore
    backup: () => ipcRenderer.invoke('data:backup'),
    restore: () => ipcRenderer.invoke('data:restore'),

    // Auto-Update
    updater: {
        check: () => ipcRenderer.invoke('updater:check'),
        download: () => ipcRenderer.invoke('updater:download'),
        install: () => ipcRenderer.invoke('updater:install'),
        onChecking: (callback) => {
            ipcRenderer.on('updater:checking', callback);
            return () => ipcRenderer.removeAllListeners('updater:checking');
        },
        onAvailable: (callback) => {
            ipcRenderer.on('updater:available', callback);
            return () => ipcRenderer.removeAllListeners('updater:available');
        },
        onNotAvailable: (callback) => {
            ipcRenderer.on('updater:not-available', callback);
            return () => ipcRenderer.removeAllListeners('updater:not-available');
        },
        onProgress: (callback) => {
            ipcRenderer.on('updater:progress', callback);
            return () => ipcRenderer.removeAllListeners('updater:progress');
        },
        onDownloaded: (callback) => {
            ipcRenderer.on('updater:downloaded', callback);
            return () => ipcRenderer.removeAllListeners('updater:downloaded');
        },        onError: (callback) => {
            ipcRenderer.on('updater:error', callback);
            return () => ipcRenderer.removeAllListeners('updater:error');
        },
        onInstalling: (callback) => {
            ipcRenderer.on('updater:installing', callback);
            return () => ipcRenderer.removeAllListeners('updater:installing');
        },
        onInstalled: (callback) => {
            ipcRenderer.on('updater:installed', callback);
            return () => ipcRenderer.removeAllListeners('updater:installed');
        }
    },

    // Eventos do sistema
    on: (event, callback) => {
        ipcRenderer.on(event, callback);
        return () => ipcRenderer.removeAllListeners(event);
    },

    // Eventos únicos
    once: (event, callback) => {
        ipcRenderer.once(event, callback);
    },

    // Remover listeners
    removeAllListeners: (event) => {
        ipcRenderer.removeAllListeners(event);
    }
}); 