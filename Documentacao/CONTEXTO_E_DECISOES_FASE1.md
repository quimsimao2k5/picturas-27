# 📋 Contexto, Decisões e Ponto de Situação do Projeto PictuRAS (Fase 1)

Documento de transição e enquadramento para continuidade do desenvolvimento por agentes de IA e equipa de desenvolvimento.

---

## 1. Contexto Geral do Projeto

- **Unidade Curricular:** Requisitos e Arquiteturas de Software (MEI, Universidade do Minho, ano letivo 2026/2027).
- **Grupo:** **`PL5-G7`**  
  - Francisco Dias (PG63958)  
  - Rodrigo Rocha (PG65437)  
  - Rodrigo Fernandes (PG64026)  
  - Luís Miguel (PG65424)  
  - Joaquim Cunha (PG63986)  
- **Idioma do Projeto:** Português Europeu (`pt-PT`) para documentação/requisitos; Interface da aplicação em Inglês (`en-US`), mantendo a consistência do código existente.
- **Natureza do Projeto:** *Brownfield* sobre o **PictuRAS** — aplicação web SaaS de edição e processamento multimédia que suporta perfis Anónimo, Registado e Premium, com quota diária de 5 operações para utilizadores Registados, encadeamento de ferramentas em *pipeline* e processamento em lote.
- **Objetivo da Fase 1:** Introduzir **suporte a vídeo** no sistema através de 3 casos de uso articulados e coerentes.

---

## 2. Divisão dos Casos de Uso e Estado dos Documentos

Os documentos de trabalho da equipa encontram-se na pasta `Documentacao/`:

1. **`UC-VID-002` — Gerir Biblioteca de Vídeos e Adicionar Vídeo**
   - **Ficheiro:** `Documentacao/RAS_UC_Biblioteca_Videos.md`
   - **Versão:** **`v1.3`** (2026-10-18; reaberta apenas para alinhar com a implementação — ver secção 6).
   - **Requisitos:** `REQ-VID-LIB-001` a `REQ-VID-LIB-062` (52 Funcionais + 10 Não Funcionais).
   - **Papel na Arquitetura:** É o **dono único** de todos os requisitos comuns e transversais:
     - `REQ-VID-LIB-001` (Acesso à biblioteca por Registado e Premium);
     - `REQ-VID-LIB-002` (Listagem de vídeos Disponíveis e espaço ocupado);
     - `REQ-VID-LIB-032` (Isolamento de consulta entre bibliotecas);
     - `REQ-VID-LIB-033` (Isolamento de processamento e eliminação);
     - `REQ-VID-LIB-034` (Isenção de quota diária na biblioteca);
     - `REQ-VID-LIB-045` (Cobrança de quota em operações de processamento);
     - `REQ-VID-LIB-048` (Informação e redirecionamento de Anónimos para autenticação);
     - `REQ-VID-LIB-049` (Bloqueio estrito de acesso ao perfil Anónimo);
     - `REQ-VID-LIB-057` (Eliminação manual de vídeos e libertação de espaço);
     - `REQ-VID-LIB-058` (Bloqueio de eliminação de vídeos em processamento).
   - Os outros dois casos de uso referenciam estes IDs na coluna `Origem`.

2. **`UC-VID-003` — Reproduzir Vídeo**
   - **Ficheiro:** `Documentacao/RAS-exercicio1_Reproducao_Video_v2_1.md`
   - **Versão:** **`v2.3`** (2026-10-18: removido o limite de 60 fps; REQ-PLAY-014 retirado; novos REQ-PLAY-055/056, nota de idioma e A7 — ver secção 7; o nome do ficheiro mantém `v2_1`).
   - **Requisitos:** `REQ-VID-PLAY-001` a `REQ-VID-PLAY-054` (39 Funcionais ativos + 14 Não Funcionais; `REQ-VID-PLAY-041` marcado formalmente como **RETIRADO** com justificação de retenção; novos `053` e `054`).
   - Alinhado com a biblioteca em formatos (MP4/MOV H.264/AAC), estados de vídeo (`Disponível`), limites de streams concorrentes (1 Registado, 3 Premium) e sem fugas de tecnologias no texto dos requisitos.

