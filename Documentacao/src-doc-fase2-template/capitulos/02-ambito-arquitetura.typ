#import "../template.typ": *

= Âmbito e Vista da Arquitetura

Este capítulo descreve a *solução de base* (_commit_ `0523102`), antes do _refactoring_: como foi lançada, em que fontes assenta a análise, a arquitetura com o caminho do vídeo em destaque e a sequência de um pedido completo. A arquitetura depois do _refactoring_ está no capítulo 9.

== Preparação e ambiente

#tab([Preparação e ambiente],
  tabela-campos(
    [Commit de partida], [`0523102` (`052310226c51fa57a17101c7bd1ad795674aac95`, `picturas-um/picturas-27`); o código é igual ao de `b638a13`],
    [Comando(s) de arranque], [Limpeza dos dados da instância (`docker compose down --remove-orphans` e remoção dos volumes de dados, mantendo `picturas_whisper_models`), depois `docker compose up -d --build`. Automatizado em `Documentacao/medicoes/medicao_inicial.command` (lógica em `lancar_medicao.sh`)],
    [Ambiente (SO, CPU, RAM, versões de Docker e Compose)], [macOS, MacBook Pro 13" de 2022 (`Mac14,7`), Apple M2 com 8 núcleos e 8 GiB; Docker 29.8.0 com 8 CPU, 6 GB de memória e 1 GB de _swap_ atribuídos; Python 3.13.7 para os _scripts_ de medição. Registo completo em `Documentacao/medicoes/baseline/ambiente.json`],
    [Projeto de teste], [Teste de ponta a ponta, caso B: uma imagem 640×480 e o vídeo `sample_10s_720p.mp4`, com o _pipeline_ brilho → corte 1–6 s → legendas (`Documentacao/testes_regressao/ponta_a_ponta.py`). Nas medições: um vídeo por projeto (10 s 720p, 30 s 720p, 150 s 1080p e um discurso de 177 s para a legendagem)],
    [Problemas encontrados ao lançar], [(1) O nome do projeto Compose (`picturas`) é o mesmo da Fase 1: os volumes antigos têm de ser apagados antes do primeiro arranque. (2) O primeiro `--build` instala as dependências de cerca de 30 imagens (≈ 8 min nesta máquina) e ocupa vários GB. Nenhum outro problema: todos os serviços ficaram `Up`],
  ),
)

*Como é orquestrado o processamento em lote de imagens e de vídeos.* No _Apply_, o _frontend_ chama `POST …/process` e o `projects` valida o _pipeline_. Para cada _media_ do projeto, descarrega o original do SeaweedFS para o volume partilhado `image_data` e publica uma mensagem no RabbitMQ. Para uma *imagem*, a mensagem leva só a *primeira* ferramenta e vai para a fila dessa ferramenta; cada resposta chega a `project_queue` e o `projects` publica a ferramenta seguinte, até ao fim da cadeia. Para um *vídeo*, o `projects` envia *uma só mensagem* para `video_queue` com o *_pipeline_ inteiro*, que o `video_tool` aplica numa passagem: descodifica, aplica os efeitos fotograma a fotograma, corre as etapas de legendagem e de extração de fotogramas e codifica uma vez. O sistema distingue os dois tipos pelo campo `media_type` de cada _media_, definido no carregamento, que usa _endpoints_ diferentes para imagens e vídeos. O progresso do vídeo vai do _worker_ para `ws_queue` e daí, pelo WS Gateway, para o _browser_.

== Fontes consultadas

