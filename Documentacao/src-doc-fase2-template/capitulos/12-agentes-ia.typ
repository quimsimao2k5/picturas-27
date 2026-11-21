#import "../template.typ": *

= Utilização de IA

== Ferramentas, modelos e configuração

#tabela(
  colunas: (3.6cm, 1fr),
  [Ferramenta / modelo], [Configuração e utilização (_skills_, instruções de projeto, MCP, …)],
  [Claude (Anthropic), modelos Claude Opus, na aplicação Claude], [Agente com acesso à pasta do repositório no computador de medição da equipa (ligação da aplicação de secretária) e a um ambiente na _cloud_ para escrever e testar código fora do Docker. A equipa usou um Projeto com os documentos de contexto da fase, para manter as decisões entre sessões],
  [Instruções de projeto], [`AGENTS.md` (já existente na base; atualizado com a arquitetura nova) e `Documentacao/CONTEXTO_E_DECISOES_FASE2.md`, com as decisões D1–D35, as questões em aberto e o estado de cada passo. Regras dadas pela equipa ao agente: não decidir sozinho (apresentar opções com uma recomendação), não alterar o enunciado nem o _template_, não fazer _commits_ nem _push_ (a equipa revê e faz), não afetar outros contentores Docker da máquina],
  [_Skills_ e ferramentas do agente], [Leitura de PDF (enunciados e slides), geração de diagramas Mermaid, execução de comandos no computador de medição (lançadores das medições e dos testes), Typst para este relatório],
)

== Tarefas apoiadas e validação

#tab([Tarefas apoiadas por IA e validação],
  tabela(
    colunas: (2.4cm, 2.8cm, 3.2cm, 3.6cm, 1fr),
    tamanho: 8pt,
    [Ferramenta / modelo / _skill_], [Tarefa apoiada (capítulo)], [O que foi aceite], [O que foi rejeitado e porquê], [Como foi validado pela equipa],
    [Claude], [Diagnóstico da base: evidências com ficheiro e linha, padrões, alternativas, matriz (caps. 2 a 4)], [As evidências e a análise; a escolha de ALT-1 + ALT-2 pela equipa, entre as opções apresentadas], [Fazer a vista global de raiz, uma das opções apresentadas: a equipa preferiu adaptar a vista dos docentes (D19)], [Evidências verificáveis no _commit_ `0523102`; revisão do texto],
    [Claude], [Plano de medição, _scripts_, execução das medições inicial e final (caps. 6 e 10)], [Os cenários S1–S4 e M1–M3 e os valores-alvo, decididos pela equipa], [A falha do M3 aos 20 %: o serviço era terminado antes da legendagem; passou para 55 % nas duas fases e o M3 da base foi repetido], [Execuções acompanhadas no computador de medição; verificação cruzada com os _logs_ dos serviços (EV-30)],
    [Claude], [Táticas, decisões DA-1 e DA-2 e implementação do _refactoring_ e dos testes (caps. 7 a 9)], [O código dos três serviços, do `autoscaler` e do encadeamento, revisto e aprovado pela equipa antes do _commit_], [As táticas registadas como rejeitadas (TAT-03, -04, -05, -09, -10, coreografia, réplicas fixas). O limite de 1 GB do `video_effects`, proposto sem medição, que fez falhar os vídeos 1080p (EV-36)], [101 pytest e 10 `node --test`; ponta a ponta 15/15; medição final completa],
    [Claude], [Redação do relatório e dos exercícios 6 e 7 (todos os capítulos)], [O texto, como base para a revisão da equipa], [Afirmações que não correspondiam ao estado real (por exemplo, dar o texto como já revisto pela equipa antes de o ser)], [Revisão final do relatório por todos os elementos antes da entrega],
  ),
)

== Análise crítica

O agente foi útil sobretudo no que exige ler muito código com precisão (as evidências com ficheiro e linha), em automatizar as medições de forma repetível e em implementar um _refactoring_ grande mantendo os testes da base a passar. A regra de não decidir sozinho funcionou: todas as decisões (D1–D35) foram tomadas pela equipa a partir de opções com prós e contras, e ficaram registadas.

Os erros mais relevantes foram de *dimensionamento e de método*, não de código. O limite de memória de 1 GB por réplica do `video_effects` foi proposto pelo agente a partir de um exemplo, sem dados; a primeira medição final falhou com vídeos 1080p, a equipa detetou-o pelos erros "Broken pipe" nos _logs_, escolheu 3 GB e repetiu a medição. O momento da falha do M3 (20 %) não testava a legendagem na solução nova; foi detetado ao analisar as etapas do vídeo e corrigido antes da medição final, repetindo também a da base. Houve ainda pormenores que inflacionavam uma métrica (testes numa pasta que o M2 contava como código) e que foram corrigidos e documentados.

Práticas que a equipa adotou para validar o resultado: medir antes e depois com o mesmo método e comparar com os _logs_ dos serviços; correr os testes de regressão e de ponta a ponta no computador de medição, não só na _cloud_; rever cada alteração antes do _commit_, feito sempre por um elemento da equipa; e registar no documento de contexto cada decisão e cada correção, para que o histórico seja verificável.
