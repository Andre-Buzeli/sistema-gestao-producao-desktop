# 📋 Guia Completo - Release v1.0.6

## 🔧 Passo 1: Testar as Correções

```bash
# Testar aplicação localmente
npm start

# Verificar:
# - Servidor inicia sem erros
# - Console sem erros de GPU
# - Aplicação fecha sem erro fatal
```

## 📦 Passo 2: Fazer Build

```bash
# Limpar builds anteriores
rmdir /s /q dist

# Criar novo build
npm run dist
```

## 🔄 Passo 3: Git Commit e Push

```bash
# Adicionar mudanças
git add .

# Commit
git commit -m "v1.0.6: Correções críticas - erro fatal no shutdown e logs GPU"

# Push
git push origin master
```

## 🏷️ Passo 4: Criar Tag

```bash
# Criar tag
git tag -a v1.0.6 -m "Release v1.0.6 - Correções Críticas"

# Push tag
git push origin v1.0.6
```

## 🚀 Passo 5: Criar Release no GitHub

### Via GitHub CLI:
```bash
gh release create v1.0.6 --title "v1.0.6 - Correções Críticas e Estabilidade" --notes-file RELEASE_NOTES_v1.0.6.md "dist\Sistema de Gestão de Produção Setup 1.0.6.exe" "dist\latest.yml" "dist\Sistema de Gestão de Produção Setup 1.0.6.exe.blockmap"
```

### Ou Via Interface Web:
1. Vá para: https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases/new
2. Tag: `v1.0.6`
3. Título: `v1.0.6 - Correções Críticas e Estabilidade`
4. Copie conteúdo de `RELEASE_NOTES_v1.0.6.md`
5. Anexe arquivos da pasta `dist/`:
   - `Sistema de Gestão de Produção Setup 1.0.6.exe`
   - `latest.yml`
   - `Sistema de Gestão de Produção Setup 1.0.6.exe.blockmap`
6. Publique!

## ✅ Passo 6: Verificar

1. Checar: https://github.com/Andre-Buzeli/sistema-gestao-producao-desktop/releases
2. Confirmar que latest.yml aponta para v1.0.6
3. Testar auto-update de v1.0.5 → v1.0.6

## 📊 Resultado Esperado

- Usuários com v1.0.5 receberão notificação automática
- Instalação silenciosa sem intervenção
- Console limpo sem erros
- Aplicação fecha corretamente

---
*Guia criado em 18/06/2025* 