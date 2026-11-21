#import "../template.typ": *

#paisagem[
= Trade-offs, Medição e Preservação Funcional

== Matriz de efeitos

#tab([Matriz de efeitos das decisões],
  tabela(
    colunas: (1.6cm, 2.8cm, 2.6cm, 1.8cm, 1.8cm, 2.8cm, 1fr),
    tamanho: 8.5pt,
    [Decisão], [Desempenho], [Disponibilidade / Fiabilidade], [Segurança], [Usabilidade], [Manutenibilidade / Testabilidade], [Justificação],
    [*DA-1*], [*↑* capacidade e tempo sob carga; *↓* utilização de recursos], [*↑*], [*↓*], [*↑*], [*↓*], [Medido: espera de 141 s para 6,5 s e até 3 vídeos em paralelo, mas débito só +12 % numa só máquina e mais memória por réplica (EV-32, EV-36). Fiabilidade: a mensagem passa para outra réplica se uma cair. Segurança: `docker.sock` no `autoscaler` (EV-35). Usabilidade: menos tempo com a barra parada em 0 %. Manutenibilidade: mais um serviço a operar, com comportamento que depende do tempo e é difícil de testar],
    [*DA-2*], [*↓* ligeiro no tempo de um vídeo sozinho], [*↑*], [*=*], [*=*], [*↑*], [Medido: +2,4 % no pior caso do S4 (etapas e ficheiros intermédios); falha na legendagem com 0 % dos outros vídeos afetados (EV-33); M1 e M2 de 3 para 1 (EV-34). Segurança: mais serviços internos, mas nenhuma porta publicada nova. Usabilidade: a mesma barra de progresso de 0 a 100 %. Testabilidade: testes por serviço, mais testes do encadeamento],
  ),
)

*Gestão dos custos.* O limite de memória e o número máximo de réplicas de cada serviço são configuráveis por variáveis de ambiente, para os ajustar à máquina; o acesso ao `docker.sock` fica restrito ao `autoscaler`, que não publica portas e só atua nos serviços de vídeo do próprio projeto Compose; o custo das etapas é vigiado pelo S4 em cada medição.
]

== Interação entre DA-1 e DA-2

#tab([Interação entre as decisões],
  tabela(
    colunas: (2cm, 2cm, 3cm, 1fr),
    tamanho: 8.5pt,
    [Decisão A], [Decisão B], [Efeito (pré-requisito, sinergia ou conflito)], [Razão / evidência],
    [DA-2], [DA-1], [*Pré-requisito*], [Só com a legendagem num serviço e numa fila próprios se lhe podem dar réplicas próprias sem que os trabalhos curtos fiquem atrás dela. Medido: a espera que resta ao vídeo curto (6,5 s) é o arranque de uma segunda réplica de efeitos, já não a legendagem (EV-32)],
    [DA-1], [DA-2], [*Sinergia*], [Com várias réplicas, a falha de um serviço também deixa de parar o trabalho dos restantes (EV-33)],
  ),
)

== Plano de medição

A mesma medição foi feita antes (11–12/11/2026, _commit_ `0523102`) e depois (14/11/2026, _commit_ `67d222c`) do _refactoring_, no mesmo computador e com o mesmo método. O passo a passo dos _scripts_ está na secção 10.4 e as instruções para repetir no anexo A.

#tab([Plano de medição],
  tabela(
    colunas: (1.6cm, 3.8cm, 2.6cm, 3.2cm, 2cm, 1fr),
    tamanho: 8pt,
    [Cenário], [Cenário de teste e carga], [Ambiente (máquina, recursos, versões)], [O que se regista], [Repetições e agregação], [Onde ficam os _scripts_ e os dados],
    [QS-01 (S1)], [Legendagem do vídeo de 177 s (1080p) e, logo que começa, brilho num vídeo de 10 s (720p) de outro utilizador; controlo com o vídeo curto sozinho], [MacBook Pro M2, 8 núcleos, 8 GiB; Docker 29.8.0 com 8 CPU e 6 GB; dados limpos antes de medir; modelo Whisper já descarregado], [Pedido aceite, primeiro `video-progress`, `process-update` (espera e conclusão); CPU e memória por contentor; _logs_ dos serviços], [5; mediana, mínimo, máximo e IQR], [`Documentacao/medicoes/scripts/` (`cenarios.py s1`); dados em `medicoes/baseline/s1/` e `medicoes/final/s1/`],
    [QS-02, QS-03 (S2, S3)], [S2: 1, 2, 4 e 8 utilizadores com um brilho ao mesmo tempo. S3: rajada de 8 brilhos e 1 legendagem, seguida de 120 s de calma], [O mesmo], [Débito, vídeos em simultâneo, espera; réplicas de cada serviço a cada 2 s], [5 por nível], [`cenarios.py s2`, `s3`; `medicoes/*/s2/`, `s3/`],
    [QS-04, QS-05 (M1), M2], [C1 (modelo Whisper), C2 (código da legendagem), C3 (efeito sépia num ramo descartável); análise estática do código de vídeo], [Repositório, sem lançar a solução], [Ficheiros e componentes alterados; imagens a reconstruir; serviços a reiniciar; funcionalidades interrompidas], [Uma vez (determinístico)], [`modularidade.py m1`, `m2`; `medicoes/*/m1/`, `m2/`],
    [QS-06 (M3)], [Legendagem do vídeo de 177 s e 4 brilhos; serviço da legendagem terminado aos 55 % e arrancado 5 s depois], [O mesmo do S1], [Vídeos curtos afetados, trabalhos perdidos, legendagens concluídas], [5], [`cenarios.py m3`; `medicoes/*/m3/`],
    [QS-07 (S4)], [Brilho em vídeos de 10 s, 30 s e 150 s, um de cada vez], [O mesmo do S1], [Tempo de conclusão / duração], [5 por vídeo], [`cenarios.py s4`; `medicoes/*/s4/`],
  ),
)

