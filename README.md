# 🏭 Sistema de Gestão de Produção Desktop

> **Sistema desktop profissional para controle de produção industrial com interface para tablets**

## 🚀 **FEATURES PRINCIPAIS**

✅ **App Desktop Completo** - Interface Electron moderna e responsiva  
✅ **Sistema de Auto-Update** - Atualizações automáticas via GitHub Releases  
✅ **Servidor HTTP Integrado** - Para conectar tablets e dispositivos móveis  
✅ **Banco SQLite Portável** - Dados locais com backup automático  
✅ **Autenticação por Dispositivo** - Controle seguro de acesso  
✅ **Build Automático** - GitHub Actions para releases  
✅ **Instalador Windows** - NSIS profissional  

## 📦 **DOWNLOAD E INSTALAÇÃO**

### Para Usuários Finais

**➡️ [Baixar Última Versão](https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases/latest)**

**Opções Disponíveis:**
- **`Sistema-Gestao-Producao-Setup-1.0.0.exe`** → Instalador completo (recomendado)
- **`Sistema-Gestao-Producao-1.0.0-portable.exe`** → Versão portável (não precisa instalar)

### Requisitos do Sistema
- **Windows 10/11** (64-bit)
- **4GB RAM** (8GB recomendado)
- **500MB** espaço livre
- **Conexão de rede** (para tablets)

## 🎯 **COMO USAR**

### 1. **Iniciar o Sistema**
- Execute o aplicativo desktop
- O servidor será iniciado automaticamente
- Interface ficará disponível em: `http://SEU_IP:3000`

### 2. **Conectar Tablets**
- Abra navegador no tablet
- Acesse: `http://IP_DO_DESKTOP:3000`
- Autorize o dispositivo no desktop
- Use o terminal de produção

### 3. **Gestão de Produção**
- **Produtos**: Cadastro com categorias (PT, PH, TB, ST, GN)
- **Ordens**: Controle de produção em tempo real
- **Dispositivos**: Autorização e revogação de acesso
- **Logs**: Histórico completo do sistema

## 🔄 **AUTO-UPDATER**

O sistema verifica automaticamente por atualizações:

- **Verificação automática** a cada 4 horas
- **Notificação popup** quando nova versão disponível
- **Download automático** com aprovação do usuário
- **Instalação segura** sem perda de dados

## 🛠️ **PARA DESENVOLVEDORES**

### Setup do Ambiente
```bash
# Clonar repositório
git clone https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop.git
cd sistema-gestao-producao-desktop

# Instalar dependências
npm install

# Executar em desenvolvimento
npm start
```

### Build e Release
```bash
# Build local (teste)
npm run build-portable

# Publicar nova versão
git tag v1.0.1
git push origin v1.0.1
# GitHub Actions fará build e release automaticamente
```

### Stack Tecnológico
- **Electron 36.4.0** - Framework desktop
- **Node.js** - Runtime JavaScript
- **SQLite 5.1.7** - Banco de dados
- **Express 4.18.2** - Servidor HTTP
- **electron-updater** - Sistema de atualizações
- **electron-builder** - Build e packaging

## 📊 **ARQUITETURA**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Desktop   │◄──►│   HTTP Server   │◄──►│ Tablets/Mobile  │
│   (Electron)    │    │   (Express)     │    │  (Browser)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SQLite DB     │    │   Device Auth   │    │   Production    │
│   (Local)       │    │   (Security)    │    │   Interface     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 **SEGURANÇA**

- **Autenticação obrigatória** para todos os dispositivos
- **Autorização manual** via interface desktop
- **Tokens únicos** por dispositivo
- **Logs de acesso** completos
- **Revogação instantânea** de permissões

## 📈 **ROADMAP**

### v1.1 (Próxima)
- [ ] Ícone personalizado profissional
- [ ] Assinatura digital de código
- [ ] Logs estruturados com Winston
- [ ] Backup automático programado

### v1.2 (Futuro)
- [ ] Dashboard analytics
- [ ] Relatórios exportáveis
- [ ] API REST externa
- [ ] Multi-idioma

## 🐛 **SUPORTE**

**Problemas?** Abra uma [issue](https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/issues)

**Dúvidas?** Consulte:
- Logs do sistema (no próprio app)
- [Wiki do projeto](https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/wiki)
- [Releases notes](https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases)

## 📄 **LICENÇA**

MIT License - Veja [LICENSE](LICENSE) para detalhes.

---

**© 2025 Sistema de Gestão de Produção | Made with ❤️ for Industry 4.0**