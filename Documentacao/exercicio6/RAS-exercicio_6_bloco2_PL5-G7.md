# 📝 Exercício 6 (Bloco 2) — Trade-offs, Cenários de Qualidade e Candidatos a RNF
### Fase 2: Melhoria de Requisitos Não Funcionais do PictuRAS

> Continuação do Bloco 1 (`RAS-exercicio_6_bloco1_PL5-G7.md`, v1.0): usa os mesmos IDs (`EV-nn`, `H-nn`, `ALT-n`) e acrescenta os cenários (`QS-nn`) e os candidatos (`CAND-n`). Preparado com apoio de um agente de IA a partir do Bloco 1, do código e das medições, para revisão final da equipa (ver secção 7). A análise é a da solução de base; onde a medição final (depois do *refactoring*) confirma ou desmente uma previsão, isso é indicado com `EV-32` a `EV-36`.

---

**Equipa:** PL5-G7  
**Elementos:** PG63958 Francisco Dias · PG65437 Rodrigo Rocha · PG64026 Rodrigo Fernandes · PG65424 Luís Miguel · PG63986 Joaquim Cunha  
**Commit de partida:** `0523102` (o mesmo do Bloco 1)  
**Data da análise:** 2026-11-19  
**Versão deste documento:** v1.0  
**Versões usadas:** enunciado 1.1 · template 1.1  
**Versão do Bloco 1 usada como entrada:** v1.0

---

## 4. Trade-offs, cenários de qualidade e prioridades

### 4.1 Justificação detalhada das avaliações da matriz

Avaliações da matriz do Bloco 1 (secção 3.3), atributo a atributo. As colunas são: padrão global atual (G), padrão atual do vídeo (V) e as alternativas ALT-1 (serviços por responsabilidade de vídeo), ALT-2 (*Competing Consumers* com filas por tipo e réplicas ajustadas à carga) e ALT-3 (tarefas efémeras com um orquestrador de *workflow*).

