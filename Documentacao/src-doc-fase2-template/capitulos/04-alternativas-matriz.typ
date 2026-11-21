#import "../template.typ": *

= Alternativas e Matriz de Comparação

== Alternativas consideradas

#tab([Alternativas consideradas],
  tabela(
    colunas: (1.4cm, 3.4cm, 1fr, 2.6cm, 2.6cm),
    tamanho: 8.5pt,
    [ID], [Nome / padrão], [Descrição breve], [Mantém ou altera o padrão global?], [Fonte],
    [ALT-1], [*Microsserviços por responsabilidade de vídeo* (_Microservices_ / _Pipes and Filters_ distribuído)], [Separar o `video_tool` em serviços com fila própria: efeitos (descodificação, efeitos de fotograma e de tempo, codificação), legendagem e extração de fotogramas], [Mantém (alinha o vídeo com "um serviço por ferramenta")], [Diretrizes (modularidade); enunciado (sugestão 1); catálogo de padrões],
    [ALT-2], [*_Competing Consumers_ com filas por tipo de trabalho e réplicas ajustadas à carga* (_Work Queue_)], [Vários consumidores do processamento de vídeo, filas separadas para os trabalhos pesados (legendagem) e número de réplicas ajustado ao tamanho de cada fila], [Mantém], [Diretrizes (elasticidade); enunciado (sugestão 2); catálogo],
    [ALT-3], [*Tarefas efémeras coordenadas por um orquestrador de _workflow_*], [Um _job_ por vídeo (ou por etapa), lançado a pedido e coordenado por um motor que gere estados, novas tentativas e paralelismo], [Afasta-se parcialmente (novo orquestrador ao lado do `projects`)], [Enunciado (sugestão 3)],
  ),
)

Como termo de comparação ao nível global, não proposto como alternativa, considerou-se o _Modular Monolith_: um único processo com os módulos de vídeo separados. Resolveria a duplicação de código, mas tiraria ao vídeo a fila própria e a hipótese de escalar cada parte à parte, que é exatamente o que falta. Os microsserviços continuam, por isso, o contexto certo para o vídeo.

== Análise de cada alternativa

*ALT-1 — Microsserviços por responsabilidade de vídeo*

#tabela-campos(
  [Coerência com o padrão global], [Alta: replica a decomposição por ferramenta das imagens e usa as mesmas filas, o mesmo volume e o mesmo protocolo de mensagens],
  [Efeito nos atributos de qualidade], [Modularidade e modificabilidade sobem: cada funcionalidade numa unidade implantável, e mudar a legendagem não reinicia os efeitos (H-12). A capacidade melhora de forma indireta, porque cada serviço pode ter recursos e réplicas próprios. O comportamento temporal pode piorar um pouco, com mensagens e ficheiros intermédios entre etapas (H-09)],
  [Vantagens potenciais], [Isolamento de falhas: um erro na legendagem não para os efeitos (H-11); imagem Docker dos efeitos mais pequena (sem Whisper); é a pré-condição para escalar a legendagem à parte],
  [Desvantagens ou riscos], [Mais serviços a operar; a ordem do _pipeline_ passa a exigir coordenação entre serviços (quem decide a etapa seguinte); risco de partir as regras sem requisito explícito (extração terminal, legendagem na ordem do _pipeline_)],
  [Custo e risco de migração (a funcionalidade existente tem de ser preservada)], [Médio. As funções já estão em ficheiros separados (`subtitles.py`, `frame_extraction.py`); o maior trabalho é coordenar as etapas e manter os testes de regressão de vídeo, que já existem em `Tools/video/tests` e `projects/tests`],
)

*ALT-2 — _Competing Consumers_ com filas por tipo e réplicas ajustadas à carga*

#tabela-campos(
  [Coerência com o padrão global], [Alta: mantém o RabbitMQ e o contrato das mensagens; acrescenta réplicas e filas por tipo de trabalho],
  [Efeito nos atributos de qualidade], [Capacidade e elasticidade sobem: vários vídeos em paralelo, e a legendagem deixa de bloquear os outros se tiver fila própria (H-10). O comportamento temporal dos trabalhos curtos melhora sob carga. Utilização de recursos: mais memória com várias réplicas (o Whisper pesa)],
  [Vantagens potenciais], [Resolve diretamente a serialização (REQ-VID-EDIT-011); o _ack_ manual existente já garante a reentrega se uma réplica cair (EV-09)],
  [Desvantagens ou riscos], [O Docker Compose não ajusta réplicas sozinho: é preciso um componente que observe as filas e mude o número de réplicas. Numa só máquina, os recursos totais são limitados (8 CPU, 6 GB). Cuidado com a ordem e o progresso por vídeo],
  [Custo e risco de migração], [Médio. Pouca mudança no código do _worker_; o risco está no mecanismo de escalonamento e na sua medição (S1–S3)],
)

*ALT-3 — Tarefas efémeras coordenadas por um orquestrador de _workflow_*

