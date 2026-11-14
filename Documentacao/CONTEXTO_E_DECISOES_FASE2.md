# 📋 Contexto, Decisões e Ponto de Situação do Projeto PictuRAS (Fase 2)

Documento de transição e enquadramento para a Fase 2, para a equipa e para os agentes de IA que trabalhem no código. Segue o modelo do `CONTEXTO_E_DECISOES_FASE1.md`: regista o contexto, as decisões tomadas pela equipa (com data) e as questões ainda em aberto. **Nenhuma decisão de implementação é tomada pelo agente: são propostas aqui e decididas pela equipa.**

---

## 1. Contexto Geral

- **Unidade Curricular:** Requisitos e Arquiteturas de Software (MEI, Universidade do Minho, 2026/2027).
- **Grupo:** `PL5-G7` — Francisco Dias (PG63958), Rodrigo Rocha (PG65437), Rodrigo Fernandes (PG64026), Luís Miguel (PG65424), Joaquim Cunha (PG63986).
- **Objetivo da Fase 2:** escolher **dois requisitos não funcionais** distintos (ISO/IEC 25010:2011, característica e subcaracterística) e melhorá-los **por refactoring, sem novas funcionalidades**, fechando o ciclo: requisito → quantificação → medição inicial → refactoring → medição final.
- **Entrega:** 20 de novembro de 2026. **Defesas:** 23–27 de novembro de 2026.
- **Estrutura do relatório e entregáveis:** ainda não definidos (sairão numa versão seguinte das diretrizes).

### 1.1 Ponto de partida

- **Solução de base:** a da Fase 1 do grupo **PL1-G4**, integrada no repositório oficial `picturas-um/picturas-27`, com correções da equipa docente e duas funcionalidades acrescentadas depois: **legendagem automática** e **extração de fotogramas**.
- **Commit de partida (a identificar no relatório):** `b638a13` — "Add a real speech video sample for subtitles and frame extraction (#36)", na cópia local em `fase2/picturas-27/` (remote `origin` = `picturas-um/picturas-27`).
- **Atualização no repositório oficial (verificada a 4/11/2026, 14:55):** o `HEAD` passou a ser `0523102` — "Tell students replacing Phase 1 to wipe old Docker volumes (#37)" (Paulo Sousa, 4/11/2026). Só altera o `README.md` e o `AGENTS.md` (+19 linhas); **o código é igual ao de `b638a13`**. A cópia local foi atualizada para `0523102` a 4/11/2026 (fast-forward a partir do `main` do fork). Remotes reconfigurados com acordo da equipa: `origin` = fork `quimsimao2k5/picturas-27` (o `main` local segue `origin/main`); `upstream` = repositório oficial `picturas-um/picturas-27`, para receber correções da equipa docente. Ver Q2 e Q5.
- **Documentos de base:**
  - `fase2/fase-2-guidelines.pdf` — diretrizes da Fase 2 (versão 1, 4/11/2026);
  - `fase2/doc-ext-requisitos-2627.pdf` — extensão de requisitos do PL1-G4 (85 páginas), a ler com os documentos de requisitos e de solução arquitetural da base anterior;
  - `fase2/picturas-27/README.md` e `AGENTS.md` — únicos sítios onde estão descritas a legendagem e a extração de fotogramas.
  - `fase2/enunciados/` (recebidos a 5/11/2026): enunciado do **Exercício 6, Bloco 1** (`RAS-exercicio_6_bloco1_SWdesign_PT.html`, v1.1), o seu **template** (`RAS-exercicio_6_bloco1_SWdesign_template_PT.md`, v1.1, a converter mais tarde para o relatório, como na Fase 1) e uma **vista da arquitetura global com o caminho do vídeo destacado**, dada pelos docentes (`arquitetura_global.puml` e `.svg`). Ver secção 1.3.

### 1.2 Regras de trabalho com o agente (mantidas da Fase 1)

- O agente não toma decisões sozinho: em cada questão de implementação apresenta alternativas e uma sugestão, e a equipa escolhe.
- Não alterar código sem autorização da equipa.
- Todo o trabalho da Fase 2 é feito dentro da pasta `fase2/`.
- Os commits e pushes são feitos pela equipa.
- Tudo o que for decidido ou alterado fica registado neste documento.

### 1.3 Exercício 6 — Bloco 1 (padrões arquiteturais)

- **Objetivo:** diagnóstico arquitetural que alimenta as secções de diagnóstico e de decisões arquiteturais do relatório. Identificar o **padrão global** do PictuRAS e o **padrão do processamento de vídeo**, a relação entre eles, benefícios e desafios (ISO/IEC 25010), 2 a 3 **alternativas** para o vídeo e uma **matriz de comparação** com todas as células justificadas por evidência (`EV-nn`) ou marcadas como hipótese (`H-nn`).
- **Secções do template:** 0 preparação e ambiente (commit, arranque, projeto de teste com imagens e vídeos); 1 vista da arquitetura global com o caminho do vídeo, diagrama de sequência (carregamento → pipeline → *Apply* → progresso → resultado) e pontos de bifurcação imagem/vídeo; 2 padrões atuais, legendagem e fotogramas, RNF suportados e regras sem requisito, registo de evidências e hipóteses; 3 alternativas e matriz.
- **Bloco 2** (ainda não recebido): trade-offs, cenários de qualidade, **candidatos a RNF da Fase 2**, conclusões e uso de IA. Reutiliza os IDs `EV`, `H` e `ALT` do Bloco 1, que têm de ficar estáveis.
- **Ligação ao que já temos:**
  - a matriz usa o rótulo **«Eficiência de desempenho — capacidade / elasticidade»**, o que responde em parte à Q6;
  - duas das alternativas sugeridas pelos docentes correspondem ao par A (D1): **um microsserviço por efeito de vídeo** (modularidade) e um **worker replicável (Competing Consumers) com recursos dinâmicos e/ou fila dedicada à legendagem** (elasticidade). A terceira é tarefas efémeras coordenadas por um orquestrador de workflow;
  - as fragilidades F1–F7 (secção 3) e as medições de `Documentacao/medicoes/` podem servir de evidências (`EV-nn`);
  - a vista `arquitetura_global.puml` dos docentes cobre a secção 1.2 do template.
- **Material de apoio** (em `fase2/enunciados/` desde 5/11/2026):
  - `RAS_support_doc_architectural_patterns_PT.html` — catálogo de 7 padrões com o nível de análise e a relevância para o vídeo. Classifica o `video_tool` como *pipeline monolith* dentro de uma arquitetura de microsserviços, e Competing Consumers como alternativa que mantém o padrão global;
  - `RAS-slidesEN-11-ARCH-Styles.pdf` — slides da aula 11 (51 páginas);
  - `doc-sol-arquitetural.pdf` — documento de solução arquitetural da base anterior (Fase 2 de 2025/2026, 25 páginas: manutenção corretiva T-01 a T-11, partilha e colaboração, RNF46–RNF66).
- **Ainda em falta:** versão em inglês do template (dispensável) e enunciado do Bloco 2 (ainda não publicado).

---

## 2. Solução de Base — Resumo

### 2.1 Arquitetura (do `README.md` / `AGENTS.md`)

