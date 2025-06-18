const localtunnel = require('localtunnel');

/**
 * Inicia um túnel para acesso externo
 * @param {number} port - Porta do servidor local
 * @param {string} subdomain - Subdomínio desejado (opcional)
 * @returns {Promise<object>} - Objeto do túnel
 */
async function startTunnel(port, subdomain = null) {
  try {
    console.log(`[${new Date().toISOString()}] Iniciando túnel para acesso externo na porta ${port}${subdomain ? ' com subdomínio ' + subdomain : ''}...`);

    const options = {
      port: port
    };

    if (subdomain) {
      options.subdomain = subdomain;
    }

    console.log(`[${new Date().toISOString()}] Opções do túnel:`, options);
    console.log(`[${new Date().toISOString()}] Chamando localtunnel()...`);

    const tunnelPromise = localtunnel(options);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: localtunnel demorou demais para iniciar (30 segundos).')), 30000)
    );

    const tunnel = await Promise.race([tunnelPromise, timeoutPromise]);

    console.log(`[${new Date().toISOString()}] localtunnel() retornou.`);

    if (!tunnel || !tunnel.url) {
      console.error(`[${new Date().toISOString()}] Falha ao iniciar o túnel: objeto de túnel inválido ou URL não encontrada.`, tunnel);
      throw new Error('Falha ao iniciar o túnel: objeto de túnel inválido ou URL não encontrada.');
    }

    console.log(`\n===================================================`);
    console.log(`    ACESSO EXTERNO CONFIGURADO`);
    console.log(`===================================================`);
    console.log(`URL de acesso externo: ${tunnel.url}`);
    console.log(`===================================================\n`);

    // Gerenciamento de eventos do túnel
    tunnel.on('close', () => {
      console.log(`[${new Date().toISOString()}] Túnel fechado: ${tunnel.url}`);
    });

    tunnel.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Erro no túnel (${tunnel.url || 'URL desconhecida'}):`, err);
    });

    return tunnel;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Falha ao criar túnel:`, error.message || error);
    console.error(`[${new Date().toISOString()}] Detalhes do erro:`, error);

    // Se o erro for relacionado ao subdomínio já em uso, tenta novamente sem especificar o subdomínio
    if (error.message && error.message.includes('subdomain') && subdomain !== null) {
      console.log(`[${new Date().toISOString()}] Subdomínio ${subdomain} já em uso ou inválido. Tentando com um subdomínio aleatório...`);
      return startTunnel(port, null);
    }

    throw error; // Propaga o erro para ser tratado pelo chamador
  }
}

/**
 * Monitora o túnel e reconecta se necessário
 * @param {number} port - Porta do servidor local
 * @param {string} password - Senha para o túnel (subdomínio será a senha)
 * @returns {Promise<string|null>} - URL do túnel ou null se falhar
 */
async function monitorTunnel(port, password) {
  let tunnelUrl = null;
  let currentSubdomain = password; // Usa a senha como subdomínio inicial
  let attempt = 0;
  const maxAttempts = 3; // Tenta o subdomínio específico e depois aleatórios

  while (attempt < maxAttempts && !tunnelUrl) {
    attempt++;
    try {
      console.log(`[${new Date().toISOString()}] Tentativa ${attempt}/${maxAttempts} de iniciar o túnel com subdomínio: ${currentSubdomain || '(aleatório)'}`);
      const tunnel = await startTunnel(port, currentSubdomain);
      if (tunnel && tunnel.url) {
        tunnelUrl = tunnel.url;
        console.log(`[${new Date().toISOString()}] Túnel estabelecido com sucesso: ${tunnelUrl}`);
        
        // Gerenciamento de reconexão
        tunnel.on('close', async () => {
          console.log(`[${new Date().toISOString()}] Túnel ${tunnelUrl} fechado. Tentando reconectar...`);
          tunnelUrl = null; // Reseta a URL para tentar reconectar
          // Chama monitorTunnel novamente para tentar restabelecer com a lógica de subdomínio
          // Idealmente, deveria haver um delay ou backoff aqui
          setTimeout(async () => {
            try {
                // Para reconectar, tenta primeiro com o mesmo subdomínio que funcionou
                // Se falhar, a lógica interna de startTunnel (com retentativa aleatória) será acionada
                const newTunnel = await startTunnel(port, currentSubdomain); 
                if (newTunnel && newTunnel.url) {
                    tunnelUrl = newTunnel.url; // Atualiza a URL do túnel
                     console.log(`[${new Date().toISOString()}] Túnel reconectado com sucesso: ${tunnelUrl}`);
                } else {
                    console.warn(`[${new Date().toISOString()}] Não foi possível reconectar o túnel após o fechamento.`);
                }
            } catch(reconnectError) {
                console.error(`[${new Date().toISOString()}] Erro crítico ao tentar reconectar o túnel:`, reconnectError);
            }
          }, 5000); // Espera 5 segundos antes de tentar reconectar
        });

      } else {
         console.warn(`[${new Date().toISOString()}] Tentativa ${attempt} falhou em obter uma URL de túnel válida.`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Erro na tentativa ${attempt} de iniciar o túnel com subdomínio '${currentSubdomain || '(aleatório)'}':`, error.message);
      if (attempt < maxAttempts) {
         console.log(`[${new Date().toISOString()}] Próxima tentativa será com subdomínio aleatório.`);
         currentSubdomain = null; // Tenta com subdomínio aleatório na próxima vez
      } else {
         console.error(`[${new Date().toISOString()}] Máximo de tentativas (${maxAttempts}) atingido. Não foi possível iniciar o túnel.`);
      }
    }
    if (!tunnelUrl && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2s antes da próxima tentativa
    }
  }
  return tunnelUrl; // Retorna a URL do túnel ou null
}

module.exports = { startTunnel, monitorTunnel };
