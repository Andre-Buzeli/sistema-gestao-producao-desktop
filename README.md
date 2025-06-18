# 🏭 Sistema de Gestão de Produção Desktop

![Electron](https://img.shields.io/badge/Electron-v36.4.0-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Express](https://img.shields.io/badge/Express-v4.18.2-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-v5.1.7-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0.4-blue?style=for-the-badge)

Sistema desktop desenvolvido em Electron para gerenciamento completo de ordens de produção em ambiente fabril, com suporte para múltiplos dispositivos e acesso remoto seguro.

## 📋 Sumário

- [Recursos](#-recursos)
- [Screenshots](#-screenshots)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API](#-api)
- [Desenvolvimento](#-desenvolvimento)
- [Build e Distribuição](#-build-e-distribuição)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

## ✨ Recursos

### 🖥️ Interface Desktop Principal
- Dashboard completo com estatísticas em tempo real
- Gestão de dispositivos com autenticação granular
- Cadastro e controle de produtos por categoria
- Visualização e gerenciamento de ordens de produção
- Sistema de logs detalhado
- Dark theme moderno e responsivo

### 📱 Terminal Máquina
- Interface simplificada para operadores
- Registro rápido de ordens de produção
- Autenticação por dispositivo
- Otimizado para tablets e telas touch

### 🌐 Conectividade
- Servidor Express integrado
- LocalTunnel para acesso externo seguro
- Auto-descoberta de IP local
- Suporte multi-dispositivo simultâneo

### 🔐 Segurança
- Autenticação multi-nível
- Controle granular de dispositivos
- Senhas geradas automaticamente
- Cookies seguros para sessões

### 📦 Categorias de Produtos
- **PT** - Papel Toalha
- **PH** - Papel Higiênico
- **TB** - Toalha Bobina
- **ST** - Sacos e Talheres
- **GN** - Guardanapos

## 🖼️ Screenshots

<details>
<summary>Clique para ver as capturas de tela</summary>

### Dashboard Principal
![Dashboard](docs/images/dashboard.png)

### Terminal Máquina
![Terminal](docs/images/terminal.png)

### Gestão de Produtos
![Produtos](docs/images/produtos.png)

</details>

## 🛠️ Tecnologias

### Frontend
- **Electron** v36.4.0 - Framework desktop
- **HTML5/CSS3** - Interface web
- **JavaScript** vanilla - Lógica do cliente
- **Material Icons** - Ícones
- **Dark Theme** personalizado

### Backend
- **Express** v4.18.2 - Servidor web
- **SQLite3** v5.1.7 - Banco de dados
- **LocalTunnel** v2.0.2 - Acesso externo
- **Cookie-Parser** - Gestão de sessões

### Ferramentas
- **Electron-Builder** - Empacotamento
- **Electron-Updater** - Auto-atualização
- **Portfinder** - Descoberta de portas

## 📥 Instalação

### Pré-requisitos
- Node.js v18+ 
- npm ou yarn
- Git

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/SEU_USUARIO/sistema-gestao-producao-desktop.git
cd sistema-gestao-producao-desktop
```

2. **Instale as dependências**
```bash
npm install
```

3. **Execute em modo desenvolvimento**
```bash
npm run dev
```

## 🚀 Uso

### Iniciar a aplicação
```bash
npm start
```

### Acessos disponíveis

1. **Desktop (Electron)**
   - Interface completa de gestão
   - Acesso total a todas funcionalidades

2. **Terminal Máquina** 
   - URL: `http://localhost:3000/maquina`
   - Interface para operadores

3. **Acesso Externo**
   - Ativado automaticamente via LocalTunnel
   - URL fornecida no console ao iniciar

### Credenciais

As credenciais são geradas automaticamente ao iniciar o servidor e exibidas no console:
- **Usuário Gestão**: admin
- **Senha Gestão**: [gerada automaticamente]
- **Senha Externa**: [gerada automaticamente]

## 📁 Estrutura do Projeto

```
sistema-gestao-producao-desktop/
├── backend/                 # Servidor Express e lógica
│   ├── server.js           # Servidor principal
│   ├── data-store.js       # Armazenamento em memória
│   ├── device-auth.js      # Autenticação de dispositivos
│   └── ...
├── database/               # Módulo SQLite
│   └── database.js        # Classe de banco de dados
├── frontend/              # Interfaces web
│   ├── css/              # Estilos
│   ├── js/               # Scripts cliente
│   ├── desktop.html      # Interface desktop
│   ├── maquina.html      # Terminal máquina
│   └── tablet_connect.html # Interface tablet
├── main.js               # Processo principal Electron
├── preload.js            # Script de preload
├── package.json          # Configurações npm
└── README.md            # Este arquivo
```

## 🔌 API

### Endpoints principais

#### Produtos
- `GET /api/products` - Lista todos produtos
- `GET /api/products/:category` - Produtos por categoria
- `POST /api/products/:category` - Adicionar produto
- `DELETE /api/products/:category/:id` - Remover produto

#### Ordens
- `GET /api/orders` - Lista todas ordens
- `GET /api/orders/:orderCode` - Detalhes da ordem
- `POST /api/orders/:orderCode` - Criar/atualizar ordem

#### Sistema
- `GET /server_info.json` - Informações do servidor
- `GET /sse/products` - Stream de eventos (SSE)

## 💻 Desenvolvimento

### Scripts disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia em modo desenvolvimento

# Produção
npm start           # Inicia aplicação

# Build
npm run build       # Build para todas plataformas
npm run build-win   # Build para Windows
npm run dist        # Criar distribuível

# Publicação
npm run publish     # Publicar release
```

### Variáveis de ambiente

```env
PORT=3000              # Porta do servidor (padrão: 3000)
NODE_ENV=production    # Ambiente (development/production)
```

## 📦 Build e Distribuição

### Gerar executável Windows

```bash
npm run build-win
```

O executável será gerado em `dist/`

### Configuração do auto-updater

1. Configure o repositório no `package.json`
2. Crie releases no GitHub
3. O app verificará atualizações automaticamente

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: Nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

### Padrões de código

- Use ESLint para linting
- Siga o padrão de commits convencionais
- Documente novas funcionalidades
- Adicione testes quando possível

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Autores

- **Sistema de Gestão** - *Desenvolvimento inicial*

## 🙏 Agradecimentos

- Equipe Electron pela excelente framework
- Comunidade open source
- Todos os contribuidores

---

<p align="center">
  Feito com ❤️ para otimizar a gestão de produção
</p> 