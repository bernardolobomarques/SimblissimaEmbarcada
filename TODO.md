# Pendências

## Artigo 3118 — Energia (`artigo-3118-energia/`)

- [ ] Adicionar `figs/diagrama-de-blocos.png` (referenciada no `.tex`, ausente no repo)
- [ ] Adicionar `figs/diagrama-metodo.png` (referenciada no `.tex`, ausente no repo)
- [ ] Preencher `refs.bib` com as entradas BibTeX das 10 chaves já citadas no texto (ver comentário no topo do arquivo)

## Artigo 3119 — Água (`artigo-3119-agua/`)

- [ ] Adicionar `figs/dashboard.png` (referenciada no `.tex`, ausente no repo)
- [ ] Preencher `refs.bib` com as entradas BibTeX das 10 chaves já citadas no texto (ver comentário no topo do arquivo)

## Compilação LaTeX (ambos os artigos)

- [ ] Confirmar de onde vem a classe `sbrt.cls` (não está no repositório — provavelmente precisa ser baixada do site do SBrT/Overleaf e instalada localmente, ou o artigo é compilado apenas via Overleaf)
- [ ] Ambos os `.tex` começam com um BOM UTF-8 antes de `\documentclass`; confirmar que isso não causa warnings/erros no compilador usado

## Segurança

- [ ] **`agua_temp.ino` e `energia_temp.ino` (raiz do repositório)** contêm uma API key do Supabase e credenciais de Wi-Fi reais hardcoded no código-fonte. Recomenda-se **rotacionar/revogar essa API key no painel do Supabase o quanto antes**, já que o valor está exposto no histórico do git independentemente de qualquer limpeza futura do arquivo. Os arquivos de exemplo equivalentes em `iot-monitor-app/esp32_agua_exemplo.ino` e `iot-monitor-app/esp32_energia_exemplo.ino` já usam placeholders e podem servir de referência segura para publicação.