| **Atributo** | **Justificação** | **Depende sobretudo de** | **Evidência** |
|--------------|------------------|--------------------------|---------------|
| Eficiência de desempenho — comportamento temporal | **G Médio:** o *Apply* responde logo, porque o trabalho segue por filas, mas no caminho das imagens cada ferramenta lê e escreve a imagem completa no volume partilhado. **V Alto sozinho, Baixo sob carga:** uma descodificação e uma codificação por vídeo dão 0,39–0,90× a duração do vídeo; mas um vídeo de 10 s passa de 3,9 s para 144,7 s se for pedido durante uma legendagem, porque espera pelo único *worker*. **ALT-1 Médio:** junta mensagens e ficheiros intermédios entre etapas. **ALT-2 Alto:** os trabalhos curtos deixam de esperar pelos longos. **ALT-3 Médio:** cada tarefa paga o arranque de um contentor | Padrão do vídeo (o tempo sob carga é o efeito do *worker* único); o padrão global só dá o desacoplamento do pedido HTTP | EV-06, EV-11, EV-22, EV-24, EV-26; H-09, H-10, H-13. Depois: H-09 confirmada, custo de +2,4 % no pior caso (EV-32) |
| Eficiência de desempenho — capacidade / elasticidade | **G Médio:** uma fila por ferramenta evita que uma ferramenta lenta bloqueie as outras, mas cada serviço é um contentor fixo, sem réplicas nem limites. **V Baixo:** `prefetch_count=1` e uma réplica, ou seja, um vídeo de cada vez; o débito fica em 16–18 vídeos/min de 1 a 8 utilizadores e, sob rajada, há até 9 vídeos à espera com 40 % do CPU usado. **ALT-1 Médio:** dá a cada etapa os seus recursos, mas sozinha não acrescenta réplicas. **ALT-2 Alto:** as réplicas acompanham o tamanho de cada fila. **ALT-3 Alto:** uma tarefa por vídeo | **Interação:** o padrão global impõe recursos fixos (Docker Compose, 1 contentor por serviço); o padrão do vídeo agrava, porque concentra todo o trabalho num só consumidor | EV-03, EV-04, EV-09, EV-27, EV-28; H-10. Depois: até 3 vídeos em simultâneo, mas o débito só sobe 12 % numa só máquina (EV-32) |
| Fiabilidade — tolerância a falhas / recuperabilidade | **G Baixo:** as ferramentas de imagem confirmam a mensagem ao recebê-la, por isso uma falha a meio perde o trabalho; as respostas de erro trocam `messageId` e `correlationId`. **V Médio:** com a confirmação no fim e a escrita atómica, uma falha não perde o pedido nem deixa saídas parciais (5/5 legendagens refeitas), mas atrasa 100 % dos outros vídeos, e com `heartbeat=0` um bloqueio não é detetado. **ALT-1 Alto:** uma falha na legendagem fica no serviço da legendagem. **ALT-2 Médio/Alto:** a mensagem passa para outra réplica. **ALT-3 Alto:** novas tentativas geridas pelo motor | Padrão do vídeo (confirmação manual, um só *worker*); o padrão global dá as filas duráveis que tornam a reentrega possível | EV-09, EV-10, EV-20, EV-29; H-06, H-07, H-11. Depois: 0 % dos vídeos curtos afetados (mediana), 0 perdidos (EV-33) |
| Manutenibilidade — modularidade / modificabilidade | **G Médio:** uma ferramenta de imagem acrescenta-se sem tocar nas outras, mas o orquestrador tem 2 732 linhas e 33 rotas, com ramos imagem/vídeo. **V Baixo:** as 3 funcionalidades de vídeo estão numa só unidade implantável, os 8 efeitos de fotograma estão duplicados e a complexidade ciclomática chega a 22; mudar a legendagem ou acrescentar um efeito interrompe as 3 funcionalidades. **ALT-1 Alto:** uma funcionalidade por unidade. **ALT-2 Baixo:** não muda a decomposição. **ALT-3 Alto:** tarefas independentes | **Ambos:** o padrão do vídeo concentra as funcionalidades; o padrão global (orquestração central no `projects`) obriga a ramificar o orquestrador | EV-12, EV-21, EV-23, EV-31; H-12. Depois: M2 = 1 e M1 = 1 (EV-34) |
| Manutenibilidade — testabilidade e reutilização | Não estão na matriz do Bloco 1 (o enunciado pede-as aqui). **G:** cada ferramenta de imagem testa-se isolada, mas não há testes automáticos do caminho das imagens. **V:** há 74 testes do `video_tool` e 8 do `projects`; os efeitos de fotograma são reimplementados em vez de reutilizados. **ALT-1:** testes por serviço, mas o encadeamento entre serviços passa a precisar de testes próprios. **ALT-2:** o mecanismo de escalonamento precisa de testes com uma fila e um Docker simulados | Padrão do vídeo | EV-12, EV-25; `Tools/video/tests`, `projects/tests` |
| Segurança | **G Baixo:** 12 portas publicadas além do nginx, segredos no `docker-compose.yaml`, comunicação interna sem validação de certificados. **V Baixo:** herda o global, sem fragilidades próprias. **ALT-1 Baixo:** igual, com mais serviços internos. **ALT-2 Baixo:** igual; se as réplicas forem criadas pelo próprio sistema, o componente que as cria precisa de acesso à API do Docker. **ALT-3 Baixo/Médio:** mais um componente a proteger | Padrão global | EV-03, EV-16, EV-17. Depois: o *autoscaler* monta `docker.sock` (EV-35) |
| Usabilidade — operabilidade | **G Médio:** progresso em tempo real por WebSocket, perdido com um *refresh*. **V Médio:** progresso a cada 2 % por vídeo, mas sob carga o vídeo fica parado em 0 % sem explicação enquanto espera. **ALT-1 Médio:** a barra tem de somar as etapas. **ALT-2 Médio/Alto:** menos tempo parado sob carga. **ALT-3 Médio** | Padrão global (canal de progresso); o padrão do vídeo determina quanto tempo a barra fica parada | EV-19, EV-26 |
| Eficiência de desempenho — utilização de recursos | Não está na matriz do Bloco 1. **V:** processamento fotograma a fotograma em Python, num só processo; o `video_tool` mantém o modelo Whisper em memória (≈ 0,6 GB) mesmo quando só aplica efeitos. **ALT-1:** cada serviço só carrega o que precisa. **ALT-2:** cada réplica ocupa memória própria; o total cresce com o número de réplicas | Padrão do vídeo | EV-11, EV-13; H-08. Depois: o limite de 1 GB por réplica não chegou para vídeos 1080p (EV-36) |

