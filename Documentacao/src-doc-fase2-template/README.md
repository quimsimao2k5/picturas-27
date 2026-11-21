# PictuRAS · RAS 2026/2027 — Template do Relatório da Fase 2 (Typst)

Proposta de *template* para o relatório da Fase 2 (melhoria de requisitos não funcionais por *refactoring*). A sua
utilização é **opcional**. Mantém o formato, os componentes e a convenção de marcadores do template da Fase 1; o conteúdo
reúne os contributos pedidos nos Exercícios 6 (Blocos 1 e 2) e 7.


## Compilar

Requer [Typst](https://typst.app) ≥ 0.13 (CLI) ou o editor web typst.app (carregar a pasta toda).

```bash
typst compile --font-path fonts main.typ      # gera main.pdf
typst watch   --font-path fonts main.typ      # recompila a cada gravação
```

A fonte usada é a **Carlito** (equivalente livre da Calibri, licença OFL), incluída em `fonts/`.

## Estrutura e correspondência com os exercícios

| Parte | Capítulo | Origem (template do exercício) |
|-------|----------|--------------------------------|
| I | 1 Introdução | — |
| II | 2 Âmbito e Vista da Arquitetura (explica o que é uma evidência `EV-nn`) | Ex. 6 Bloco 1, secções 0 e 1 |
| II | 3 Padrões Arquiteturais Atuais | Ex. 6 Bloco 1, secções 2.1 a 2.3 |
| II | 4 Alternativas e Matriz de Comparação (`ALT`) | Ex. 6 Bloco 1, secção 3 |
| III | 5 Trade-offs, Cenários de Qualidade e Prioridades (`QS`, a partir de fragilidades do sistema atual) | Ex. 6 Bloco 2, secção 4 (sem 4.1) |
| III | 6 Candidatos a Requisitos Não Funcionais (`CAND`) | Ex. 6 Bloco 2, secção 5 |
| IV | 7 Cenários de Entrada e Táticas Candidatas (`TAT`) | Ex. 7, secções 1 e 2 |
| IV | 8 Decisões Arquiteturais (`DA`) | Ex. 7, secção 3 |
| IV | 9 Vista Arquitetural Antes e Depois | Ex. 7, secção 4 |
| IV | 10 Trade-offs, Medição e Preservação Funcional (plano, resultados antes/depois, testes de regressão) | Ex. 7, secção 5; Ex. 6 Bloco 2, secção 6 (riscos); implementação |
| V | 11 Conclusões e Recomendações | Ex. 6 Bloco 2, secção 6 |
| V | 12 Utilização de IA | Ex. 6 Bloco 2, secção 7; Ex. 7, secção 6 |
| — | Anexos (instruções de execução, glossário) | — |

```
main.typ         capa, índices e ordem dos capítulos (editar autores/grupo aqui)
template.typ     estilos e componentes (tabela, tabela-campos, orientacao, preencher, …)
cover.typ        capa
capitulos/       um ficheiro por capítulo
images/          ee-um.png (capa); acrescentar aqui os diagramas da equipa
```

## Como usar

1. Preencher cada capítulo **copiando o conteúdo já preenchido dos templates dos exercícios**, *mantendo os IDs*
   (`EV-nn`, `H-nn`, `ALT-n`, `QS-nn`, `CAND-n`, `TAT-nn`, `DA-n`). Os IDs encadeiam os capítulos. O relatório *não tem um registo
   separado* de evidências e hipóteses: descrevam cada `EV-nn` onde o usam pela primeira vez (ver a orientação da secção 2.4).
2. Substituir todos os marcadores a vermelho `{…}` (macro `#preencher[...]`).
3. As caixas laranja **Orientação** explicam cada secção. Antes de entregar, em `main.typ`:
   `#mostrar-orientacoes.update(false)`.
4. Substituir as caixas tracejadas ("Figura a produzir") por imagens em `images/`
   (e.g., `#figure(image("../images/arquitetura_global.png", width: 100%), caption: [...])`).
5. **Não inventar valores** de *baseline*, alvo ou mínimo aceitável: fixam-se após a medição inicial.

## Componentes úteis

```typst
#tabela(colunas: (2cm, 1fr), [Cab. 1], [Cab. 2], [célula], [célula])   // 1.ª linha = cabeçalho
#tabela-campos([Campo], [Valor], [Campo], [Valor])                     // tabela chave/valor
#tab([Legenda], tabela(...))                                           // tabela numerada (Lista de Tabelas)
#paisagem[ ... ]                                                       // páginas na horizontal (tabelas largas)
```

Verificação final: `grep -rn "preencher\[" capitulos` não deve devolver nada.