3. **`UC-VID-001` — Recortar Intervalo Temporal de um Vídeo**
   - **Ficheiro:** `Documentacao/RAS-Exercicio1_Recorte_de_Video.md`
   - **Versão:** **`v1.4`** (2026-10-18: A9; TRIM-001/048/049 passam a referências à biblioteca; Q1–Q4/Q6 fechadas; RN4 Premium ≤ 3; nova E7 + REQ-VID-TRIM-062/063; E1 defensivo; áudio no RN1; PL5-G7 — ver secção 8).
   - **Estado:** `REQ-VID-TRIM-001` a `063`; alinhado com a biblioteca v1.3 e a reprodução v2.3.

---

## 3. Decisões Transversais Fechadas (Não Alterar nem Reabrir)

1. **Ciclo de Estados:**
   - **Vídeos na Biblioteca:** `A carregar`, `A validar`, `Disponível`, `Rejeitado`. Apenas vídeos no estado `Disponível` podem ser reproduzidos ou recortados.
   - **Pedidos de Processamento / Ferramentas:** `Em fila`, `A processar`, `Concluído`, `Falhou`, `Cancelado`.
   - **Dinâmica de Ingestão:** Rejeições no Passo 4 do carregamento (`E2`, `E3`, `E4`) ocorrem **antes** de criar o registo, não atribuindo estado. O estado `Rejeitado` só aparece após validação nos passos 6 e 7. Cancelamento pelo utilizador (`FA2`) só é possível no estado `A carregar`; nos passos 6 e 7 (`A validar`) a opção de cancelar fica indisponível.

2. **Compatibilidade de Formatos e Codecs:**
   - **MVP (Fase 1):** Contentores **MP4** e **MOV**, codec de vídeo **H.264 (AVC)**, codec de áudio **AAC** (ou vídeo sem áudio). Sem limite de taxa de fotogramas (decisão de 2026-10-18: removido o limite de 60 fps da biblioteca/reprodução; o recorte continua a preservar a taxa de fotogramas do original).
   - **Produção (Fase 2 / `DQ-006`):** Suporte alargado a WebM, MKV, H.265, VP8, VP9, HE-AAC e Opus.

3. **Limites Numéricos por Perfil (`RN10` da Biblioteca):**
   - **Anónimo:** Bloqueado no MVP (`401`/`403`), encaminhado para registo (`E1`).
   - **Registado:** Até 100 MB por vídeo, duração máxima de 3 min (180 s), resolução até 1080p, armazenamento total na biblioteca até 500 MB, máximo de 1 stream de reprodução simultâneo.
   - **Premium:** Até 1 GB por vídeo, duração máxima de 30 min (1800 s), resolução até 4K, armazenamento total na biblioteca até 10 GB, máximo de 3 streams de reprodução simultâneos.

4. **Retenção e Eliminação (`RN13` e `A6` da Biblioteca):**
   - Vídeos `Disponíveis` (carregados ou resultantes de processamento) são guardados permanentemente até **eliminação manual** pelo utilizador. Não há expiração temporal automática de 24 h ou 30 dias.
   - A biblioteca bloqueia a eliminação se o vídeo estiver a ser usado como origem de um pedido `Em fila` ou `A processar`. Caso seja eliminado noutro separador durante a reprodução, o leitor trata a ausência no pedido de segmentos fora do buffer como exceção `E4`.

5. **Quota Diária de Operações (5 ops/dia para Registado):**
   - Consulta da biblioteca, upload, eliminação e reprodução **não descontam** na quota diária.
   - O recorte de vídeo reserva 1 operação ao submeter, consome-a ao passar a `Concluído` e devolve-a se `Falhou` ou for `Cancelado`.

---

## 4. Análise da Arquitetura Atual da Aplicação (`picturas-27`)

A solução PictuRAS assenta numa arquitetura orientada a microsserviços em Docker:

- **Nginx (Reverse Proxy HTTPS, porta 8080):**
  - Encaminha `/` para o `frontend:3000`.
  - Encaminha `/api-gateway/` para o `api_gateway:8000`.
  - Encaminha `/s3/` para o serviço de armazenamento de objetos `seaweedfs:9000`.
  - Encaminha `/socket.io` para o `ws_gateway:4000`.
- **API Gateway (`apiGateway`, Express, porta 8000):**
  - Ponto de entrada das chamadas do frontend com middleware de autenticação JWT (`auth/auth.js`).
  - Redireciona chamadas para os microsserviços internos via HTTP/HTTPS interno.
- **Armazenamento de Objetos (`seaweedfs` + `imageStorageService`):**
  - **SeaweedFS S3** (porta 9000 interna): Armazena ficheiros em buckets organizados por utilizador (`user-<userId>`).
  - **`img_storage` (porta 11000):** Microsserviço auxiliar para criação de buckets, upload e geração de URLs pré-assinadas (`internal` e `public` via `/s3`).