== Como funcionam os _scripts_ de medição

Cada medição completa é lançada com um duplo clique num ficheiro `.command` (`medicao_inicial.command` na base, `medicao_final.command` depois do _refactoring_). O fluxo, sem entrar no código, é este:

+ *Preparar o ambiente.* O lançador para a solução, apaga os dados da instância anterior (contas, projetos, ficheiros), mantém só o modelo Whisper já descarregado, e volta a construir e arrancar todos os serviços. Regista a máquina, os recursos do Docker e o _commit_ (`ambiente.json`).
+ *Esperar que tudo esteja pronto.* Confirma que a API responde e que os serviços de vídeo estão ligados ao RabbitMQ.
+ *Aquecer.* Corre uma legendagem e um brilho que são descartados, para que o modelo e as _caches_ não pesem na primeira medição.
+ *Simular utilizadores reais.* Para cada trabalho, o _script_ cria um utilizador premium novo, faz _login_, cria um projeto, carrega o vídeo, define o _pipeline_ e liga-se ao WebSocket com o _token_ desse utilizador, tal como o _frontend_. Nada disto conta para os tempos.
+ *Medir.* Faz o _Apply_ e regista três instantes: quando o pedido é aceite, quando chega o primeiro evento de progresso e quando chega o aviso de que o resultado foi gravado. Em paralelo, um monitor guarda a cada 2 s o CPU e a memória de cada contentor, o número de réplicas de cada serviço e o tamanho de cada fila.
+ *Repetir e resumir.* Cada cenário corre 5 vezes, com 10 s de pausa; no fim, um _script_ calcula a mediana, o mínimo, o máximo e o IQR e escreve o `resumo.md`. As contas e os projetos de teste são apagados.
+ *Verificar.* Os _logs_ de todos os serviços são guardados e comparados com os resultados: cada trabalho medido tem de aparecer como concluído no _log_ do serviço que o fez.

O M1 e o M2 não lançam a solução: leem o repositório, veem que ficheiros cada mudança toca, que imagens Docker os copiam e que funcionalidades de vídeo vivem nessas imagens.

A verificação cruzada deu, na base, #ev("EV-30", [`baseline/*/logs_*.txt`], [os 175 trabalhos dos ficheiros de resultados têm o mesmo número de conclusões no _log_ do `video_tool`, e o tempo medido pelos _scripts_ difere do registado pelo _worker_ em menos de 0,4 s]); na final, nenhum trabalho com erro em S1–S4 e M3.

== Resultados das medições

Valores na mediana de 5 repetições; os mínimos e máximos estão nos `resumo.md` de cada fase.