### 4.2 Cenários de qualidade para a extensão de vídeo

Os cenários QS-01 a QS-07 correspondem aos cenários de medição S1–S4 e M1–M3 (`Documentacao/medicoes/PLANO_MEDICAO.md`). QS-08 a QS-10 vêm de fragilidades do Bloco 1 que não foram escolhidas; ficam para a priorização.

| **ID** | **Característica (ISO/IEC 25010)** | **Fonte do estímulo** | **Estímulo** | **Artefacto** | **Ambiente** | **Resposta** | **Medida da resposta** |
|--------|------------------------------------|-----------------------|--------------|---------------|--------------|--------------|------------------------|
| QS-01 | Eficiência de desempenho — capacidade / elasticidade | Utilizador B | Pede um brilho num vídeo de 10 s enquanto o utilizador A legenda um vídeo de 177 s | Processamento de vídeo (`video_tool`, `video_queue`) | Operação normal; a legendagem de A já começou | O vídeo de B é processado sem esperar pelo fim da legendagem | Espera do vídeo de B (s): do pedido aceite ao primeiro evento de progresso (S1) |
| QS-02 | Eficiência de desempenho — capacidade / elasticidade | N utilizadores (N = 1, 2, 4, 8) | Pedem ao mesmo tempo um brilho num vídeo de 10 s cada | Processamento de vídeo | Operação normal, sistema sem outros trabalhos | Os vídeos são processados em paralelo | Vídeos em processamento ao mesmo tempo (contagem) e débito com N = 8 (vídeos/min) (S2) |
| QS-03 | Eficiência de desempenho — capacidade / elasticidade | 9 utilizadores | Rajada: 8 brilhos em vídeos de 10 s e 1 legendagem do vídeo de 177 s, seguida de calma | Serviços de vídeo e os seus recursos | Rajada em operação normal, depois sistema parado | Os recursos do vídeo aumentam com a carga e voltam ao mínimo na calma | Réplicas de vídeo ao longo do tempo (contagem), tempo até voltar ao mínimo (s) e duração da rajada (s) (S3) |
| QS-04 | Manutenibilidade — modularidade / modificabilidade | Programador | Muda a legendagem: troca o modelo Whisper (C1, configuração) ou corrige `subtitles.py` (C2, código) | Código e configuração da legendagem | Em desenvolvimento, com o sistema em produção | A mudança é feita e implantada sem parar as outras funcionalidades de vídeo | Funcionalidades de vídeo interrompidas pela implantação (contagem, de 0 a 3) (M1) |
| QS-05 | Manutenibilidade — modificabilidade | Programador | Acrescenta um efeito de vídeo novo (sépia, C3) | Código dos efeitos de vídeo, `projects` e `frontend` | Em desenvolvimento | O efeito fica disponível sem alterar os efeitos existentes | Ficheiros e componentes alterados, unidades a reconstruir e funcionalidades interrompidas (contagens) (M1, C3) |
| QS-06 | Manutenibilidade — modularidade (isolamento); relacionada com Fiabilidade — tolerância a falhas | Falha interna | O serviço que faz a legendagem é terminado (`SIGKILL`) a meio de uma legendagem, com 4 vídeos curtos pedidos entretanto | Serviço da legendagem e fila | Operação normal com um lote em curso; o serviço volta a arrancar 5 s depois | Os outros vídeos não são afetados e a legendagem é retomada sem perder o pedido | Vídeos curtos afetados (%; afetado = erro ou mais de 1,5× o tempo máximo de QS-02 com N = 4) e trabalhos perdidos (contagem) (M3) |
| QS-07 | Eficiência de desempenho — comportamento temporal | Utilizador | Aplica um brilho a um vídeo de 10 s, 30 s ou 150 s | Processamento de vídeo | Sistema sem outros trabalhos | O vídeo é processado | Tempo de conclusão / duração do vídeo (razão) (S4; REQ-VID-EDIT-010) |
| QS-08 | Eficiência de desempenho — utilização de recursos | Utilizador premium | Carrega um vídeo de 1 GB | API Gateway, `projects`, `img_storage` | Operação normal | O vídeo é aceite e guardado | Pico de memória somado dos três serviços (MB) e tempo até à resposta do carregamento (s) |
| QS-09 | Segurança — confidencialidade / autenticidade | Atacante na rede do anfitrião | Acede diretamente a uma porta interna publicada (ex.: `projects`, RabbitMQ) | Serviços internos e `docker-compose.yaml` | Operação normal | O acesso é recusado; só a entrada pelo nginx funciona | Portas internas acessíveis a partir do anfitrião (contagem) e segredos versionados no repositório (contagem) |
| QS-10 | Fiabilidade — tolerância a falhas | Falha interna | Uma ferramenta de imagem é terminada a meio de um trabalho | Ferramenta de imagem e a sua fila | Operação normal | O trabalho é retomado | Trabalhos de imagem perdidos (contagem) |