- **Microsserviços de Backend Existentes:**
  - `users` (porta 10001, MongoDB próprio em `27019`): Gestão de contas, tipos de utilizador, quotas diárias de operações e encriptação de dados pessoais.
  - `projects` (porta 9001, MongoDB próprio em `27018`): Gestão de projetos de edição de imagem, pipelines de ferramentas e mensageria RabbitMQ.
  - `subscriptions` (porta 11001, MongoDB próprio): Planos e cartões de subscrição.
- **Frontend (`frontend`, Next.js 15, App Router, React 19, Tailwind, Shadcn/Radix UI):**
  - Sessão gerida por `SessionProvider` (`lib/session.ts`), com utilizador atual, tipo (`anonymous`, `free`, `premium`) e token JWT.
  - Sidebar em `components/dashboard-sidebar/dashboard-sidebar.tsx` com lista de projetos e botão de novo projeto.
  - Comunicação via Axios (`lib/axios.ts`) configurada com base em `/api-gateway/`.

---

## 5. Decisões de Implementação da Biblioteca de Vídeos

Ficou aprovado avançar para o código com as seguintes decisões de desenho:

1. **Microsserviço Dedicado de Vídeos no Backend:**
   - Criar uma nova pasta/serviço `videos/` (Express + MongoDB próprio na rede interna docker + FFmpeg/ffprobe para extração técnica fiável de metadados, validação de integridade, contentores MP4/MOV, codecs H.264/AAC, duração e resolução).
   - Mapear o serviço no `docker-compose.yaml` e expor as respetivas rotas no `apiGateway` sob o prefixo `/videos`.
   - Utilizar o SeaweedFS S3 existente para armazenamento persistente dos ficheiros de vídeo.

2. **Frontend:**
   - Língua da interface em **Inglês** (ex.: *"Video Library"*, *"Upload Video"*, *"Duration"*, *"Resolution"*, *"Delete"*, *"Storage Used"*), consistente com o restante PictuRAS.
   - Nova rota e página dedicada: **`app/dashboard/videos/page.tsx`**.
   - Adicionar o item **"Video Library"** na sidebar (`frontend/components/dashboard-sidebar/dashboard-sidebar.tsx`).
   - Se um utilizador Anónimo aceder, apresentar a mensagem e diálogo de conversão/registo conforme a exceção `E1` / `REQ-VID-LIB-048`.

3. **Estado Atual do Repositório (2026-10-18):**
   - Biblioteca de vídeos (`UC-VID-002`) **implementada** (alterações por fazer commit; ver secção 6.2).
   - Reprodução (`UC-VID-003`) **implementada** (secção 7).
   - Recorte (`UC-VID-001`) **implementado** (secção 8).

---

## 6. Alterações de 2026-10-18 (início da implementação da biblioteca)

### 6.1 Decisões tomadas pela equipa (respostas às perguntas do agente)
1. **Taxa de fotogramas:** removido o limite de 60 fps (Reprodução RN1/A5/REQ-PLAY-025); a biblioteca não valida fps. O recorte mantém a preservação da taxa de fotogramas do original (RN5, REQ-VID-TRIM-051) — revertido a pedido da equipa.
2. **Resolução independente da orientação:** lado maior ≤ 1920 px e lado menor ≤ 1080 px (Registado); ≤ 3840 / ≤ 2160 px (Premium). Um vertical 1080 × 1920 é aceite como 1080p (RN10, E9, REQ-VID-LIB-055).
3. **Painel "Recent uploads":** vídeos `A carregar` / `A validar` / `Rejeitado` (com motivo) aparecem num painel separado da lista, e os rejeitados podem ser dispensados (novos RN14, FA7, REQ-VID-LIB-061, REQ-VID-LIB-062).
4. **Pedidos de processamento no serviço `videos`:** coleção `jobs` no mesmo serviço da biblioteca, consultada para o bloqueio E13 (novas assunções A8 na biblioteca e A9 no recorte).