#tabela-campos(
  [Coerência com o padrão global], [Média a baixa: introduz um segundo orquestrador ao lado do `projects` e outro modelo de execução],
  [Efeito nos atributos de qualidade], [Capacidade e recuperabilidade altas (cada tarefa isolada, novas tentativas geridas pelo motor); modularidade alta; comportamento temporal com um custo de arranque por tarefa (H-13)],
  [Vantagens potenciais], [Estados, novas tentativas e paralelismo geridos por um componente especializado],
  [Desvantagens ou riscos], [Tecnologia nova a operar; duplica responsabilidades com o `projects`; difícil de demonstrar nesta fase sem alterar o comportamento],
  [Custo e risco de migração], [Alto],
)

#paisagem[
== Matriz de comparação de padrões

Escala: *Alto / Médio / Baixo* (nível de qualidade que o padrão suporta). As colunas do padrão global e do vídeo assentam em evidências do código e da medição inicial; as das alternativas são hipóteses feitas antes do _refactoring_ (última tabela deste capítulo), entretanto verificadas para ALT-1 e ALT-2.

#tab([Matriz de comparação de padrões],
  tabela(
    colunas: (4cm, 3.8cm, 4.4cm, 3cm, 3cm, 3cm),
    tamanho: 8pt,
    [Atributo de qualidade (ISO/IEC 25010)], [Padrão global atual (referência)], [Padrão atual do vídeo], [ALT-1], [ALT-2], [ALT-3],
    [Relação com o padrão global], [—], [Afasta-se (EV-03, EV-11)], [Mantém], [Mantém], [Afasta-se parcialmente],
    [Eficiência de desempenho: comportamento temporal], [*Médio* — o _Apply_ responde logo, mas cada ferramenta escreve a saída completa no volume (EV-06, EV-24)], [*Alto sozinho, Baixo sob carga* — 0,39–0,90× a duração (EV-22), mas um vídeo de 10 s passa de 3,9 s para 144,7 s durante uma legendagem (EV-26)], [*Médio* — mensagens e ficheiros intermédios entre etapas (H-09)], [*Alto* — os vídeos curtos deixam de esperar pela legendagem (H-10)], [*Médio* — custo de arranque por tarefa (H-13)],
    [Eficiência de desempenho: capacidade / elasticidade], [*Médio* — uma fila por ferramenta, mas um contentor fixo por serviço (EV-03, EV-04)], [*Baixo* — 16–18 vídeos/min de 1 a 8 utilizadores, no máximo 1 em processamento (EV-27); #ev("EV-28", [`baseline/s3/`], [sob rajada, 1 réplica sempre, até 9 vídeos à espera, 319 % de 800 % de CPU usados])], [*Médio* — permite escalar cada etapa, mas não escala sozinha (H-09)], [*Alto* — réplicas ajustadas à fila (H-10)], [*Alto* — uma tarefa por vídeo (H-13)],
    [Fiabilidade: tolerância a falhas / recuperabilidade], [*Baixo* — _ack_ automático nas ferramentas de imagem; IDs trocados nas respostas de erro (EV-10, EV-20)], [*Médio* — sem perda após falha, mas uma falha na legendagem atrasa 100 % dos outros vídeos (EV-29); `heartbeat=0` (H-07)], [*Alto* — uma falha na legendagem não para os efeitos (H-11)], [*Médio / Alto* — a mensagem passa para outra réplica (EV-09, H-10)], [*Alto* — novas tentativas geridas pelo motor (H-13)],
    [Manutenibilidade: modularidade / modificabilidade], [*Médio* — um serviço por ferramenta, mas orquestrador com 2 732 linhas (EV-21)], [*Baixo* — 3 funcionalidades numa unidade; efeitos duplicados; CC máx. 22 (EV-23); mudar a legendagem interrompe as 3 (EV-31)], [*Alto* — uma funcionalidade por unidade (H-12)], [*Baixo* — não muda a decomposição], [*Alto* (H-13)],
    [Segurança], [*Baixo* — 12 portas publicadas, segredos no Compose, TLS interno sem validação (EV-03, EV-16, EV-17)], [*Baixo* — herda o global], [*Baixo* — igual, com mais serviços internos], [*Baixo* — igual], [*Baixo / Médio* — novo componente a proteger],
    [Usabilidade: operabilidade], [*Médio* — progresso em tempo real, perdido com um _refresh_ (EV-19)], [*Médio* — progresso a cada 2 %, mas espera longa e sem explicação sob carga (EV-26)], [*Médio*], [*Médio / Alto* — menos espera sob carga (H-10)], [*Médio*],
  ),
)
]

== Adequação do padrão atual

