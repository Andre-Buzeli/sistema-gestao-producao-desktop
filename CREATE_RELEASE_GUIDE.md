# 📋 Guia para Criar a Release no GitHub

## 🚀 Passos para Criar a Release v1.0.4

### 1. **Acesse a página de Releases**
   - Vá para: https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases
   - Clique em **"Create a new release"** ou **"Draft a new release"**

### 2. **Configure a Release**

#### Tag:
- **Choose a tag**: Digite `v1.0.4` e clique em "Create new tag: v1.0.4 on publish"
- **Target**: Deixe em `master`

#### Detalhes da Release:
- **Release title**: `v1.0.4 - Versão Inicial`
- **Describe this release**: Cole o conteúdo do arquivo `RELEASE_NOTES.md`

### 3. **Upload dos Arquivos**

Faça o upload dos seguintes arquivos da pasta `dist`:

1. **`Sistema de Gestão de Produção Setup 1.0.4.exe`** (88MB) - Instalador principal
2. **`latest.yml`** - Arquivo de metadados para auto-updater
3. **`Sistema de Gestão de Produção Setup 1.0.4.exe.blockmap`** - Verificação de integridade

### 4. **Configurações Finais**
- [ ] **Set as the latest release** - Marque esta opção
- [ ] **Set as a pre-release** - NÃO marque esta opção

### 5. **Publicar**
- Clique em **"Publish release"**

## ⚙️ Após Publicar

### Verificações Importantes:

1. **Auto-updater**: O arquivo `latest.yml` deve estar acessível em:
   ```
   https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases/latest/download/latest.yml
   ```

2. **Download Direto**: O instalador deve estar em:
   ```
   https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases/download/v1.0.4/Sistema%20de%20Gest%C3%A3o%20de%20Produ%C3%A7%C3%A3o%20Setup%201.0.4.exe
   ```

### Testando o Auto-updater:

1. Instale a versão 1.0.4
2. Modifique a versão no `package.json` para 1.0.5
3. Crie um novo build
4. Publique como nova release
5. O app deve detectar e oferecer atualização automática

## 📝 Template para Próximas Releases

Para futuras releases, use este template:

```markdown
## 🆕 O que há de novo

- Feature 1
- Feature 2
- Bug fix 1

## 🔄 Atualizações

- Melhoria 1
- Melhoria 2

## 🐛 Correções

- Correção 1
- Correção 2

## 📥 Download

- **Instalador Windows**: `Sistema de Gestão de Produção Setup X.X.X.exe`

## 🔄 Auto-updater

Esta versão será instalada automaticamente se você já tem o sistema instalado.
```

## 🎯 Checklist Final

- [ ] Build criado com sucesso
- [ ] Arquivos testados localmente
- [ ] Release notes escritas
- [ ] Tag criada (v1.0.4)
- [ ] Arquivos uploaded
- [ ] Release publicada
- [ ] Links verificados
- [ ] Auto-updater testado

---

**Criado em**: ${new Date().toLocaleString('pt-BR')} 