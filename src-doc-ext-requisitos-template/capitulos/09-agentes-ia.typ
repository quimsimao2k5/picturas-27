#import "../template.typ": *

= Implementação Assistida por Agentes de IA

#orientacao[
  Obrigatório (enunciado): documentar as ferramentas e _skills_ utilizadas, enumerar as tarefas apoiadas e
  comprovar a validação realizada — tanto na especificação como no código
  e nos testes. A equipa é responsável por todo o conteúdo entregue, incluindo o gerado por IA.
  Valoriza-se evidência concreta (_commits_, _pull requests_, ficheiros de configuração dos agentes) e
  reflexão crítica (onde a IA errou e como isso foi detetado).
]

== Ferramentas, modelos e configuração

#tabela(
  colunas: (3.5cm, 1fr),
  [Ferramenta / modelo], [Configuração e utilização (_skills_, instruções de projeto, MCP, …)],
  [#preencher[e.g., Claude Code]], [#preencher[e.g., _skills_ em `.claude/skills/<skill-name>/SKILL.md`; instruções de projeto]],
)

== Tarefas apoiadas e validação

#tab([Tarefas apoiadas por agentes de IA e validação],
  tabela(
    colunas: (2.6cm, 2cm, 1fr, 1fr, 2.4cm),
    tamanho: 8.5pt,
    [Ferramenta / _skill_], [Caso de uso], [Tarefa apoiada], [Validação realizada pela equipa], [Evidência],
    [#preencher[…]], [#preencher[UC-VID-001]], [#preencher[e.g., primeira versão dos fluxos alternativos]], [#preencher[e.g., revisão manual; 2 fluxos descartados]], [#preencher[commit/PR]],
    [#preencher[…]], [#preencher[…]], [#preencher[e.g., geração do microserviço de recorte]], [#preencher[e.g., revisão de código + TST-TRIM-01..05]], [#preencher[…]],
  ),
)

== Análise crítica

#preencher[O que correu bem, onde a IA introduziu erros ou soluções inadequadas, como foram detetados, e que práticas a equipa adotou para validar o resultado.]