#tab([Resultados das medições],
  tabela(
    colunas: (1.5cm, 1fr, 2.1cm, 2.3cm, 1.9cm, 1.9cm, 2cm),
    tamanho: 8.5pt,
    [Cenário], [Medição (o que se mede, unidade)], [Antes (_baseline_)], [Depois], [Valor-alvo], [Mínimo aceitável], [Atingido?],
    [QS-01 (S1)], [Espera do vídeo de 10 s durante uma legendagem (s)], [141,0], [#text(fill: rgb("#2E7D32"), weight: "bold")[6,5]], [≤ 10], [≤ 30], [*Alvo*],
    [QS-02 (S2)], [Vídeos em processamento simultâneo (contagem)], [1], [#text(fill: rgb("#2E7D32"), weight: "bold")[3]], [≥ 3], [≥ 2], [*Alvo*],
    [QS-02 (S2)], [Débito com N = 8 (vídeos/min)], [16,8], [#text(fill: rgb("#B00020"), weight: "bold")[18,8]], [≥ 25], [≥ 20], [*Não* (+12 %)],
    [QS-03 (S3)], [Réplicas de vídeo sob carga e regresso ao mínimo], [sempre 1], [#text(fill: rgb("#2E7D32"), weight: "bold")[até 3] do `video_effects` em 6–11 s; volta a 1 antes do fim da rajada], [≥ 3; volta em ≤ 120 s], [≥ 2; volta], [*Alvo*],
    [QS-03 (S3)], [Duração da rajada (s)], [158,8], [#text(fill: rgb("#B00020"), weight: "bold")[172,1]], [≤ 95], [≤ 127], [*Não* (+8 %)],
    [QS-07 (S4)], [Tempo de conclusão de um vídeo sozinho, 10 / 30 / 150 s (s)], [3,91 / 11,52 / 134,73], [3,91 / 10,54 / 137,93], [não piorar > 10 %], [≤ 1,0× a duração], [*Alvo* (pior caso +2,4 %)],
    [QS-04 (M1)], [Funcionalidades de vídeo interrompidas por C1 e C2 (0 a 3)], [3], [#text(fill: rgb("#2E7D32"), weight: "bold")[1]], [1], [≤ 2], [*Alvo*],
    [QS-05 (M1)], [C3, efeito novo: ficheiros, componentes, funcionalidades interrompidas], [6 / 3 / 3], [6 / 3 / #text(fill: rgb("#2E7D32"), weight: "bold")[1]], [descritivo], [—], [—],
    [M2], [Máximo de funcionalidades de vídeo numa unidade implantável], [3], [#text(fill: rgb("#2E7D32"), weight: "bold")[1]], [1], [≤ 2], [*Alvo*],
    [QS-06 (M3)], [Vídeos curtos afetados por uma falha da legendagem (%)], [100], [#text(fill: rgb("#2E7D32"), weight: "bold")[0] (0 em 3 repetições, 75 em 2)], [0], [≤ 25], [*Alvo* na mediana],
    [QS-06 (M3)], [Trabalhos perdidos (contagem)], [0], [0], [0], [0], [*Alvo*],
  ),
)

=== Análise dos resultados

*CAND-1, elasticidade.* O que o utilizador sente mudou: um vídeo curto pedido durante uma legendagem espera *6,5 s* em vez de *141 s*, há até 3 vídeos em processamento ao mesmo tempo e o `autoscaler` sobe e desce as réplicas como previsto. A espera que resta é o tempo de arranque de uma segunda réplica do `video_effects`, porque a legendagem começa por normalizar o vídeo nesse serviço. O que *não* melhorou foi a capacidade total. Os vídeos correm numa só máquina (8 CPU no Docker) e cada vídeo já usa 2 a 3 núcleos sozinho, porque o `ffmpeg` paraleliza por dentro. Com 3 réplicas ao mesmo tempo, cada vídeo fica mais lento (no S2 com N = 8, o processamento de cada vídeo passa de ≈ 3,4 s para ≈ 12 s), e o débito só sobe *12 %*: as réplicas dão paralelismo e isolamento, não CPU. Mais réplicas só dão mais débito com mais recursos (outra máquina ou mais CPU), o que fica para a evolução futura (capítulo 11).

A duração da rajada no S3 piorou 8 %. É marcada pela legendagem do vídeo de 177 s, o trabalho mais longo e que não se divide, agora um pouco mais lenta por disputar o CPU com os brilhos. O alvo de ≤ 95 s não era atingível com este cenário enquanto a legendagem sozinha demora mais do que isso (136 s na final): foi um erro da equipa na quantificação, que devia ter medido a rajada sem a legendagem, ou o tempo até ao fim do último vídeo curto.

*CAND-2, modularidade.* Os alvos foram todos atingidos. Cada serviço tem uma só funcionalidade (M2 = 1) e mudar a configuração ou o código da legendagem só reconstrói e reinicia o `video_subtitles` (M1 = 1). Acrescentar um efeito continua a tocar 6 ficheiros em 3 componentes, porque um efeito novo precisa sempre de ser exposto no _frontend_ e validado no `projects`; mas só interrompe a edição. Também desceu a complexidade ciclomática máxima do código de vídeo (22 para 20). Os 8 efeitos de fotograma continuam duplicados entre imagem e vídeo: não era objetivo desta fase.

No M3, uma falha da legendagem deixou de afetar os outros vídeos na mediana (0 %), e nenhum trabalho se perdeu. Em 2 das 5 repetições, 3 dos 4 vídeos curtos passaram o limite de "afetado" (21,1 s), com ≈ 28 s. Os _logs_ mostram que não foi a falha: esperaram 8 a 10 s que o `autoscaler` arrancasse réplicas novas do `video_effects` e depois disputaram o CPU com o reconhecimento de fala. Nenhum falhou.

*Outros atributos.* A matriz de efeitos confirmou-se. O tempo de um vídeo sozinho não piorou de forma relevante (pior caso +2,4 %, dentro da dispersão), a memória por réplica teve de ser medida e aumentada (EV-36) e o `autoscaler` tem acesso ao Docker do anfitrião (EV-35).

*Ameaças à validade.*
- Uma só máquina, um portátil: os resultados de capacidade não se generalizam para mais recursos e podem variar com a temperatura e a carga do sistema operativo.
- 5 repetições: chegam para a mediana, mas a dispersão de alguns cenários é grande (M3 de 0 a 75 %, S4 de 150 s com IQR de 31 s).
- Os tempos dependem da latência do `autoscaler` (leitura a cada 2 s, arranque de contentores), que é parte do que se mede, mas varia de repetição para repetição.
- O M1 é análise estática: conta o que tem de ser reconstruído e reiniciado, não mede o tempo de indisponibilidade.
- A primeira medição final foi inválida (EV-36) e foi repetida; os resultados aqui são os da segunda, com o mesmo método.

== Preservação funcional

#tab([Preservação funcional e testes de regressão],
  tabela(
    colunas: (2.6cm, 3.4cm, 2.8cm, 1fr, 2.6cm),
    tamanho: 8pt,
    [Zona alterada], [Testes de regressão existentes], [Lacunas de teste], [Testes acrescentados], [Resultado (imagem e vídeo)],
    [DA-1: filas, `autoscaler`, paragem graciosa do _worker_], [Nenhum (o mecanismo é novo)], [Comportamento do escalonamento com Docker e RabbitMQ reais, que depende do tempo], [`autoscaler/tests` (7: regra de réplicas, período de espera, limites, clonagem com os _labels_ do Compose, escolha das réplicas a remover); experiência contra um Docker real; o próprio S3], [7/7; S3 sem erros],
    [DA-2: divisão do `video_tool`, encadeamento no `projects`], [`Tools/video/tests` (74 pytest) e `projects/tests` (8 `node --test`), todos a passar na base], [O caminho das imagens não tinha testes automáticos; o encadeamento entre serviços não existia], [Os 74 testes movidos com o código para cada serviço (29 efeitos, 3 legendagem, 20 extração, 22 de _pipelines_ completos a correr pelos três serviços); 11 do _worker_ comum; 9 + 2 da divisão em etapas (os mesmos casos em Python e no `projects`); teste de ponta a ponta com imagem e vídeo no mesmo projeto, pela API], [*101/101* pytest, *10/10* `node --test`; ponta a ponta *15/15* (imagem e vídeo), igual à base],
  ),
)

#tab([Riscos para a preservação funcional e mitigação],
  tabela(
    colunas: (3.6cm, 1.8cm, 1fr, 4.4cm),
    tamanho: 8pt,
    [Risco], [Funcionalidade afetada], [Mitigação], [Teste de regressão],
    [Mudar a ordem dos efeitos ou deixar de aplicar um efeito ao dividir o _pipeline_ em etapas], [Vídeo], [O `projects` divide o _pipeline_ com as mesmas regras que o `video_tool` usava; os mesmos casos testados em Python e em JavaScript], [`Tools/tests/video_pipeline`; `projects/tests/video-stages.test.js`],
    [A legendagem deixar de ver o vídeo já cortado, ou a pré-visualização cortar na etapa errada], [Vídeo], [A mesma regra da base para a etapa onde a pré-visualização é cortada], [`test_order_and_preview`, `test_preview_after_temporal_edit`],
    [A extração de fotogramas deixar de ser o último passo, ou de ler o original quando é a única ferramenta], [Vídeo], [Validação no `projects` mantida; a etapa de extração é sempre a última], [`test_extraction_must_be_terminal_once`, `test_extraction_only_seeks_original_without_transcoding`, `test_captions_run_before_extraction`; `projects/tests/frame-extraction.test.js`],
    [Saídas parciais ou ficheiros intermédios esquecidos quando uma etapa falha ou é cancelada], [Vídeo], [Escrita atómica em cada serviço; pasta de trabalho apagada no fim, em erro e no cancelamento], [`test_encoder_failure_preserves_previous_output`, `test_model_failure_does_not_publish_partial_output`, `test_extractor_failure_leaves_previous_output`; `Tools/video_common/tests`],
    [A barra de progresso chegar aos 100 % antes do fim, ou recomeçar em cada etapa], [Vídeo], [Progresso calculado sobre o total das etapas; só a última chega aos 100 %], [`Tools/video_common/tests/test_worker.py`],
    [O encadeamento no `projects` partir o caminho das imagens], [Imagem], [O código das imagens não muda; teste de ponta a ponta com imagem e vídeo no mesmo projeto], [`Documentacao/testes_regressao/ponta_a_ponta.py` (casos A e B)],
  ),
)