### 6.2 Arquitetura implementada
- **Novo serviço `videos/`** (Express, porta 11002, HTTP interno; MongoDB próprio `videos_mongoDB:27020`; ffprobe na imagem Docker; ficheiros no SeaweedFS, bucket `user-<id>`, chave `videos/<videoId>.<ext>`).
- **Upload em 2 pedidos:** `POST /videos/:user` (passo 4: E2/E3/E4 sem transferir bytes, cria o registo `uploading`) e `PUT /videos/:user/:id/content` (passos 5–8 em streaming: ficheiro temporário → ffprobe → S3 → `available`, ou `rejected` com motivo). Cancelar = abortar o envio ou `POST …/cancel` (só em `uploading`). Se o utilizador sair durante a validação, o servidor conclui o processamento (FA6) e o frontend consulta o estado a cada 2 s.
- **Estados no código (EN) ↔ especificação (PT):** `uploading`=A carregar, `validating`=A validar, `available`=Disponível, `rejected`=Rejeitado; jobs: `queued`, `processing`, `completed`, `failed`, `cancelled`.
- **Espaço ocupado:** conta os `available`; a verificação E4 conta também os uploads em curso (reserva). 1 MB = 1024² bytes.
- **E12:** o gateway envia a expiração do JWT (`X-Session-Expires-At`); o serviço não publica o vídeo se a sessão expirar antes do passo 8.
- **Integração:** `apiGateway/routes/videos.js` (prefixo `/videos`, PUT encaminhado em streaming); `nginx` com `location /api-gateway/videos/` (`client_max_body_size 1100m`, `proxy_request_buffering off`); `requestTimeout = 0` no gateway e no serviço; `docker-compose` com `videos`, `videos_mongoDB`, volumes `video_data`/`video_tmp` e backup.
- **Frontend:** `app/dashboard/videos/page.tsx`, `components/videos/*`, `lib/videos.ts`, `lib/queries/videos.ts`, `lib/mutations/videos.ts`; item "Video Library" na sidebar; anónimo → aviso E1 + redirecionamento para `/login` após 5 s.
- **Eliminação de conta (RN13):** o serviço `users`, ao apagar uma conta, chama `DELETE http://videos:11002/:user` (rota interna, não exposta no gateway), que remove todos os vídeos do utilizador (qualquer estado), os ficheiros no S3 e os pedidos de processamento.
- **Testes:** `videos/test/*.test.js` (53 testes `node --test`, com vídeos reais gerados por FFmpeg; nomes com o ID do requisito) e `videos/test/e2e/smoke.sh` (ponta a ponta via nginx; requer a stack levantada).

### 6.3 Incoerências detetadas e ainda por resolver
- **Limitação conhecida (não alterado por decisão da equipa):** o certificado do nginx (`certs/selfsigned.crt`) só tem `CN=localhost`, sem SAN; o Safari não reproduz os vídeos com este certificado (o motor de vídeo do macOS ignora a exceção aceite na página). Testar a reprodução noutro navegador (Chrome/Firefox, alvo do REQ-VID-PLAY-049).
- **Baseline (candidato a T-nn, cap. 11):** `users/routes/users.js` chama o serviço `projects` em `https://projects:10002/projects/`, mas o `projects` escuta na porta 9001; ao apagar uma conta, os projetos não são apagados (o erro é registado e ignorado). Não corrigido.
- Recorte: Q2, Q3, Q4 e Q6 continuam "em aberto" mas a biblioteca já as fecha; falta definir o que acontece se o resultado do recorte não couber no espaço da biblioteca.
- Recorte: REQ-VID-TRIM-001 duplica REQ-VID-LIB-002 e REQ-VID-TRIM-049 duplica REQ-VID-LIB-057/058 (requisitos partilhados não devem ser duplicados).
- Recorte: E1 (formato não suportado) é inalcançável no MVP e devia ter nota de verificação defensiva; RN1 não refere o áudio (AAC) da saída; identificação "Grupo 7" / "Grupo {nº do grupo}" em vez de PL5-G7.
- Reprodução: A1 refere MinIO (o repositório usa SeaweedFS); FA1 refere vídeos "num projeto", conceito que nenhum UC define.

---

## 7. Reprodução de vídeo (UC-VID-003) — implementação de 2026-10-18

### 7.1 Decisões tomadas pela equipa
1. **Projetos retirados do UC:** nenhum UC associa vídeos a projetos. FA1 fica só para resultados de processamento; `REQ-VID-PLAY-014` marcado como RETIRADO.
2. **Contagem de transmissões ativas (RN6):** sessão de reprodução por leitor aberto, com sinal (*heartbeat*) a cada 15 s; uma sessão sem sinal durante 45 s deixa de contar. Um novo pedido do **mesmo navegador** substitui as sessões anteriores desse navegador (recuperação imediata após fecho abrupto). Novos `REQ-VID-PLAY-055` e `056`; `REQ-VID-PLAY-048` ajustado (≤ 45 s noutro dispositivo).
3. **Idioma:** mensagens em inglês; nota no UC a explicar que os textos em português definem o conteúdo.
4. **Auditoria (REQ-PLAY-054, A7):** coleção `security_events` no Mongo do serviço `videos` (anónimo / não proprietário); pedidos sem JWT válido recusados no gateway ficam em linhas `[SECURITY]` no log do `api_gateway`.