#tab([Fontes consultadas],
  tabela(
    colunas: (5.5cm, 3.2cm, 1fr),
    [Fonte], [Versão / data], [Usada para],
    [`README.md`, `AGENTS.md`], [_commit_ `0523102`], [Arranque, serviços, regras da legendagem e da extração; regras de vídeo e limites por perfil],
    [`doc-ext-requisitos-2627.pdf`], [PL1-G4, 23/10/2026], [Requisitos não funcionais de vídeo, decisões do MVP (DQ-01 a DQ-07)],
    [`doc-sol-arquitetural.pdf`], [Fase 2 de 2025/2026 (jan. 2026)], [Solução de base anterior ao vídeo (T-01 a T-11)],
    [Diretrizes da Fase 2], [Versão 1, 4/11/2026], [Âmbito, par de RNF, princípios],
    [Slides da aula 11 (_Arch. Styles_) e documento de apoio de padrões arquiteturais], [JM Fernandes; Exercício 6], [Identificação dos estilos (_pipe & filter_, _batch-sequential_, _publish-subscribe_) e catálogo de alternativas],
    [Slides das aulas 6 e 7 (Bloco 2 e táticas)], [Novembro de 2026], [Cenários de qualidade, priorização, táticas e decisões arquiteturais],
    [`arquitetura_global.puml`], [Equipa docente, 5/11/2026], [Base da vista da arquitetura global (secção 2.3)],
    [Teste de ponta a ponta], [`Documentacao/testes_regressao/baseline/`, 12/11/2026], [Comportamento observado de imagens e vídeos na base (15/15 verificações)],
    [Medições inicial e final], [`Documentacao/medicoes/baseline/` (11–12/11/2026) e `final/` (14/11/2026)], [Evidências medidas],
  ),
)

== Vista da arquitetura global

#figure(
  image("../images/arquitetura_global.png", width: 100%),
  caption: [Vista da arquitetura global da base, com o caminho do vídeo destacado e as fragilidades medidas],
)

*Ferramenta / notação:* diagrama de componentes em Mermaid (fonte em `Documentacao/exercicio6/arquitetura_global_video.mmd`; a versão em SVG, ao lado, pode ser ampliada sem perder legibilidade), *adaptado* da vista da equipa docente (`arquitetura_global.puml`): mantém os componentes, as filas, as ligações e as cores do original e acrescenta, a vermelho, as fragilidades da base com o resultado da medição inicial.

#tab([Legenda da vista da arquitetura],
  tabela(
    colunas: (5cm, 1fr),
    [Elemento (cor, forma ou estilo)], [Significado],
    [Seta laranja grossa], [Caminho do vídeo],
    [Seta cinzenta], [Padrão global e caminho das imagens],
    [Linha azul tracejada], [Acesso ao volume partilhado `image_data`],
    [Componente e fila laranja], [`video_tool` (_worker_ único) e `video_queue`],
    [Caixa amarela], [RabbitMQ: _exchange_ direto `picturas` e filas duráveis],
    [Caixa vermelha ligada a tracejado], [Fragilidade da base e o cenário que a mediu (S1–S3, M1–M3, descritos no capítulo 6)],
  ),
)

== Sequência de um pedido completo

#figure(
  image("../images/sequencia_pedido.png", width: 92%),
  caption: [Sequência do processamento em lote de um projeto com vídeos, na base],
)

Cada evidência (`EV-nn`) é descrita no sítio onde aparece pela primeira vez, no formato *EV-nn* (localização): o que mostra. As localizações referem-se ao _commit_ `0523102`, salvo indicação em contrário.

