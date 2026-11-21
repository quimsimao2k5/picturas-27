#import "../template.typ": *

= Introdução

== Propósito e âmbito

Na Fase 1, o PictuRAS passou a suportar vídeo numa lógica de MVP. Nesta fase, o objetivo é melhorar dois requisitos não funcionais da *extensão de vídeo*, por _refactoring_ e sem novas funcionalidades, e demonstrar a melhoria com medições feitas antes e depois, com o mesmo método.

A análise da solução de base mostrou que todo o vídeo é processado por um único serviço (`video_tool`), com um vídeo de cada vez: uma legendagem automática ocupa-o durante minutos e atrasa os vídeos de todos os outros utilizadores, e qualquer mudança ou falha na legendagem afeta todas as funcionalidades de vídeo. Por isso, a equipa escolheu:

- *Eficiência de desempenho — capacidade / elasticidade* (CAND-1): ajustar os recursos do processamento de vídeo à carga, para que os trabalhos curtos não esperem pelos longos;
- *Manutenibilidade — modularidade* (CAND-2): separar as funcionalidades de vídeo (edição, legendagem e extração de fotogramas) em unidades implantáveis independentes.

O vídeo é sempre analisado *enquadrado no padrão global* da solução (microsserviços com filas no RabbitMQ), e todas as alterações preservam o comportamento funcional, verificado por testes de regressão e de ponta a ponta.

== _Baseline_ e repositório

#tab([Artefactos de partida],
  tabela(
    colunas: (5cm, 1fr),
    [Artefacto], [Versão / referência],
    [Documento de requisitos de base], [doc-ext-requisitos-2627.pdf (PL1-G4, 23/10/2026)],
    [Documento de solução arquitetural de base], [doc-sol-arquitetural.pdf (Fase 2 de 2025/2026)],
    [Repositório de partida], [`github.com/picturas-um/picturas-27`, _commit_ `0523102` (`052310226c51fa57a17101c7bd1ad795674aac95`); o código é igual ao de `b638a13`, só acrescenta documentação],
    [Repositório entregue], [`github.com/quimsimao2k5/picturas-27` (_fork_ da equipa), ramo `main`; _refactoring_ em `aee398d` e `67d222c`; o _commit_ da entrega é o último do ramo a 27/11/2026],
    [Diretrizes da Fase 2], [Versão 1 (4/11/2026)],
  ),
)

== Exercícios e versões usadas

#tab([Exercícios que alimentam este relatório],
  tabela(
    colunas: (3.6cm, 2.2cm, 2cm, 2cm, 1fr),
    [Exercício], [Capítulos], [Enunciado], [Template], [Versão do documento da equipa],
    [Exercício 6, Bloco 1: padrões arquiteturais], [2, 3 e 4], [1.1], [1.1], [v1.0 (`Documentacao/exercicio6/`)],
    [Exercício 6, Bloco 2: trade-offs, cenários e candidatos a RNF], [5 e 6], [1.1], [1.1], [v1.0 (`Documentacao/exercicio6/`)],
    [Exercício 7: táticas arquiteturais], [7 a 10], [não publicado (seguidos os slides das aulas 6 e 7)], [3.0], [v1.0 (`Documentacao/exercicio7/`)],
  ),
)

== Organização do documento

A *Parte II* (capítulos 2 a 4) faz o diagnóstico da solução de base: como foi lançada e medida, a arquitetura com o caminho do vídeo, os padrões global e do vídeo, e as alternativas comparadas numa matriz. A *Parte III* (capítulos 5 e 6) transforma as fragilidades em cenários de qualidade, prioriza-os e escolhe os dois candidatos a RNF, com a sua quantificação. A *Parte IV* (capítulos 7 a 10) apresenta as táticas, as decisões arquiteturais implementadas, a vista antes e depois, os _trade-offs_, os resultados das medições e a preservação funcional. A *Parte V* (capítulos 11 e 12) conclui e documenta a utilização de IA. Os anexos explicam como repetir tudo.

Os capítulos encadeiam-se pelos IDs: as evidências (`EV-nn`) e hipóteses (`H-nn`) sustentam o diagnóstico e as alternativas (`ALT-n`); estas levam aos cenários (`QS-nn`) e candidatos (`CAND-n`); daí saem as táticas (`TAT-nn`) e as decisões (`DA-n`). Cada evidência é descrita onde aparece pela primeira vez. As decisões tomadas pela equipa ao longo da fase (`D1` a `D35`) estão registadas em `Documentacao/CONTEXTO_E_DECISOES_FASE2.md`.
