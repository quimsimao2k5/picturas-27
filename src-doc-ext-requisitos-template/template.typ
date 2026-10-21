// =============================================================================
//  PictuRAS · RAS 2026/2027 · Template do Relatório da Fase 1 (Suporte a Vídeo)
//  Estilos de página e componentes reutilizáveis.
//  Em princípio NÃO precisam de alterar este ficheiro.
// =============================================================================

// -----------------------------------------------------------------------------
// Orientações do template
// -----------------------------------------------------------------------------
// As caixas de "Orientação" explicam o que escrever em cada secção.
// Antes de entregar, coloquem `mostrar-orientacoes` a `false` em `main.typ`
// (ou apaguem as caixas). Os marcadores #preencher[...] ficam a vermelho até
// serem substituídos — o relatório entregue não deve ter nenhum.
#let mostrar-orientacoes = state("mostrar-orientacoes", true)

#let orientacao(corpo) = context {
  if mostrar-orientacoes.get() {
    block(
      width: 100%,
      fill: rgb("#FFF4E5"),
      stroke: (left: 3pt + rgb("#C76C1B")),
      inset: (x: 10pt, y: 8pt),
      radius: 2pt,
      breakable: true,
    )[
      #set text(size: 9pt)
      #set par(justify: false)
      #text(weight: "bold", fill: rgb("#C76C1B"))[Orientação (esconder antes de entregar)] \
      #corpo
    ]
  }
}

// Texto a substituir pela equipa.
#let preencher(corpo) = text(fill: rgb("#B00020"), style: "italic")[{#corpo}]

// Espaço reservado para uma figura ainda não produzida.
#let figura-pendente(descricao, altura: 5cm) = rect(
  width: 100%,
  height: altura,
  stroke: (dash: "dashed", paint: gray),
  inset: 10pt,
)[
  #align(center + horizon)[
    #text(fill: gray)[Figura a produzir: #descricao]
  ]
]

// -----------------------------------------------------------------------------
// Tabelas
// -----------------------------------------------------------------------------
#let cor-cabecalho = rgb("#F3E3D3")

// Tabela genérica com cabeçalho sombreado.
//   #tabela(colunas: (auto, 1fr), [Cab 1], [Cab 2], ..celulas)
// `n-cabecalho` indica quantas células formam o cabeçalho (por omissão, uma linha).
#let tabela(colunas: (auto, 1fr), tamanho: 9pt, ..celulas) = {
  let c = celulas.pos()
  let n = if type(colunas) == int { colunas } else { colunas.len() }
  set text(size: tamanho)
  set par(justify: false)
  table(
    columns: colunas,
    stroke: 0.5pt + gray,
    inset: 5pt,
    align: left + top,
    fill: (x, y) => if y == 0 { cor-cabecalho },
    table.header(..c.slice(0, n).map(x => strong(x))),
    ..c.slice(n),
  )
}

// Tabela "Campo | Valor" (cabeçalho do caso de uso, identificação, etc.).
#let tabela-campos(..pares) = {
  set text(size: 9pt)
  set par(justify: false)
  table(
    columns: (4.2cm, 1fr),
    stroke: 0.5pt + gray,
    inset: 5pt,
    align: left + top,
    fill: (x, y) => if x == 0 { cor-cabecalho },
    ..pares.pos().enumerate().map(((i, x)) => if calc.even(i) { strong(x) } else { x }),
  )
}

// Páginas na horizontal (para tabelas largas):  #paisagem[ ...conteúdo... ]
#let quebra-capitulo = state("quebra-capitulo", true)
#let paisagem(corpo) = page(flipped: true)[
  #quebra-capitulo.update(false)
  #corpo
  #quebra-capitulo.update(true)
]

// Figura com tabela legendada (aparece na Lista de Tabelas).
#let tab(legenda, corpo) = figure(corpo, kind: table, caption: legenda)

// Prioridade MoSCoW com cor: Must have / Should have / Could have / Won't have (this time).
#let must = text(fill: rgb("#B00020"), weight: "bold")[Must]
#let should = text(fill: rgb("#C76C1B"), weight: "bold")[Should]
#let could = text(fill: rgb("#2E7D32"), weight: "bold")[Could]
#let wont = text(fill: gray.darken(30%), weight: "bold")[Won't]

// -----------------------------------------------------------------------------
// Página e tipografia
// -----------------------------------------------------------------------------
#let project(body) = {
  set document(title: "PictuRAS — Fase 1: Suporte a Vídeo")
  set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm))
  // Carlito: equivalente métrico livre (OFL) da Calibri, incluída em fonts/.
  set text(font: "Carlito", lang: "pt", region: "PT", size: 10.5pt)
  set par(justify: true)
  set heading(numbering: "1.")

  show heading: set block(above: 2em, below: 1em)
  show heading.where(level: 1): it => {
    context if quebra-capitulo.get() { pagebreak(weak: true) }
    text(size: 18pt, it)
  }
  show heading.where(level: 2): it => text(size: 14pt, it)
  show heading.where(level: 3): it => text(size: 12pt, it)

  show link: set text(fill: blue.darken(30%))
  show link: underline.with(evade: false)

  show figure.where(kind: table): set figure.caption(position: top)
  show figure: set block(breakable: true)

  body
}