**Priorização dos cenários**

| **ID** | **Importância para os *stakeholders*** | **Dificuldade / risco técnico** | **Prioridade** |
|--------|----------------------------------------|---------------------------------|----------------|
| QS-01 | **Alta:** qualquer utilizador que peça um vídeo curto enquanto outro legenda espera minutos (141 s medidos, EV-26); é o cenário dado como exemplo no enunciado | **Alta:** obriga a separar a legendagem e a ter mais de um consumidor de vídeo | 1 |
| QS-02 | **Alta:** com vários utilizadores, todos esperam em fila (EV-27); REQ-VID-EDIT-011 não é cumprido | **Média/Alta:** réplicas e mecanismo de escalonamento | 2 |
| QS-06 | **Alta:** uma falha na legendagem atrasa todos os vídeos (EV-29) | **Alta:** exige separar a legendagem numa unidade própria | 3 |
| QS-04 | **Média/Alta:** para a equipa que mantém o sistema, qualquer mudança na legendagem para todo o vídeo (EV-31) | **Alta:** divisão do `video_tool` e encadeamento das etapas no `projects` | 4 |
| QS-03 | **Média:** importa a quem opera o sistema (recursos fixos, 60 % do CPU sem uso, EV-28) | **Alta:** reagir à carga sem o Docker Compose o fazer sozinho | 5 |
| QS-05 | **Média:** acrescentar efeitos é a evolução mais provável | **Média:** o efeito toca sempre o *frontend* e o `projects` | 6 |
| QS-07 | **Média:** já cumprido na base (0,39–0,90×, EV-22); serve para garantir que não piora | **Baixa:** não exige mudança | 7 (efeito colateral a vigiar) |
| QS-09 | **Alta** em produção, mas a fragilidade é do padrão global e não do vídeo (EV-16, EV-17) | **Média/Alta:** mexe em todos os serviços, com risco de regressão alto | 8 |
| QS-08 | **Média:** só utilizadores premium com vídeos grandes; não medido (H-05) | **Média:** carregamento por *stream* em três serviços | 9 |
| QS-10 | **Média:** imagens, fora da extensão de vídeo; não medido (H-06) | **Baixa:** confirmação manual nas ferramentas de imagem | 10 |

### 4.3 Atributos de qualidade por ordem de prioridade

1. **Eficiência de desempenho — capacidade / elasticidade** (QS-01, QS-02, QS-03): é a fragilidade que os utilizadores sentem diretamente e a que tem a maior diferença medida (141 s de espera para um vídeo de 3,9 s).
2. **Manutenibilidade — modularidade / modificabilidade** (QS-04, QS-05, QS-06): a concentração das 3 funcionalidades numa unidade é a causa estrutural do bloqueio e do efeito de uma falha, e torna cada mudança na legendagem arriscada.
3. **Fiabilidade — tolerância a falhas / recuperabilidade** (QS-06, QS-10): no vídeo a recuperação já existe (ack no fim, escrita atómica); falta o isolamento, que vem da modularidade.
4. **Eficiência de desempenho — comportamento temporal** (QS-07): cumprido na base; tem de se manter.
5. **Segurança** (QS-09): importante, mas é uma fragilidade do padrão global, fora do âmbito da extensão de vídeo.
6. **Usabilidade — operabilidade:** melhora indiretamente quando a espera diminui (QS-01).

