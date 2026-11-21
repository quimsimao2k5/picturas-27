#import "../template.typ": *

// Capítulo inteiro na horizontal (tabelas largas).
#paisagem[
= Candidatos a Requisitos Não Funcionais

#tab([Candidatos a requisitos não funcionais da Fase 2],
  tabela(
    colunas: (1.4cm, 2.6cm, 3.4cm, 2.4cm, 3cm, 3cm, 1.8cm, 2.4cm, 3cm),
    tamanho: 7.5pt,
    [\#], [Característica / subcaracterística (ISO/IEC 25010)], [Fragilidade na base (evidência)], [Origem (padrão global / vídeo / interação)], [Impacto nos stakeholders (pertinência)], [Exigência técnica (complexidade)], [Cenário (`QS-nn`, cap. 5)], [Escala e método de medição (esboço)], [Pré-requisitos / efeitos colaterais],
    [*CAND-1*], [Eficiência de desempenho — *capacidade / elasticidade*], [Um só `video_tool`, `prefetch_count=1`, sem réplicas nem ajuste à carga: os vídeos são processados um a um e uma legendagem bloqueia todos os outros (EV-03, EV-09, EV-26, EV-27, EV-28)], [*Interação:* recursos fixos do padrão global + _worker_ único do padrão do vídeo], [Utilizadores: minutos de espera por um vídeo de segundos, que crescem com o número de utilizadores. Operação: 60 % do CPU sem uso sob carga], [Alta: filas por tipo de trabalho, réplicas que acompanham a carga sem o Docker Compose o fazer sozinho, e medição de cenários concorrentes com vários utilizadores simulados], [*QS-01* (principal), QS-02, QS-03; guarda: QS-07], [Tempos vistos pelo utilizador nos cenários S1–S4 (secção 6.2)], [Precisa de CAND-2 (legendagem separada). Efeitos: mais memória e CPU por réplica; acesso à API do Docker (segurança)],
    [*CAND-2*], [Manutenibilidade — *modularidade*], [As 3 funcionalidades de vídeo numa só unidade implantável, efeitos duplicados, orquestrador ramificado; mudar a legendagem ou uma falha nela afeta todos os vídeos (EV-12, EV-21, EV-23, EV-29, EV-31)], [*Padrão do vídeo* (afasta-se da decomposição por ferramenta do padrão global)], [Equipa de desenvolvimento: cada mudança na legendagem reconstrói e reinicia o vídeo todo. Utilizadores: uma falha na legendagem atrasa os seus vídeos], [Alta: dividir o `video_tool` preservando as regras do _pipeline_ (ordem, extração terminal, pré-visualização, progresso único) e mover o encadeamento para o `projects`], [*QS-04* (principal), QS-05, QS-06], [Contagens de impacto de uma mudança e de isolamento de uma falha, M1–M3 (secção 6.2)], [Pré-requisito de CAND-1. Efeitos: mensagens e ficheiros intermédios entre etapas (comportamento temporal), mais serviços a operar],
  ),
)

== Quantificação

Os valores da base, os alvos e os mínimos foram fixados *depois* da medição inicial (11–12/11/2026) e não antes de medir. A origem de cada alvo está entre parênteses: o tempo de um vídeo curto sozinho, os requisitos do PL1-G4 (REQ-VID-EDIT-010, -011, -013 e REQ-VID-FAIL-004), a definição de elasticidade das diretrizes ou a própria medição inicial (por exemplo, só 40 % dos 8 CPU usados sob rajada). C3 (efeito novo) é descritivo, sem alvo.

