#import "../template.typ": *

= Alterações Arquiteturais

A introdução das funcionalidades de manipulação, gestão e reprodução de vídeo no PictuRAS estende a arquitetura de microsserviços existente (*brownfield*). O *core* de edição de imagem é mantido, introduzindo-se serviços dedicados para ingestão e validação de vídeo, gestão de tarefas assíncronas em fila e entrega por *streaming* progressivo.

== Visão geral das alterações

A vista de componentes da extensão de vídeo foca-se no desacoplamento entre a API síncrona e a execução assíncrona pesada via *broker* de mensagens (RabbitMQ) e *workers* especializados com o adaptador FFmpeg.

#figure(kind: image,
  figura-pendente[vista de componentes/serviços atualizada, com componentes novos e alterados destacados (`images/arquitetura_componentes.png`)],
  caption: [Vista de componentes da solução com suporte a vídeo],
)

#tab([Componentes novos e alterados na extensão de vídeo],
  tabela(
    colunas: (3.2cm, 1.8cm, 1fr, 3cm),
    [Componente / serviço], [Estado], [Responsabilidade / alteração], [Requisitos],
    
    [api_gateway], 
    [Alterado], 
    [Encaminha novos *endpoints* de vídeo (`/api/v1/videos`, `/api/v1/tools/trim`), efetua a validação de autenticação/tokens JWT e faz *proxy* de *presigned URLs* e ligações de *streaming*.], 
    [REQ-VID-LIB-001, 048, REQ-VID-PLAY-005, 030, REQ-VID-TRIM-059],

    [video_library_ms], 
    [Novo], 
    [Gestão da biblioteca de vídeos do utilizador, máquina de estados de ingestão (`A carregar`, `A validar`, `Disponível`, `Rejeitado`), extração de metadados técnicos (FFprobe), validação de quotas/perfis e bloqueio de eliminação.], 
    [REQ-VID-LIB-001 a 063, REQ-VID-PLAY-004, 022],

    [video_tool_trim_ms], 
    [Novo], 
    [Gestão de pedidos de recorte temporal, máquina de estados assíncrona (`Em fila`, `A processar`, `Concluído`, `Falhou`, `Cancelado`), reserva/devolução de quota e orquestração de *jobs*.], 
    [REQ-VID-TRIM-003 a 063],

    [ffmpeg_worker], 
    [Novo], 
    [Trabalhador (*worker*) autónomo que consome mensagens da fila AMQP, executa comandos FFmpeg via adaptador isolado para realizar o corte temporal e emite eventos de progresso (%) e conclusão.], 
    [REQ-VID-TRIM-016, 017, 044, 058, 061],

    [video_player_ms / ws_gateway], 
    [Estendido], 
    [Emissão de credenciais de acesso temporário (*presigned URLs* S3 com TTL ≤ 30 min), controlo de *streams* simultâneos ativos e notificação WebSocket de progresso/estado aos clientes.], 
    [REQ-VID-PLAY-005, 006, 021, 039, 055, REQ-VID-TRIM-017, 023],

    [MinIO / S3 Storage], 
    [Estendido], 
    [Alojamento de ficheiros binários de grande dimensão (MP4/MOV) e suporte nativo a pedidos parciais *HTTP Range Requests* (código 206) para reprodução progressiva.], 
    [REQ-VID-LIB-028, 059, REQ-VID-PLAY-006, 046],
  ),
)

== Decisões arquiteturais

#tab([Decisões arquiteturais (ADR)],
  tabela(
    colunas: (1.2cm, 2.6cm, 1fr, 3cm, 2.4cm),
    tamanho: 8.5pt,
    [ID], [Decisão], [Contexto e alternativas consideradas], [Consequências], [Requisitos / DQ],

    [DA-01], 
    [Processamento Assíncrono via RabbitMQ + Workers], 
    [O processamento de vídeo (recorte/FFmpeg) é computacionalmente pesado e demorado. Considerou-se processamento síncrono por HTTP, mas este bloquearia as conexões da API. Optou-se por filas AMQP desacopladas.], 
    [Garante aceitação imediata dos pedidos (≤ 3s), não bloqueia a navegação e permite escalabilidade horizontal de *workers*. Exige gestão de estados assíncronos e notificações.], 
    [REQ-VID-TRIM-014, 015, 058; DQ-002],

    [DA-02], 
    [Entrega por Presigned URLs e Range Requests], 
    [Os ficheiros de vídeo possuem dimensões elevadas. Transmitir o binário através do microsserviço API Gateway sobrecarregaria a memória RAM do servidor. Considerou-se *streaming proxy* na API, mas optou-se pela emissão de *presigned URLs* temporários do MinIO com *Range Requests* (HTTP 206).], 
    [Consumo de RAM na API mantido ≤ 5 MB por pedido. Permite navegação temporal (*seek*) rápida. Exige gestão estrita do tempo de vida (TTL ≤ 30 min) dos URLs.], 
    [REQ-VID-PLAY-006, 037, 046; DQ-001, DQ-003],

    [DA-03], 
    [Isolamento do Motor FFmpeg via Camada Adaptadora], 
    [Invocação direta de comandos de sistema operativo no código de negócio criaria forte acoplamento e dependência do SO anfitrião. Optou-se por criar uma interface/adaptador de vídeo que encapsula as chamadas de linha de comando.], 
    [Aumenta a portabilidade e facilita a execução em contentores Docker isolados, permitindo substituir a ferramenta subjacente na Fase 2 sem alterar as regras de negócio.], 
    [REQ-VID-TRIM-061; DQ-005],

    [DA-04], 
    [Modelo de Quota Transacional com Reserva e Devolução], 
    [Como as tarefas são assíncronas e podem demorar minutos ou falhar, debitar a quota no início poderia penalizar o utilizador em caso de erro; debitar só no fim permitiria ultrapassar o limite submetendo vários pedidos em paralelo. Optou-se por reservar a operação na submissão, confirmar no sucesso e devolver na falha/cancelamento.], 
    [Garante o cumprimento estrito do limite diário do perfil Registado sem injustiças perante falhas técnicas da infraestrutura.], 
    [REQ-VID-TRIM-013, 022, 032, 046; RN3],
  ),
)