### 4.4 Pré-requisitos e efeitos colaterais entre atributos

| **Atributo A** | **Atributo B** | **Efeito** | **Razão / evidência** |
|----------------|----------------|------------|-----------------------|
| Modularidade (ALT-1) | Elasticidade (ALT-2) | **Pré-requisito** | Só com a legendagem numa unidade própria se pode dar-lhe uma fila e réplicas próprias, para que os trabalhos curtos não esperem atrás dela (H-10). Confirmado: espera de 141 s para 6,5 s (EV-32) |
| Modularidade | Comportamento temporal | **Conflito** | As etapas trocam mensagens e ficheiros intermédios (H-09). Medido depois: +2,4 % no pior caso (EV-32) |
| Elasticidade | Utilização de recursos | **Conflito** | Cada réplica ocupa memória e CPU próprios; numa só máquina as réplicas disputam os mesmos 8 CPU, por isso o débito só sobe 12 % (EV-32), e um limite de memória mal dimensionado faz falhar os vídeos grandes (EV-36) |
| Elasticidade | Segurança | **Conflito** | Criar réplicas a partir do próprio sistema exige acesso à API do Docker (EV-35) |
| Elasticidade | Fiabilidade | **Sinergia** | Com a confirmação no fim, se uma réplica cair a mensagem passa para outra (EV-09) |
| Modularidade | Fiabilidade | **Sinergia** | Uma falha fica na unidade onde acontece (QS-06; confirmado em EV-33) |
| Modularidade | Testabilidade | **Sinergia com custo** | Testes por serviço, mas o encadeamento das etapas entre serviços passa a precisar de testes próprios |
| Elasticidade | Usabilidade — operabilidade | **Sinergia** | Menos tempo com a barra de progresso parada sob carga (QS-01) |

### 4.5 Recomendações de melhoria à solução atual

| **Recomendação** | **Atributo(s)** | **Padrão a que se refere** | **Esforço** | **Risco de regressão** |
|------------------|-----------------|----------------------------|-------------|------------------------|
| Separar o `video_tool` em serviços por funcionalidade (efeitos, legendagem, extração), cada um com a sua fila, encadeados pelo `projects` (ALT-1) | Modularidade, modificabilidade, isolamento de falhas | Vídeo (alinha-o com o global) | Alto | Médio (regras do pipeline sem requisito explícito; mitigado por testes) |
| Réplicas de cada serviço de vídeo ajustadas ao tamanho da sua fila (ALT-2) | Capacidade / elasticidade, comportamento temporal sob carga | Vídeo | Médio/Alto | Baixo/Médio |
| Confirmar as mensagens das ferramentas de imagem só no fim e corrigir os IDs trocados nas respostas de erro | Fiabilidade | Global | Baixo | Baixo |
| Carregamento por *stream* (sem `multer.memoryStorage`) no gateway, no `projects` e no `img_storage` | Utilização de recursos | Global | Médio | Médio |
| Tirar os segredos do `docker-compose.yaml`, deixar de publicar as portas internas e validar certificados internos | Segurança | Global | Médio | Alto (toca todos os serviços) |
| Ativar o *heartbeat* do RabbitMQ no vídeo, processando o trabalho fora da *thread* da ligação | Fiabilidade — disponibilidade | Vídeo | Médio | Médio |
| Partilhar a implementação dos efeitos de fotograma entre as ferramentas de imagem e o vídeo | Reutilização, modificabilidade | Ambos | Médio | Médio |

---

## 5. Candidatos a requisitos não funcionais da Fase 2