### 7.2 Arquitetura implementada
- **Serviço `videos` → `PlaybackService`:** `POST /:user/videos/:id/playback` (passo 2: perfil, titularidade, estado Disponível, ficheiro existe com o tamanho registado, limite de streams, URL assinado), `POST /:user/playback/:sid/heartbeat`, `POST /:user/playback/:sid/renew` (E3a; revalida o vídeo → deteta E4), `DELETE /:user/playback/:sid` (passo 5/FA3). Coleções `playback_sessions` (índice TTL) e `security_events`.
- **Entrega dos bytes:** URL assinado do SeaweedFS (validade 30 min, `config/playback.js`) servido pelo nginx em `/s3`, com *Range requests* — o mesmo mecanismo que o PictuRAS já usa para as imagens. A API não transporta bytes de vídeo (REQ-PLAY-046). Ficheiros MOV são anunciados como `video/mp4` para reprodução nativa em Chrome/Firefox.
- **Gateway:** rotas `/videos/:user/:video/playback` e `/videos/:user/playback/:sid/...`; `docker-compose`: `FRONTEND_URL` no serviço `videos`.
- **Frontend:** `components/videos/video-player.tsx` (leitor com controlos próprios: play/pause, *seek* com barra de *buffer*, volume/mute, velocidade 0,5–2x, ecrã inteiro, *replay*, estados Loading/Buffering/Playing/Paused/Ended/Error, E1–E7, "Try again" a partir do instante `t`), `video-player-dialog.tsx`, botão **Play** e coluna de formato na lista; `clientId` do navegador em `localStorage`.
- **Testes:** `videos/test/playbackService.test.js` (20 testes; total 73) e secção "UC-VID-003" no `smoke.sh` (Range 206, assinatura adulterada 403, limite 429, reclamar, 410, JWT inválido 401).

### 7.3 Estado / limitações
- `REQ-VID-PLAY-038` e `040` (resultados de processamento) ficam **parciais** até existir o recorte (`UC-VID-001`).
- E3a: a renovação acontece em segundo plano 1 min antes da expiração; com o vídeo em pausa a troca é invisível, durante a reprodução o novo URL é aplicado quando o navegador pede novos segmentos (pode surgir um indicador de *buffering* breve).
- Metas de desempenho (REQ-PLAY-034/035/036/044/045) e compatibilidade de navegadores (REQ-PLAY-049) exigem teste manual com a stack levantada.

---

## 8. Recorte de vídeo (UC-VID-001) — implementação de 2026-10-18

### 8.1 Decisões tomadas pela equipa
1. **Arquitetura:** o processamento corre no serviço `videos` — fila interna com até 5 recortes em paralelo (REQ-TRIM-058); FFmpeg isolado em `services/tools/ffmpegAdapter.js` (REQ-TRIM-061) e contrato comum de ferramenta de vídeo em `services/tools/trimTool.js` (REQ-TRIM-060). Sem alterações ao RabbitMQ nem às Tools existentes.
2. **Método de corte:** recodificação H.264 (`libx264 veryfast`, CRF 20) com áudio AAC — corte exato ao segundo (±1 s), mesma resolução e fps do original.
3. **Espaço (Q6 → E7):** estimativa ao submeter (tamanho × intervalo ÷ duração; recusa sem consumir quota — REQ-TRIM-062) e verificação do tamanho real no fim (Falhou + devolução — REQ-TRIM-063).
4. **Premium:** até 3 recortes ativos em simultâneo (Registado: 1) — RN4.
5. **Correções ao MD (v1.4)** aprovadas: duplicados → referências, Q fechadas, E1 defensivo + áudio, identificação PL5-G7.
6. **Notificações:** consulta periódica (3 s com pedidos ativos, 30 s sem) e *toast*; pedidos terminados ainda não vistos são notificados quando o utilizador volta (campo `seen`). Sem alterações ao `ws_gateway`.