== Fluxo de processamento de vídeo

#figure(kind: image,
  figura-pendente[diagrama de sequência entre componentes para o fluxo principal de processamento de um vídeo (`images/sequencia_processamento.png`)],
  caption: [Sequência de processamento assíncrono de recorte de vídeo],
)

*Explicação do fluxo de processamento:*
1. *Submissão e Validação Síncrona:* O utilizador submete o pedido de recorte no *Frontend*. O `api_gateway` encaminha a solicitação para o `video_tool_trim_ms`, que valida os parâmetros do intervalo, confirma a quota diária e verifica que o utilizador não excede o limite de recortes ativos (RN4).
2. *Reserva e Entrada em Fila:* O `video_tool_trim_ms` reserva 1 operação na quota diária do utilizador, regista o pedido na base de dados com o estado `Em fila` e publica uma mensagem na fila AMQP do RabbitMQ. A API responde ao cliente em menos de 3 segundos, libertando a interface.
3. *Processamento Assíncrono:* Um `ffmpeg_worker` disponível consome a mensagem da fila, altera o estado do pedido para `A processar` e transfere o segmento de origem do armazenamento de objetos (MinIO) ou acede via montagem de volume.
4. *Acompanhamento de Progresso:* À medida que o FFmpeg executa a extração e remuxing do intervalo temporal, o *worker* calcula a percentagem de conclusão e publica atualizações na fila de eventos. O `ws_gateway` consome estes eventos e envia o progresso em tempo real (atualizado a cada ≤ 5 s) via WebSocket para o utilizador.
5. *Conclusão e Armazenamento:* Terminado o corte, o *worker* envia o novo ficheiro gerado para a *bucket* da biblioteca no MinIO, passa o pedido ao estado `Concluído`, consome definitivamente a operação reservada e notifica o utilizador dentro da aplicação.
6. *Tratamento de Cancelamentos e Falhas:* Se o utilizador cancelar a operação ou ocorrer um erro do FFmpeg, o *worker* interrompe a tarefa, repete automaticamente 1 vez em caso de falha técnica, limpa imediatamente todos os ficheiros temporários em disco (garantindo 0 órfãos) e assinala o estado final (`Cancelado` ou `Falhou`), devolvendo a operação reservada à quota do utilizador.

== Impacto na instalação e execução

A introdução do suporte a vídeo estende o ambiente de *deployment* baseado em Docker Compose:

- *Novos Contentores:*
  - `video_library_ms`: Serviço em Node.js/Python para gestão da biblioteca e validação de metadados.
  - `video_tool_trim_ms`: Serviço de orquestração do trabalho de recorte temporal.
  - `ffmpeg_worker`: Contentor de processamento leve com a ferramenta `ffmpeg` e `ffprobe` instaladas.
- *Dependências Externas:*
  - Binários `ffmpeg` (versão $\ge 4.4$) e `ffprobe` encapsulados na imagem do *worker*.
  - Instância do RabbitMQ com filas dedicadas (`video_jobs_queue`, `video_events_queue`).
  - Instância MinIO configurada com a *bucket* `picturas-videos` e políticas de CORS/Range Requests ativas.
- *Volumes e Armazenamento:*
  - Volume temporário partilhado de alta velocidade (`/tmp/video_processing`) montado nos *workers* para operações de corte temporário em disco antes do *upload* para o MinIO.
- *Variáveis de Configuração:*
  - `MAX_VIDEO_SIZE_REGISTERED=104857600` (100 MB)
  - `MAX_VIDEO_SIZE_PREMIUM=1073741824` (1 GB)
  - `PRESIGNED_URL_TTL_SECONDS=1800` (30 minutos para o MVP)
  - `MAX_CONCURRENT_STREAMS_REGISTERED=1`
  - `MAX_CONCURRENT_STREAMS_PREMIUM=3`