- Entrada única pelo **nginx** em `https://localhost:8080` (frontend Next.js, `api_gateway`, `ws_gateway`, SeaweedFS em `/s3/`).
- Atrás do gateway: `users`, `projects` (orquestrador: projetos, media, pipelines, processamento), `subscriptions`, `img_storage` (fachada S3).
- **Ferramentas de imagem:** um microsserviço Python por efeito, cada um com a sua fila no RabbitMQ (exchange `picturas`).
- **Vídeo:** um único worker, `video_tool` (`Tools/video/`), que recebe **uma mensagem por vídeo com o pipeline inteiro** em `video_queue`, descodifica uma vez, aplica os efeitos (PIL, duplicados em `Tools/video/effects.py`), codifica uma vez para MP4/H.264 + AAC e envia o progresso para `ws_queue`.

### 2.2 Diferença entre imagem e vídeo no processamento

| | Imagens | Vídeos |
|---|---|---|
| Mensagens | Uma por (imagem, ferramenta); o `projects` avança a cadeia a cada resposta | Uma por vídeo, com o pipeline inteiro |
| Serviço | Um por ferramenta | `video_tool` para tudo |
| Confirmação da mensagem | Automática ao receber (`Tools/utils/rabbit_mq.py:40`, `auto_ack=True`) | Manual, só no fim (`Tools/video/video.py:170`) |
| Paralelismo | Um consumidor por ferramenta | `prefetch_count=1`, uma réplica: um vídeo de cada vez |

### 2.3 Funcionalidades de vídeo sem requisito no documento do PL1-G4

As diretrizes assinalam que a **legendagem automática** e a **extração de fotogramas** só estão descritas no `README.md` e no `AGENTS.md`. Regras relevantes para não as partir num refactoring:

- **Legendas (`subtitles`):** só vídeo, para todo o projeto (sem `imgId`); Faster-Whisper `small` em CPU/int8, 2 threads (`WHISPER_CPU_THREADS`); legenda queimada no MP4 na língua detetada; sem áudio ou sem fala não faz nada; corre como etapa ordenada dentro do `video_tool` (a ordem conta: os efeitos depois das legendas também alteram o vídeo legendado); modelo guardado no volume `whisper_models`; a primeira pré-visualização pode demorar até 10 minutos (descarga do modelo).
- **Extração de fotogramas (`extract_frames`):** só vídeo, para todo o projeto, **sempre o último passo e no máximo uma vez**; 1–100 fotogramas por contagem ou intervalo, PNG/JPEG; um intervalo que daria mais de 100 é recusado; a pré-visualização é uma folha de contacto de até 6 amostras; cada fotograma fica um Result de imagem com nome único; sem efeitos antes, lê do original sem recodificar.
- **Outras regras de vídeo:** `trim` e `speed` só vídeo e só para um vídeo (`params.imgId`); cada efeito num vídeo conta 1 operação; limites free 60 s / 100 MB e premium 600 s / 1 GB; pré-visualização dos 3 primeiros segundos; em projetos com vídeo o frontend esconde as ferramentas só de imagem (IA, marca de água) e a exportação PDF; os vídeos nunca arrancam sozinhos nem repetem.

> Estas regras terão de ser respeitadas pelos testes de regressão (preservação funcional) e, se mexermos nelas, ficar com requisito explícito no relatório.

---

## 3. Fragilidades Observadas no Código (análise inicial, 4/11/2026)

Análise estática do código no commit `b638a13` (revalidada a 4/11/2026, 14:55: todos os pontos F1–F4 e F7 confirmados de novo; dos certificados, só o do nginx, `certs/selfsigned.crt`, está válido, até set. 2027). **Ainda não lançámos a solução nem fizemos medições**: os pontos abaixo são evidência de código, a confirmar com medições exploratórias. Estão organizados pelas ideias indicativas das diretrizes.

| # | Ideia (diretrizes) | Evidência encontrada no código | Estado |
|---|---|---|---|
| F1 | **Elasticidade** do processamento de vídeo | `video_tool` sem réplicas nem limites de recursos (nenhum `deploy`/`cpus`/`mem_limit` no `docker-compose.yaml`); `prefetch_count=1` (`video.py:54`); o processamento bloqueia a thread durante minutos, com `heartbeat=0` (`video.py:61-63`); a legendagem (Whisper em CPU, 2 threads) corre no mesmo worker e atrasa todos os outros vídeos | Confirmado no código |
| F2 | **Modularidade** do processamento de vídeo | Efeitos, legendas e fotogramas todos em `Tools/video/` (`effects.py`, `subtitles.py`, `frame_extraction.py`, `video_processor.py`); os efeitos PIL estão duplicados entre as ferramentas de imagem e `effects.py`; o orquestrador ramifica imagem/vídeo em `projects/routes/projects.js` (2 732 linhas) e `projects/utils/video.js` | Confirmado no código |
| F3 | **Eficiência no carregamento** de ficheiros grandes | `multer.memoryStorage()` em três serviços: `apiGateway/routes/projects.js:23`, `projects/routes/projects.js:72`, `imageStorageService/route/upload.js:6` — um vídeo de 1 GB fica inteiro em memória em cada um; sem progresso do envio | Confirmado no código |
| F4 | **Segurança** | 11 portas publicadas no anfitrião (incl. `users` 10001, `projects` 9002, `subscriptions` 11001, SeaweedFS 9000, RabbitMQ 5672/15672, MongoDB 27018); `rejectUnauthorized: false` em 7 ficheiros; segredos no `docker-compose.yaml` (`JWT_SECRET_KEY=lisan_al_gaib`, `FIELD_ENCRYPTION_KEY`, `SECRET_KEY`, senhas do RabbitMQ); certificados internos expirados (jan. 2026) | Confirmado no código |
| F5 | **Usabilidade — trabalho em segundo plano** | Estado do processamento só no componente da página (`frontend/app/dashboard/[pid]/page.tsx:89-91`, `useState`): perde-se com um refresh | Confirmado em parte; falta ver o ecrã sobreposto na aplicação |
| F6 | **Usabilidade — criação de pipelines** | Ferramentas escondidas em projetos com vídeo; pipeline inválido só detetado ao executar (segundo as diretrizes) | Por verificar na aplicação |
| F7 | **Fiabilidade** (não está nas ideias, mas é a prioridade do PL1-G4) | As ferramentas de imagem confirmam a mensagem ao recebê-la (`auto_ack=True`): se o serviço cair a meio, o trabalho perde-se; os erros das ferramentas de imagem trocam `messageId`/`correlationId` e não chegam ao utilizador | Confirmado no código |

### 3.1 O que o PL1-G4 deixou para a Fase 2

- **Requisitos não funcionais com alvo de produção** (Tabela 30 do documento deles), úteis para dar **origem identificável** aos valores-alvo:
  - `REQ-VID-EDIT-010` — concluir a edição em até 1× a duração (MVP: até 5×);
  - `REQ-VID-EDIT-011` — editar vários vídeos em paralelo ("escalável"; MVP: pelo menos 2);
  - `REQ-VID-STATUS-003` — progresso a cada 2 s ou menos (MVP: 5 s);
  - `REQ-VID-FAIL-004` — recuperação automática após falha interna;
  - `REQ-VID-EDIT-012` — taxa de sucesso ≥ 99,5 % (MVP: 95 %);
  - `REQ-VID-SUBMIT-008` — confirmar o upload em menos de 1 s (MVP: 3 s);
  - `REQ-VID-ACCESS-002` — endereços com rotação e registo de acessos;
  - `REQ-VID-EDIT-013` — acrescentar um efeito de vídeo sem alterar os existentes.
