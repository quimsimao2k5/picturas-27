# PictuRAS · RAS 2026/2027 — Template do Relatório da Fase 1 (Typst)

Proposta de *template* para o relatório da Fase 1 (suporte a vídeo). A sua utilização é **opcional**:
serve apenas para facilitar o trabalho. O que se espera do relatório está descrito no documento de
diretrizes (`*__pictoRAS__fase_1__guidelines_*.pdf`); a estrutura e o aspeto podem ser adaptados livremente.

## Compilar

Requer [Typst](https://typst.app) ≥ 0.13 (CLI) ou o editor web typst.app (carregar todo o conteúdo do zip).

```bash
typst compile --font-path fonts main.typ doc-ext-requisitos.pdf   # gera o PDF a entregar
typst watch   --font-path fonts main.typ doc-ext-requisitos.pdf   # recompila a cada gravação
```

A fonte usada é a **Carlito** (equivalente livre da Calibri, licença OFL), incluída em `fonts/`.

## Estrutura

```
main.typ                       capa, índices e ordem dos capítulos (editar autores/grupo aqui)
template.typ                   estilos e componentes (tabela, tabela-campos, orientacao, preencher, …)
cover.typ                      capa
capitulos/                     todos os capítulos (Partes I, II e III) e anexos
casos-uso/UC-VID-001.typ       UM caso de uso de vídeo (incluído no capítulo 4)
images/baseline/               diagramas da solução de base (a substituir pelos atualizados)
```

## Como usar

1. **Organização por artefacto.** Cada capítulo da Parte II (casos de uso, ERS, impacto, rastreabilidade)
   reúne todas as funcionalidades de vídeo; nas tabelas, a coluna *Origem* indica o caso de uso de cada linha.
   Para cada caso de uso, copiar `casos-uso/UC-VID-001.typ` para `UC-VID-002.typ`, … e acrescentar o `#include`
   em `capitulos/04-casos-de-uso.typ`.
2. Substituir todos os marcadores a vermelho `{…}` (macro `#preencher[...]`).
3. As caixas laranja **Orientação** explicam cada secção. Antes de entregar, em `main.typ`:
   `#mostrar-orientacoes.update(false)`.
4. Substituir as figuras de baseline e as caixas tracejadas ("Figura a produzir") por imagens em `images/`
   (e.g., `#figure(image("../images/modelo_dominio.png", width: 100%), caption: [...])`).
5. Prioridades MoSCoW (com cor): `#must`, `#should`, `#could`, `#wont`.

## Componentes úteis

```typst
#tabela(colunas: (2cm, 1fr), [Cab. 1], [Cab. 2], [célula], [célula])   // 1.ª linha = cabeçalho
#tabela-campos([Campo], [Valor], [Campo], [Valor])                     // tabela chave/valor
#tab([Legenda], tabela(...))                                           // tabela numerada (Lista de Tabelas)
#paisagem[ ... ]                                                       // páginas na horizontal (usado em 5.1 e 5.2)
```

Verificação final: `grep -rn "preencher\[" capitulos casos-uso` não deve devolver nada.

Na entrega: o PDF chama-se `doc-ext-requisitos.pdf` e o código-fonte (esta pasta, preenchida) vai em `src-doc-ext-requisitos.zip`.

## Notas do grupo PL5-G7

- Os capítulos 4 (casos de uso) e 5 (ERS) são gerados a partir dos MD em `../Documentacao/`:
  `python3 ferramentas/gen_uc.py && python3 ferramentas/gen_ers.py`. Alterem os MD e voltem a gerar,
  em vez de editar `casos-uso/*.typ` e `capitulos/05-ers.typ` à mão.
- Diagramas em `images/` (fontes editáveis no zip `diagramas_relatorio.zip`).
- Evidência dos testes automáticos em `evidencias/`.
