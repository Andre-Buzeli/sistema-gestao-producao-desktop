const ngrok = require('ngrok');

/**
 * Inicia um túnel ngrok para acesso externo
 * @param {number} port - Porta do servidor local
 * @param {string} subdomain - Subdomínio desejado (opcional, requer conta pro)
 * @returns {Promise<string>} - URL do túnel
 */
async function startNgrokTunnel(port, subdomain = null) {
  try {
    console.log('Iniciando túnel ngrok...');
    
    // Opções do ngrok
    const options = {
      addr: port,
      proto: 'http',
      region: 'sa', // América do Sul (Brasil)
      onStatusChange: (status) => {
        console.log(`Status do ngrok: ${status}`);
      },
      onLogEvent: (logEvent) => {
        if (logEvent.includes('error') || logEvent.includes('critical')) {
          console.error(`Log ngrok: ${logEvent}`);
        }
      }
    };
    
    // Adiciona subdomínio se fornecido (requer conta pro)
    if (subdomain) {
      options.subdomain = subdomain;
    }
    
    // Inicia o túnel
    const url = await ngrok.connect(options);
    
    console.log(`\n===================================================`);
    console.log(`    ACESSO EXTERNO CONFIGURADO VIA NGROK`);
    console.log(`===================================================`);
    console.log(`URL de acesso externo: ${url}`);
    console.log(`Para acessar de qualquer lugar: ${url}`);
    console.log(`===================================================\n`);
    
    return url;
  } catch (error) {
    console.error('Falha ao criar túnel ngrok:', error.message);
    throw error;
  }
}

/**
 * Encerra o túnel ngrok
 */
async function stopNgrokTunnel() {
  try {
    await ngrok.kill();
    console.log('Túnel ngrok encerrado');
  } catch (error) {
    console.error('Erro ao encerrar túnel ngrok:', error.message);
  }
}

module.exports = { startNgrokTunnel, stopNgrokTunnel };