- **Manutenção corretiva pendente** (Cap. 11 deles): T-01 (`auto_ack` nas ferramentas de imagem), T-02 (certificados internos), T-03 (segredos no repositório), T-04 (observabilidade desligada), T-07 (erros das ferramentas de imagem), T-11 (códigos 501/601), T-12 (ficheiros não apagados com o projeto), T-13 (recorte).
- **Prioridade que eles indicaram para a Fase 2:** fiabilidade (confirmação manual e retoma automática) e segurança (certificados e segredos).
- **Limitação que eles reconhecem:** o processamento fotograma a fotograma em Python é "o principal candidato a otimização na Fase 2".

---

## 4. Questões em Aberto (para a equipa decidir)

> **Q1–Q5 decididas pela equipa a 4/11/2026 — ver secção 6.** A tabela fica como registo das alternativas consideradas.

| ID | Questão | Opções | Sugestão do agente |
|---|---|---|---|
| Q1 | Que dois requisitos não funcionais escolhemos? | Ver secção 4.1 | Par A (elasticidade + modularidade do vídeo) |
| Q2 | Onde fica o código da Fase 2, e de que commit partimos? | Local: (a) fork do repositório oficial, como na Fase 1; (b) ramo num repositório do grupo; (c) outro. Commit: `b638a13` (o que temos) ou `0523102` (o atual, só com mais documentação) | (a), a partir de `0523102`: o código é o mesmo e fica com o aviso dos volumes no `README.md` |
| Q3 | Em que máquina e com que recursos se fazem as medições? | Uma máquina fixa, com os recursos do Docker registados (CPU, RAM) e iguais na medição inicial e na final | Fixar já a máquina e a configuração do Docker Desktop |
| Q4 | Onde fica a documentação? | `Documentacao/` dentro do repositório (como na Fase 1) ou só em `fase2/` | `Documentacao/` no repositório, quando existir o fork |
| Q5 | Como lançamos a Fase 2 sem estragar a Fase 1 no Docker? As duas usam o mesmo nome de projeto Compose (`name: picturas`), logo os mesmos volumes; o armazenamento mudou (um bucket partilhado `users/<id>/…` em vez de um por utilizador) e os dados antigos não são migrados | (a) `docker compose down -v --remove-orphans` na pasta da Fase 1, como manda o `README.md` (apaga contas, projetos e ficheiros da Fase 1); (b) lançar a Fase 2 com outro nome de projeto, `docker compose -p picturas-fase2 up -d --build`, sem mexer no código (não há `container_name` no compose, por isso os volumes ficam separados; as portas são as mesmas, por isso só corre uma de cada vez) | (b) enquanto houver defesas ou demonstrações da Fase 1; senão (a). Em ambos os casos, usar sempre o mesmo comando nas medições inicial e final |
| Q6 | ~~Que subcaracterística da ISO/IEC 25010:2011 indicamos no relatório para a elasticidade? A equipa adota o requisito tal como está nas diretrizes ("Eficiência de desempenho — elasticidade": ajustar dinamicamente os recursos de cada serviço à carga), mas a norma de 2011 não tem "elasticidade" como subcaracterística (tem comportamento temporal, utilização de recursos e capacidade)~~ **Decidida (D17).** | (a) usar o rótulo das diretrizes; (b) "Eficiência de desempenho → Capacidade", com a elasticidade como o mecanismo; (c) confirmar com os docentes | (c) e, até lá, (b). Não muda o que se mede. **Nota de 5/11/2026:** a matriz do Exercício 6 usa «Eficiência de desempenho — capacidade / elasticidade», o que indica que os docentes aceitam esta designação |
| Q7 | ~~Que mudanças de referência usamos em M1 (impacto de uma mudança)?~~ **Decidida (D18).** | Propostas em `Documentacao/medicoes/PLANO_MEDICAO.md`, secção 5: C1 alterar a configuração da legendagem (modelo Whisper); C2 corrigir a lógica da legendagem (`subtitles.py`); C3 acrescentar um efeito de vídeo novo (REQ-VID-EDIT-013), medido num ramo de sonda descartável que nunca é integrado | C1, C2 e C3 |
| Q9 | ~~Usamos a vista da arquitetura dos docentes (`arquitetura_global.puml`) na secção 1.2 do Exercício 6?~~ **Decidida (D19).** | (a) tal como está, citando a fonte; (b) adaptá-la (ex.: marcar as fragilidades F1–F4 e as filas do vídeo) e citar a fonte; (c) fazer a nossa de raiz | (b): já está correta e destaca o caminho do vídeo; acrescentar o que é nosso e dizer o que foi adaptado |
| Q10 | Onde e quando preenchemos o template do Bloco 1? | (a) agora, numa cópia em `Documentacao/exercicio6/` (sem mexer em `fase2/enunciados/`), com o agente a propor o conteúdo a partir da análise já feita e a equipa a rever; (b) depois da medição inicial, para já ter medições como evidência; (c) cada elemento uma secção | (a) para as secções 0–2 e (b) para fechar a matriz (secção 3.3) com medições |
| Q12 | ~~Acrescentamos testes de regressão para o que os testes da base não cobrem (caminho das imagens, ponta a ponta)?~~ **Decidida (D32).** | (a) não: usar os testes da base (82) e os cenários de medição como verificação do vídeo; (b) acrescentar um teste de ponta a ponta simples (uma imagem e um vídeo pela API, com o cliente dos scripts de medição), corrido antes e depois do *refactoring*; (c) testes unitários novos para o `projects` | (b): o *refactoring* mexe no encadeamento do `projects`, que também serve as imagens; um teste de ponta a ponta reutiliza o cliente que já existe |
| QI-9 | ~~Quando se termina a legendagem no M3, depois do *refactoring*? O cenário termina o serviço da legendagem 5 s depois de o vídeo de 177 s chegar aos 20 % do progresso. Uma legendagem tem duas etapas (normalização no `video_effects`, 0–50 %, e legendagem no `video_subtitles`, 50–100 %), tanto na base (dentro do `video_tool`) como agora. Aos 20 % o trabalho ainda está no `video_effects`, por isso o `video_subtitles` seria terminado parado e a legendagem em curso não seria interrompida~~ **Decidida (D33).** | (a) manter os 20 % (mesmo instrumento; na versão final o serviço morto não tem trabalho); (b) terminar quando o vídeo passa dos 55 % (já na etapa de legendagem) só na medição final; (c) terminar aos 55 % nas duas fases, repetindo o M3 da base (≈ 30 min no Mac, com o código da base) | (c): o cenário passa a testar o que diz (a legendagem a meio) nas duas fases, com o mesmo instrumento |
| Q8 | ~~Mudamos este documento para `Documentacao/` (D4)?~~ **Decidida (D14).** | (a) mover para `fase2/picturas-27/Documentacao/` e deixar de o manter em `fase2/`; (b) manter em `fase2/` até à entrega | (a), para ficar versionado com o código e as medições |

### 4.1 Pares de requisitos possíveis (Q1)

