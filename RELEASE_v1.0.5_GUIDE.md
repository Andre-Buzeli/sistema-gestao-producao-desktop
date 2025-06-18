# 🚀 Guia para Lançar Release v1.0.5

## ✅ Status Atual

- [x] Código atualizado com melhorias do tema escuro
- [x] Versão atualizada para 1.0.5 no package.json
- [x] Commit e push realizados
- [x] Tag v1.0.5 criada e enviada
- [x] Build Windows criado com sucesso
- [x] Release notes preparadas

## 📋 Passos para Criar a Release

### 1. Acesse a página de releases
https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases

### 2. Clique em "Draft a new release"

### 3. Configure a release:

- **Choose a tag**: Selecione `v1.0.5` (já existe)
- **Release title**: `v1.0.5 - Melhorias no Tema Escuro`
- **Description**: Cole o conteúdo do arquivo `RELEASE_NOTES_v1.0.5.md`

### 4. Upload dos arquivos (pasta `dist`):

1. `Sistema de Gestão de Produção Setup 1.0.5.exe` - Instalador principal (88MB)
2. `latest.yml` - Metadados para auto-updater
3. `Sistema de Gestão de Produção Setup 1.0.5.exe.blockmap` - Verificação

### 5. Configurações finais:

- [x] Set as the latest release
- [ ] Set as a pre-release (NÃO marcar)

### 6. Clique em "Publish release"

## 🔄 Como o Auto-Update Funcionará

### Para usuários com v1.0.4:

1. **Ao abrir o app**, será verificada a nova versão
2. **Notificação** aparecerá informando sobre a v1.0.5
3. **Opções disponíveis**:
   - Instalação Silenciosa Automática (recomendada)
   - Instalação com Interface
   - Adiar para depois

4. **Se escolher silenciosa**:
   - Download em background
   - Instalação automática
   - App reinicia sozinho
   - Tema escuro melhorado!

### Teste do Auto-Update:

1. Instale a v1.0.4 em uma máquina de teste
2. Publique a v1.0.5 no GitHub
3. Abra o app v1.0.4
4. Aguarde 5 segundos (verificação automática)
5. Confirme que a notificação aparece
6. Teste ambas opções de instalação

## 📊 Métricas para Acompanhar

- Downloads da v1.0.5
- Taxa de atualização automática
- Feedback sobre o tema escuro
- Issues relacionadas ao visual

## 🎯 Checklist Final

- [ ] Release publicada no GitHub
- [ ] Arquivos uploaded corretamente
- [ ] Links funcionando
- [ ] Auto-updater testado
- [ ] Anúncio para usuários (opcional)

---

**Criado em**: ${new Date().toLocaleString('pt-BR')}
**Por**: Sistema de Gestão de Produção 