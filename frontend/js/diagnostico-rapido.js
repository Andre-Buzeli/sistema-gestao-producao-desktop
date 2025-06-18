// ===== DIAGNÓSTICO RÁPIDO PARA MAQUINA.HTML =====
// Este script é carregado automaticamente na página /maquina

console.log('🔧 Diagnóstico automático iniciado...');

// Teste rápido da API de produtos
async function testeRapidoAPI() {
    try {
        console.log('🧪 Testando /api/products...');
        
        const response = await fetch('/api/products');
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ API /api/products OK - ${data.products ? data.products.length : 0} produtos`);
            console.log(`📊 Fonte: ${data.source || 'unknown'}`);
            return true;
        } else {
            console.error(`❌ API /api/products ERRO: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error(`📄 Resposta: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Erro ao testar API: ${error.message}`);
        return false;
    }
}

// Executar teste após carregamento da página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testeRapidoAPI, 1000); // Aguarda 1s para garantir que tudo carregou
    });
} else {
    setTimeout(testeRapidoAPI, 1000);
}

// Expor função para teste manual
window.testeRapidoAPI = testeRapidoAPI;
