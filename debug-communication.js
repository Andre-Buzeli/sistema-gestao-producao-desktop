// Script de teste para debugar problemas de comunicação
// Adicione este código no console do navegador (DevTools) para testar

console.log('🔍 Testando comunicação IPC...');

// Teste 1: Verificar se electronAPI está disponível
if (window.electronAPI) {
    console.log('✅ electronAPI disponível');
    
    // Teste 2: Verificar se invoke funciona
    try {
        window.electronAPI.invoke('server:status').then(status => {
            console.log('✅ server:status funcionando:', status);
        }).catch(err => {
            console.error('❌ server:status falhou:', err);
        });
    } catch (error) {
        console.error('❌ Erro ao chamar server:status:', error);
    }
    
    // Teste 3: Verificar se products:list funciona
    try {
        window.electronAPI.invoke('products:list').then(products => {
            console.log('✅ products:list funcionando, produtos encontrados:', products.length);
            console.log('Produtos:', products);
        }).catch(err => {
            console.error('❌ products:list falhou:', err);
        });
    } catch (error) {
        console.error('❌ Erro ao chamar products:list:', error);
    }
    
    // Teste 4: Testar criação de produto
    setTimeout(() => {
        console.log('🧪 Testando criação de produto...');
        window.electronAPI.invoke('products:create', {
            name: 'Produto Teste Debug',
            description: 'Produto criado para teste de debug',
            category: 'TEST',
            unit: 'un'
        }).then(result => {
            console.log('✅ Produto criado com sucesso:', result);
        }).catch(err => {
            console.error('❌ Erro ao criar produto:', err);
        });
    }, 2000);
    
} else {
    console.error('❌ electronAPI não está disponível!');
    console.log('Variáveis disponíveis no window:', Object.keys(window));
}
