#import "../template.typ": *

= Alterações Arquiteturais

#orientacao[
  Descrever as alterações à arquitetura de base: vista de componentes atualizada, decisões arquiteturais (DA-nn) com
  contexto, alternativas e consequências, sequência do processamento de um vídeo e impacto na instalação.
]

O suporte a vídeo foi acrescentado num microsserviço novo, #raw("videos"), com base de dados própria. O resto da solução de base só foi alterado para ligar o serviço novo: rotas no _gateway_, uma regra no nginx, os contentores no #raw("docker-compose.yaml"), o menu do _frontend_ e a eliminação de conta no serviço #raw("users"). O processamento é assíncrono, numa fila interna ao serviço, e os bytes de vídeo são entregues ao _browser_ diretamente pelo armazenamento de objetos, sem passar pela API.

== Visão geral das alterações


A @fig-componentes (no fim desta secção) distingue os componentes novos (azul), os existentes que foram alterados (laranja) e os existentes que ficaram iguais (cinzento). As setas a cheio são pedidos à API; a linha tracejada é o caminho dos bytes do vídeo na reprodução e na descarga.

#tab([Componentes novos e alterados na extensão de vídeo],
  tabela(
    colunas: (3.1cm, 2cm, 1fr, 3.2cm),
    tamanho: 8.5pt,
    [Componente / serviço], [Estado], [Responsabilidade / alteração], [Requisitos],
    [#raw("videos") (Express, porta 11002)], [Novo], [Biblioteca, validação com ffprobe, sessões de reprodução, fila e execução de recortes com FFmpeg. Módulos principais: #raw("VideoLibraryService"), #raw("PlaybackService"), #raw("ProcessingService"), #raw("ffmpegAdapter") e #raw("trimTool")], [REQ-VID-LIB, REQ-VID-PLAY, REQ-VID-TRIM],
    [#raw("videos_mongoDB") (mongo 4.4, porta 27020)], [Novo], [Coleções #raw("videos"), #raw("jobs"), #raw("playback_sessions") (com índice TTL) e #raw("security_events")], [UC-VID-002/RN9, REQ-VID-PLAY-054, UC-VID-001/A9],
    [#raw("api_gateway")], [Alterado], [Novo #raw("routes/videos.js") com todas as rotas #raw("/videos/…"): verificação de que o JWT pertence ao utilizador do URL, reencaminhamento do _upload_ em _streaming_ e registo #raw("[SECURITY]") de pedidos sem sessão. #raw("requestTimeout = 0") para _uploads_ longos. Correção do erro do _login_ (T-02, Capítulo 11)], [REQ-VID-LIB-032, 049; REQ-VID-PLAY-029, 030, 053; REQ-VID-TRIM-059],
    [nginx], [Alterado], [Regra #raw("location /api-gateway/videos/") com #raw("client_max_body_size 1100m"), #raw("proxy_request_buffering off") e _timeouts_ de 1 h. A regra #raw("/s3"), que já existia, serve os bytes dos vídeos], [REQ-VID-LIB-009, 015; REQ-VID-PLAY-006, 046],
    [_frontend_ (Next.js)], [Alterado], [Página nova #raw("/dashboard/videos") e componentes #raw("components/videos/*"); botão _Video Library_ e notificação de recortes concluídos na barra lateral], [Interface dos três casos de uso],
    [#raw("users")], [Alterado], [Ao apagar uma conta, chama #raw("DELETE /:user") do serviço #raw("videos"). A quota usa os _endpoints_ que já existiam (#raw("GET /:user/process/1") e #raw("POST /:user/process/refund/1")). Correção do _login_ (T-01) e do endereço do #raw("projects") na eliminação de conta (T-03), Capítulo 11], [UC-VID-002/RN13; REQ-VID-TRIM-013, 022, 032, 046],
    [SeaweedFS (S3)], [Existente, reutilizado], [Ficheiros em #raw("user-<id>/videos/"), no _bucket_ de cada utilizador que já existia para as imagens; URL assinados e pedidos parciais (206)], [REQ-VID-LIB-028; REQ-VID-PLAY-005, 006, 037],
    [RabbitMQ, #raw("ws_gateway"), #raw("projects"), #raw("img_storage"), #raw("subscriptions"), ferramentas de imagem], [Sem alterações], [—], [—],
  ),
)

#paisagem[
#figure(
  image("../images/arquitetura_componentes.png", height: 15cm),
  caption: [Vista de componentes da solução com suporte a vídeo],
) <fig-componentes>
]

== Decisões arquiteturais

#tab([Decisões arquiteturais (ADR)],
  tabela(
    colunas: (1.2cm, 2.9cm, 1fr, 1fr, 2.6cm),
    tamanho: 8.5pt,
    [ID], [Decisão], [Contexto e alternativas consideradas], [Consequências], [Requisitos / DQ],
    [DA-01], [Microsserviço próprio #raw("videos"), com base de dados própria], [Alternativas: estender o #raw("projects") ou o #raw("img_storage"). Os vídeos têm regras, ciclo de vida e processamento diferentes das imagens e não pertencem a projetos.], [A solução de base fica quase intacta. Biblioteca e pedidos de recorte no mesmo serviço permitem bloquear a eliminação de um vídeo em uso (E13). Mais um contentor e uma base de dados para operar.], [UC-VID-002/A8, UC-VID-001/A9; REQ-VID-LIB-058],
    [DA-02], [Fila de processamento interna ao serviço], [Alternativa: usar o RabbitMQ e o modelo de _workers_ das ferramentas de imagem, o que obrigaria a alterar o _pipeline_ e as ferramentas existentes.], [Até 5 recortes em paralelo; 1 ativo por Registado e 3 por Premium; pedidos interrompidos voltam à fila após um reinício. Só escala com a máquina; na Fase 2 pode passar para um _broker_.], [UC-VID-001/A6; REQ-VID-TRIM-014, 034, 043, 058],
    [DA-03], [Entrega dos bytes por URL assinado do SeaweedFS, servido pelo nginx em #raw("/s3"), com pedidos parciais (206)], [Alternativa: transmitir os bytes através da API, o que carregaria o _gateway_ com gigabytes por reprodução. É o mesmo mecanismo que o PictuRAS já usa para as imagens.], [Validade de 30 min e renovação antes de expirar. Os MOV são guardados com o tipo #raw("video/mp4"), porque alterar o tipo no URL invalidava a assinatura do SeaweedFS.], [UC-VID-003/DQ1, DQ3; REQ-VID-PLAY-005, 006, 021, 037, 046],
    [DA-04], [_Upload_ em dois pedidos: #raw("POST") de pré-verificação e #raw("PUT") dos bytes em _streaming_], [Alternativa: um único _upload_ _multipart_, como nas imagens, com o ficheiro em memória e sem recusar antes de enviar.], [Formato, tamanho e espaço (E2–E4) são recusados antes de enviar bytes; a barra de progresso é real; ficheiros até 1 GB sem os guardar em memória.], [UC-VID-002/A5; REQ-VID-LIB-007–010, 015, 017, 050],
    [DA-05], [FFmpeg isolado num adaptador e contrato comum de ferramenta de vídeo], [Alternativa: chamar o FFmpeg diretamente no código do recorte.], [O motor pode ser trocado sem mexer nas regras; uma nova ferramenta segue o mesmo contrato.], [UC-VID-001/DQ-004, DQ-005; REQ-VID-TRIM-060, 061],
    [DA-06], [Recortar recodificando (libx264 _veryfast_, CRF 20, áudio AAC)], [Alternativa: copiar os fluxos sem recodificar, que é rápido mas só corta em _keyframes_ (erro de vários segundos).], [Corte com tolerância de ± 1 s, mesma resolução e fps do original. Gasta mais CPU.], [UC-VID-001/RN5, DQ-001; REQ-VID-TRIM-051, 052],
    [DA-07], [Quota com reserva e devolução, nos _endpoints_ que o #raw("users") já tinha], [Debitar só no fim permitiria ultrapassar o limite com pedidos em paralelo; debitar sem devolver penalizaria falhas técnicas.], [Limite diário cumprido sem alterar o serviço #raw("users").], [UC-VID-001/RN3; REQ-VID-TRIM-013, 022, 032, 046],
    [DA-08], [Sessões de reprodução com sinal a cada 15 s e caducidade de 45 s], [Contar pedidos de URL não permite saber quando o leitor foi fechado.], [Limite de 1/3 transmissões; um leitor fechado à força deixa de contar ao fim de 45 s e o mesmo navegador recupera a vaga de imediato.], [UC-VID-003/RN6; REQ-VID-PLAY-039, 048, 055, 056],
    [DA-09], [Progresso e notificações por consulta periódica (3 s com pedidos ativos, 30 s sem)], [Alternativa: WebSocket através do #raw("ws_gateway"), o que obrigaria a alterá-lo.], [Sem alterações ao #raw("ws_gateway"); o progresso aparece no ecrã em ≤ 5 s. Custa pedidos extra ao servidor.], [UC-VID-001/RN8; REQ-VID-TRIM-017, 023, 053],
  ),
)

== Fluxo de processamento de vídeo

#figure(
  image("../images/sequencia_processamento.png", width: 100%),
  caption: [Sequência do processamento de um vídeo: recorte (UC-VID-001), com falha e cancelamento],
) <fig-sequencia>

A @fig-sequencia mostra o recorte de um vídeo, do clique do utilizador ao resultado:

+ *Elegibilidade (passos 1–6).* Ao escolher _Recortar_, o _frontend_ pergunta ao serviço #raw("videos") se o vídeo pode ser recortado: tem de estar Disponível e em H.264 (E1), e o utilizador não pode ter já o máximo de pedidos ativos (E4).
+ *Submissão (7–15).* O serviço valida o intervalo (E2, FA1), estima o tamanho do resultado e confirma que cabe na biblioteca (E7). Depois reserva uma operação no #raw("users") (E3 se já não houver) e cria o pedido Em fila. O utilizador volta à biblioteca.
+ *Processamento (16–20).* O _worker_ do serviço arranca o pedido quando há menos de 5 a correr. Passa-o a A processar, lê o original por URL assinado só de leitura e executa o FFmpeg, guardando o progresso a cada segundo.
+ *Acompanhamento (21–23).* O _frontend_ consulta os pedidos de 3 em 3 s e mostra o estado e a percentagem.
+ *Conclusão (24–33).* O resultado é validado com as regras da biblioteca e o espaço é verificado de novo com o tamanho real. Depois é guardado no SeaweedFS como um vídeo novo e Disponível, e o pedido fica Concluído, com a operação consumida. O _frontend_ notifica o utilizador.
+ *Falha e cancelamento (34–42).* Se o FFmpeg falhar, há uma segunda tentativa automática; se voltar a falhar, o pedido fica Falhou. No cancelamento, o processo FFmpeg é terminado e o pedido fica Cancelado. Em ambos os casos a operação é devolvida e os ficheiros parciais são apagados.

== Impacto na instalação e execução

- *Contentores novos:* #raw("videos") (imagem #raw("node:20") com #raw("ffmpeg") e #raw("ffprobe") instalados por #raw("apt")) e #raw("videos_mongoDB") (#raw("mongo:4.4"), porta 27020).
- *Volumes novos:* #raw("video_data") (base de dados) e #raw("video_tmp") (ficheiros temporários da validação e do recorte).
- *Variáveis do serviço #raw("videos"):* #raw("PORT"), #raw("MONGO_URL"), #raw("USERS_URL"), #raw("S3_ENDPOINT"), #raw("S3_ACCESS_KEY"), #raw("S3_SECRET_KEY"), #raw("VIDEO_TMP_DIR") e #raw("FRONTEND_URL"). No serviço #raw("users"), #raw("VIDEOS_URL").
- *Limites configuráveis sem alterar o código* (UC-VID-002/A4): #raw("VIDEO_FREE_*") e #raw("VIDEO_PREMIUM_*") (tamanho, duração, resolução, espaço), #raw("PLAYBACK_*") (transmissões, validade do URL, sinal) e #raw("PROCESSING_*") (paralelismo, tentativas, recortes ativos).
- *Configuração alterada:* a regra nova no #raw("nginx.conf") e o #raw("requestTimeout") do _gateway_. O serviço de _backup_ passa a copiar também a base #raw("videos").
- *Sem alterações:* RabbitMQ, #raw("ws_gateway"), ferramentas de imagem e SeaweedFS (os _buckets_ por utilizador já existiam).
