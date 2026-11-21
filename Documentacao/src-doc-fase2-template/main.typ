// =============================================================================
//  PictuRAS · RAS 2026/2027 · Relatório da Fase 2 — Melhoria de Requisitos Não Funcionais
//  Compilar:  typst compile --font-path fonts main.typ
//  Pré-visualizar ao gravar:  typst watch --font-path fonts main.typ
// =============================================================================
#import "cover.typ": cover
#import "template.typ": *

#show: project

// Antes de entregar: `false` esconde todas as caixas de orientação.
#mostrar-orientacoes.update(false)

#cover(
  title: "Fase 2 — Melhoria de Requisitos Não Funcionais",
  subtitle: "Diagnóstico, decisões arquiteturais e avaliação",
  group: "Grupo PL5-G7",
  authors: (
    (name: "Francisco Dias", number: "PG63958"),
    (name: "Rodrigo Rocha", number: "PG65437"),
    (name: "Rodrigo Fernandes", number: "PG64026"),
    (name: "Luís Miguel", number: "PG65424"),
    (name: "Joaquim Cunha", number: "PG63986"),
  ),
  "Novembro, 2026",
)

// --- Elementos iniciais (numeração romana) -----------------------------------
#set page(numbering: "i", number-align: center)
#counter(page).update(1)

#include "capitulos/00-historico-versoes.typ"

#outline(title: [Índice], indent: auto, depth: 3)
#pagebreak()
#outline(title: [Lista de Figuras], target: figure.where(kind: image))
#outline(title: [Lista de Tabelas], target: figure.where(kind: table))

// --- Corpo do relatório -------------------------------------------------------
#set page(numbering: "1", number-align: center)
#counter(page).update(1)

// Parte I — Enquadramento
#include "capitulos/01-introducao.typ"

// Parte II — Diagnóstico arquitetural (Exercício 6, Bloco 1)
#include "capitulos/02-ambito-arquitetura.typ"
#include "capitulos/03-padroes-atuais.typ"
#include "capitulos/04-alternativas-matriz.typ"

// Parte III — Qualidade e candidatos a RNF (Exercício 6, Bloco 2)
#include "capitulos/05-tradeoffs-cenarios.typ"
#include "capitulos/06-candidatos-rnf.typ"

// Parte IV — Táticas, decisões arquiteturais, medição e resultados (Exercício 7 e implementação)
#include "capitulos/07-cenarios-taticas.typ"
#include "capitulos/08-decisoes-arquiteturais.typ"
#include "capitulos/09-vista-antes-depois.typ"
#include "capitulos/10-tradeoffs-medicao.typ"

// Parte V — Síntese
#include "capitulos/11-conclusoes.typ"
#include "capitulos/12-agentes-ia.typ"

// Anexos
#include "capitulos/99-anexos.typ"