| **#** | **Característica / subcaracterística (ISO/IEC 25010)** | **Fragilidade na base (evidência)** | **Origem** | **Impacto nos *stakeholders* (pertinência)** | **Exigência técnica (complexidade)** | **Escala e método de medição (esboço)** | **Pré-requisitos / efeitos colaterais** |
|-------|---------------------------------------------------------|--------------------------------------|------------|-----------------------------------------------|---------------------------------------|------------------------------------------|----------------------------------------|
| CAND-1 | Eficiência de desempenho — capacidade / elasticidade (cenários QS-01, QS-02, QS-03) | Um só `video_tool`, `prefetch_count=1`, sem réplicas nem ajuste à carga: os vídeos são processados um a um e uma legendagem bloqueia todos os outros (EV-03, EV-09, EV-26, EV-27, EV-28) | **Interação:** recursos fixos do padrão global + *worker* único do padrão do vídeo | Utilizadores: minutos de espera por um vídeo de segundos, que crescem com o número de utilizadores. Operação: 60 % do CPU sem uso sob carga | Alta: filas por tipo de trabalho, réplicas que acompanham a carga sem o Docker Compose o fazer sozinho, e medição de cenários concorrentes com vários utilizadores simulados | Ver 5.1 | Precisa de CAND-2 (legendagem separada). Efeitos: mais memória e CPU por réplica; acesso à API do Docker (segurança) |
| CAND-2 | Manutenibilidade — modularidade (cenários QS-04, QS-05, QS-06) | As 3 funcionalidades de vídeo numa só unidade implantável, efeitos duplicados, orquestrador ramificado; mudar a legendagem ou uma falha nela afeta todos os vídeos (EV-12, EV-21, EV-23, EV-29, EV-31) | **Padrão do vídeo** (afasta-se da decomposição por ferramenta do padrão global) | Equipa de desenvolvimento: cada mudança na legendagem reconstrói e reinicia o vídeo todo. Utilizadores: uma falha na legendagem atrasa os seus vídeos | Alta: dividir o `video_tool` preservando as regras do pipeline (ordem, extração terminal, pré-visualização, progresso único) e mover o encadeamento para o `projects` | Ver 5.1 | Pré-requisito de CAND-1. Efeitos: mensagens e ficheiros intermédios entre etapas (comportamento temporal), mais serviços a operar |

### 5.1 Esboço de quantificação

Os valores foram fixados depois da medição inicial (11–12/11/2026, decisão D22 do `CONTEXTO_E_DECISOES_FASE2.md`, secção 4B); não foram escolhidos antes de medir.

| | **CAND-1** | **CAND-2** |
|---|---|---|
| **Escala** | QS-01: espera do vídeo curto (s). QS-02: máximo de vídeos em processamento simultâneo (contagem) e débito com N = 8 (vídeos/min). QS-03: réplicas de vídeo ao longo do tempo (contagem), tempo até voltar ao mínimo (s) e duração da rajada (s). Efeito colateral (QS-07): tempo de conclusão / duração | QS-04 e QS-05 (M1): funcionalidades de vídeo interrompidas por uma mudança (contagem, de 0 a 3), ficheiros e unidades tocados. M2: máximo de funcionalidades de vídeo numa unidade implantável (contagem). QS-06 (M3): vídeos curtos afetados (%) e trabalhos perdidos (contagem) |
| **Cenário de medição** | S1 (legendagem + vídeo curto), S2 (N = 1, 2, 4, 8 em simultâneo), S3 (rajada e calma), S4 (vídeo sozinho) | M1 (mudanças C1, C2, C3), M2 (análise estática), M3 (falha da legendagem aos 55 % do progresso) |
| **Carga** | Vídeos de 10 s (720p) e de 177 s com fala (1080p); 30 s e 150 s no S4 | M3: 1 legendagem do vídeo de 177 s e 4 vídeos de 10 s |
| **Ambiente** | O mesmo computador nas duas medições: Apple M2, 8 núcleos; Docker Desktop com 8 CPU e 6 GB; dados limpos antes de cada medição, modelo Whisper já descarregado (D3, D12) | O mesmo; M1 e M2 sobre o código, sem o lançar |
| **Instrumento** | *Scripts* em `Documentacao/medicoes/scripts/`: cliente da API pública (contas, carregamento, *Apply*), tempos pelos eventos WebSocket (`video-progress`, `process-update`), `docker ps`/`docker stats` para réplicas e recursos; 5 repetições, mediana e dispersão; logs dos serviços para verificação cruzada | `modularidade.py`: ficheiros alterados (`git diff`), imagens Docker que os contêm (linhas `COPY`), marcadores de cada funcionalidade no código; M3 com `cenarios.py` (`docker compose kill -s SIGKILL`) |
| **Valor medido na base / valor-alvo / valor mínimo aceitável** | QS-01: 141,0 s / ≤ 10 s / ≤ 30 s. QS-02: 1 vídeo e 16,8 vídeos/min / ≥ 3 e ≥ 25 / ≥ 2 e ≥ 20. QS-03: sempre 1 réplica, 158,8 s / sobe a ≥ 3 e volta em ≤ 120 s, ≤ 95 s / sobe a ≥ 2 e volta, ≤ 127 s. QS-07: 0,39× / 0,38× / 0,90× / não piorar mais de 10 % / ≤ 1,0× | M1 (C1, C2): 3 / 1 / ≤ 2. M2: 3 / 1 / ≤ 2. M3: 100 % e 0 perdidos / 0 % e 0 / ≤ 25 % e 0 |

