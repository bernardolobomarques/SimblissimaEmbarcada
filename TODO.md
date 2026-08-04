# Pendências

## Artigo 3118 — Energia (`artigo-3118-energia/`)

- [ ] Adicionar `figs/diagrama-de-blocos.png` (referenciada no `.tex`, ausente no repo)
- [ ] Adicionar `figs/diagrama-metodo.png` (referenciada no `.tex`, ausente no repo)
- [ ] Preencher `refs.bib` com as entradas BibTeX das 10 chaves já citadas no texto (ver comentário no topo do arquivo)

## Artigo 3119 — Água (`artigo-3119-agua/`)

- [x] `figs/dashboard.png` adicionada — screenshot da `WaterMonitorScreen` do app, gerado com dados mockados (ver seção "Backend Supabase" abaixo) já que o backend original saiu do ar
- [ ] Preencher `refs.bib` com as entradas BibTeX das 10 chaves já citadas no texto (ver comentário no topo do arquivo)

## Backend Supabase (app `iot-monitor-app/`)

- O projeto Supabase original (`ybnobvonfxoqvlimfzpl.supabase.co`) não está mais disponível. Enquanto isso, o app roda com dados mockados determinísticos (`iot-monitor-app/src/services/mockData.ts`), controlados pela flag `USE_MOCK_DATA` em `iot-monitor-app/src/constants/config.ts`.
- [ ] Se/quando houver um novo backend (Supabase ou outro), atualizar `SUPABASE_CONFIG` em `config.ts`, trocar `USE_MOCK_DATA` para `false` e validar as telas novamente antes de tirar novas screenshots para os artigos.

## Compilação LaTeX (ambos os artigos)

- [ ] Confirmar de onde vem a classe `sbrt.cls` (não está no repositório — provavelmente precisa ser baixada do site do SBrT/Overleaf e instalada localmente, ou o artigo é compilado apenas via Overleaf)
- [ ] Ambos os `.tex` começam com um BOM UTF-8 antes de `\documentclass`; confirmar que isso não causa warnings/erros no compilador usado

## Segurança

- [ ] **`agua_temp.ino` e `energia_temp.ino` (raiz do repositório)** contêm uma API key do Supabase e credenciais de Wi-Fi reais hardcoded no código-fonte. Recomenda-se **rotacionar/revogar essa API key no painel do Supabase o quanto antes**, já que o valor está exposto no histórico do git independentemente de qualquer limpeza futura do arquivo. Os arquivos de exemplo equivalentes em `iot-monitor-app/esp32_agua_exemplo.ino` e `iot-monitor-app/esp32_energia_exemplo.ino` já usam placeholders e podem servir de referência segura para publicação.