| Par | Requisitos | Porque é pertinente | Complexidade e medição | Riscos |
|---|---|---|---|---|
| **A** | Eficiência de desempenho (**capacidade/elasticidade**) do processamento de vídeo + Manutenibilidade (**modularidade**) | O vídeo é a funcionalidade nova; uma legendagem bloqueia todos os outros vídeos de todos os utilizadores (F1). A modularidade pode ser condição da elasticidade: só se escala a legendagem à parte se for um serviço à parte | Alta. Mede-se bem: tempo de espera e de conclusão de um vídeo curto enquanto corre uma legendagem, vídeos concluídos por minuto, e métricas de acoplamento por serviço | Mexe no worker de vídeo e no orquestrador; medições demoradas (legendas em CPU) |
| **B** | Segurança (**confidencialidade/autenticidade**) + Fiabilidade (**tolerância a falhas/recuperabilidade**) | É a prioridade indicada pelo PL1-G4; F4 e F7 confirmados | Média. Mede-se com contagens (portas expostas, segredos no repositório, ligações internas sem validação) e injeção de falhas (matar um serviço a meio e contar trabalhos perdidos) | Mudanças espalhadas por muitos serviços; risco de partir a comunicação interna |
| **C** | Eficiência (**utilização de recursos**) no carregamento + Usabilidade (**operabilidade**) no trabalho em segundo plano | Afeta diretamente quem carrega vídeos grandes e quem espera pelo processamento (F3, F5) | Média. Mede-se o pico de memória por upload de 1 GB e o tempo até ao primeiro progresso; a usabilidade é mais difícil de quantificar (tarefas, testes com utilizadores) | Exige mudanças no frontend; a usabilidade é mais subjetiva de avaliar |

**Porque sugerimos o par A:** é o que tem a ligação mais clara aos stakeholders da funcionalidade nova, o refactoring mais exigente (que as diretrizes valorizam) e uma medição antes/depois objetiva e repetível. As duas primeiras ideias das diretrizes apontam no mesmo sentido. É apenas uma sugestão: a decisão é da equipa.

---

## 4A. Medição Inicial — Registo de Execução