### 8.2 Arquitetura implementada
- **Quota:** usa os endpoints **existentes** do serviço `users` sem os alterar — `GET /:user/process/1` (reserva) e `POST /:user/process/refund/1` (devolução); a reserva fica consumida na conclusão. Hora de reposição = 00:00 UTC (o serviço `users` conta por dia UTC).
- **Serviço `videos` → `ProcessingService`:** `GET /:user/videos/:id/trim-eligibility` (passo 2: E1, E4), `POST /:user/videos/:id/trims` (E2, FA1, E4, E7, quota, `queued`), `GET /:user/trims`, `GET /:user/trims/:job`, `POST /:user/trims/:job/cancel` (FA2), `POST /:user/trims/:job/seen`; `POST /:user/videos/:id/download` (URL assinado para descarregar). Coleção `jobs` alargada (parâmetros, progresso, tentativas, estimativa, erro, resultado, `seen`).
- **Worker:** lê o original por URL assinado interno (só leitura), escreve o resultado num ficheiro temporário, valida-o com as regras da biblioteca (ffprobe), verifica o espaço, guarda-o no S3 (`videos/result-<job>.<ext>`) e cria um vídeo **Disponível** independente. Uma repetição automática (RN7); cancelamento mata o FFmpeg e devolve a operação; ficheiros parciais sempre removidos; após reinício, pedidos `processing` voltam à fila.
- **Gateway:** `/videos/:user/:video/trim-eligibility`, `/videos/:user/:video/trims`, `/videos/:user/trims/list`, `/videos/:user/trims/:job[/cancel|/seen]`, `/videos/:user/:video/download`.
- **Frontend:** botões **Trim** e **Download** na lista; `trim-video-dialog.tsx` (leitor + início/fim em segundos + formato + nome + resumo + FA1); painel **Processing requests** (estado, progresso, cancelar com confirmação, reproduzir/descarregar resultado, motivo de falha); `trim-notifier.tsx` montado na sidebar; operações diárias restantes na página da biblioteca (Registado).
- **Testes:** `videos/test/processingService.test.js` (22 testes; total 96, com FFmpeg real e duplos para falhas/cancelamento) e secção "UC-VID-001" no `smoke.sh`.

### 8.3 Estado / limitações
- A prioridade na fila do Premium (Q1, parte restante) não foi implementada: ordem de chegada.
- As mensagens do recorte estão em inglês; a nota de idioma existe no UC-VID-003 mas ainda não no UC-VID-001.
- Metas de desempenho (REQ-TRIM-057 ≤ 3 s; REQ-TRIM-058 ≤ 2× a duração em 720p) exigem medição manual com a stack levantada.
- `REQ-VID-PLAY-038/040` passam a ser verificáveis (resultado reproduzível no painel de pedidos).


---

## 9. Correção de bug do código herdado — login (2026-10-21)

**Problema:** o login falhava sempre, mesmo com email e password corretos. Após criar conta o utilizador entrava (o registo devolve logo um JWT válido por 7 dias), mas depois de terminar sessão não conseguia voltar a entrar. No browser: **500 "Error logging in"**.

**Causa:**
1. `users/routes/users.js` (rota `POST /:email/login`) obtém o utilizador com `User.getOneEmail(...)`.
2. `users/controllers/user.js` → `getOneEmail` devolvia `user.toJSON()`.
3. `users/models/user.js` → o `transform` do `toJSON` faz `delete ret.password_hash` (para não expor o hash nas respostas).
4. `users/auth/auth.js` → `authenticate` chama `bcrypt.compare(password, user.password_hash)` com o hash `undefined`; o bcrypt lança erro ("data and hash arguments required").
5. A rota apanha o erro no `catch` e responde **701**; o `apiGateway/routes/users.js` converte qualquer erro do serviço `users` em **500**.
- Efeito secundário: um email inexistente também dava erro (701 → 500) em vez de 401, porque `user` é `null`.

**Correção (2 alterações mínimas):**
- `users/controllers/user.js` → `getOneEmail` devolve `{ ...user.toJSON(), password_hash: user.password_hash }`. Só o login usa esta função, e a rota já retira o hash da resposta (`removeSensitiveInfo`), por isso o hash continua a não sair do serviço.
- `users/auth/auth.js` → guarda no início de `authenticate`: `if (!user || !user.password_hash) return false;` (email inexistente → credenciais incorretas, sem exceção).

**Porquê assim:** é a alteração mais pequena que repõe o comportamento esperado sem mudar o modelo, as outras rotas nem o contrato da API; o `toJSON` continua a esconder o hash em todas as outras respostas.
