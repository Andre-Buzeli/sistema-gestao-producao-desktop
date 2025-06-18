const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const cookieParser = require('cookie-parser');
const { isPortAvailable, findAvailablePort } = require('./port-finder');
const { monitorTunnel } = require('./tunnel-config');
const dataStore = require('./data-store');
const deviceAuth = require('./device-auth');
const deviceAuthMiddleware = require('./auth-middleware');
const Database = require('../database/database');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;
let port = DEFAULT_PORT;

// Instância do banco de dados
let database = null;

// Função para inicializar o banco de dados no backend
async function initializeDatabase() {
    try {
        database = new Database();
        await database.initialize();
        console.log('✅ Banco de dados conectado no backend');
        return database;
    } catch (error) {
        console.error('❌ Erro ao conectar banco no backend:', error);
        return null;
    }
}

// Pré-carrega o template do Terminal Máquina para melhorar performance
const machineTemplatePath = path.join(__dirname, '..', 'frontend', 'maquina.html');
const machineTemplate = fs.existsSync(machineTemplatePath) 
    ? fs.readFileSync(machineTemplatePath, 'utf8')
    : null;

// Função para gerar uma string aleatória
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Gera credenciais aleatórias para o terminal de gestão
const gestaoCredentials = {
    username: 'admin',
    password: generateRandomString(6)
};

// Gera credencial para acesso externo via localtunnel (senha externa)
const externalPassword = generateRandomString(6);

// Exibe credenciais e inicia servidor async
;(async () => {
    console.log('\n===================================================');
    console.log('CREDENCIAIS PARA TERMINAL DE GESTÃO:');
    console.log(`Usuário: ${gestaoCredentials.username}`);
    console.log(`Senha Gestão: ${gestaoCredentials.password}`);
    // Busca senha externa via loca.lt
    let externalPassword = 'N/A';
    try {
        const resp = await fetch('https://loca.lt/mytunnelpassword');
        if (resp.ok) externalPassword = (await resp.text()).trim();
        else console.error(`Falha ao obter senha externa: HTTP ${resp.status}`);
    } catch (err) {
        console.error('Erro ao buscar senha externa:', err);
    }
    console.log(`Senha Externa: ${externalPassword}`);
    console.log('===================================================\n');

    // NOTA: startServer() será chamado no final do arquivo, após definir todas as rotas
})();

// Função para obter o IP local
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Pula endereços não IPv4 e internos
            if (iface.family !== 'IPv4' || iface.internal) {
                continue;
            }
            return iface.address;
        }
    }
    return '127.0.0.1';
}

// Middleware para processar JSON
app.use(express.json());

// Middleware para processar cookies
app.use(cookieParser());

// Middleware para processar formulários
app.use(express.urlencoded({ extended: true }));

// Middleware para verificar se a rota é /maquina ou acesso direto ao maquina.html
app.use((req, res, next) => {
    // Verifica se é uma solicitação para o arquivo maquina.html ou para a rota /maquina
    if (req.path === '/maquina' || req.path === '/maquina.html') {
        // Aplica o middleware de autenticação
        return deviceAuthMiddleware(req, res, next);
    }
    // Para outras rotas, continua normalmente
    next();
});

// Rota para o terminal máquina (com verificação de autenticação)
app.get('/maquina', (req, res) => {
    console.log(`[${new Date().toISOString()}] 🖥️ GET /maquina - Acesso ao terminal máquina`);
    
    // Verifica se o template existe
    if (!machineTemplate) {
        console.error('❌ Template maquina.html não encontrado em:', machineTemplatePath);
        return res.status(500).send('Template não encontrado');
    }

    // Adiciona as informações de autenticação como variáveis para o frontend
    const authInfo = req.deviceAuth || {
        deviceId: null,
        authorized: false,
        status: 'unknown',
        message: 'Status de autenticação desconhecido'
    };

    console.log(`🔐 Info de autenticação: ${JSON.stringify(authInfo)}`);

    // Usa o template pré-carregado
    let htmlContent = machineTemplate;

    // Injeta as informações de autenticação no HTML
    const authScript = `
    <script>
        // Informações de autenticação do dispositivo
        window.deviceAuthInfo = ${JSON.stringify(authInfo)};
    </script>
    `;

    // Insere o script antes do fechamento da tag head
    htmlContent = htmlContent.replace('</head>', authScript + '</head>');

    console.log(`✅ Enviando template maquina.html (${htmlContent.length} chars)`);
    console.log(`📍 APIs disponíveis em: /api/products, /api/orders\n`);

    // Envia o HTML modificado
    res.send(htmlContent);
});