- **Início:** 11/11/2026, 14:23 (lançador `Documentacao/medicoes/medicao_inicial.command`, lógica em `lancar_medicao.sh`; tudo o que aparece no Terminal fica em `Documentacao/medicoes/baseline/terminal.log`). Limpeza dos dados (D12), `docker compose up -d --build` (14:23–14:31), API pronta às 14:31, medição a partir das 14:32 (`correr.sh baseline`).
- **Máquina:** `Mac14,7` (MacBook Pro 13", 2022), Apple M2, 8 núcleos, 8 GiB. **Docker:** 29.8.0, 8 CPU, 6,21 GB atribuídos. **Python:** 3.13.7. **Commit:** `0523102`, sem alterações ao código (só `Documentacao/` por versionar).
- **Primeiros tempos (aquecimento):** legendagem do vídeo de 177 s em 126,3 s; brilho no vídeo de 10 s em 4,4 s. Verificação cruzada com o log do `video_tool`: 125,4 s e 4,1 s (a diferença é gravar o resultado e avisar o utilizador).
- **Incidente sem efeito nos tempos:** a cópia do `cenarios.py` no Mac não tinha a tabela de durações dos vídeos, e o `ffprobe` não existe no Mac, por isso a coluna `duracao_video_s` dos CSV da medição inicial fica vazia. Corrigido sem mexer na execução: o `analisar.py` usa as durações medidas com `ffprobe` (10; 176,62; 30; 150 s) quando a coluna vem vazia, e o `cenarios.py` certo fica para a medição final.

- **Incidente 2 (sem efeito nos tempos):** o monitor de recursos não obtém a profundidade das filas do RabbitMQ (nem pela API de gestão, nem pelo recurso ao `rabbitmqctl`) e cada amostra demora cerca de 7 s em vez de 2 s. Não se altera o monitor, para o instrumento ser igual na medição final. As métricas de fila e de paralelismo passam a ser calculadas a partir dos instantes de cada trabalho (`analisar.py`, função `concorrencia`: vídeos à espera e em processamento simultâneo), o que é exato e independente da implementação. Registado em `PLANO_MEDICAO.md`, secção 8.
- **Primeiro resultado do S1 (rep. 1):** o vídeo de 10 s demora 4,4 s sozinho e 161,6 s quando é pedido durante uma legendagem (157,1 s à espera). Confirma H-01.
- **Fim:** 11/11/2026, 15:56:19, código de saída 0 (`CONCLUÍDO`), duração total 1 h 24 min (14:32–15:56).
- **Verificação (21:50):** 175 trabalhos, 0 erros, 0 sem tempo; o número de vídeos concluídos no log do `video_tool` é igual ao dos CSV em todos os cenários (a linha a mais em `logs_s4.txt` é do aquecimento, apanhada pela margem de 5 s); o tempo de processamento dos scripts difere do registado pelo worker em −0,4 a −0,03 s por trabalho (em M3 a diferença é maior porque o worker só regista a tentativa bem-sucedida).
- **Resultados principais (mediana de 5 repetições, `baseline/resumo.md`):**
  - **S1:** vídeo de 10 s em 3,9 s sozinho e 144,7 s durante uma legendagem (141,0 s à espera); legendagem do vídeo de 177 s em 141,8 s.
  - **S2:** débito de 15,9 / 16,7 / 17,6 / 16,8 vídeos/min com 1 / 2 / 4 / 8 utilizadores; tempo máximo de conclusão 3,8 / 7,2 / 13,7 / 28,5 s; nunca mais de 1 vídeo em processamento.
  - **S3:** 1 réplica do `video_tool` sempre; até 9 vídeos à espera; CPU média do `video_tool` na rajada 319 % de 800 %; rajada em 158,8 s.
  - **S4:** tempo / duração 0,39× (10 s), 0,38× (30 s), 0,90× (150 s, 1080p).
  - **M3:** o `video_tool` foi terminado ≈ 33 s depois de pedida a legendagem; a mesma mensagem foi reentregue e a legendagem refeita (5/5 concluídas); 100 % dos vídeos curtos atrasados (132,8 s contra 13,7 s em S2 com N = 4), nenhum perdido. **Repetido a 12/11/2026 com a falha aos 55 % (D33):** o mesmo resultado, 100 % dos vídeos curtos atrasados (mediana 131,5 s), nenhum perdido, 5/5 legendagens concluídas; é este o valor de referência da base (`baseline/m3/`; o de 20 % fica em `baseline/m3_20pct/`).
  - **M1 (medido a 12/11/2026, `baseline/m1/`):** C1 (modelo Whisper) e C2 (`subtitles.py`) obrigam a reiniciar o `video_tool` e interrompem as 6 responsabilidades de vídeo; C3 (efeito sépia, sonda num ramo descartável, `baseline/m1/C3_sonda.patch`) toca 6 ficheiros em 3 componentes (`Tools/video`, `projects`, `frontend`), reconstrói 3 unidades e também interrompe as 6.
  - **M2:** 1 unidade implantável com as 6 responsabilidades de vídeo; 722 SLOC de Python de vídeo, CC máx. 22, 6 funções com CC > 10; 8 efeitos duplicados.
  - Hipóteses H-01 a H-04 do Exercício 6 confirmadas.
- **Ficheiros das medições não apagados com o projeto (T-12):** apesar de os scripts apagarem a conta e o projeto de cada trabalho, os vídeos ficam no volume `picturas_image_data` (≈ 2,2 GB no fim da medição inicial). Não afeta os tempos; a limpeza de D12 repõe o estado antes da medição final.
- **Prints:** `baseline/prints/` (resumo no Terminal em duas partes; Docker Desktop com contentores e recursos).
- **Testes de regressão na base (12/11/2026, `Documentacao/testes_regressao/baseline/`):** os testes que já vêm com a solução passam todos: **`Tools/video/tests` 74/74** (pytest; processamento de vídeo, legendagem com o reconhecimento de fala simulado, extração de fotogramas) e **`projects/tests` 8/8** (`node --test`; encadeamento do pipeline de vídeo, extração de fotogramas, despacho do lote). Corridos na máquina de medição (D3), dentro das imagens Docker do `video_tool` e do `projects`, como indica o `README.md`, no commit `c52ed20` (o `0523102` mais a pasta `Documentacao/`; 0 alterações ao código da aplicação). Lançador reutilizável: `Documentacao/testes_regressao/testes_inicial.command` e `testes_final.command` (lógica em `correr_testes.sh`), que constroem as imagens a partir do código atual antes de testar. É a referência da preservação funcional para depois do *refactoring*. **Limite de cobertura:** não há testes automáticos do caminho das imagens nem testes de ponta a ponta; os 175 trabalhos de vídeo concluídos sem erro na medição inicial servem também de verificação funcional do vídeo. Ver Q12.
- **Teste de ponta a ponta na base (D32, 12/11/2026, `Documentacao/testes_regressao/baseline/ponta_a_ponta.txt`): 15/15 verificações OK.** Três casos pela API pública, com a solução lançada na máquina de medição: (A) projeto só com uma imagem, brilho → rotação 90°: pré-visualização e resultado PNG rodado; (B) projeto misto, imagem + vídeo de 10 s, brilho → corte 1–6 s → legendas: pré-visualização do vídeo com 3 s, imagem só com o brilho, vídeo em MP4 com 5 s; (C) vídeo, brilho → extração de 3 fotogramas: 3 PNG 1280×720 com nomes únicos. Lançador: `Documentacao/testes_regressao/ponta_a_ponta_inicial.command` e `ponta_a_ponta_final.command` (lógica em `ponta_a_ponta.sh`; limpa os dados como as medições, lança a solução, corre o teste e para os contentores). Cobre o caminho das imagens, que os testes da base não cobrem.
- **Guia `Documentacao/COMO_TESTAR.md` (12/11/2026):** explica cada medição (S1–S4, M1–M3) e cada teste de funcionamento (regressão e ponta a ponta) — o que verifica, o fluxo, os valores da base e os alvos —, com os comandos para os correr (duplo clique no Mac ou Terminal) e a ordem para a fase final. O `medicao_final.command` já indica ao M3 e à recolha de logs os serviços de vídeo novos do desenho (`video_subtitles`; `video_effects`, `video_subtitles`, `video_frames`).
- **Fluxo das medições para a defesa:** `Documentacao/medicoes/FLUXO_DAS_MEDICOES.md` descreve, passo a passo, o que o lançador e os scripts fazem (sem explicar o código). A pedido do utilizador, este fluxo tem de entrar no PowerPoint da defesa da Fase 2.
- **Exercício 6, Bloco 1 — atualizado para v0.2** com os resultados (EV-22 revista, EV-26 a EV-30, hipóteses H-09 a H-13 sobre as alternativas, matriz 3.3 e secção 3.4 escritas).
- **Exercício 6, Bloco 1 — rascunho v0.1 (11/11/2026, durante a medição):** `fase2/picturas-27/Documentacao/exercicio6/RAS-exercicio_6_bloco1_PL5-G7.md`, com o diagrama de sequência `sequencia_processamento_video.mmd`/`.svg` (Mermaid). Secções 0–3.2 preenchidas com 25 evidências (`EV-01`–`EV-25`, ficheiro e linha) e 8 hipóteses (`H-01`–`H-08`); alternativas ALT-1 (microsserviços por responsabilidade de vídeo), ALT-2 (Competing Consumers com filas por tipo e réplicas ajustadas à carga) e ALT-3 (tarefas efémeras com orquestrador de workflow). Matriz (3.3) provisória e secção 3.4 por escrever até haver resultados. A vista da arquitetura (1.2) usa, por agora, a dos docentes com citação (Q9 em aberto). **Para revisão da equipa.**

## 4B. Quantificação dos Requisitos (aprovada a 12/11/2026, D22; escala do M1 e do M2 corrigida em D24)

Método e cenários em `medicoes/PLANO_MEDICAO.md`; valores de base em `medicoes/baseline/resumo.md` (medianas de 5 repetições).

| Requisito | Métrica (escala) | Base | Alvo | Mínimo aceitável | Origem do valor |
|---|---|---|---|---|---|
| Elasticidade | S1 — espera de um vídeo de 10 s pedido durante uma legendagem (s) | 141,0 | ≤ 10 | ≤ 30 | Vídeo de 10 s sozinho: 3,9 s (S1, controlo) |
| Elasticidade | S2 — máximo de vídeos em processamento simultâneo | 1 | ≥ 3 | ≥ 2 | REQ-VID-EDIT-011 (MVP ≥ 2) |
| Elasticidade | S2 — débito com 8 utilizadores (vídeos/min) | 16,8 | ≥ 25 (1,5×) | ≥ 20 (1,2×) | Na base só se usam 40 % dos 8 CPU (S3) |
| Elasticidade | S3 — réplicas dos serviços de vídeo sob carga | sempre 1 | sobem até ≥ 3 e voltam ao mínimo em ≤ 120 s após a carga | sobem até ≥ 2 e voltam ao mínimo | Definição de elasticidade das diretrizes |
| Elasticidade | S3 — duração da rajada (s) | 158,8 | ≤ 95 (0,6×) | ≤ 127 (0,8×) | Medição inicial |
| Elasticidade (efeito colateral) | S4 — tempo de conclusão / duração de um vídeo sozinho | 0,39× / 0,38× / 0,90× | não piorar mais de 10 % | ≤ 1,0× | REQ-VID-EDIT-010 |
| Modularidade | M2 — máximo de funcionalidades de vídeo numa unidade implantável (D24) | 3 | 1 | ≤ 2 | Medição inicial |
| Modularidade | M1 — funcionalidades de vídeo interrompidas por uma mudança na legendagem (C1, C2) (D24) | 3 (¹) | 1 | ≤ 2 | REQ-VID-EDIT-013 |
| Modularidade | M1 — C3, efeito novo: ficheiros e unidades tocados, e funcionalidades interrompidas | 6 ficheiros, 3 unidades, 3 interrompidas | sem alvo definido (descritivo) | — | REQ-VID-EDIT-013 |
| Modularidade | M3 — vídeos curtos afetados por uma falha na legendagem (%) | 100 | 0 | ≤ 25 | REQ-VID-FAIL-004 |
| Ambos | M3 — trabalhos perdidos após falha | 0 | 0 | 0 | REQ-VID-FAIL-004 (manter) |

(¹) Quando a tabela foi aprovada, o valor de base do M1 ainda não tinha sido medido: foi estimado a partir do M2 (o `video_tool` é uma única unidade com as 6 responsabilidades de vídeo). A medição do M1, feita no mesmo dia (`baseline/m1/`), confirmou o valor. O M1 é uma métrica de análise estática: o resultado decorre da estrutura do sistema e dos ficheiros que cada mudança toca.

## 4C. *Refactoring* — Implementação (12/11/2026, por aprovar)

Segue o `DESENHO_SOLUCAO.md` e as decisões D24–D32.

**O que mudou no código**

| Área | Alteração |
|---|---|
| `Tools/video/` | Removida. O código passou para três serviços, cada um com a sua fila, `Dockerfile` e testes: `Tools/video_effects/` (efeitos de fotograma, `trim`, `speed`; `effects.py` e `video_processor.py`), `Tools/video_subtitles/` (`subtitles.py`) e `Tools/video_frames/` (`frame_extraction.py`) |
| `Tools/video_common/` | Novo (D25): *worker* RabbitMQ comum (`worker.py`: consome a fila, `prefetch 1`, confirmação no fim, respostas e progresso no formato de antes, códigos de erro 2000–2005, paragem graciosa com `SIGTERM`), `ffprobe` e erros (`media.py`), *fixtures* dos testes |
| `projects` | `utils/video.js`: `videoStages` divide o pipeline de cada vídeo em etapas (as mesmas regras que o `video_tool` usava por dentro). `routes/projects.js`: o *Apply* e a pré-visualização enviam a etapa 0; o `process_msg` envia a etapa seguinte quando uma etapa intermédia responde (sem gravar resultado nem avisar o utilizador) e só a última segue o caminho de antes. `models/process.js`: campo `video_job` (etapas, pasta de trabalho, saída final). A pasta dos ficheiros intermédios é apagada no fim, em erro e no cancelamento |
| `autoscaler/` | Novo (D26–D28): lê a API de gestão do RabbitMQ a cada 2 s, 1 réplica por mensagem (à espera + em processamento), desce após 30 s, remove primeiro réplicas paradas, clona o contentor do Compose pela API do Docker e pára réplicas com `SIGTERM` (até 900 s para acabarem o trabalho em curso) |
| Configuração | `docker-compose.yaml`: `video_tool` substituído por `video_effects`, `video_subtitles`, `video_frames` e `autoscaler` (limites de réplicas e de memória por variáveis de ambiente, D31). `rabbitMQ/definitions.json`: três filas novas, `video_queue` removida. `rabbitmq.conf`: estatísticas das filas a cada 1 s (eram 5 s) para o *autoscaler* reagir mais depressa |
| Documentação | `README.md` e `AGENTS.md` atualizados (arquitetura, variáveis, testes, resolução de problemas) |

**Testes (na *cloud*, fora do Docker):** os 74 testes Python da base passam nas pastas novas (29 + 3 + 20 + 22, ver `COMO_TESTAR.md` 4.1) e os 8 do `projects` também. Testes novos: 11 do *worker* comum, 9 + 2 da divisão em etapas (Python e `projects`, com os mesmos casos) e 7 do *autoscaler*. O *autoscaler* foi ainda experimentado contra um Docker real (subir de 1 para 3 réplicas com os *labels*, volumes, rede e limite de memória do original; descer para 1 após o período de espera). Falta correr tudo no Mac (`testes_final.command`, `ponta_a_ponta_final.command`).

**Pré-visualização dos resultados estáticos** (calculados sobre o código novo; a repetir no Mac depois do *commit*): **M2 = 1** funcionalidade por serviço (base 3); **M1 C1 = C2 = 1** funcionalidade interrompida (base 3); C3 continua a tocar 6 ficheiros em 3 componentes, mas interrompe 1 funcionalidade (base 3).

**Pontos a confirmar pela equipa**

- **Limite de memória da legendagem (aprovado, D34):** 3 GB por réplica, e não os 1,5 GB do exemplo do QI-8: na medição inicial a legendagem do vídeo de 177 s chegou a 2,3 GB no `video_tool`. Efeitos 1 GB e extração 512 MB, como no exemplo. Com 2 réplicas de legendagem a trabalhar ao mesmo tempo a memória do Docker (6 GB) pode não chegar; nenhum cenário de medição tem duas legendagens em simultâneo.
- **Instrumento de medição:** o `modularidade.py` lia os efeitos duplicados de `Tools/video/effects.py`; passa a ler de `Tools/video_effects/effects.py` quando o primeiro não existe (só muda o caminho). O marcador "consumir trabalhos de vídeo" do M2 procura `basic_consume(` com "video" na mesma linha; no *worker* comum o atributo da fila chama-se `video_queue`, por isso continua a ser detetado (é infraestrutura comum e não conta para as funcionalidades, D24).
- **Verificação cruzada dos logs:** cada etapa escreve a sua linha `[video] msg=… ok …`; um vídeo com legendas tem duas (normalização + legendagem).
- **M3 (D33):** o serviço da legendagem passa a ser terminado aos 55 % do progresso, nas duas fases (`cenarios.py --m3-progresso`, 55 por omissão). O M3 da base foi repetido aos 55 % a 12/11/2026 (secção 4A): 100 % afetados, como aos 20 %.

## 5. Próximos Passos Propostos

1. ~~Equipa decide Q1–Q5.~~ Feito a 4/11/2026 (secção 6).
2. ~~Criar o fork a partir de `0523102` (D2) e atualizar a cópia local.~~ Feito a 4/11/2026. `Documentacao/` criada com este documento a 11/11/2026 (D14).
3. ~~Registar os recursos do Docker Desktop (D3).~~ Feito (8 CPU, 6 GB, 1 GB de swap). O modelo e o processador são registados automaticamente pelo `ambiente.py` na medição inicial.
3a. ~~Plano de medição e scripts.~~ Criados a 4/11/2026 em `fase2/picturas-27/Documentacao/medicoes/`: `PLANO_MEDICAO.md` (método de S1–S4 e M1–M3), `correr.sh` (corre tudo), `scripts/` (cliente da API e WebSocket, cenários, amostragem de recursos, métricas de modularidade, resumo) e `videos/` (os vídeos de 30 s e 150 s de S4, copiados de `videos_teste_picturas/` para a medição ser reprodutível). Testados de ponta a ponta contra uma réplica falsa da API; falta o teste contra a solução real, que é o primeiro passo da medição inicial.
4. ~~Medição inicial completa (S1–S4, M2, M3).~~ Feita a 11/11/2026 (secção 4A).
5. ~~Quantificação dos requisitos.~~ Aprovada a 12/11/2026 (secção 4B, D22).
6. ~~M1 na base (C1, C2, C3).~~ Feito a 12/11/2026 (`baseline/m1/`).
7. ~~**Testes de regressão na base.**~~ Feito a 12/11/2026 (secção 4A).
8. ~~**Desenho da solução.**~~ `Documentacao/DESENHO_SOLUCAO.md`, aprovado a 12/11/2026 com as decisões D24–D32.
8a. ~~**Teste de ponta a ponta na base** (D32).~~ Feito a 12/11/2026: 15/15 OK.
9. ***Refactoring*** implementado a 12/11/2026 (secção 4C), **à espera da aprovação da equipa**; depois, testes de regressão e de ponta a ponta no Mac.
10. **Medição final** (`medicoes/medicao_final.command`) e M1 sobre o código refatorado; comparação com a base e com os alvos.
11. **Relatório e defesa:** Exercício 6 (adaptar a vista dos docentes, D19; Bloco 2 quando sair); descrever no relatório e no PowerPoint o que é e o que faz cada medição (S1–S4, M1–M3) e o fluxo das medições (`medicoes/FLUXO_DAS_MEDICOES.md`).

---

## 6. Registo de Decisões

*(Cada decisão da equipa entra aqui com data, alternativas consideradas e justificação.)*

| ID | Data | Questão | Decisão | Alternativas consideradas | Justificação |
|---|---|---|---|---|---|
| D1 | 4/11/2026 | Q1 — Requisitos não funcionais | **Par A:** Eficiência de desempenho (capacidade/elasticidade) do processamento de vídeo + Manutenibilidade (modularidade) do processamento de vídeo | Par B (segurança + fiabilidade); par C (eficiência no carregamento + usabilidade do trabalho em segundo plano) | Fragilidade com maior impacto nos stakeholders da funcionalidade nova (uma legendagem bloqueia todos os vídeos, F1); refactoring mais exigente; medição antes/depois objetiva e repetível; a modularidade pode ser condição da elasticidade (cada requisito é especificado e avaliado por si) |
| D2 | 4/11/2026 | Q2 — Código e commit de partida | **Fork novo do repositório oficial, a partir de `0523102`** | Fork a partir de `b638a13`; ramo no fork da Fase 1 (`quimsimao2k5/picturas-27`) | Mesmo modelo da Fase 1; `0523102` tem o mesmo código que `b638a13` e inclui o aviso sobre os volumes Docker. É este o commit a identificar no relatório. **Fork criado:** `https://github.com/quimsimao2k5/picturas-27`, com `main` em `0523102` (verificado a 4/11/2026, 15:26; existe também o ramo `mudancas-kiko`, em `c9bfb5c`) |
| D3 | 4/11/2026 | Q3 — Máquina de medição | **O computador ligado à sessão do agente** (o mesmo nas medições inicial e final, com os mesmos recursos do Docker Desktop) | Outro computador do grupo | Medições comparáveis e reprodutíveis. **Recursos do Docker Desktop registados a 4/11/2026:** CPU 8, memória **6 GB** (subida pela equipa a 4/11/2026 a partir de 4 GB, para evitar que as ferramentas de IA e o Whisper sejam terminados por falta de memória durante as medições), swap 1 GB. O máximo de memória que o Docker oferece é 8 GB. Estes valores mantêm-se iguais nas medições inicial e final. Falta registar o modelo do computador e do processador |
| D4 | 4/11/2026 | Q4 — Documentação | **`Documentacao/` dentro do fork** | Só na pasta `fase2/` | Como na Fase 1: versionada junto do código. Este documento está em `fase2/picturas-27/Documentacao/` desde 11/11/2026 (D14) |
| D5 | 4/11/2026 | Q5 — Volumes Docker da Fase 1 | **Volumes da Fase 1 já apagados pela equipa**; a Fase 2 é lançada com o nome de projeto por omissão (`picturas`) | Lançar com `-p picturas-fase2`; apagar com `docker compose down -v --remove-orphans` | Já não há dados da Fase 1 a preservar. Usar sempre o mesmo comando de arranque nas medições inicial e final |
| D6 | 4/11/2026 | Requisito 1 do par A | **Eficiência de desempenho — elasticidade, tal como nas diretrizes:** ajustar dinamicamente os recursos de cada serviço à carga que lhe é destinada. Classificação ISO 2011 em aberto (Q6) | — | Escolha da equipa, a partir da ideia indicativa das diretrizes |
| D7 | 4/11/2026 | Cenários de medição da elasticidade (iguais na medição inicial e na final) | **S1** bloqueio pela legendagem (legendar o vídeo de 177 s e, logo a seguir, brilho num vídeo de 10 s: tempo de espera e de conclusão do vídeo curto); **S2** carga concorrente (1, 2, 4 e 8 utilizadores com vídeos curtos em simultâneo: vídeos/min e tempo médio de conclusão); **S3** adaptação à carga (rajada e depois calma: réplicas, CPU e memória ao longo do tempo, com `docker stats`); **S4** tempo de edição / duração de um vídeo sozinho (REQ-VID-EDIT-010, para ver se a modularização piora o desempenho) | — | Cobrem o diagnóstico das diretrizes (serialização, bloqueio pela legendagem, recursos fixos) e o efeito colateral no desempenho |
| D8 | 4/11/2026 | Métricas de modularidade | **M1** impacto de uma mudança (ficheiros, serviços e imagens Docker afetados ao acrescentar um efeito de vídeo ou mudar o modelo Whisper; origem: REQ-VID-EDIT-013); **M2** acoplamento estático (dependências entre módulos, tamanho e complexidade do `video_tool` e do `projects.js`, com radon e madge); **M3** isolamento de falhas (o que acontece aos outros trabalhos de vídeo se a legendagem falhar ou for terminada a meio) | M4 custo de build/deploy (não escolhida) | Medem a modularidade do processamento de vídeo de forma objetiva e repetível |
| D9 | 4/11/2026 | Repetições | **5 repetições por cenário** (mediana e dispersão) | 3; 10 | Equilíbrio entre robustez e tempo (a legendagem em CPU demora minutos) |
| D10 | 4/11/2026 | Quem faz a medição inicial | **O agente**, no computador de medição (D3), com acesso dado pela equipa; resultados, prints e scripts em `Documentacao/medicoes/` | — | Os scripts ficam versionados para repetir o mesmo método na medição final |
| D11 | 5/11/2026 | Como se verifica que as medições são reais | **Logs dos serviços guardados automaticamente em cada cenário** (`logs_<cenário>.txt`, com hora, do `video_tool` e do `projects`; serviços configuráveis com `--servicos-log`), como fonte independente dos scripts para confirmar os tempos. Também: os valores vêm só dos scripts, `ambiente.json` com commit e `git status`, execução visível no ecrã e repetível por qualquer elemento | Lista de hashes SHA-256 dos resultados (rejeitada: desnecessária) | Evidência reprodutível e verificável pela equipa, como pedem as diretrizes |
| D12 | 11/11/2026 | Estado dos dados antes de cada medição | **Limpar os dados da instância e manter só o modelo Whisper:** `docker compose down --remove-orphans` e apagar os volumes `picturas_{image,project,rabbitmq,seaweedfs,subscription,user}_data`, mantendo `picturas_whisper_models`. Igual na medição final | Manter tudo; limpar tudo incluindo o Whisper | Estado inicial limpo e igual nas duas medições, sem descarregar o modelo outra vez |
| D13 | 11/11/2026 | Repetições e cenários | **Correr a medição completa, sem cortes** (5 repetições, S1–S4, M2, M3) | 3 repetições nos cenários com legendagem; sem o vídeo de 150 s | Decisão da equipa |
| D14 | 11/11/2026 | Q8 — Onde ficam este documento e o lançador da medição | **Tudo o que é preciso está no repositório:** este documento em `Documentacao/`; o lançador em `Documentacao/medicoes/` (`lancar_medicao.sh`, com `medicao_inicial.command` e `medicao_final.command` para duplo clique no Mac); o registo do Terminal da medição inicial em `Documentacao/medicoes/baseline/terminal.log`. Fora do repositório, em `fase2/`, ficam só os materiais da disciplina (diretrizes, documento de requisitos, `enunciados/`) | Manter em `fase2/` até à entrega | Versionado com o código e as medições; a medição final repete-se só com o repositório |
| D15 | 12/11/2026 | Alternativa de refactoring | **ALT-1 + ALT-2**: separar o processamento de vídeo em serviços (modularidade) e ajustar as réplicas à carga, com fila própria para a legendagem (elasticidade) | Só ALT-2; só ALT-1; ALT-3 (tarefas efémeras com orquestrador de workflow) | Respondem às duas fragilidades confirmadas, mantêm o padrão global e completam-se: separar a legendagem é condição para a escalar à parte. ALT-3 exige tecnologia nova e tem custo e risco de migração altos |
| D16 | 12/11/2026 | Divisão do `video_tool` | **3 serviços: efeitos** (descodificar, efeitos de fotograma e de tempo, codificar), **legendagem** e **extração de fotogramas**, cada um com a sua fila | 2 serviços (efeitos + extração, legendagem); 1 serviço por efeito | Os efeitos mantêm uma só descodificação e codificação; cada responsabilidade pesada fica isolada |
| D17 | 12/11/2026 | Q6 — Classificação ISO da elasticidade | **«Eficiência de desempenho — capacidade / elasticidade»**, como na matriz do Exercício 6 e nas diretrizes | Só «capacidade»; perguntar aos docentes | Rótulo usado pelos próprios docentes |
| D18 | 12/11/2026 | Q7 — Mudanças de referência para M1 | **C1** trocar o modelo Whisper (configuração); **C2** corrigir o `subtitles.py` (código da legendagem); **C3** acrescentar um efeito de vídeo novo, num ramo de sonda descartável que nunca é integrado | Só C1 + C2; só C3 | Cobre configuração, código e extensão (REQ-VID-EDIT-013) |
| D19 | 12/11/2026 | Q9 — Vista da arquitetura no Exercício 6 | **Adaptar a vista dos docentes** (`arquitetura_global.puml`), acrescentando as fragilidades medidas e citando a fonte | Usar tal como está; fazer uma de raiz | Já está correta e destaca o caminho do vídeo |
| D20 | 12/11/2026 | Encadeamento das etapas de vídeo | **O `projects` encadeia as etapas** (efeitos → legendagem → extração), enviando a seguinte quando recebe a resposta da anterior, como já faz nas imagens | Coreografia entre serviços; o serviço de efeitos chama os outros | Segue o padrão global; a ordem do pipeline fica num só sítio |
| D21 | 12/11/2026 | Mecanismo de elasticidade | **Serviço *autoscaler*** que lê o tamanho das filas de vídeo no RabbitMQ e aumenta ou reduz as réplicas de cada serviço de vídeo | Réplicas fixas; paralelismo dentro do worker | É ajuste dinâmico dos recursos à carga (definição das diretrizes). **Efeito colateral a registar no relatório:** precisa de acesso à API do Docker (`docker.sock`), o que piora a segurança |
| D22 | 12/11/2026 | Quantificação dos requisitos | **Valores-alvo e mínimos aceitáveis da secção 4B aprovados** | Alvos mais ambiciosos; mais conservadores | Ambiciosos mas realistas para 8 CPU / 6 GB; mínimos ligados aos requisitos do PL1-G4 |
| D23 | 12/11/2026 | Vídeos de teste no repositório | **Manter** os vídeos de 30 s e 150 s (48 MB) em `Documentacao/medicoes/videos/` | Excluir e indicar a origem | A medição é reproduzível só com o repositório |
| D24 | 12/11/2026 | QI-0 — Escala do M1 e do M2 | **Contar funcionalidades de vídeo** (edição = efeitos de fotograma e de tempo; legendagem; extração de fotogramas), em vez das 6 responsabilidades técnicas. Base 3 (recalculada a partir do mesmo código, `0523102`, sem medir de novo; os valores antigos mantêm-se nos resultados como detalhe). Alvo 1, mínimo ≤ 2, no M2 e no M1 (C1, C2) | Manter as 6 e baixar os alvos (M2 ≤ 4, M1 ≤ 3); manter como estava | Duas das 6 (consumir da fila, codificar com ffmpeg) são infraestrutura que existe em todos os serviços de vídeo: com elas os alvos aprovados em D22 eram inatingíveis por construção |
| D25 | 12/11/2026 | QI-1 — Código comum aos serviços de vídeo | **`Tools/video_common/`**, copiado para cada imagem, como `Tools/utils/` | Uma pasta com três entradas; código duplicado | Cada imagem leva só o que precisa |
| D26 | 12/11/2026 | QI-2 — Réplicas por serviço | **Efeitos 1–3, legendagem 1–2, extração de fotogramas 1–2** (valores por omissão; configuráveis, D31) | Efeitos 2–4; mínimo 0 | Cabe nos 6 GB; sempre 1 réplica pronta de cada serviço |
| D27 | 12/11/2026 | QI-3 — Regra do *autoscaler* | **1 réplica por mensagem na fila, leitura a cada 2 s, descer após 30 s abaixo do limiar** | 1 por 2 mensagens, 5 s, 60 s; subir só com ≥ 3 à espera | Reage depressa e volta ao mínimo bem antes dos 120 s do alvo do S3 |
| D28 | 12/11/2026 | QI-4 — Como o *autoscaler* muda as réplicas | **API do Docker (SDK Python), clonando a configuração da réplica existente**, com os *labels* do Compose | `docker compose --scale` dentro do contentor; Docker Swarm | Não muda a forma de lançar a solução; as réplicas aparecem como réplicas do serviço |
| D29 | 12/11/2026 | QI-5 — Progresso com várias etapas | **Uma barra de 0 a 100 % no total**, com a fórmula de hoje | A barra recomeça em cada etapa | O utilizador vê o mesmo que hoje |
| D30 | 12/11/2026 | QI-6 e QI-7 — Ficheiros intermédios e testes atuais | Ficheiros intermédios no **volume `image_data`**, apagados no fim, em erro ou em cancelamento; os testes de `Tools/video/tests` **mudam de pasta com o código**, sem mudar o que verificam, mais testes novos da divisão em etapas | SeaweedFS; testes no sítio atual | Como hoje entre o `projects` e os workers; testes junto do código que testam |
| D31 | 12/11/2026 | QI-8 — Limites de memória e máximo de réplicas | **Configuráveis por variáveis de ambiente**, com valores por omissão folgados para a máquina de medição (D3); nas medições usam-se os valores por omissão | Sem limites de memória; limites fixos no compose | O limite é por réplica e não prejudica máquinas maiores; quem tiver outra máquina ajusta o máximo de réplicas sem mexer no código |
| D32 | 12/11/2026 | Q12 — Teste de ponta a ponta | **Sim**: uma imagem e um vídeo processados pela API, com o cliente dos scripts de medição, corridos na base e depois do *refactoring* | Não; testes unitários do `projects` | Cobre o caminho das imagens, que os testes da base não cobrem e que o *refactoring* toca (encadeamento no `projects`) |
| D33 | 12/11/2026 | QI-9 — Momento da falha no M3 | **Terminar o serviço da legendagem aos 55 % do progresso nas duas fases**, repetindo o M3 da base com o código da base | Manter os 20 %; 55 % só na final | Aos 20 % o vídeo ainda está na normalização (`video_effects`); aos 55 % já está na legendagem, que é o que o cenário quer testar |
| D34 | 12/11/2026 | Limite de memória da legendagem | **3 GB por réplica** (efeitos 1 GB, extração 512 MB), configuráveis (D31) | 1,5 GB (exemplo do QI-8); 3 GB com máximo de 1 réplica | Na medição inicial a legendagem do vídeo de 177 s chegou a 2,3 GB |