#tab([Passos do pedido completo],
  tabela(
    colunas: (2.4cm, 3.2cm, 4cm, 1fr),
    tamanho: 8.5pt,
    [Passo], [Origem → Destino], [Mensagem / _endpoint_ / fila], [Evidência],
    [Carregamento do vídeo], [Browser → nginx → API Gateway → `projects` → `img_storage` / SeaweedFS], [`POST /api-gateway/projects/:user/:project/video` (_multipart_), com o vídeo inteiro em memória no _gateway_ e no `projects`],
      [#ev("EV-01", [`nginx/nginx.conf:13, 24–35, 64–65, 95–96`], [entrada única HTTPS, `client_max_body_size 1100m`, rotas para _frontend_, API e Socket.IO]); #ev("EV-15", [`apiGateway/routes/projects.js:23`; `projects/routes/projects.js:72`; `imageStorageService/route/upload.js:6`], [`multer.memoryStorage()` nos três serviços do carregamento]); #ev("EV-08", [`projects/utils/video.js:16–48, 146–210`], [listas de ferramentas de vídeo, limites por perfil, `videoPipeline`, `validateFrameExtraction`, `insertPipelineTool`])],
    [Definição do _pipeline_], [Browser → API Gateway → `projects`], [`POST …/tool {procedure, params}`; `insertPipelineTool` mantém a extração de fotogramas no fim], [EV-08],
    [_Apply_], [Browser → API Gateway → `projects` → RabbitMQ → `video_tool`], [`POST …/process`; uma mensagem por vídeo em `video_queue`, com o _pipeline_ inteiro],
      [#ev("EV-06", [`projects/routes/projects.js:1521–1680`], [validações do _Apply_; vídeo → uma mensagem com `videoPipeline`; imagem → primeira ferramenta]); #ev("EV-09", [`Tools/video/video.py:51–63, 170–174`], [`prefetch_count=1`, `heartbeat=0`, _ack_ manual só no fim])],
    [Progresso], [`video_tool` → `ws_queue` → WS Gateway → Browser], [Evento `video-progress` (percentagem) para a sala do utilizador, por cada 2 % do vídeo],
      [#ev("EV-19", [`wsGateway/index.js`; `Tools/video/video.py:112–124`], [`video-progress`, `process-update` e `process-error` emitidos para a sala do utilizador])],
    [Resultado], [`video_tool` → `project_queue` → `projects` → SeaweedFS; `projects` → `ws_queue` → Browser], [Resposta com `correlationId`; `Result` gravado; evento `process-update`],
      [#ev("EV-07", [`projects/routes/projects.js:204, 246–254, 505–524`], [avanço da cadeia de imagens (`cur_pos + 1`); a resposta de um vídeo é sempre a última da cadeia]); EV-19],
  ),
)

=== Onde o sistema bifurca entre imagem e vídeo

#tab([Pontos de bifurcação entre imagem e vídeo],
  tabela(
    colunas: (2.6cm, 3.4cm, 1fr, 1fr),
    tamanho: 8.5pt,
    [Ponto], [Imagens], [Vídeo], [Evidência e porquê],
    [Carregamento], [`POST …/img`], [`POST …/video`, com `ffprobe` e validação de _codec_, duração, tamanho e resolução por perfil (free 60 s / 100 MB, premium 600 s / 1 GB)], [EV-08; cada _endpoint_ recusa o outro tipo],
    [Validação no _Apply_], [Ignora as ferramentas só de vídeo], [Recusa efeitos sem versão de vídeo (IA, marca de água)], [EV-06, EV-08],
    [Despacho], [Uma mensagem por (imagem, ferramenta), para a fila da ferramenta], [Uma mensagem por vídeo, para `video_queue`, com o _pipeline_ todo], [EV-06; o PL1-G4 justifica-o com uma só descodificação e codificação e sem saídas parciais (DQ-04, DQ-06)],
    [Avanço da cadeia], [O `projects` publica a ferramenta seguinte], [A resposta do vídeo fecha a cadeia], [EV-07],
    [Confirmação da mensagem], [_Ack_ automático ao receber], [_Ack_ manual no fim do processamento], [EV-09; #ev("EV-10", [`Tools/utils/rabbit_mq.py:36–41`], [ferramentas de imagem com `auto_ack=True`])],
    [Interface], [Todas as ferramentas], [Esconde a IA e a marca de água; mostra Legendas e Extrair fotogramas], [#ev("EV-18", [`frontend/components/toolbar/toolbar.tsx:53, 84–86`], [ferramentas mostradas em projetos com vídeo])],
  ),
)
