#import "../template.typ": *

// Capítulo inteiro na horizontal (tabelas largas).
#paisagem[
= Cenários de Entrada e Táticas Candidatas

Cada candidato tem vários cenários (CAND-1: QS-01 a QS-03; CAND-2: QS-04 a QS-06). Para as táticas e as decisões usa-se o cenário principal de cada um: *QS-01* (bloqueio pela legendagem) para CAND-1 e *QS-04* (mudança na legendagem) para CAND-2. Os restantes entram no plano de medição (capítulo 10).

== Candidatos e cenários de entrada

#tab([Candidatos e cenários de entrada],
  tabela(
    colunas: (1.6cm, 1.6cm, 3cm, 2cm, 3cm, 3.6cm, 3.8cm, 1fr),
    tamanho: 8pt,
    [Candidato], [Cenário (`QS-nn`)], [Característica / subcaracterística (ISO/IEC 25010)], [Evidência], [Origem (padrão global / vídeo / interação)], [Estímulo a que a tática reage], [Resposta e medida (resumo)], [Escala e método (cap. 6)],
    [CAND-1], [*QS-01*], [Eficiência de desempenho — capacidade / elasticidade], [EV-03, EV-09, EV-26], [Interação: recursos fixos do padrão global + _worker_ único do padrão do vídeo], [Um utilizador pede um brilho num vídeo de 10 s enquanto outro legenda um vídeo de 177 s], [O vídeo curto não espera pelo fim da legendagem; espera do pedido aceite ao primeiro progresso (s)], [Espera em s; S1, 5 repetições, mediana; cliente da API e eventos WebSocket],
    [CAND-2], [*QS-04*], [Manutenibilidade — modularidade / modificabilidade], [EV-23, EV-31], [Padrão do vídeo], [Um programador troca o modelo Whisper (C1) ou corrige o código da legendagem (C2)], [A mudança é implantada sem parar as outras funcionalidades de vídeo; funcionalidades interrompidas (0 a 3)], [Contagem; M1 por análise estática (ficheiros alterados → imagens Docker que os contêm → funcionalidades nessas imagens)],
  ),
)

== Alterações feitas ao capítulo 5

Nenhuma. A medida de QS-06 (M3) já usava a falha aos 55 % do progresso quando os cenários foram caracterizados. A primeira medição da base terminava o serviço aos 20 %; na solução nova, a esse ponto o vídeo ainda está a ser normalizado pelo `video_effects` e a legendagem nem começou. Para testar a falha a meio da legendagem nas duas fases, a equipa passou para 55 % e repetiu o M3 da base (o resultado manteve-se: 100 % dos vídeos afetados).

== Táticas candidatas

Classe *A* = _refactoring_ puro; *B* = alteração visível que é o objeto da melhoria; *C* = funcionalidade nova, a rejeitar. As categorias são as de Bass, Clements e Kazman: no desempenho, controlar a procura ou gerir os recursos; na modificabilidade, aumentar a coesão, reduzir o acoplamento ou adiar a ligação.

#tab([Táticas candidatas],
  tabela(
    colunas: (1.4cm, 1.4cm, 3.4cm, 4cm, 5.2cm, 3.8cm, 1fr),
    tamanho: 8pt,
    [ID], [Cenário], [Atributo → categoria], [Tática], [Como produz a resposta (estímulo → tática → resposta)], [Já existe na base? (evidência)], [Classe (A/B/C)],
    [TAT-01], [QS-01], [Desempenho → gerir recursos], [*Replicar a computação* com consumidores concorrentes, em número ajustado ao tamanho da fila], [Pedido curto durante uma legendagem → uma réplica livre consome-o → o vídeo curto começa logo], [Não: um só contentor, `prefetch_count=1` (EV-03, EV-09)], [*A*],
    [TAT-02], [QS-01], [Desempenho → controlar a procura (gerir pedidos de trabalho)], [*Separar os trabalhos por tipo*, cada um com a sua fila (legendagem à parte dos efeitos)], [Pedido curto → vai para uma fila onde não está a legendagem → não fica atrás dela], [Não: uma só `video_queue` para tudo (EV-04)], [*A*],
    [TAT-03], [QS-01], [Desempenho → gerir recursos], [*Concorrência dentro do _worker_* (`prefetch` > 1 com vários processos no mesmo contentor)], [Pedido curto → outro processo do mesmo contentor trata-o em paralelo], [Não: `prefetch_count=1` (EV-09)], [A],
    [TAT-04], [QS-01], [Desempenho → gerir recursos], [*Aumentar os recursos* do `video_tool` (mais CPU e memória)], [Legendagem mais rápida → o vídeo curto espera menos], [Parcial: já pode usar os 8 CPU, mas usa só 40 % sob carga (EV-28)], [A],
    [TAT-05], [QS-01], [Desempenho → controlar a procura (aumentar a eficiência)], [*Modelo de reconhecimento de fala mais leve* (Whisper `tiny` em vez de `small`)], [Legendagem mais curta → o vídeo curto espera menos], [Parcial: o modelo é configurável (EV-13)], [C (legendas de pior qualidade: muda o resultado visível)],
    [TAT-06], [QS-04], [Modificabilidade → aumentar a coesão (dividir o módulo)], [*Separar o `video_tool` em serviços por funcionalidade*: efeitos, legendagem e extração, cada um com a sua imagem Docker], [Mudança na legendagem → só a imagem da legendagem muda → só esse serviço reinicia], [Não: as 3 funcionalidades numa só imagem (EV-23)], [*A*],
    [TAT-07], [QS-04], [Modificabilidade → reduzir o acoplamento (usar um intermediário)], [*Encadear as etapas no orquestrador* (`projects`), por mensagens, em vez de os serviços se chamarem uns aos outros], [Mudança num serviço → os outros não dependem dele diretamente → não mudam], [Parcial: o `projects` já encadeia as ferramentas de imagem (EV-07)], [*A*],
    [TAT-08], [QS-04], [Modificabilidade → reduzir o acoplamento (abstrair serviços comuns)], [*Código comum num módulo partilhado* (_worker_ RabbitMQ, `ffprobe`, erros)], [Mudança no protocolo de mensagens → faz-se num só sítio], [Parcial: `Tools/utils` partilhado com as ferramentas de imagem (EV-25)], [*A*],
    [TAT-09], [QS-04], [Modificabilidade → adiar a ligação], [*Configuração em vez de código* (modelo e parâmetros por variáveis de ambiente)], [Troca de modelo → muda só a configuração], [Sim (EV-13); mas reiniciar o `video_tool` continua a parar tudo (EV-31)], [A],
    [TAT-10], [QS-04], [Modificabilidade → reduzir o tamanho de um módulo], [*Mais módulos dentro do mesmo serviço*], [Mudança na legendagem → toca menos código], [Parcial: legendagem e extração já são módulos à parte (EV-13, EV-14)], [A],
  ),
)
]
