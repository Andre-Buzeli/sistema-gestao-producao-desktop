# 🚀 Configuração do GitHub para o Sistema de Gestão de Produção

## ✅ Passo 1: Criar repositório no GitHub

1. Acesse: https://github.com/new
2. Nome do repositório: `sistema-gestao-producao-desktop`
3. Descrição: Sistema Desktop de Gestão de Produção - Aplicação Electron para gerenciar ordens de produção
4. Escolha: Público ou Privado
5. **NÃO marque** "Initialize this repository with a README"
6. Clique em "Create repository"

## ✅ Passo 2: Configurar o remote e fazer push

Após criar o repositório, execute os comandos abaixo no terminal.

**⚠️ IMPORTANTE: Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub!**

```bash
# Adicionar o remote origin
git remote add origin https://github.com/SEU_USUARIO/sistema-gestao-producao-desktop.git

# Verificar se o remote foi adicionado
git remote -v

# Fazer o push do branch master
git push -u origin master
```

## 📝 Comandos alternativos (se necessário)

Se você receber erro de autenticação, use:

```bash
# Com token de acesso pessoal
git remote set-url origin https://SEU_TOKEN@github.com/SEU_USUARIO/sistema-gestao-producao-desktop.git

# Ou com SSH (se configurado)
git remote set-url origin git@github.com:SEU_USUARIO/sistema-gestao-producao-desktop.git
```

## 🔧 Configuração adicional recomendada

```bash
# Configurar branch padrão como main (opcional)
git branch -M main
git push -u origin main

# Adicionar tags de versão
git tag -a v1.0.4 -m "Versão inicial do sistema"
git push origin v1.0.4
```

## ✨ Após o push inicial

1. Acesse seu repositório em: https://github.com/SEU_USUARIO/sistema-gestao-producao-desktop
2. Configure as GitHub Actions para CI/CD (opcional)
3. Configure o auto-updater com as releases do GitHub
4. Adicione colaboradores se necessário

## 🛡️ Configurar Branch Protection (recomendado)

1. Vá em Settings > Branches
2. Adicione rule para `main` ou `master`
3. Marque "Require pull request reviews before merging"
4. Marque "Dismiss stale pull request approvals when new commits are pushed"

---

**Arquivo criado em:** ${new Date().toLocaleString('pt-BR')} 