// Rota para a página inicial - redireciona para /maquina
app.get('/', (req, res) => {
    res.redirect('/maquina');
});

// Rota para servir o index.html diretamente - redireciona para /maquina
app.get('/index.html', (req, res) => {
    res.redirect('/maquina');
});

// Rota para o terminal gestão (protegida)
app.get('/manutencao', (req, res) => {
    // Verificação de autenticação seria feita aqui em um sistema real
    // Como estamos usando localStorage para autenticação no cliente, não há verificação no servidor
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

// Rota para a página de administração de dispositivos (protegida)
app.get('/admin/devices', (req, res) => {
    // Verificação de autenticação seria feita aqui em um sistema real
    // Como estamos usando localStorage para autenticação no cliente, não há verificação no servidor
    res.sendFile(path.join(__dirname, 'app', 'device-admin.html'));
});

// Rota para a página de autenticação de dispositivos
app.get('/device-auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'device_auth.html'));
});

// Rota para a interface de gestão/desktop
app.get('/desktop', (req, res) => {
    const desktopPath = path.join(__dirname, '..', 'frontend', 'desktop.html');
    if (fs.existsSync(desktopPath)) {
        res.sendFile(desktopPath);
    } else {
        res.status(404).send('Interface de gestão não encontrada');
    }
});

// Rota para tablets - serve uma versão simplificada
app.get('/tablet', (req, res) => {
    const tabletPath = path.join(__dirname, '..', 'frontend', 'tablet_connect.html');
    if (fs.existsSync(tabletPath)) {
        res.sendFile(tabletPath);
    } else {
        // Fallback para maquina se tablet_connect.html não existir
        res.redirect('/maquina');
    }
});

// Variável global para armazenar o timestamp da última atualização dos produtos
let productsLastUpdate = Date.now();

// Função para atualizar o timestamp dos produtos
function updateProductsTimestamp() {
    productsLastUpdate = Date.now();
    console.log(`Produtos atualizados: ${new Date(productsLastUpdate).toLocaleString()}`);
}

// Objeto global para armazenar informações do servidor
let serverInfo = {
    ip: getLocalIP(),
    port: DEFAULT_PORT,
    hostname: 'gestao-producao',
    external_url: 'https://acesso.producao.loca.lt',
    maquina_path: '/maquina',
    manutencao_path: '/manutencao',
    last_update: Date.now(),
    products_update: productsLastUpdate,
    gestao_credentials: {
        username: gestaoCredentials.username,
        password: gestaoCredentials.password
    }
};

// Rota para fornecer informações do servidor
app.get('/server_info.json', (req, res) => {
    // Atualiza as informações dinâmicas
    serverInfo.ip = getLocalIP();
    serverInfo.last_update = Date.now();
    serverInfo.products_update = productsLastUpdate;

    res.json(serverInfo);
});

// Rota para notificar atualização de produtos
app.post('/update_products', (req, res) => {
    updateProductsTimestamp();
    res.json({ success: true, timestamp: productsLastUpdate });
});

// ===== API para gerenciamento de produtos =====

// Rota para Server-Sent Events (SSE) para notificações de atualização de produtos
const clients = [];

app.get('/sse/products', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Adiciona o cliente à lista
    clients.push(res);

    // Remove o cliente quando a conexão é encerrada
    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) {
            clients.splice(index, 1);
        }
    });
});

// Função para enviar notificações SSE para todos os clientes
function notifyProductUpdate() {
    clients.forEach((client) => {
        client.write(`data: { "updated": true, "timestamp": ${Date.now()} }\n\n`);
    });
}