O *padrão global* (microsserviços com API Gateway e filas no RabbitMQ) continua adequado ao vídeo: dá-lhe desacoplamento, mensagens duráveis e uma fila própria, e é ele que torna possíveis ALT-1 e ALT-2 sem mudar a arquitetura. O *padrão atual do vídeo* é adequado a *um vídeo de cada vez*: cumpre o REQ-VID-EDIT-010 com folga (EV-22) e, com o _ack_ manual, não perde trabalho quando o _worker_ falha (EV-29). Deixa de ser adequado com *vários utilizadores e com a legendagem*: os vídeos são processados um a um (EV-27, REQ-VID-EDIT-011 não cumprido), uma legendagem atrasa um vídeo de 10 s cerca de *141 s* (EV-26) e os recursos não acompanham a carga (EV-28, só 40 % do CPU disponível usado). Concentrar as 3 funcionalidades numa unidade (EV-23) faz ainda com que qualquer mudança ou falha na legendagem afete todos os vídeos (EV-29, EV-31).

*ALT-2* responde à fragilidade de capacidade / elasticidade e *ALT-1* à de modularidade; as duas mantêm o padrão global e são complementares, porque separar a legendagem (ALT-1) é o que permite escalá-la à parte (ALT-2). ALT-3 resolveria as duas, mas com um custo e um risco de migração que não se justificam numa fase de _refactoring_. A equipa escolheu por isso *ALT-1 + ALT-2*; os _trade-offs_ estão no capítulo 5 e a concretização em táticas nos capítulos 7 e 8.

== Hipóteses e o seu estado

As hipóteses H-01 a H-04 foram confirmadas pela medição inicial; as de ALT-1 e ALT-2 (H-09 a H-12) pela medição final, feita com o mesmo método depois do _refactoring_ (capítulo 10).

As evidências da medição final usadas na tabela seguinte são: #ev("EV-32", [`Documentacao/medicoes/final/`, 14/11/2026, _commit_ `67d222c`], [resultados de S1 a S4 depois de ALT-1 + ALT-2, com a mesma máquina e o mesmo método]); #ev("EV-33", [`final/m3/`], [com o `video_subtitles` terminado aos 55 %, 0 % dos vídeos curtos afetados (mediana)]); #ev("EV-34", [`final/m1/`, `final/m2/`], [uma funcionalidade por serviço; mudar a legendagem interrompe só 1 funcionalidade]). Os valores estão no capítulo 10.

#tab([Hipóteses e estado após as medições],
  tabela(
    colunas: (1.4cm, 1fr, 3.6cm, 4.6cm),
    tamanho: 8.5pt,
    [ID], [Hipótese], [Como confirmar ou refutar], [Estado],
    [H-01], [Uma legendagem atrasa um vídeo curto de outro utilizador aproximadamente pela duração da legendagem], [Medição S1], [*Confirmada* (EV-26)],
    [H-02], [Vários vídeos submetidos ao mesmo tempo são processados em série], [Medição S2], [*Confirmada* (EV-27)],
    [H-03], [Os recursos do processamento de vídeo não se ajustam à carga], [Medição S3], [*Confirmada* (EV-28)],
    [H-04], [Se o serviço que legenda falhar a meio, os outros vídeos são atrasados, mas não perdidos], [Medição M3], [*Confirmada* (EV-29)],
    [H-05], [Um carregamento de 1 GB ocupa cerca de 3 GB de memória no conjunto dos serviços], [Pico de memória por serviço durante o _upload_], [Por confirmar (fora do par escolhido)],
    [H-06], [Uma ferramenta de imagem que caia a meio perde o trabalho], [Terminar uma ferramenta durante o processamento], [Por confirmar (fora do par)],
    [H-07], [Com `heartbeat=0`, um _worker_ bloqueado não é detetado], [Simular um bloqueio], [Por confirmar],
    [H-08], [O custo do vídeo é dominado pelo laço por fotograma em Python], [Perfilar o _worker_], [Por confirmar],
    [H-09], [Em ALT-1, separar as etapas acrescenta tempo, mas permite dar recursos a cada etapa], [S4 e S1 na medição final], [*Confirmada:* custo extra desprezável (pior caso +2,4 %) e limites e réplicas por serviço (EV-32)],
    [H-10], [Em ALT-2, os vídeos curtos deixam de esperar pela legendagem e o débito cresce com a carga], [S1, S2 e S3 na medição final], [*Confirmada em parte:* a espera cai de 141 s para 6,5 s e há até 3 vídeos em simultâneo, mas o débito só sobe 12 %, porque as réplicas disputam os mesmos 8 CPU (EV-32)],
    [H-11], [Em ALT-1, uma falha na legendagem não afeta os outros vídeos], [M3 na medição final], [*Confirmada* na mediana (EV-33)],
    [H-12], [Em ALT-1, mudar a legendagem só reinicia o serviço de legendagem], [M1 e M2 na medição final], [*Confirmada* (EV-34)],
    [H-13], [Em ALT-3, cada tarefa paga um custo de arranque, mas o motor dá paralelismo e novas tentativas], [Não avaliado], [Por confirmar (alternativa não escolhida)],
  ),
)
