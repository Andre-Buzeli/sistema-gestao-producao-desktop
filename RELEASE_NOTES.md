# 🎉 Release v1.0.4 - Sistema de Gestão de Produção

## ✨ Recursos Principais

- 🖥️ **Interface Desktop Completa** - Dashboard moderno com dark theme
- 📱 **Terminal Máquina** - Interface simplificada para operadores  
- 🌐 **Acesso Multi-dispositivo** - Suporte para tablets e acesso remoto
- 🔐 **Autenticação Granular** - Controle por dispositivo
- 📦 **5 Categorias de Produtos** - PT, PH, TB, ST, GN
- 💾 **Banco SQLite + Fallback** - Persistência com backup em memória
- 🔄 **Auto-updater Integrado** - Atualizações automáticas silenciosas

## 📥 Download

- **Instalador Windows**: `Sistema de Gestão de Produção Setup 1.0.4.exe` (88MB)

## 🚀 Instalação

1. Baixe o instalador
2. Execute como administrador
3. Siga as instruções na tela
4. O sistema iniciará automaticamente após a instalação

## 🔄 Sistema de Atualização Automática

Esta versão inclui um sistema avançado de atualização automática com duas opções:

### Instalação Silenciosa (Recomendado)
- Baixa e instala atualizações automaticamente
- Sem interrupção do trabalho
- Aplicada ao reiniciar o sistema

### Instalação com Interface
- Permite acompanhar o progresso
- Escolha quando instalar
- Notificações visuais

## 📋 Requisitos Mínimos

- **Sistema Operacional**: Windows 10 ou superior
- **Memória RAM**: 4GB (8GB recomendado)
- **Espaço em Disco**: 300MB
- **Processador**: Dual Core 2GHz+
- **Conexão**: Internet para acesso remoto (opcional)

## 🛠️ Stack Tecnológica

- **Framework Desktop**: Electron v36.4.0
- **Backend**: Express v4.18.2
- **Banco de Dados**: SQLite3 v5.1.7
- **Acesso Remoto**: LocalTunnel v2.0.2
- **Auto-updater**: electron-updater v6.6.2

## 📦 Arquivos da Release

1. `Sistema de Gestão de Produção Setup 1.0.4.exe` - Instalador principal
2. `latest.yml` - Arquivo de metadados para auto-updater
3. `*.exe.blockmap` - Arquivo de verificação de integridade

## 🔒 Segurança

- Autenticação por dispositivo
- Senhas geradas automaticamente
- Cookies seguros para sessões
- Isolamento entre dispositivos

## 🚨 Notas Importantes

- Primeira instalação requer privilégios de administrador
- O auto-updater funcionará nas próximas atualizações
- Backup automático dos dados antes de cada atualização
- Compatível com instalações corporativas

---

**Data da Release**: ${new Date().toLocaleDateString('pt-BR')}
**Versão**: 1.0.4
**Build**: Stable 