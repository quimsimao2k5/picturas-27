#import "../template.typ": *

= Padrões Arquiteturais Atuais

== Padrão global da solução

#tabela-campos(
  [Nome(s) do padrão / estilo], [*Microsserviços com API Gateway*, comunicação *orientada a eventos / _Work Queue_* sobre RabbitMQ, *orquestração centralizada* no `projects` e *_pipeline_ distribuído* (_Pipes and Filters_ distribuído, _batch-sequential_ entre serviços) no processamento de imagens; *_Layered_* dentro de cada serviço Node],
  [Descrição], [Entrada única por nginx (TLS), que encaminha para o _frontend_, o API Gateway (REST, JWT) e o WS Gateway (Socket.IO). Serviços de negócio com base de dados própria (`users`, `projects`, `subscriptions`). O `projects` orquestra o processamento: publica trabalhos em filas, uma por ferramenta, e avança a cadeia a cada resposta. Cada ferramenta de imagem é um contentor que consome a sua fila; os ficheiros passam entre serviços pelo volume `image_data` e pelo SeaweedFS],
)

#tab([Decisões globais que condicionam o vídeo],
  tabela(
    colunas: (4.2cm, 1fr, 4.2cm),
    tamanho: 8.5pt,
    [Decisão global], [Evidência], [Efeito no vídeo],
    [Entrada única por nginx com limite de corpo de 1100 MB], [EV-01], [Um vídeo de até 1 GB atravessa nginx → _gateway_ → `projects` → `img_storage`],
    [Carregamento em memória no _gateway_, no `projects` e no `img_storage`], [EV-15], [Um vídeo grande fica inteiro em memória em três serviços],
    [Filas duráveis num _exchange_ direto (`picturas`), uma por tipo de trabalho], [#ev("EV-04", [`rabbitMQ/definitions.json`], [_exchange_ `picturas` do tipo _direct_ e 20 filas duráveis, incluindo `video_queue`, `project_queue` e `ws_queue`]); #ev("EV-05", [`projects/utils/project_msg.js:3–26`], [mapa ferramenta → fila])], [O vídeo ganha uma fila própria e reutiliza `project_queue` e `ws_queue`],
    [Orquestração central no `projects`], [EV-06, EV-07; #ev("EV-21", [`projects/routes/projects.js` e `projects/utils/video.js`], [orquestrador com 2 732 linhas, 33 rotas e 35 referências a vídeo])], [A lógica de vídeo (validação, limites, despacho, resultados, extração) entra no mesmo serviço e ramifica o código],
    [Volume `image_data` partilhado entre o `projects` e todas as ferramentas], [#ev("EV-24", [`docker-compose.yaml`, ex.: linhas 151, 240, 253, 272], [`image_data:/app/images` no orquestrador e nos _workers_])], [O `video_tool` lê e escreve no mesmo volume],
    [Docker Compose, um contentor por serviço, sem réplicas nem limites de recursos], [#ev("EV-03", [`docker-compose.yaml` (`video_tool:256–273`)], [um contentor por serviço e por ferramenta; `video_tool` sem réplicas nem limites; 12 portas publicadas além do nginx])], [O `video_tool` é um único contentor; não há mecanismo de escalonamento],
    [Imagens Docker com contexto `./Tools` e biblioteca comum `Tools/utils`], [#ev("EV-25", [`Tools/video/Dockerfile`; `Tools/brightness/Dockerfile`], [cada imagem copia `Tools/utils`; a do vídeo instala ffmpeg e fontes])], [O `video_tool` partilha a biblioteca de mensagens com as ferramentas de imagem],
  ),
)

#tab([Benefícios e desafios do padrão global],
  tabela(
    colunas: (1.8cm, 1fr, 3.6cm, 3.6cm),
    tamanho: 8.5pt,
    [Tipo], [Descrição], [Característica / subcaracterística (ISO/IEC 25010)], [Facto / hipótese],
    [Benefício], [Cada ferramenta de imagem é independente: acrescentar uma é criar um serviço e uma fila, sem tocar nas outras], [Manutenibilidade — modularidade, modificabilidade], [EV-03, EV-05],
    [Benefício], [As filas desacoplam o pedido do processamento: o _Apply_ responde logo e o trabalho continua em segundo plano], [Eficiência — comportamento temporal; Usabilidade — operabilidade], [EV-06],
    [Benefício], [Cada ferramenta tem a sua fila: uma ferramenta lenta não bloqueia as outras], [Eficiência — capacidade], [EV-04],
    [Benefício], [Entrada única com TLS e JWT], [Segurança — autenticidade], [EV-01; #ev("EV-02", [`apiGateway/app.js:25–27`; `apiGateway/auth/*.js`], [verificação de JWT por rota])],
    [Desafio], [Orquestrador central muito grande e com ramos imagem / vídeo], [Manutenibilidade — modularidade, analisabilidade], [EV-21],
    [Desafio], [Recursos fixos: um contentor por serviço, sem réplicas nem limites], [Eficiência — capacidade], [EV-03],
    [Desafio], [As ferramentas de imagem confirmam a mensagem ao recebê-la, e as respostas de erro trocam `messageId` e `correlationId`], [Fiabilidade — tolerância a falhas], [EV-10; #ev("EV-20", [`Tools/utils/tool_msg.py:48–49` vs `66–67`], [identificadores trocados nas respostas de erro]); perda de trabalho: H-06],
    [Desafio], [Confiança implícita entre serviços: TLS interno sem validação, certificados expirados, segredos no `docker-compose.yaml`], [Segurança — confidencialidade, autenticidade], [#ev("EV-16", [`rejectUnauthorized: false` em 7 ficheiros; `*/certs/selfsigned.crt` expirados em jan. 2026], [comunicação interna sem validar certificados]); #ev("EV-17", [`docker-compose.yaml:178–179, 222, 512`], [`JWT_SECRET_KEY` e `FIELD_ENCRYPTION_KEY` em claro]); EV-03],
    [Desafio], [Cada ferramenta escreve a imagem completa no volume partilhado, a cada etapa], [Eficiência — utilização de recursos], [EV-24],
  ),
)

== Padrão do processamento de vídeo

#tabela-campos(
  [Nome do padrão], [*_Worker_ único sobre uma fila* (um "monólito de _pipeline_" dentro de uma arquitetura de microsserviços), com o *_pipeline_ completo numa só mensagem*; internamente, _pipe & filter_ por fotograma (ffmpeg → PIL → ffmpeg) e _batch-sequential_ entre etapas (a legendagem e a extração escrevem ficheiros intermédios)],
  [Descrição], [O `projects` envia uma mensagem por vídeo com a sequência ordenada de efeitos. O `video_tool` (um contentor, `prefetch_count=1`, _ack_ manual no fim) descodifica o vídeo uma vez, aplica os efeitos de fotograma (PIL) e de tempo (`trim`, `speed`), corre a legendagem (Faster-Whisper em CPU) e a extração de fotogramas como etapas ordenadas, codifica uma vez para MP4 (H.264 + AAC) e envia o progresso para `ws_queue`],
  [Contraste com o caminho de imagens], [Imagens: um serviço por ferramenta e uma mensagem por (imagem, ferramenta), com o `projects` a avançar a cadeia. Vídeo: um serviço para todos os efeitos e uma mensagem por vídeo. Nos termos dos slides da aula 11, o caminho das imagens está mais perto de _batch-sequential_ (etapas grossas, cada uma escreve a saída completa) e o interior do `video_tool` mais perto de _pipe & filter_ (fotogramas a fluir entre filtros)],
)

#tab([Benefícios e desafios do padrão do vídeo],
  tabela(
    colunas: (1.8cm, 1fr, 3.4cm, 4.6cm),
    tamanho: 8.5pt,
    [Tipo], [Descrição], [Característica / subcaracterística (ISO/IEC 25010)], [Facto / hipótese],
    [Benefício], [Descodifica e codifica uma só vez, em vez de uma vez por efeito], [Eficiência — comportamento temporal, utilização de recursos], [#ev("EV-11", [`Tools/video/video_processor.py:27, 167–185, 286–362`], [laço por fotograma; divisão em etapas com ficheiros intermédios; pré-visualização de 3 s]); #ev("EV-22", [`Documentacao/medicoes/baseline/s4/`], [um vídeo sozinho demora 0,39× (10 s), 0,38× (30 s) e 0,90× (150 s, 1080p) a sua duração])],
    [Benefício], [Sem saídas parciais; com _ack_ manual, uma falha do _worker_ devolve a mensagem à fila], [Fiabilidade — tolerância a falhas, recuperabilidade], [EV-09; #ev("EV-29", [`baseline/m3/`], [com o `video_tool` terminado a meio de uma legendagem, as 5 legendagens foram refeitas e concluídas; os 4 vídeos curtos pedidos entretanto foram todos atrasados (mediana 131,5 s), nenhum falhou])],
    [Benefício], [Uma mensagem por vídeo simplifica o orquestrador para o vídeo], [Manutenibilidade — modificabilidade], [EV-07],
    [Desafio], [Um consumidor, `prefetch_count=1`, sem réplicas: os vídeos de todos os utilizadores são processados um de cada vez], [Eficiência — capacidade], [EV-03, EV-09; #ev("EV-27", [`baseline/s2/`], [débito de 15,9 / 16,7 / 17,6 / 16,8 vídeos/min com 1 / 2 / 4 / 8 utilizadores; nunca mais de 1 vídeo em processamento])],
    [Desafio], [A legendagem (Whisper em CPU, 2 _threads_) corre no mesmo _worker_ e ocupa-o durante minutos], [Eficiência — capacidade, comportamento temporal], [#ev("EV-13", [`Tools/video/subtitles.py:16–21`], [Faster-Whisper em CPU, int8, `cpu_threads=2`]); #ev("EV-26", [`baseline/s1/`], [um vídeo de 10 s demora 3,9 s sozinho e 144,7 s se pedido durante uma legendagem, dos quais *141,0 s à espera*])],
    [Desafio], [As 3 funcionalidades de vídeo (edição, legendagem, extração) numa única unidade implantável: mudar a legendagem obriga a reiniciar o serviço que faz todos os vídeos], [Manutenibilidade — modularidade, modificabilidade], [#ev("EV-23", [`baseline/m2/m2_modularidade.json`], [1 unidade com as 3 funcionalidades; 722 SLOC de Python de vídeo, CC máxima 22]); #ev("EV-31", [`baseline/m1/`], [mudar o modelo Whisper ou corrigir `subtitles.py` interrompe as *3* funcionalidades; um efeito novo toca 6 ficheiros em 3 componentes])],
    [Desafio], [Os 8 efeitos de fotograma estão duplicados entre o vídeo e as ferramentas de imagem], [Manutenibilidade — modificabilidade, reutilização], [#ev("EV-12", [`Tools/video/effects.py:46–58`], [os mesmos 8 efeitos das ferramentas de imagem, mais `trim` e `speed`]); EV-23],
    [Desafio], [`heartbeat=0`: o _broker_ não deteta um _worker_ bloqueado], [Fiabilidade — disponibilidade], [EV-09; H-07],
    [Desafio], [Processamento fotograma a fotograma em Python, num só processo], [Eficiência — utilização de recursos], [EV-11; H-08],
  ),
)

== Relação entre o padrão global e o padrão do vídeo

#tab([Relação entre o padrão global e o padrão do vídeo],
  tabela(
    colunas: (2.3cm, 3cm, 3cm, 1.9cm, 3.2cm, 1.6cm),
    tamanho: 8pt,
    [Aspeto], [O que o padrão global prescreve], [O que o vídeo faz], [Segue / afasta-se], [Consequência], [Evidência],
    [Entrada e autenticação], [nginx + API Gateway com JWT], [Igual], [Segue], [Herda a segurança da entrada e as suas fragilidades (carregamento em memória)], [EV-01, EV-02, EV-15],
    [Comunicação], [Filas no RabbitMQ, uma por tipo de trabalho], [Fila própria `video_queue`; reutiliza `project_queue` e `ws_queue`], [Segue], [Desacoplamento e persistência das mensagens], [EV-04, EV-09],
    [Granularidade dos serviços], [Um serviço por ferramenta], [Um serviço para os efeitos, a legendagem e a extração], [*Afasta-se*], [Uma só descodificação, mas menos modularidade e nenhuma forma de escalar cada etapa à parte], [EV-03, EV-11, EV-23],
    [Orquestração], [O `projects` avança a cadeia ferramenta a ferramenta], [Uma mensagem com o _pipeline_ todo; o _worker_ orquestra as etapas], [*Afasta-se*], [A ordem dos efeitos passa a estar em dois sítios (`projects` e `video_processor`)], [EV-07, EV-08, EV-11],
    [Confirmação das mensagens], [_Ack_ automático nas ferramentas de imagem], [_Ack_ manual no fim], [Afasta-se (para melhor)], [O vídeo não perde trabalho se o _worker_ cair; as imagens perdem], [EV-09, EV-10],
    [Implantação e recursos], [Um contentor por serviço, recursos fixos], [Um contentor, sem réplicas, `prefetch_count=1`], [Segue], [Herda a falta de escalonamento; no vídeo pesa mais, porque os trabalhos duram minutos], [EV-03, EV-09],
    [Armazenamento], [Volume `image_data` + SeaweedFS], [Igual], [Segue], [Herda o acoplamento ao volume partilhado], [EV-24],
  ),
)

O vídeo herda do padrão global a entrada única, a autenticação, o desacoplamento por filas duráveis e o armazenamento partilhado. O padrão global impõe-lhe a orquestração no `projects` (que obriga a ramificar o orquestrador entre imagem e vídeo) e uma implantação com recursos fixos. Ao concentrar todos os efeitos num _worker_ único, o vídeo afasta-se da decomposição por ferramenta: ganha uma só descodificação e resultados sem saídas parciais, mas perde a independência entre funcionalidades e a possibilidade de escalar cada uma. Esta combinação explica as duas fragilidades centrais: a legendagem, a etapa mais pesada, bloqueia todos os outros vídeos (*capacidade*), e qualquer mudança ou falha na legendagem afeta o serviço inteiro (*modularidade*).

== Legendagem automática e extração de fotogramas

#tab([Integração da legendagem e da extração no padrão do vídeo],
  tabela(
    colunas: (2.4cm, 1fr, 1fr, 2.6cm),
    tamanho: 8.5pt,
    [Funcionalidade], [Como se integra], [Impacto nos atributos de qualidade], [Evidência],
    [Legendagem automática], [Etapa ordenada dentro do `video_tool`: escreve um ficheiro intermédio que a etapa seguinte lê. Faster-Whisper `small`, CPU / int8, 2 _threads_; modelo no volume `whisper_models`], [*Capacidade e comportamento temporal:* ocupa o único _worker_ durante minutos (142 s para um vídeo de 177 s nesta máquina), atrasando os outros vídeos. *Modularidade:* acrescenta uma dependência pesada (Whisper, fontes) à imagem de todos os efeitos], [EV-11, EV-13, EV-23, EV-26],
    [Extração de fotogramas], [Etapa terminal e única dentro do `video_tool`; o `projects` valida a posição e grava cada fotograma como um `Result` de imagem], [*Modificabilidade:* a regra "último passo" vive em três sítios (_frontend_, `projects`, _worker_). *Capacidade:* partilha o mesmo _worker_], [EV-08; #ev("EV-14", [`Tools/video/frame_extraction.py:18–50`], [validação dos parâmetros e amostragem])],
  ),
)

== Suporte aos requisitos não funcionais existentes

#tab([Suporte aos requisitos de vídeo do PL1-G4 e a regras sem requisito explícito],
  tabela(
    colunas: (4.4cm, 1.6cm, 1.6cm, 1fr, 2cm),
    tamanho: 8.5pt,
    [Requisito / regra], [Global], [Vídeo], [Porquê], [Evidência],
    [REQ-VID-EDIT-010: editar em até 1× a duração], [Sim], [Sim], [Uma descodificação e uma codificação; medido 0,38–0,90×], [EV-11, EV-22],
    [REQ-VID-EDIT-011: vários vídeos em paralelo (MVP ≥ 2)], [Parcial], [*Não*], [Um consumidor com `prefetch_count=1` e sem réplicas; no máximo 1 vídeo em processamento], [EV-03, EV-09, EV-27],
    [REQ-VID-STATUS-003: progresso a cada 2 s ou menos], [Sim], [Sim], [Evento por cada 2 % do vídeo], [EV-19],
    [REQ-VID-FAIL-004: sem perda de trabalho após falha], [Parcial], [Sim], [A mensagem volta à fila se o _worker_ cair antes do _ack_; 0 trabalhos perdidos em 5 falhas], [EV-09, EV-10, EV-29],
    [REQ-VID-SUBMIT-008: aceitação do _upload_ em < 1 s], [Não], [Não], [Carregamento inteiro em memória em três serviços antes da resposta], [EV-15; H-05],
    [REQ-VID-EDIT-013: acrescentar um efeito sem alterar os outros], [Sim (imagens)], [Parcial], [Um efeito novo toca 6 ficheiros em 3 componentes, incluindo o dos efeitos existentes], [EV-08, EV-12, EV-31],
    [Sem requisito: extração sempre no último passo e no máximo uma vez; no máximo 100 fotogramas], [—], [Sim], [Validada no `projects` e reforçada na inserção e no _worker_], [EV-08, EV-14],
    [Sem requisito: legendagem só para vídeo, na ordem do _pipeline_; pré-visualização de 3 s], [—], [Sim], [Etapa ordenada no _worker_; `VIDEO_PREVIEW_SECONDS=3`], [EV-08, EV-11],
  ),
)