// Obter todos os produtos
app.get('/api/products', async (req, res) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 📥 GET /api/products - Solicitação recebida`);
    
    try {
        if (database) {
            console.log('📊 Consultando banco SQLite...');
            const products = await database.getProducts();
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

// Obter produtos de uma categoria
app.get('/api/products/:category', async (req, res) => {
    const { category } = req.params;
    try {
        if (database) {
            const allProducts = await database.getProducts();
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

// Adicionar um produto
app.post('/api/products/:category', async (req, res) => {
    const { category } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome do produto é obrigatório' });
    }

    try {
        if (database) {
            const product = await database.createProduct({ name, category });
            updateProductsTimestamp(); // Atualiza o timestamp global
            notifyProductUpdate(); // Notifica os clientes SSE
            res.status(201).json(product);
        } else {
            // Fallback para dataStore
            const product = dataStore.addProduct(category, name);
            updateProductsTimestamp(); // Atualiza o timestamp global
            notifyProductUpdate(); // Notifica os clientes SSE
            res.status(201).json(product);
        }
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Remover um produto
app.delete('/api/products/:category/:productId', async (req, res) => {
    const { category, productId } = req.params;

    try {
        if (database) {
            const result = await database.deleteProduct(parseInt(productId));
            if (result.success) {
                updateProductsTimestamp(); // Atualiza o timestamp global
                res.json({ success: true, message: 'Produto removido com sucesso' });
            } else {
                res.status(404).json({ error: 'Produto não encontrado' });
            }
        } else {
            // Fallback para dataStore
            const removed = dataStore.removeProduct(category, productId);
            if (removed) {
                updateProductsTimestamp(); // Atualiza o timestamp global
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

// ===== API para gerenciamento de ordens de produção =====

// Obter todas as ordens
app.get('/api/orders', async (req, res) => {
    try {
        if (database) {
            const orders = await database.getOrders();
            res.json({
                orders: orders,
                lastUpdate: Date.now()
            });
        } else {
            // Fallback para dataStore se banco não estiver disponível
            res.json({
                orders: dataStore.getAllOrders(),
                lastUpdate: dataStore.getLastUpdate()
            });
        }
    } catch (error) {
        console.error('Erro ao buscar ordens:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Obter uma ordem específica
app.get('/api/orders/:orderCode', async (req, res) => {
    const { orderCode } = req.params;
    
    try {
        if (database) {
            const orders = await database.getOrders();
            const order = orders.find(o => o.order_code === orderCode);
            
            if (order) {
                res.json(order);
            } else {
                res.status(404).json({ error: 'Ordem não encontrada' });
            }
        } else {
            // Fallback para dataStore
            const order = dataStore.getOrder(orderCode);
            if (order) {
                res.json(order);
            } else {
                res.status(404).json({ error: 'Ordem não encontrada' });
            }
        }
    } catch (error) {
        console.error('Erro ao buscar ordem:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Adicionar/atualizar uma ordem (quando finalizada no /maquina)
app.post('/api/orders/:orderCode', async (req, res) => {
    const { orderCode } = req.params;
    const orderData = req.body;

    if (!orderData) {
        return res.status(400).json({ error: 'Dados da ordem são obrigatórios' });
    }

    try {
        if (database) {
            // Salvar no banco de dados SQLite
            const orderToSave = {
                order_code: orderCode,
                products_data: orderData.products || orderData,
                device_id: orderData.device_id || 'unknown',
                operator: orderData.operator || 'Sistema',
                notes: orderData.notes || 'Ordem finalizada via terminal',
                status: 'completed'
            };
            
            const result = await database.createOrder(orderToSave);
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

// Remover uma ordem
app.delete('/api/orders/:orderCode', (req, res) => {
    const { orderCode } = req.params;

    const removed = dataStore.removeOrder(orderCode);
    if (removed) {
        updateProductsTimestamp(); // Atualiza o timestamp global
        res.json({ success: true, message: 'Ordem removida com sucesso' });
    } else {
        res.status(404).json({ error: 'Ordem não encontrada' });
    }
});

// Endpoint para receber ordem completa do frontend (com todos os produtos)
app.post('/api/orders/:orderCode/complete', async (req, res) => {
    const { orderCode } = req.params;
    const orderData = req.body;

    if (!orderData || !orderData.products || !Array.isArray(orderData.products)) {
        return res.status(400).json({ error: 'Dados da ordem são obrigatórios (products array)' });
    }

    try {
        let order = null;
        let savedToDatabase = false;
        
        // Prioriza salvar no banco SQLite se disponível
        if (database) {
            try {
                const dbResult = await database.createOrder({
                    order_code: orderCode,
                    products_data: orderData.products,
                    device_id: orderData.terminal || 'maquina',
                    operator: 'Sistema',
                    created_at: new Date().toISOString()
                });
                
                if (dbResult.success) {
                    order = dbResult.order;
                    savedToDatabase = true;
                    console.log(`✅ Ordem ${orderCode} salva no banco SQLite`);
                } else {
                    console.warn(`⚠️ Falha ao salvar ordem ${orderCode} no banco:`, dbResult.message);
                }
            } catch (dbError) {
                console.error(`❌ Erro ao salvar ordem ${orderCode} no banco:`, dbError);
            }
        }
        
        // Fallback para dataStore se banco não estiver disponível ou falhar
        if (!savedToDatabase) {
            if (!dataStore.getOrder(orderCode)) {
                dataStore.addProductToOrder(orderCode, orderData.products[0] || {});
            }
            order = dataStore.addCompleteOrder(orderCode, orderData);
            console.log(`📋 Ordem ${orderCode} salva no dataStore (memória)`);
        }
        
        res.json({
            success: true,
            message: 'Ordem completa recebida com sucesso',
            order: order,
            savedToDatabase: savedToDatabase,
            databaseAvailable: !!database
        });
    } catch (error) {
        console.error('Erro ao processar ordem completa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ===== API para autenticação de dispositivos =====

// Verificar autorização de um dispositivo
app.get('/api/auth/device', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            authorized: false,
            message: 'ID do dispositivo não fornecido'
        });
    }

    try {
        // Importa o módulo de integração com o Google Sheets
        const sheetsIntegration = require('./sheets-integration');

        // Verifica a autorização do dispositivo
        const authResult = await deviceAuth.checkDeviceAuthorization(id, sheetsIntegration, req);

        res.json(authResult);
    } catch (error) {
        console.error('Erro ao verificar autorização do dispositivo:', error);
        res.status(500).json({
            authorized: false,
            message: 'Erro ao verificar autorização do dispositivo'
        });
    }
});

// Rota para limpar o cache de autenticação
app.get('/api/auth/clear-cache', (req, res) => {
    // Importa o módulo de integração com o Google Sheets
    const sheetsIntegration = require('./sheets-integration');
    sheetsIntegration.clearAuthCache();

    console.log('Cache de autenticação limpo manualmente');
    res.json({ success: true, message: 'Cache limpo com sucesso' });
});

// Rota para obter todos os dispositivos
app.get('/api/auth/devices', async (req, res) => {
    try {
        // Importa o módulo de integração com o Google Sheets
        const sheetsIntegration = require('./sheets-integration');

        // Verifica se o serviço de planilhas está configurado
        if (!sheetsIntegration.isConfigured()) {
            return res.status(503).json({
                status: 'error',
                message: 'Serviço de planilhas não configurado'
            });
        }

        // Verifica se deve forçar a atualização do cache
        const forceRefresh = req.query.force === 'true';

        // Obtém os dados de autenticação
        const devices = await sheetsIntegration.getAuthenticationData(forceRefresh);

        // Retorna os dispositivos
        res.json({
            status: 'success',
            devices: devices
        });
    } catch (error) {
        console.error('Erro ao obter dispositivos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao obter dispositivos: ' + error.message
        });
    }
});

// Rota para atualizar o status de autorização de um dispositivo
app.post('/api/auth/update-device', async (req, res) => {
    try {
        const { deviceId, authorized } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                status: 'error',
                message: 'ID do dispositivo não fornecido'
            });
        }

        if (authorized === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Status de autorização não fornecido'
            });
        }

        // Importa o módulo de integração com o Google Sheets
        const sheetsIntegration = require('./sheets-integration');

        // Verifica se o serviço de planilhas está configurado
        if (!sheetsIntegration.isConfigured()) {
            return res.status(503).json({
                status: 'error',
                message: 'Serviço de planilhas não configurado'
            });
        }

        // Atualiza o dispositivo na planilha
        const updateResult = await sheetsIntegration.updateDevice(deviceId, authorized);

        if (updateResult.status === 'error') {
            return res.status(500).json(updateResult);
        }

        // Limpa o cache para forçar uma nova consulta na próxima verificação
        sheetsIntegration.clearAuthCache();

        // Retorna o resultado
        return res.json({
            status: 'success',
            message: 'Dispositivo atualizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar dispositivo:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao atualizar dispositivo: ' + error.message
        });
    }
});

// Registrar um novo dispositivo
app.post('/api/auth/register-device', async (req, res) => {
    const { deviceId, deviceName, deviceModel } = req.body;

    if (!deviceId || !deviceName || !deviceModel) {
        return res.status(400).json({
            status: 'error',
            message: 'Informações incompletas. Forneça ID, nome e modelo do dispositivo.'
        });
    }

    try {
        // Importa o módulo de integração com o Google Sheets
        const sheetsIntegration = require('./sheets-integration');

        // Verifica se o serviço de planilhas está configurado
        if (!sheetsIntegration.isConfigured()) {
            return res.status(503).json({
                status: 'error',
                message: 'Serviço de planilhas não configurado'
            });
        }

        // Cria a descrição do dispositivo
        const description = `${deviceName} | ${deviceModel}`;

        // Adiciona o dispositivo à planilha (com status "NAO" por padrão)
        const addResult = await sheetsIntegration.addDevice(deviceId, description);

        if (addResult.status === 'error') {
            return res.status(500).json(addResult);
        }

        // Limpa o cache para forçar uma nova consulta na próxima verificação
        sheetsIntegration.clearAuthCache();

        // Retorna o resultado
        return res.json({
            status: 'success',
            message: 'Dispositivo registrado com sucesso. Aguardando aprovação do administrador.',
            authorized: false,
            newDevice: true,
            deviceExists: true
        });
    } catch (error) {
        console.error('Erro ao registrar dispositivo:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erro ao registrar dispositivo: ' + error.message
        });
    }
});

// Rota para atualizar a configuração do Google Sheets
app.post('/api/config/sheets', (req, res) => {
    const { driveUrl, webappUrl } = req.body;
    
    if (!webappUrl) {
        return res.status(400).json({ error: 'URL do webapp é obrigatória' });
    }
    
    try {
        // Importa o módulo de integração com o Google Sheets
        const sheetsIntegration = require('./sheets-integration');
        
        // Atualiza a URL do webapp
        const updated = sheetsIntegration.updateSheetsApiUrl(webappUrl);
        
        // Salva a URL do Google Drive (opcional)
        if (driveUrl) {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, 'config.json');
            
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            
            config.drive = driveUrl;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        }
        
        if (updated) {
            // Limpa o cache para forçar uma nova consulta com a nova URL
            sheetsIntegration.clearAuthCache();
            
            // Verifica a URL atual para confirmar que foi atualizada
            const currentUrl = sheetsIntegration.getCurrentSheetsApiUrl();
            
            console.log('Configuração de URL atualizada:');
            console.log('- URL solicitada:', webappUrl);
            console.log('- URL configurada:', currentUrl);
            
            res.json({ 
                success: true, 
                message: 'Configuração atualizada com sucesso',
                webappUrl: currentUrl
            });
        } else {
            res.status(500).json({ 
                error: 'Não foi possível atualizar a configuração',
                reason: 'Erro interno ao atualizar arquivo de configuração'
            });
        }
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração: ' + error.message });
    }
});

// ===== MIDDLEWARE PARA ARQUIVOS ESTÁTICOS =====
// Colocado APÓS as rotas da API para evitar conflitos
// Middleware para servir arquivos estáticos da aplicação frontend
// Exceto para o arquivo maquina.html que é tratado separadamente para controle de acesso
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
    index: false // Desativa o servir automático de index.html
}));

// Função para exibir informações do servidor (SEM as URLs externas completas)
function displayServerInfo(port) {
    const ip = getLocalIP();
    // const externalUrl = serverInfo.external_url; // Não usa mais aqui

    console.log(`\n===================================================\n    SERVIDOR CENTRAL DE GESTÃO DE PRODUÇÃO\n===================================================\n`);
    console.log(`Servidor rodando em http://${ip}:${port}`);
    console.log(`Hostname configurado: ${serverInfo.hostname}\n`);

    // Apenas informa que a configuração do túnel será tentada
    console.log(`Configurando acesso externo via LocalTunnel...`);
    console.log(`(Este processo pode levar alguns segundos)`);
}

