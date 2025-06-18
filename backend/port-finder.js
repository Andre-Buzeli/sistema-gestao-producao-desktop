const portfinder = require('portfinder');
const net = require('net');

/**
 * Verifica se uma porta específica está disponível
 * @param {number} port - Porta a ser verificada
 * @returns {Promise<boolean>} - True se a porta estiver disponível, false caso contrário
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Porta já está em uso
        resolve(false);
      } else {
        // Outro erro
        console.error('Erro ao verificar porta:', err);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      // Porta está disponível, fecha o servidor e retorna true
      server.close(() => {
        resolve(true);
      });
    });
    
    server.listen(port);
  });
}

/**
 * Encontra uma porta disponível a partir de uma porta base
 * @param {number} basePort - Porta base para iniciar a busca
 * @returns {Promise<number>} - Porta disponível
 */
async function findAvailablePort(basePort = 3000) {
  // Configura o portfinder para iniciar a busca a partir da porta base
  portfinder.basePort = basePort;
  
  try {
    // Encontra uma porta disponível
    const port = await portfinder.getPortPromise();
    return port;
  } catch (err) {
    console.error('Erro ao encontrar porta disponível:', err);
    // Retorna a porta base + um número aleatório entre 1000-9999 como fallback
    return basePort + Math.floor(Math.random() * 9000) + 1000;
  }
}

module.exports = { isPortAvailable, findAvailablePort };