### 5.2 Relação entre os dois candidatos

CAND-2 é **pré-requisito** de CAND-1: enquanto a legendagem estiver no mesmo serviço que os efeitos, não se lhe pode dar uma fila e réplicas próprias, e os trabalhos curtos continuam a esperar atrás dela. Os dois têm também um **custo** que é preciso medir: separar as etapas acrescenta mensagens e ficheiros intermédios (comportamento temporal, QS-07), e mais réplicas ocupam mais memória e CPU e, se forem criadas pelo próprio sistema, dão-lhe acesso à API do Docker (segurança). Por isso o S4 entra na medição como guarda do efeito colateral.

### 5.3 Evidência exploratória

| **Descrição** | **Localização** | **Como repetir** |
|---------------|-----------------|------------------|
| Medição inicial completa (S1–S4, M2, M3) e M1 | `Documentacao/medicoes/baseline/` (`resumo.md`, CSV por cenário, logs dos serviços, `ambiente.json`) | `Documentacao/medicoes/medicao_inicial.command` com o código no commit de partida; passo a passo em `Documentacao/COMO_TESTAR.md` e `medicoes/FLUXO_DAS_MEDICOES.md` |
| M3 da base com a falha aos 55 % (D33) | `Documentacao/medicoes/baseline/m3/` (o de 20 % em `baseline/m3_20pct/`) | `Documentacao/medicoes/m3_base.command` |
| Testes de regressão e de ponta a ponta da base | `Documentacao/testes_regressao/baseline/` | `testes_inicial.command`, `ponta_a_ponta_inicial.command` |

---

## 6. Conclusões e recomendações

**Adequação do padrão atual (global e do vídeo):**

O padrão global (microsserviços com API Gateway, filas duráveis no RabbitMQ e orquestração no `projects`) é adequado ao vídeo e é ele que permite melhorá-lo sem mudar a arquitetura: as filas desacoplam o pedido do processamento e a confirmação no fim garante que nenhum pedido se perde. O padrão do vídeo (um *worker* com o pipeline todo numa mensagem) é adequado a um vídeo de cada vez, com uma só descodificação e sem saídas parciais, mas deixa de o ser com vários utilizadores e com a legendagem: os vídeos são processados em série, uma legendagem atrasa todos os outros e qualquer mudança ou falha na legendagem afeta todo o vídeo.

**Sugestões de otimização:**

Alinhar o vídeo com o padrão global, separando-o por funcionalidade (CAND-2, ALT-1), e dar a cada serviço de vídeo réplicas que acompanhem a sua fila (CAND-1, ALT-2), mantendo a confirmação no fim e a escrita atómica que a base já tem. Dimensionar os limites de recursos de cada serviço a partir de medições, não de estimativas (EV-36).

