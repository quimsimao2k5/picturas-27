#import "../template.typ": *

= Decisões Arquiteturais

As duas decisões foram tomadas pela equipa a partir das táticas do capítulo 7, implementadas no repositório entregue e medidas com o mesmo método da base (capítulo 10). Por isso cada uma indica os _commits_ e os desvios face ao decidido.

== DA-1 — Consumidores concorrentes por tipo de trabalho, com réplicas ajustadas à fila (cenário QS-01)

#tab([Decisão arquitetural DA-1],
  tabela-campos(
    [Contexto], [Um só `video_tool` com `prefetch_count=1` processa os vídeos de todos os utilizadores um a um: uma legendagem atrasa um vídeo de 10 s em 141 s (EV-26) e o débito não cresce com a carga (EV-27). É um _refactoring_: os resultados, a ordem dos efeitos e o progresso têm de se manter],
    [Tática(s) escolhida(s)], [*TAT-01* (replicar a computação) + *TAT-02* (separar os trabalhos por tipo)],
    [Estrutura / padrão que a realiza], [*_Competing Consumers_* (_Work Queue_): uma fila por tipo de trabalho (`video_effects_queue`, `video_subtitles_queue`, `video_frames_queue`) e um serviço `autoscaler` que, a cada 2 s, lê o tamanho de cada fila na API de gestão do RabbitMQ e ajusta as réplicas (uma por mensagem; efeitos 1–3, legendagem 1–2, extração 1–2). Desce passados 30 s sem carga, removendo primeiro as réplicas paradas, com uma paragem graciosa (`SIGTERM`)],
    [Alternativas consideradas e razão de rejeição], [*TAT-03:* as réplicas partilhariam o contentor e a memória (o modelo Whisper ocupa ≈ 0,6 GB), uma falha pararia todas e os recursos não acompanhariam a carga. *TAT-04:* não acaba com a fila única: o vídeo curto continuaria atrás da legendagem. *TAT-05:* classe C, rejeitada. *Réplicas fixas* (sem `autoscaler`) ou `docker compose --scale` manual: ocupariam memória mesmo sem carga e não cumprem a definição de elasticidade das diretrizes],
    [Consequências positivas], [Os trabalhos curtos deixam de esperar pela legendagem; vários vídeos em paralelo; recursos que acompanham a carga; se uma réplica cair, a mensagem passa para outra (o _ack_ continua no fim)],
    [Consequências negativas / riscos], [Mais memória e CPU com várias réplicas, que numa só máquina disputam os mesmos 8 CPU; o `autoscaler` precisa da API do Docker (`docker.sock`), o que lhe dá controlo sobre o anfitrião; uma réplica nova demora alguns segundos a arrancar; limites de memória por réplica a dimensionar],
    [Elementos arquiteturais afetados], [Novo serviço `autoscaler/`; `docker-compose.yaml` (serviços, limites de memória e de réplicas por variáveis de ambiente); `rabbitMQ/definitions.json` (3 filas novas, `video_queue` removida); `rabbitMQ/rabbitmq.conf` (estatísticas das filas a cada 1 s); `Tools/video_common/worker.py` (paragem graciosa)],
    [Origem e âmbito do _refactoring_], [*Interação:* recursos fixos do padrão global (Compose) + _worker_ único do padrão do vídeo. Risco de regressão baixo / médio: o contrato das mensagens não muda; o risco está no dimensionamento dos recursos],
    [Classe (A/B/C)], [*A*: o utilizador vê os mesmos resultados; só espera menos],
    [Implementação (_commits_ / _pull requests_)], [`aee398d` (_refactoring_) e `67d222c` (limite de memória), em `github.com/quimsimao2k5/picturas-27`],
    [Desvios face à decisão], [O limite de memória do `video_effects` passou de 1 GB para *3 GB* depois da primeira medição final, em que os vídeos 1080p falharam (EV-36): o valor de 1 GB tinha sido estimado sem medição],
  ),
)

== DA-2 — Um serviço por funcionalidade de vídeo, encadeado pelo orquestrador (cenário QS-04)

#tab([Decisão arquitetural DA-2],
  tabela-campos(
    [Contexto], [As 3 funcionalidades de vídeo (edição, legendagem, extração) estão numa só unidade implantável (EV-23): mudar a legendagem interrompe as 3 (EV-31) e uma falha na legendagem atrasa todos os vídeos (EV-29). É um _refactoring_: as regras do _pipeline_ mantêm-se, incluindo as que não têm requisito explícito (ordem, extração terminal e única, pré-visualização de 3 s, uma só barra de progresso)],
    [Tática(s) escolhida(s)], [*TAT-06* (separar em serviços por funcionalidade) + *TAT-07* (encadear no orquestrador) + *TAT-08* (código comum partilhado)],
    [Estrutura / padrão que a realiza], [*Microsserviços por funcionalidade* (_Pipes and Filters_ distribuído): `video_effects`, `video_subtitles` e `video_frames`, cada um com a sua fila e imagem Docker. O `projects` divide o _pipeline_ de cada vídeo em etapas (`videoStages`) e envia a seguinte quando a anterior responde, como já faz nas imagens. O código comum fica em `Tools/video_common/`],
    [Alternativas consideradas e razão de rejeição], [*TAT-09:* já existe e não chega: trocar o modelo continua a reiniciar o serviço de todos os vídeos. *TAT-10:* módulos no mesmo serviço continuam a ser uma só unidade implantável. *Coreografia* (o serviço de efeitos chama a legendagem): acopla os serviços entre si e põe a ordem do _pipeline_ em vários sítios. *ALT-3* (motor de _workflow_): custo e risco altos para uma fase de _refactoring_],
    [Consequências positivas], [Cada funcionalidade é implantada, reiniciada e testada à parte; uma falha fica no serviço onde acontece; a imagem dos efeitos deixa de levar o Whisper; é a condição para dar réplicas próprias à legendagem (DA-1)],
    [Consequências negativas / riscos], [Mensagens e ficheiros intermédios entre etapas (no volume `image_data`, apagados no fim, em erro e no cancelamento); mais serviços a operar; a divisão em etapas no `projects` passa a ter de ser testada; os efeitos de fotograma continuam duplicados entre imagem e vídeo],
    [Elementos arquiteturais afetados], [`Tools/video/` substituído por `Tools/video_effects/`, `Tools/video_subtitles/`, `Tools/video_frames/` e `Tools/video_common/`; `projects/utils/video.js` (`videoStages`); `projects/routes/projects.js` (envio da primeira etapa, encadeamento ao receber a resposta, limpeza no cancelamento); `projects/models/process.js` (campo `video_job`); `docker-compose.yaml`; testes movidos com o código e testes novos das etapas],
    [Origem e âmbito do _refactoring_], [*Padrão do vídeo*, que passa a seguir a decomposição por ferramenta do padrão global. Risco de regressão médio (regras do _pipeline_ sem requisito explícito), mitigado pelos 74 testes da base, que passaram a correr pelos três serviços, e pelo teste de ponta a ponta],
    [Classe (A/B/C)], [*A*: os mesmos resultados e a mesma barra de progresso de 0 a 100 %],
    [Implementação (_commits_ / _pull requests_)], [`aee398d`, em `github.com/quimsimao2k5/picturas-27`],
    [Desvios face à decisão], [Em ALT-1 (capítulo 4) previa-se que o serviço de efeitos recebesse o _pipeline_ inteiro; ficou o `projects` a encadear as etapas, para a ordem do _pipeline_ ficar num só sítio. A escrita atómica da legendagem, que estava na orquestração interna do `video_tool`, passou para o próprio serviço],
  ),
)
