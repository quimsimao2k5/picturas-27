// =============================================================================
//  PictuRAS · RAS 2026/2027 · Relatório da Fase 1 — Suporte a Vídeo
//  Compilar:  typst compile --font-path fonts main.typ doc-ext-requisitos.pdf
//  Pré-visualizar ao gravar:  typst watch --font-path fonts main.typ doc-ext-requisitos.pdf
// =============================================================================
#import "cover.typ": cover
#import "template.typ": *

#show: project

// Antes de entregar: `false` esconde todas as caixas de orientação.
#mostrar-orientacoes.update(true)

#cover(
  title: "Fase 1 — Suporte a Vídeo",
  subtitle: "Requisitos, Arquitetura, Implementação e Validação do MVP",
  group: "Grupo PL5-G7",   // e.g., "Grupo PL3-G2"
  authors: (
    (name: "Francisco Dias", number: "pg63958"), 
    (name: "Rodrigo Rocha", number: "pg65437"),
    (name: "Rodrigo Fernandes", number: "pg64026"),
    (name: "Luís Miguel", number: "pg65424"),
    (name: "Joaquim Cunha", number: "pg63986"),
  ),
  "Outubro, 2026",
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

// Parte I — Enquadramento e visão transversal
#include "capitulos/01-introducao.typ"
#include "capitulos/02-contexto-stakeholders.typ"
#include "capitulos/03-visao-geral-video.typ"

// Parte II — Especificação das funcionalidades de vídeo, por artefacto
// (todas as funcionalidades juntas em cada capítulo; um ficheiro por caso de uso em casos-uso/)
#include "capitulos/04-casos-de-uso.typ"
#include "capitulos/05-ers.typ"
#include "capitulos/06-impacto.typ"
#include "capitulos/07-rastreabilidade.typ"

// Parte III — Arquitetura, IA e validação
#include "capitulos/08-arquitetura.typ"
#include "capitulos/09-agentes-ia.typ"
#include "capitulos/10-testes-validacao.typ"
#include "capitulos/11-manutencao-corretiva.typ"
#include "capitulos/12-conclusao.typ"

// Anexos
#include "capitulos/99-anexos.typ"