**Considerações para evolução futura:**

Numa só máquina, as réplicas repartem o mesmo CPU: dão paralelismo e isolamento, mas pouco débito extra (EV-32). A capacidade só cresce com mais recursos, por exemplo vários nós com um orquestrador de contentores que faça o escalonamento automático (Kubernetes com HPA ou KEDA), o que também dispensaria o acesso à API do Docker a partir de um serviço. Ficam ainda por tratar as fragilidades do padrão global: segurança (QS-09), carregamento em memória (QS-08) e confirmação das mensagens nas ferramentas de imagem (QS-10).

**Riscos para a preservação funcional e mitigação**

| **Risco** | **Funcionalidade afetada** | **Mitigação** | **Teste de regressão** |
|-----------|----------------------------|---------------|------------------------|
| Mudar a ordem dos efeitos ou deixar de aplicar um efeito ao dividir o pipeline em etapas | Vídeo | O `projects` divide o pipeline com as mesmas regras que o `video_tool` usava; testes com os mesmos casos em Python e em JavaScript | `Tools/tests/video_pipeline` (pipelines completos pelos três serviços), `projects/tests/video-stages.test.js` |
| A legendagem deixar de ver o vídeo já cortado, ou a pré-visualização cortar na etapa errada | Vídeo | Mesma regra da base para a etapa onde a pré-visualização é cortada | `test_order_and_preview`, `test_preview_after_temporal_edit` (`Tools/tests/video_pipeline`) |
| A extração de fotogramas deixar de ser o último passo ou de ler o original quando é a única ferramenta | Vídeo | Validação no `projects` mantida; a etapa de extração é sempre a última | `test_extraction_must_be_terminal_once`, `test_extraction_only_seeks_original_without_transcoding`, `test_captions_run_before_extraction` (`Tools/tests/video_pipeline`); `projects/tests/frame-extraction.test.js` |
| Saídas parciais ou ficheiros intermédios esquecidos quando uma etapa falha ou é cancelada | Vídeo | Escrita atómica em cada serviço; pasta de trabalho apagada no fim, em erro e no cancelamento | `test_encoder_failure_preserves_previous_output`, `test_model_failure_does_not_publish_partial_output`, `test_extractor_failure_leaves_previous_output` (`Tools/tests/video_pipeline`); testes do *worker* comum (`Tools/video_common/tests`) |
| A barra de progresso chegar aos 100 % antes do fim ou recomeçar em cada etapa | Vídeo | Progresso calculado sobre o total das etapas; só a última chega aos 100 % | `Tools/video_common/tests/test_worker.py` |
| O encadeamento no `projects` partir o caminho das imagens | Imagem | O código das imagens não muda; teste de ponta a ponta com imagem e vídeo no mesmo projeto | `Documentacao/testes_regressao/ponta_a_ponta.py` (casos A e B) |

---

## 7. Utilização de IA

| **Ferramenta / skill** | **Tarefa apoiada** | **Validação feita pela equipa** | **Onde está documentado** |
|------------------------|--------------------|----------------------------------|---------------------------|
| Agente de IA (Claude) | Proposta do texto das secções 4 a 6 a partir do Bloco 1, das medições e das decisões registadas; escrita dos cenários QS-01 a QS-10 | Os cenários escolhidos (S1–S4, M1–M3), os candidatos (par A, D1) e os valores-alvo (D22) foram decididos pela equipa a partir de opções apresentadas pelo agente; os valores citados estão em `Documentacao/medicoes/` | Este documento; `Documentacao/CONTEXTO_E_DECISOES_FASE2.md` (decisões D1–D35) |
| O mesmo agente | *Scripts* de medição e execução das medições inicial e final; verificação cruzada com os logs dos serviços | A equipa acompanhou as execuções no computador de medição e reviu os resultados; os *scripts* e os dados estão no repositório para repetir | `Documentacao/medicoes/`, `Documentacao/COMO_TESTAR.md` |
| O mesmo agente | Identificação das fragilidades no código (evidências com ficheiro e linha) | Evidências verificáveis no commit `0523102`; revistas pela equipa | Bloco 1, secção 2.6 |