#tab([Quantificação dos requisitos não funcionais],
  tabela(
    colunas: (3.4cm, 1fr, 1fr),
    tamanho: 8pt,
    [], [CAND-1 (elasticidade)], [CAND-2 (modularidade)],
    [Escala (o que se mede e em que unidade)], [*S1:* espera do vídeo curto (s). *S2:* máximo de vídeos em processamento simultâneo (contagem) e débito com N = 8 (vídeos/min). *S3:* réplicas de vídeo ao longo do tempo (contagem), regresso ao mínimo e duração da rajada (s). *S4* (efeito colateral): tempo de conclusão / duração], [*M1:* funcionalidades de vídeo interrompidas por uma mudança (contagem, 0 a 3), ficheiros e unidades tocados. *M2:* máximo de funcionalidades de vídeo numa unidade implantável (contagem). *M3:* vídeos curtos afetados por uma falha da legendagem (%) e trabalhos perdidos (contagem)],
    [Cenário de medição], [S1, S2, S3 e S4 (descritos abaixo)], [M1 (mudanças C1, C2, C3), M2 (análise estática), M3 (falha da legendagem aos 55 % do progresso)],
    [Carga], [Vídeos de 10 s (720p) e de 177 s com fala (1080p); 30 s e 150 s no S4], [M3: 1 legendagem do vídeo de 177 s e 4 vídeos de 10 s],
    [Ambiente], [O mesmo computador nas duas medições: Apple M2, 8 núcleos; Docker com 8 CPU e 6 GB; dados limpos antes de cada medição; modelo Whisper já descarregado], [O mesmo; M1 e M2 sobre o código, sem o lançar],
    [Instrumento], [_Scripts_ em `Documentacao/medicoes/scripts/`: cliente da API pública, tempos pelos eventos WebSocket, `docker ps` e `docker stats` para réplicas e recursos, API de gestão do RabbitMQ para as filas; 5 repetições, mediana e dispersão], [`modularidade.py` (ficheiros alterados, imagens Docker que os contêm, marcadores de cada funcionalidade no código); M3 com `cenarios.py` (`docker compose kill -s SIGKILL`)],
    [Valor medido na base], [S1: *141,0 s*. S2: *1* vídeo de cada vez, *16,8* vídeos/min. S3: sempre *1* réplica; rajada em 158,8 s. S4: 0,39× / 0,38× / 0,90×], [M1 (C1, C2): *3* funcionalidades interrompidas. M2: *3*. M3: *100 %* afetados, 0 perdidos],
    [Valor-alvo (e origem)], [S1: *≤ 10 s* (um vídeo de 10 s sozinho demora 3,9 s). S2: *≥ 3* vídeos em simultâneo (REQ-VID-EDIT-011) e *≥ 25* vídeos/min, 1,5× a base (só 40 % do CPU usado). S3: sobe a *≥ 3* réplicas e volta ao mínimo em ≤ 120 s (definição de elasticidade das diretrizes); rajada ≤ 95 s, 0,6× a base (medição inicial). S4: não piorar mais de 10 % (REQ-VID-EDIT-010)], [M1 (C1, C2): *1* (REQ-VID-EDIT-013). M2: *1* funcionalidade por unidade (medição inicial). M3: *0 %* e 0 perdidos (REQ-VID-FAIL-004)],
    [Valor mínimo aceitável (e origem)], [S1: ≤ 30 s. S2: ≥ 2 vídeos (MVP do REQ-VID-EDIT-011) e ≥ 20 vídeos/min (1,2×). S3: sobe a ≥ 2 e volta ao mínimo; rajada ≤ 127 s (0,8×). S4: ≤ 1,0× (REQ-VID-EDIT-010)], [M1 (C1, C2): ≤ 2. M2: ≤ 2. M3: ≤ 25 % e 0 perdidos],
  ),
)

== Cenários de medição S1–S4 e M1–M3

Todos os cenários de elasticidade usam o percurso completo de um utilizador (conta premium, projeto, carregamento, _pipeline_, ligação ao WebSocket, _Apply_) e contam o tempo a partir do momento em que o _Apply_ é aceite. A *espera* vai do _Apply_ ao primeiro evento de progresso; a *conclusão* vai do _Apply_ ao aviso de que o resultado foi gravado. São tempos vistos pelo utilizador, por isso comparáveis antes e depois do _refactoring_. Cada cenário é repetido 5 vezes.

