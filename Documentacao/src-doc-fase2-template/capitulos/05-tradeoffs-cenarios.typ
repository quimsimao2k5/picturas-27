#import "../template.typ": *

#paisagem[
= Trade-offs, Cenários de Qualidade e Prioridades

== Cenários de qualidade para a extensão de vídeo

Cada cenário parte de uma fragilidade da base com evidência. Os cenários QS-01 a QS-07 são os que foram medidos (cenários de medição S1–S4 e M1–M3, descritos no capítulo 6); QS-08 a QS-10 vêm de fragilidades do diagnóstico que não foram escolhidas e servem para a priorização. A medida da resposta diz o que se mede; os valores estão no capítulo 6.

#tab([Cenários de qualidade],
  tabela(
    colunas: (1.2cm, 3.6cm, 2.6cm, 1.9cm, 3cm, 2.4cm, 2.2cm, 2.6cm, 3.2cm),
    tamanho: 7.5pt,
    [ID], [Fragilidade na base (EV-nn)], [Característica (ISO/IEC 25010)], [Fonte do estímulo], [Estímulo], [Artefacto], [Ambiente], [Resposta], [Medida da resposta],
    [QS-01], [Um vídeo de 10 s espera 141 s quando é pedido durante uma legendagem (EV-26)], [Eficiência de desempenho — capacidade / elasticidade], [Utilizador B], [Pede um brilho num vídeo de 10 s enquanto o utilizador A legenda um vídeo de 177 s], [Processamento de vídeo (`video_tool`, `video_queue`)], [Operação normal; a legendagem de A já começou], [O vídeo de B é processado sem esperar pelo fim da legendagem], [Espera do vídeo de B (s), do pedido aceite ao primeiro evento de progresso (S1)],
    [QS-02], [Nunca mais de 1 vídeo em processamento; débito constante de 1 a 8 utilizadores (EV-27)], [Eficiência de desempenho — capacidade / elasticidade], [N utilizadores (1, 2, 4, 8)], [Pedem ao mesmo tempo um brilho num vídeo de 10 s cada], [Processamento de vídeo], [Operação normal, sem outros trabalhos], [Os vídeos são processados em paralelo], [Vídeos em processamento ao mesmo tempo (contagem) e débito com N = 8 (vídeos/min) (S2)],
    [QS-03], [Sob rajada, 1 réplica sempre, até 9 vídeos à espera, 60 % do CPU sem uso (EV-28)], [Eficiência de desempenho — capacidade / elasticidade], [9 utilizadores], [Rajada de 8 brilhos em vídeos de 10 s e 1 legendagem, seguida de calma], [Serviços de vídeo e os seus recursos], [Rajada em operação normal, depois sistema parado], [Os recursos aumentam com a carga e voltam ao mínimo na calma], [Réplicas ao longo do tempo (contagem), tempo até voltar ao mínimo (s), duração da rajada (s) (S3)],
    [QS-04], [Mudar o modelo Whisper ou corrigir a legendagem reinicia o serviço de todos os vídeos e interrompe as 3 funcionalidades (EV-23, EV-31)], [Manutenibilidade — modularidade / modificabilidade], [Programador], [Troca o modelo Whisper (C1, configuração) ou corrige `subtitles.py` (C2, código)], [Código e configuração da legendagem], [Em desenvolvimento, com o sistema em produção], [A mudança é implantada sem parar as outras funcionalidades de vídeo], [Funcionalidades de vídeo interrompidas pela implantação (contagem, de 0 a 3) (M1)],
    [QS-05], [Um efeito novo toca 6 ficheiros em 3 componentes, incluindo o dos efeitos existentes (EV-12, EV-31)], [Manutenibilidade — modificabilidade], [Programador], [Acrescenta um efeito de vídeo novo (sépia, C3)], [Efeitos de vídeo, `projects` e _frontend_], [Em desenvolvimento], [O efeito fica disponível sem alterar os efeitos existentes], [Ficheiros e componentes alterados, unidades a reconstruir, funcionalidades interrompidas (contagens) (M1, C3)],
    [QS-06], [Uma falha na legendagem atrasa 100 % dos outros vídeos (EV-29)], [Manutenibilidade — modularidade (isolamento); ligado a Fiabilidade — tolerância a falhas], [Falha interna], [O serviço que legenda é terminado (`SIGKILL`) a meio de uma legendagem, com 4 vídeos curtos pedidos entretanto], [Serviço da legendagem e fila], [Lote em curso; o serviço volta a arrancar 5 s depois], [Os outros vídeos não são afetados e a legendagem é retomada sem perder o pedido], [Vídeos curtos afetados (%; afetado = erro ou mais de 1,5× o tempo máximo de S2 com N = 4) e trabalhos perdidos (M3)],
    [QS-07], [Cumprido na base (0,38–0,90× a duração, EV-22); é o efeito colateral a vigiar], [Eficiência de desempenho — comportamento temporal], [Utilizador], [Aplica um brilho a um vídeo de 10 s, 30 s ou 150 s], [Processamento de vídeo], [Sem outros trabalhos], [O vídeo é processado], [Tempo de conclusão / duração do vídeo (S4; REQ-VID-EDIT-010)],
    [QS-08], [Carregamento inteiro em memória em três serviços (EV-15; H-05)], [Eficiência de desempenho — utilização de recursos], [Utilizador premium], [Carrega um vídeo de 1 GB], [API Gateway, `projects`, `img_storage`], [Operação normal], [O vídeo é aceite e guardado], [Pico de memória somado dos três serviços (MB) e tempo até à resposta (s)],
    [QS-09], [12 portas internas publicadas, segredos no repositório, TLS interno sem validação (EV-03, EV-16, EV-17)], [Segurança — confidencialidade / autenticidade], [Atacante na rede do anfitrião], [Acede diretamente a uma porta interna publicada], [Serviços internos e `docker-compose.yaml`], [Operação normal], [O acesso é recusado; só a entrada pelo nginx funciona], [Portas internas acessíveis (contagem) e segredos versionados (contagem)],
    [QS-10], [As ferramentas de imagem confirmam a mensagem ao recebê-la (EV-10; H-06)], [Fiabilidade — tolerância a falhas], [Falha interna], [Uma ferramenta de imagem é terminada a meio de um trabalho], [Ferramenta de imagem e a sua fila], [Operação normal], [O trabalho é retomado], [Trabalhos de imagem perdidos (contagem)],
  ),
)
]