// Função para iniciar o servidor
async function startServer() {
    try {
        // Inicializa o banco de dados (opcional)
        console.log('📅 Inicializando banco de dados...');
        try {
            database = new Database();
            await database.initialize();
            console.log('✅ Banco de dados inicializado com sucesso');
        } catch (dbError) {
            console.warn('⚠️ Aviso: Banco de dados com problema de I/O:', dbError.code);
            console.log('📋 Servidor continuará em modo somente memória (data-store)');
            console.log('💡 Funcionalidades mantidas, sem persistência SQLite');
            database = null; // Marca que banco não está disponível
        }

        port = await findAvailablePort(DEFAULT_PORT);
        serverInfo.port = port;

        const server = http.createServer(app);
        server.listen(port, () => {
            displayServerInfo(port); // Mostra informações básicas e mensagem do túnel

            // Inicia o monitoramento do túnel
            monitorTunnel(port, 'gestao-producao').then(tunnelUrl => {
                const ip = getLocalIP(); // Pega o IP local novamente
                
                if (tunnelUrl) {
                    serverInfo.external_url = tunnelUrl; // ATUALIZA a URL no serverInfo
                    console.log(`[${new Date().toISOString()}] URL do túnel recebida em server.js: ${tunnelUrl}`);
                console.log(`\n===================================================`);
                    console.log(`URL de acesso externo base: ${tunnelUrl}`);
                    console.log(`===================================================\n`);
                    
                    // AGORA imprime as URLs completas usando a tunnelUrl real
                    console.log(`Terminal Máquina:`);
                    console.log(`- Rede: http://${ip}:${port}${serverInfo.maquina_path}`);
                    console.log(`- Externo: ${tunnelUrl}${serverInfo.maquina_path}`); 

                    console.log(`\nTerminal Manutenção:`);
                    console.log(`- Rede: http://${ip}:${port}${serverInfo.manutencao_path}`);
                    console.log(`- Externo: ${tunnelUrl}${serverInfo.manutencao_path}`); 

                    console.log(`\nPágina para tablets:`);
                    console.log(`- Rede: http://${ip}:${port}/tablet`); 
                    console.log(`- Externo: ${tunnelUrl}/tablet`); 
                    console.log(`\n`); // Linha extra para espaçamento

                } else {
                    console.warn('\nAviso: Não foi possível estabelecer o túnel de acesso externo.\n');
                    // Imprime apenas URLs de rede se o túnel falhar
                    console.log(`Terminal Máquina (Rede): http://${ip}:${port}${serverInfo.maquina_path}`);
                    console.log(`Terminal Manutenção (Rede): http://${ip}:${port}${serverInfo.manutencao_path}`);
                    console.log(`Página para tablets (Rede): http://${ip}:${port}/tablet`);
                    console.log(`\n`);
                }
            }).catch(err => {
                console.error(`\n[${new Date().toISOString()}] Erro ao configurar o túnel ou durante seu monitoramento:`, err.message || err);
            });
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Erro: A porta ${port} já está em uso.`);
                console.log('Verifique se outra instância do servidor está rodando ou tente usar uma porta diferente.');
            } else {
                console.error('Erro ao iniciar o servidor:', error);
            }
            process.exit(1);
        });

    } catch (error) {
        console.error('Erro crítico ao iniciar o servidor:', error);
        process.exit(1);
    }
}

// Limpa o cache de autenticação na inicialização do servidor
const sheetsIntegration = require('./sheets-integration');
sheetsIntegration.clearAuthCache();
console.log('Cache de autenticação limpo na inicialização do servidor');

// ===== INICIALIZAÇÃO DO SERVIDOR =====
// REMOVIDA AUTO-EXECUÇÃO - Servidor deve ser iniciado apenas via main.js
// Para executar este servidor standalone, descomente a linha abaixo:
// startServer();
