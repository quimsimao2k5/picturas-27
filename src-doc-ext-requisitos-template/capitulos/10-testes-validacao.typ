#import "../template.typ": *

= Testes e Validação do MVP

#orientacao[
  Os critérios de aceitação da ERS (_Dado… Quando… Então…_) são a base dos testes. Cada requisito implementado
  deve ter pelo menos um teste (automático ou manual) com resultado registado. Para os requisitos não
  funcionais, registem o valor medido face ao *Alvo*, sempre que aplicável.
]

== Estratégia e ambiente de testes

#preencher[Tipos de teste (unitários, integração, ponta-a-ponta, manuais), ferramentas, ambiente (docker compose), ficheiros de vídeo de teste usados (formatos, durações, tamanhos).]

== Testes realizados

#tab([Testes e resultados],
  tabela(
    colunas: (2.2cm, 1.6cm, 1fr, 2.8cm, 1.6cm),
    tamanho: 8.5pt,
    [ID], [Tipo], [Descrição (Dado… Quando… Então…)], [Requisito(s)], [Resultado],
    [TST-#preencher[FUNC]-01], [#preencher[Automático / Manual]], [#preencher[…]], [#preencher[IDs]], [#preencher[Passa]],
  ),
)

== Limitações e defeitos conhecidos

#preencher[Defeitos conhecidos, requisitos parcialmente cumpridos e limitações assumidas no MVP.]