- *S1 — Bloqueio pela legendagem:* um utilizador legenda o vídeo de 177 s; quando a legendagem começa, outro pede um brilho no vídeo de 10 s. Mede-se quanto tempo o vídeo curto espera.
- *S2 — Carga concorrente:* 1, 2, 4 e 8 utilizadores pedem, no mesmo instante, um brilho no vídeo de 10 s. Mede-se quantos vídeos estão em processamento ao mesmo tempo e quantos vídeos por minuto o sistema conclui.
- *S3 — Adaptação à carga:* 30 s de calma, depois uma rajada de 8 brilhos e 1 legendagem pedidos ao mesmo tempo, depois 120 s de calma. Mede-se o número de réplicas dos serviços de vídeo a cada 2 s, se voltam ao mínimo e quanto dura a rajada.
- *S4 — Tempo de um vídeo sozinho:* brilho nos vídeos de 10 s, 30 s e 150 s, um de cada vez. Mede-se o tempo de conclusão a dividir pela duração do vídeo. Serve para garantir que o _refactoring_ não piora o caso normal.
- *M1 — Impacto de uma mudança:* para três mudanças típicas (C1: trocar o modelo Whisper na configuração; C2: corrigir o código da legendagem; C3: acrescentar um efeito novo, sépia, numa sonda nunca integrada), o _script_ lista os ficheiros alterados, as unidades implantáveis a reconstruir e as funcionalidades de vídeo interrompidas.
- *M2 — Divisão do processamento de vídeo:* análise estática do código, que conta quantas funcionalidades de vídeo (edição, legendagem, extração) há em cada unidade implantável, e ainda o tamanho, a complexidade e a duplicação do código de vídeo.
- *M3 — Isolamento de uma falha:* durante uma legendagem, quando passa os 55 % do progresso, 4 utilizadores pedem um brilho; 5 s depois o serviço que legenda é terminado à força e volta a arrancar 5 s mais tarde. Mede-se a percentagem de vídeos curtos afetados (com erro, ou com tempo de conclusão acima de 1,5× o máximo de S2 com N = 4) e se algum trabalho se perdeu.

== Relação entre os dois candidatos

CAND-2 é *pré-requisito* de CAND-1: enquanto a legendagem estiver no mesmo serviço que os efeitos, não se lhe pode dar uma fila e réplicas próprias, e os trabalhos curtos continuam a esperar atrás dela. Os dois têm também um *custo* a medir: separar as etapas acrescenta mensagens e ficheiros intermédios (comportamento temporal, QS-07), e mais réplicas ocupam mais memória e CPU e, se forem criadas pelo próprio sistema, dão-lhe acesso à API do Docker (segurança). Por isso o S4 entra na medição como guarda do efeito colateral.

== Evidência exploratória

#tab([Evidência exploratória],
  tabela(
    colunas: (5cm, 7cm, 1fr),
    tamanho: 8.5pt,
    [Descrição], [Localização (_scripts_, dados, resultados)], [Como repetir],
    [Medição inicial completa (S1–S4, M2, M3) e M1], [`Documentacao/medicoes/baseline/` (`resumo.md`, CSV por cenário, _logs_ dos serviços, `ambiente.json`)], [`Documentacao/medicoes/medicao_inicial.command` com o código no _commit_ de partida (anexo A)],
    [M3 da base com a falha aos 55 %], [`Documentacao/medicoes/baseline/m3/` (a primeira, aos 20 %, em `baseline/m3_20pct/`)], [`Documentacao/medicoes/m3_base.command`],
    [Testes de regressão e de ponta a ponta da base], [`Documentacao/testes_regressao/baseline/`], [`testes_inicial.command`, `ponta_a_ponta_inicial.command`],
  ),
)
]