#tab([Priorização dos cenários],
  tabela(
    colunas: (1.4cm, 1fr, 1fr, 1.9cm),
    tamanho: 8.5pt,
    [ID], [Importância para os stakeholders], [Dificuldade / risco técnico], [Prioridade],
    [QS-01], [*Alta:* quem pede um vídeo curto enquanto outro utilizador legenda espera minutos (141 s, EV-26); é o exemplo dado no enunciado], [*Alta:* obriga a separar a legendagem e a ter mais de um consumidor de vídeo], [*1*],
    [QS-02], [*Alta:* com vários utilizadores, todos esperam em fila (EV-27); o REQ-VID-EDIT-011 não é cumprido], [*Média / Alta:* réplicas e mecanismo de escalonamento], [*2*],
    [QS-06], [*Alta:* uma falha na legendagem atrasa todos os vídeos (EV-29)], [*Alta:* exige a legendagem numa unidade própria], [*3*],
    [QS-04], [*Média / Alta:* para quem mantém o sistema, qualquer mudança na legendagem para todo o vídeo (EV-31)], [*Alta:* dividir o `video_tool` e encadear as etapas no `projects`], [*4*],
    [QS-03], [*Média:* importa a quem opera o sistema (recursos fixos, 60 % do CPU sem uso, EV-28)], [*Alta:* reagir à carga sem o Docker Compose o fazer sozinho], [5],
    [QS-05], [*Média:* acrescentar efeitos é a evolução mais provável], [*Média:* um efeito toca sempre o _frontend_ e o `projects`], [6],
    [QS-07], [*Média:* já cumprido; serve para garantir que não piora], [*Baixa:* não exige mudança], [7 (efeito colateral a vigiar)],
    [QS-09], [*Alta* em produção, mas é uma fragilidade do padrão global, não do vídeo], [*Média / Alta:* mexe em todos os serviços, com risco de regressão alto], [8],
    [QS-08], [*Média:* só utilizadores premium com vídeos grandes; não medido (H-05)], [*Média:* carregamento por _stream_ em três serviços], [9],
    [QS-10], [*Média:* imagens, fora da extensão de vídeo; não medido (H-06)], [*Baixa:* confirmação manual nas ferramentas de imagem], [10],
  ),
)

== Atributos de qualidade por ordem de prioridade

+ *Eficiência de desempenho — capacidade / elasticidade* (QS-01, QS-02, QS-03): é a fragilidade que os utilizadores sentem diretamente e a de maior diferença medida (141 s de espera para um vídeo que demora 3,9 s).
+ *Manutenibilidade — modularidade / modificabilidade* (QS-04, QS-05, QS-06): ter as 3 funcionalidades numa unidade é a causa estrutural do bloqueio e do efeito de uma falha, e torna arriscada cada mudança na legendagem.
+ *Fiabilidade — tolerância a falhas / recuperabilidade* (QS-06, QS-10): no vídeo a recuperação já existe (_ack_ no fim, escrita atómica); falta o isolamento, que vem da modularidade.
+ *Eficiência de desempenho — comportamento temporal* (QS-07): cumprido na base; tem de se manter.
+ *Segurança* (QS-09): importante, mas é uma fragilidade do padrão global, fora do âmbito da extensão de vídeo.
+ *Usabilidade — operabilidade*: melhora de forma indireta quando a espera diminui (QS-01).

