# SimblissimaEmbarcada

Repositório do grupo Simblissima com dois artigos submetidos ao **SBrT 2025**
(XLIII Brazilian Symposium on Telecommunications and Signal Processing, Natal,
RN) e o código dos sistemas IoT que sustentam os artigos, desenvolvidos
originalmente para as disciplinas de Sistemas Embarcados IBM3118 e IBM3119
(IBMEC-RJ).

## Artigos

| Artigo | Título | Tema | Pasta |
|---|---|---|---|
| SBrT 2025 — 3118 | IoT-Based Energy Consumption Monitoring System | Monitoramento de consumo de energia com ESP32 + sensor de corrente ACS712 | [`artigo-3118-energia/`](artigo-3118-energia/) |
| SBrT 2025 — 3119 | IoT-Based Smart Water Tank Monitoring System | Monitoramento de nível de caixa d'água com ESP32 + sensor ultrassônico HC-SR04 | [`artigo-3119-agua/`](artigo-3119-agua/) |

**Autores:** Bernardo Lobo Marques, Bernardo Moreira Guimarães Gonçalves,
Michel de Melo Guimarães e Thiago Neves Monteiro (IBMEC-RJ). O artigo 3119
conta ainda com a colaboração de Rigel Fernandes, Talita V. Ribeiro e Clayton
J. A. Silva.

### Compilando os artigos

Cada pasta de artigo contém o `.tex` e uma subpasta `figs/` próprios:

```
artigo-3118-energia/
├── sbrt2025-3118.tex
├── refs.bib
└── figs/

artigo-3119-agua/
├── sbrt2025-3119.tex
├── refs.bib
└── figs/
```

Os artigos usam a classe `sbrt` (variante do template IEEE para o SBrT).
Para compilar localmente:

```bash
cd artigo-3118-energia
pdflatex sbrt2025-3118.tex
bibtex sbrt2025-3118
pdflatex sbrt2025-3118.tex
pdflatex sbrt2025-3118.tex
```

**Atenção:** no estado atual do repositório a compilação completa ainda não
fecha — faltam algumas imagens e o preenchimento do `refs.bib`. Veja
[`TODO.md`](TODO.md) para a lista completa de pendências antes de gerar o PDF
final.

## Estrutura do repositório

```
.
├── artigo-3118-energia/   # Artigo SBrT 2025 sobre monitoramento de energia
├── artigo-3119-agua/      # Artigo SBrT 2025 sobre monitoramento de água
├── iot-monitor-app/       # App React Native + backend Supabase (dashboard e ingestão de dados)
├── hardware/              # Protótipos e sketches Arduino/Tinkercad de desenvolvimento
├── docs/
│   ├── material-curso/    # PDFs de avaliação das disciplinas IBM3118/IBM3119
│   └── dev-notes/         # Notas de desenvolvimento do app (histórico, PRD, checklists)
├── agua_temp.ino          # Firmware ESP32 do protótipo de água (produção)
├── energia_temp.ino       # Firmware ESP32 do protótipo de energia (produção)
├── LICENSE
└── TODO.md
```

## O sistema (visão geral)

Ambos os projetos seguem a mesma arquitetura: um **ESP32** lê um sensor
(corrente ACS712 ou ultrassônico HC-SR04), envia as leituras via HTTPS para
uma **Supabase Edge Function**, que persiste os dados no banco. Um app
**React Native** (`iot-monitor-app/`) consome esses dados e exibe um
dashboard em tempo real. Detalhes de setup, API e deploy do app estão em
[`iot-monitor-app/README.md`](iot-monitor-app/README.md) e
[`iot-monitor-app/docs/`](iot-monitor-app/docs/).

## Licença

O código (firmware, app, scripts) está sob licença MIT — veja
[`LICENSE`](LICENSE). O texto dos artigos segue os termos de copyright do
IEEE/SBrT a partir da publicação.
