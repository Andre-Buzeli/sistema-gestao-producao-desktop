const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Usar diretório de dados do usuário para o banco em aplicações empacotadas
        const { app } = require('electron');
        if (app && app.isPackaged) {
            // Em produção: usar pasta de dados do usuário
            const userDataPath = app.getPath('userData');
            this.dbPath = path.join(userDataPath, 'gestao_producao.db');
            console.log(`📁 Banco em produção: ${this.dbPath}`);
        } else {
            // Em desenvolvimento: usar pasta local
            this.dbPath = path.join(__dirname, 'gestao_producao.db');
            console.log(`📁 Banco em desenvolvimento: ${this.dbPath}`);
        }
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            console.log(`🗄️ Tentando conectar ao banco: ${this.dbPath}`);
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Erro ao conectar com o banco:', err);
                    console.error('❌ Código do erro:', err.code);
                    console.error('❌ Mensagem:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conectado ao banco SQLite');
                    console.log('📋 Iniciando criação das tabelas...');
                    this.createTables()
                        .then(() => {
                            console.log('✅ Tabelas criadas com sucesso');
                            resolve();
                        })
                        .catch(error => {
                            console.error('❌ Erro ao criar tabelas:', error);
                            reject(error);
                        });
                }
            });
        });
    }

    async createTables() {
        console.log('📋 Definindo estrutura das tabelas...');
        const tables = [
            // Tabela de dispositivos
            `CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'tablet',
                status TEXT NOT NULL DEFAULT 'pending',
                authorized BOOLEAN DEFAULT FALSE,
                operator TEXT,
                ip TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME
            )`,

            // Tabela de produtos
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                unit TEXT DEFAULT 'un',
                active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela de ordens de produção
            `CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_code TEXT NOT NULL,
                products_data TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                device_id TEXT,
                operator TEXT,
                notes TEXT,
                started_at DATETIME,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela de logs do sistema
            `CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                level TEXT NOT NULL DEFAULT 'info',
                message TEXT NOT NULL,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela de configurações
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        console.log(`📋 Criando ${tables.length} tabelas...`);
        for (let i = 0; i < tables.length; i++) {
            try {
                console.log(`📋 Criando tabela ${i + 1}/${tables.length}...`);
                await this.runQuery(tables[i]);
                console.log(`✅ Tabela ${i + 1} criada com sucesso`);
            } catch (error) {
                console.error(`❌ Erro ao criar tabela ${i + 1}:`, error);
                throw error;
            }
        }

        try {
            console.log('⚙️ Inserindo configurações padrão...');
            await this.insertDefaultSettings();
            console.log('✅ Configurações padrão inseridas');
            
            // Dados de exemplo removidos conforme solicitado pelo usuário
            // console.log('📦 Inserindo dados de exemplo...');
            // await this.insertSampleData();
            // console.log('✅ Dados de exemplo inseridos');
        } catch (error) {
            console.error('❌ Erro ao inserir dados iniciais:', error);
            throw error;
        }
    }

    async insertDefaultSettings() {
        console.log('⚙️ Inserindo configurações padrão...');
        const defaultSettings = [
            ['autoStartServer', 'false', 'Iniciar servidor automaticamente'],
            ['serverPort', '3000', 'Porta do servidor'],
            ['maxDevices', '10', 'Número máximo de dispositivos'],
            ['logRetentionDays', '30', 'Dias para manter logs'],
            ['backupInterval', '24', 'Intervalo de backup em horas']
        ];

        try {
            // Inserir todas as configurações sem logs individuais
            for (const [key, value, description] of defaultSettings) {
                await new Promise((resolve, reject) => {
                    this.db.run(
                        'INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)',
                        [key, value, description],
                        (err) => err ? reject(err) : resolve()
                    );
                });
            }
            console.log('✅ Configurações padrão inseridas com sucesso');
        } catch (error) {
            console.warn('⚠️ Aviso: Erro ao inserir configurações padrão (modo somente leitura):', error.code);
            console.log('📋 Sistema continuará funcionando sem persistência SQLite');
            // Não falha - continua em modo somente leitura
        }
    }

    async insertSampleData() {
        // Inserir produtos de exemplo por categoria se não existirem
        const sampleProducts = [
            // Papel Toalha (PT)
            ['PT001', 'PT LEVE', 'Papel toalha leve', 'PT', 'un'],
            ['PT002', 'PT FIT', 'Papel toalha fit', 'PT', 'un'],
            ['PT003', 'PT VIP', 'Papel toalha vip', 'PT', 'un'],
            ['PT004', 'PT B.BRASIL', 'Papel toalha Brasil', 'PT', 'un'],
            ['PT005', 'PT DUPAPEL', 'Papel toalha dupapel', 'PT', 'un'],
            ['PT006', 'PT STAR', 'Papel toalha star', 'PT', 'un'],
            
            // Papel Higiênico (PH)
            ['PH001', 'PH ESSENCE', 'Papel higiênico essence', 'PH', 'un'],
            ['PH002', 'PH ESSENCE LIGHT', 'Papel higiênico essence light', 'PH', 'un'],
            ['PH003', 'PH CLASSIC', 'Papel higiênico classic', 'PH', 'un'],
            ['PH004', 'PH CLASSIC LIGHT', 'Papel higiênico classic light', 'PH', 'un'],
            
            // Toalha Bobina (TB)
            ['TB001', 'TB LEVE', 'Toalha bobina leve', 'TB', 'un'],
            ['TB002', 'TB MAX', 'Toalha bobina max', 'TB', 'un'],
            ['TB003', 'TB FIT', 'Toalha bobina fit', 'TB', 'un'],
            ['TB004', 'TB SUPREME', 'Toalha bobina supreme', 'TB', 'un'],
            
            // Sacos e Talheres (ST)
            ['ST001', 'TALHER KRAFT 16X27', 'Talher kraft 16x27', 'ST', 'un'],
            ['ST002', 'SACO KRAFT 1 KG', 'Saco kraft 1kg', 'ST', 'un'],
            ['ST003', 'SACO KRAFT 2 KG', 'Saco kraft 2kg', 'ST', 'un'],
            ['ST004', 'SACO KRAFT 5 KG', 'Saco kraft 5kg', 'ST', 'un'],
            
            // Guardanapos (GN)
            ['GN001', 'GUARD 32X32 SENS BR', 'Guardanapo 32x32 sensação branco', 'GN', 'un'],
            ['GN002', 'GUARD 29X29 CLASSIC', 'Guardanapo 29x29 classic', 'GN', 'un'],
            ['GN003', 'GUARD 23X23 GOL', 'Guardanapo 23x23 gol', 'GN', 'un'],
            ['GN004', 'GUARD 40X40 FD', 'Guardanapo 40x40 fd', 'GN', 'un']
        ];

        for (const [code, name, description, category, unit] of sampleProducts) {
            await this.runQuery(
                'INSERT OR IGNORE INTO products (code, name, description, category, unit) VALUES (?, ?, ?, ?, ?)',
                [code, name, description, category, unit]
            );
        }
    }

    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                // Log simplificado para evitar poluição
                const sqlPreview = sql.substring(0, 30).replace(/\s+/g, ' ');
                if (!sql.includes('INSERT OR IGNORE INTO settings')) {
                    console.log(`🔍 Executando: ${sqlPreview}...`);
                }
                
                this.db.run(sql, params, function(err) {
                    if (err) {
                        console.error('❌ Erro na query:', err);
                        console.error('❌ SQL:', sql);
                        console.error('❌ Params:', params);
                        reject(err);
                    } else {
                        // Log de sucesso apenas para operações importantes
                        if (!sql.includes('INSERT OR IGNORE INTO settings')) {
                            console.log('✅ Query executada com sucesso');
                        }
                        resolve({ id: this.lastID, changes: this.changes });
                    }
                });
            } catch (error) {
                console.error('❌ Erro crítico na runQuery:', error);
                reject(error);
            }
        });
    }

    getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    getAllQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Métodos para dispositivos
    async getDevices() {
        return await this.getAllQuery('SELECT * FROM devices ORDER BY created_at DESC');
    }

    async createDevice(device) {
        const { device_id, name, type = 'tablet', operator, ip, user_agent } = device;
        const result = await this.runQuery(
            'INSERT INTO devices (device_id, name, type, status, operator, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [device_id, name, type, 'pending', operator, ip, user_agent]
        );
        
        await this.addLog('device', 'info', `Novo dispositivo criado: ${name} (${device_id})`);
        return result;
    }

    async updateDevice(id, device) {
        const { name, type, status } = device;
        const result = await this.runQuery(
            'UPDATE devices SET name = ?, type = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, type, status, id]
        );
        
        await this.addLog('device', 'info', `Dispositivo atualizado: ID ${id}`);
        return result;
    }

    async deleteDevice(deviceIdentifier) {
        // Aceitar tanto ID numérico quanto device_id string
        let device, result;
        if (typeof deviceIdentifier === 'string' && deviceIdentifier.startsWith('TABLET-')) {
            // É um device_id string (TABLET-XXXXX)
            device = await this.getQuery('SELECT * FROM devices WHERE device_id = ?', [deviceIdentifier]);
            result = await this.runQuery('DELETE FROM devices WHERE device_id = ?', [deviceIdentifier]);
        } else {
            // É um ID numérico (compatibilidade)
            device = await this.getQuery('SELECT * FROM devices WHERE id = ?', [deviceIdentifier]);
            result = await this.runQuery('DELETE FROM devices WHERE id = ?', [deviceIdentifier]);
        }
        
        if (device) {
            await this.addLog('device', 'info', `Dispositivo removido: ${device.name} (${device.device_id})`);
        }
        
        return result;
    }

    async authorizeDevice(deviceIdentifier) {
        // Aceitar tanto ID numérico quanto device_id string
        let result;
        if (typeof deviceIdentifier === 'string' && deviceIdentifier.startsWith('TAB-')) {
            // É um device_id string (TAB-XXXXX)
            result = await this.runQuery(
                'UPDATE devices SET authorized = TRUE, status = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?',
                ['authorized', deviceIdentifier]
            );
            await this.addLog('device', 'info', `Dispositivo autorizado: ${deviceIdentifier}`);
        } else {
            // É um ID numérico (compatibilidade)
            result = await this.runQuery(
            'UPDATE devices SET authorized = TRUE, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['authorized', deviceIdentifier]
        );
            await this.addLog('device', 'info', `Dispositivo autorizado: ID ${deviceIdentifier}`);
        }
        
        return result;
    }

    async revokeDevice(deviceIdentifier) {
        // Aceitar tanto ID numérico quanto device_id string
        let result;
        if (typeof deviceIdentifier === 'string' && deviceIdentifier.startsWith('TAB-')) {
            // É um device_id string (TAB-XXXXX)
            result = await this.runQuery(
                'UPDATE devices SET authorized = FALSE, status = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?',
                ['revoked', deviceIdentifier]
            );
            await this.addLog('device', 'info', `Autorização revogada: ${deviceIdentifier}`);
        } else {
            // É um ID numérico (compatibilidade)
            result = await this.runQuery(
                'UPDATE devices SET authorized = FALSE, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['revoked', deviceIdentifier]
            );
            await this.addLog('device', 'info', `Autorização revogada: ID ${deviceIdentifier}`);
        }
        
        return result;
    }

    async rejectDevice(deviceIdentifier) {
        // Rejeitar dispositivo = remover completamente da lista
        let result;
        if (typeof deviceIdentifier === 'string' && deviceIdentifier.startsWith('TAB-')) {
            // É um device_id string (TAB-XXXXX) - remove completamente
            result = await this.runQuery(
                'DELETE FROM devices WHERE device_id = ?',
                [deviceIdentifier]
            );
            await this.addLog('device', 'warning', `Dispositivo rejeitado e removido: ${deviceIdentifier}`);
            console.log(`🗑️ Dispositivo ${deviceIdentifier} rejeitado e removido da lista`);
        } else {
            // É um ID numérico (compatibilidade) - remove completamente
            result = await this.runQuery(
                'DELETE FROM devices WHERE id = ?',
                [deviceIdentifier]
            );
            await this.addLog('device', 'warning', `Dispositivo rejeitado e removido: ID ${deviceIdentifier}`);
            console.log(`🗑️ Dispositivo ID ${deviceIdentifier} rejeitado e removido da lista`);
        }
        
        return result;
    }

    async deleteAllDevices() {
        try {
            // Deletar TODOS os dispositivos da tabela
            const result = await this.runQuery('DELETE FROM devices');
            await this.addLog('device', 'warning', `Todos os dispositivos foram removidos do banco (${result.changes} dispositivos)`);
            console.log(`🗑️ DATABASE: ${result.changes} dispositivos deletados diretamente do banco`);
            return { success: true, deletedCount: result.changes };
        } catch (error) {
            console.error('❌ Erro ao deletar todos os dispositivos:', error);
            await this.addLog('device', 'error', `Erro ao deletar dispositivos: ${error.message}`);
            throw error;
        }
    }

    // Métodos para produtos
    async getProducts() {
        return await this.getAllQuery('SELECT * FROM products WHERE active = TRUE ORDER BY name');
    }

    async createProduct(product) {
        const { code = '', name, description = '', category, unit = 'un' } = product;
        const productCode = code || `PROD_${Date.now()}`;
        const result = await this.runQuery(
            'INSERT INTO products (code, name, description, category, unit) VALUES (?, ?, ?, ?, ?)',
            [productCode, name, description, category, unit]
        );
        
        await this.addLog('product', 'info', `Novo produto criado: ${name} (${productCode})`);
        return { success: true, id: result.id };
    }

    async updateProduct(product) {
        const { id, code, name, description, category, unit } = product;
        const result = await this.runQuery(
            'UPDATE products SET code = ?, name = ?, description = ?, category = ?, unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [code, name, description, category, unit, id]
        );
        
        await this.addLog('product', 'info', `Produto atualizado: ID ${id}`);
        return { success: true };
    }

    async deleteProduct(id) {
        const product = await this.getQuery('SELECT * FROM products WHERE id = ?', [id]);
        const result = await this.runQuery('UPDATE products SET active = FALSE WHERE id = ?', [id]);
        
        if (product) {
            await this.addLog('product', 'info', `Produto desativado: ${product.name} (${product.code})`);
        }
        
        return { success: true };
    }

    // Métodos para ordens
    async getOrders() {
        return await this.getAllQuery('SELECT * FROM orders ORDER BY created_at DESC');
    }

    async createOrder(order) {
        try {
            const { order_code, products_data, device_id, operator, notes } = order;
            const result = await this.runQuery(
                'INSERT INTO orders (order_code, products_data, device_id, operator, notes, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [order_code, JSON.stringify(products_data), device_id, operator, notes, 'completed', new Date().toISOString()]
            );
            
            await this.addLog('order', 'info', `Nova ordem criada: ${order_code}`);
            return { success: true, id: result.id };
        } catch (error) {
            if (error.code === 'SQLITE_IOERR') {
                console.warn(`⚠️ Ordem ${order.order_code} não pode ser salva no banco (somente leitura)`);
                console.log('📋 Ordem mantida apenas em memória (data-store)');
                return { success: false, reason: 'readonly', saved_in_memory: true };
            }
            throw error; // Re-lança outros tipos de erro
        }
    }

    async updateOrder(id, order) {
        const { order_code, products_data, status, device_id, operator, notes } = order;
        const result = await this.runQuery(
            `UPDATE orders SET 
                order_code = ?, products_data = ?, status = ?, 
                device_id = ?, operator = ?, notes = ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
            [order_code, JSON.stringify(products_data), status, device_id, operator, notes, id]
        );
        
        await this.addLog('order', 'info', `Ordem atualizada: ID ${id}`);
        return { success: true };
    }

    async deleteOrder(id) {
        const order = await this.getQuery('SELECT * FROM orders WHERE id = ?', [id]);
        const result = await this.runQuery('DELETE FROM orders WHERE id = ?', [id]);
        
        if (order) {
            await this.addLog('order', 'info', `Ordem removida: ${order.order_code}`);
        }
        
        return { success: true };
    }

    async clearCompletedOrders() {
        try {
            const result = await this.runQuery('DELETE FROM orders WHERE status = ?', ['completed']);
            await this.addLog('order', 'info', 'Ordens concluídas removidas');
            return { success: true, message: 'Ordens concluídas removidas' };
        } catch (error) {
            console.error('Erro ao limpar ordens concluídas:', error);
            return { success: false, message: 'Erro ao limpar ordens' };
        }
    }

    // Métodos para logs
    async addLog(type, level, message, details = null) {
        try {
            return await this.runQuery(
                'INSERT INTO logs (type, level, message, details) VALUES (?, ?, ?, ?)',
                [type, level, message, details]
            );
        } catch (error) {
            // Ignora erros de I/O em logs - não crítico
            if (error.code === 'SQLITE_IOERR') {
                console.warn(`⚠️ Log ignorado (banco somente leitura): ${level} - ${message}`);
                return { success: false, reason: 'readonly' };
            }
            throw error; // Re-lança outros tipos de erro
        }
    }

    async getLogs(limit = 1000) {
        return await this.getAllQuery(
            'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
    }

    async clearLogs() {
        try {
            // Verificar se o banco ainda está aberto
            if (!this.db) {
                console.log('📋 Banco já fechado, pulando limpeza de logs');
                return { success: true, message: 'Banco já fechado' };
            }
            
            const result = await this.runQuery('DELETE FROM logs');
            // Não adicionar log aqui para evitar recursão durante shutdown
            return result;
        } catch (error) {
            if (error.code === 'SQLITE_MISUSE') {
                console.log('📋 Banco já em processo de fechamento');
                return { success: true, message: 'Banco em fechamento' };
            }
            throw error;
        }
    }

    // Métodos para configurações
    async getSettings() {
        const rows = await this.getAllQuery('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach(row => {
            // Converter valores booleanos e numéricos
            let value = row.value;
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && !isNaN(parseFloat(value))) value = parseFloat(value);
            
            settings[row.key] = value;
        });
        return settings;
    }

    async updateSettings(settings) {
        for (const [key, value] of Object.entries(settings)) {
            await this.runQuery(
                'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
                [String(value), key]
            );
        }
        
        await this.addLog('system', 'info', 'Configurações atualizadas');
        return true;
    }

    // Método para fechar conexão
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Erro ao fechar banco:', err);
                } else {
                    console.log('Conexão com banco fechada');
                }
            });
        }
    }
}

// Exporta a classe Database
module.exports = Database;