== Pré-requisitos e efeitos colaterais entre atributos

#tab([Pré-requisitos e efeitos colaterais entre atributos],
  tabela(
    colunas: (2.8cm, 2.8cm, 2.8cm, 1fr),
    tamanho: 8.5pt,
    [Atributo A], [Atributo B], [Efeito], [Razão / evidência],
    [Modularidade (ALT-1)], [Elasticidade (ALT-2)], [*Pré-requisito*], [Só com a legendagem numa unidade própria se lhe pode dar uma fila e réplicas próprias, para que os trabalhos curtos não esperem atrás dela (H-10). Confirmado depois: espera de 141 s para 6,5 s (EV-32)],
    [Modularidade], [Comportamento temporal], [*Conflito*], [As etapas trocam mensagens e ficheiros intermédios (H-09). Medido depois: +2,4 % no pior caso (EV-32)],
    [Elasticidade], [Utilização de recursos], [*Conflito*], [Cada réplica ocupa memória e CPU próprios; numa só máquina as réplicas disputam os mesmos 8 CPU, por isso o débito só sobe 12 % (EV-32); um limite de memória mal dimensionado faz falhar os vídeos grandes: #ev("EV-36", [primeira medição final, 14/11/2026, _commit_ `aee398d`], [com 1 GB por réplica do `video_effects`, o `ffmpeg` foi terminado ao passar o limite, os vídeos 1080p falharam e a normalização demorou 528 s em vez de ≈ 2 min; com 3 GB, 0 erros])],
    [Elasticidade], [Segurança], [*Conflito*], [Criar réplicas a partir do próprio sistema exige acesso à API do Docker: #ev("EV-35", [`docker-compose.yaml:346`, _commit_ `67d222c`], [o `autoscaler` monta `/var/run/docker.sock` e tem controlo sobre o Docker do anfitrião])],
    [Elasticidade], [Fiabilidade], [*Sinergia*], [Com a confirmação no fim, se uma réplica cair a mensagem passa para outra (EV-09)],
    [Modularidade], [Fiabilidade], [*Sinergia*], [Uma falha fica na unidade onde acontece (QS-06; confirmado em EV-33)],
    [Modularidade], [Testabilidade], [*Sinergia com custo*], [Testes por serviço, mas o encadeamento das etapas entre serviços passa a precisar de testes próprios],
    [Elasticidade], [Usabilidade — operabilidade], [*Sinergia*], [Menos tempo com a barra de progresso parada sob carga (QS-01)],
  ),
)

== Recomendações de melhoria à solução atual

#tab([Recomendações de melhoria],
  tabela(
    colunas: (1fr, 3cm, 2.6cm, 1.6cm, 2.4cm),
    tamanho: 8.5pt,
    [Recomendação], [Atributo(s)], [Padrão a que se refere (global / vídeo)], [Esforço], [Risco de regressão],
    [Separar o `video_tool` em serviços por funcionalidade (efeitos, legendagem, extração), cada um com a sua fila, encadeados pelo `projects` (ALT-1)], [Modularidade, modificabilidade, isolamento de falhas], [Vídeo (alinha-o com o global)], [Alto], [Médio (regras do _pipeline_; mitigado por testes)],
    [Réplicas de cada serviço de vídeo ajustadas ao tamanho da sua fila (ALT-2)], [Capacidade / elasticidade; comportamento temporal sob carga], [Vídeo], [Médio / Alto], [Baixo / Médio],
    [Confirmar as mensagens das ferramentas de imagem só no fim e corrigir os IDs trocados nas respostas de erro], [Fiabilidade], [Global], [Baixo], [Baixo],
    [Carregamento por _stream_ no _gateway_, no `projects` e no `img_storage`], [Utilização de recursos], [Global], [Médio], [Médio],
    [Tirar os segredos do `docker-compose.yaml`, deixar de publicar as portas internas e validar os certificados internos], [Segurança], [Global], [Médio], [Alto (toca todos os serviços)],
    [Ativar o _heartbeat_ do RabbitMQ no vídeo, processando o trabalho fora da _thread_ da ligação], [Fiabilidade — disponibilidade], [Vídeo], [Médio], [Médio],
    [Partilhar a implementação dos efeitos de fotograma entre as ferramentas de imagem e o vídeo], [Reutilização, modificabilidade], [Ambos], [Médio], [Médio],
  ),
)

As duas primeiras recomendações são as escolhidas para esta fase (capítulo 6). As restantes ficam como trabalho futuro (capítulo 11).
