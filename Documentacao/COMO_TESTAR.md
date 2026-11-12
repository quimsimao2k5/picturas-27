# Como Testar — Medições e Testes da Fase 2

Guia único para **perceber e repetir** tudo o que foi medido e testado na Fase 2: o que cada medição ou teste verifica, como funciona, o que se espera, como se corre e onde ficam os resultados. Os pormenores do método estão em `medicoes/PLANO_MEDICAO.md` e o fluxo dos scripts em `medicoes/FLUXO_DAS_MEDICOES.md`.

---

## 1. Visão geral

A Fase 2 compara a solução **antes** (base, commit `0523102`) e **depois** do *refactoring*, com os mesmos métodos, na mesma máquina e nas mesmas condições.

| Grupo | O que responde | Itens | Duração |
|---|---|---|---|
| **Medições dos requisitos** | Os requisitos melhoraram? | Elasticidade: **S1, S2, S3, S4**. Modularidade: **M1, M2, M3** | ≈ 1 h 30 (+ ≈ 8 min de *build*) |
| **Testes de funcionamento** | O sistema continua a fazer o mesmo? | **Testes de regressão** da base (82) e **teste de ponta a ponta** (15 verificações) | ≈ 4 min + ≈ 5 min |

Requisitos melhorados: **Eficiência de desempenho — capacidade / elasticidade** e **Manutenibilidade — modularidade** do processamento de vídeo.

## 2. Antes de correr qualquer coisa

- **Máquina e recursos:** os resultados oficiais foram obtidos num MacBook Pro 13" M2 (8 núcleos, 8 GiB) com o Docker Desktop a **8 CPU, 6 GB de memória e 1 GB de swap**. Para comparar com a base, usar a mesma configuração.
- **Necessário:** Docker Desktop, Python 3.10 ou superior, Git. Não é preciso `ffmpeg` nem Node no anfitrião.
- **Estado limpo (decisão D12):** os lançadores das medições e do teste de ponta a ponta **apagam os dados da instância** (contas, projetos, ficheiros, filas), mantendo apenas o modelo Whisper já descarregado. Não correr numa instância com dados que se queiram guardar.
- **Durante as medições:** Mac ligado à corrente, tampa aberta e sem trabalho pesado ao mesmo tempo (o lançador impede o Mac de adormecer).
- **No Mac**, cada lançador abre-se com **duplo clique no Finder** (ficheiros `.command`). Noutro sistema, corre-se o `.sh` equivalente a partir do Terminal.

---

## 3. Medições dos requisitos

### 3.1 Como correr

| Quando | Mac (duplo clique) | Terminal |
|---|---|---|
| Medição inicial (base) | `medicoes/medicao_inicial.command` | `cd Documentacao/medicoes && ./lancar_medicao.sh baseline` |
| Medição final | `medicoes/medicao_final.command` | `cd Documentacao/medicoes && ./lancar_medicao.sh final --servico-legendas video_subtitles --servicos-log video_effects video_subtitles video_frames projects` |

O lançador limpa os dados, faz `docker compose up -d --build`, espera que a API responda e chama o `correr.sh`, que regista o ambiente e corre M2, aquecimento, S4, S1, S2, S3 e M3, gerando no fim o `resumo.md`. O M1 corre à parte (3.9).

Para correr **um só cenário** (com a solução já lançada e o ambiente Python criado pelo `correr.sh`):

```bash
cd Documentacao/medicoes/scripts
../.venv/bin/python cenarios.py s1 --reps 5 --out ../verificacao   # s1, s2, s3, s4, m3 ou aquecimento
../.venv/bin/python analisar.py ../verificacao
```

As pastas de verificação (como `verificacao/`) não vão para o repositório.

### 3.2 Como se mede um trabalho (comum a S1–S4 e M3)

Cada trabalho é feito por um **utilizador de teste próprio**, pela API pública (`https://localhost:8080`), como o frontend: criar conta premium → login → criar projeto → carregar o vídeo → definir o pipeline → ligar ao WebSocket → **pedir o processamento**. Só a partir daqui conta o tempo:

- **submetido** — resposta 201 ao pedido de processamento;
- **início** — primeiro evento `video-progress` (o vídeo começou a ser processado);
- **fim** — evento `process-update` (resultado gravado, utilizador avisado).

**Tempo de espera** = início − submetido. **Tempo de conclusão** = fim − submetido. Cada cenário tem 5 repetições; reporta-se a mediana, o mínimo, o máximo e o IQR. Antes dos cenários há um **aquecimento** (descartado).

### 3.3 S1 — Bloqueio pela legendagem (elasticidade)

- **Pergunta:** quanto tempo espera um vídeo curto de um utilizador se outro utilizador estiver a legendar um vídeo?
- **Fluxo (por repetição):** (1) controlo: brilho num vídeo de 10 s, sozinho; (2) legendagem do vídeo de fala de 177 s; assim que começa, outro utilizador pede o brilho no vídeo de 10 s.
- **Métricas:** tempo de conclusão do vídeo curto sozinho e com legendagem; **espera** do vídeo curto; atraso causado pela legendagem.
- **Base:** sozinho 3,9 s; com legendagem **espera 141 s** (conclusão 144,7 s).
- **Alvo / mínimo:** espera ≤ 10 s / ≤ 30 s.

### 3.4 S2 — Carga concorrente (elasticidade)

- **Pergunta:** o sistema processa mais vídeos por minuto quando há mais utilizadores?
- **Fluxo:** 1, 2, 4 e 8 utilizadores pedem o brilho no vídeo de 10 s **no mesmo instante**.
- **Métricas:** **débito** (vídeos/min), tempo médio e máximo de conclusão, espera média, **máximo de vídeos em processamento ao mesmo tempo**, erros.
- **Base:** débito 15,9 / 16,7 / 17,6 / **16,8** vídeos/min; nunca mais de **1** vídeo em processamento.
- **Alvo / mínimo:** ≥ 3 / ≥ 2 vídeos em paralelo; débito com 8 utilizadores ≥ 25 / ≥ 20 vídeos/min.

### 3.5 S3 — Adaptação à carga (elasticidade)

- **Pergunta:** os recursos do processamento de vídeo sobem com a carga e voltam ao normal depois?
- **Fluxo:** 30 s de calma → rajada (8 brilhos + 1 legendagem ao mesmo tempo) → 120 s de calma depois do último fim, sempre a amostrar réplicas, CPU e memória dos contentores.
- **Métricas:** réplicas dos serviços de vídeo (máximo e variação), máximo de vídeos à espera e em processamento, CPU média na rajada, duração da rajada.
- **Base:** **1 réplica sempre**; até 9 vídeos à espera; 319 % de CPU de 800 % disponíveis; rajada em 158,8 s.
- **Alvo / mínimo:** réplicas sobem até ≥ 3 / ≥ 2 e voltam ao mínimo (≤ 120 s após a carga); rajada ≤ 95 s / ≤ 127 s.

### 3.6 S4 — Tempo de um vídeo sozinho (efeito colateral)

- **Pergunta:** o *refactoring* tornou mais lento um vídeo sem concorrência?
- **Fluxo:** brilho nos vídeos de 10 s, 30 s e 150 s, um de cada vez.
- **Métrica:** tempo de conclusão / duração do vídeo.
- **Base:** 0,39× (10 s), 0,38× (30 s), 0,90× (150 s, 1080p).
- **Alvo / mínimo:** não piorar mais de 10 % / ≤ 1,0× (REQ-VID-EDIT-010).

### 3.7 M3 — Isolamento de falhas (modularidade)

- **Pergunta:** se o serviço que faz a legendagem falhar a meio, o que acontece aos outros vídeos?
- **Fluxo:** legendagem do vídeo de 177 s; aos 20 % de progresso, 4 utilizadores pedem brilhos no vídeo de 10 s; 5 s depois, o serviço da legendagem é **terminado à força** (`docker compose kill -s SIGKILL`) e arrancado 5 s depois. Na base é o `video_tool`; depois do *refactoring* é o `video_subtitles` (opção `--servico-legendas`).
- **Métricas:** % de vídeos curtos afetados (com erro ou com tempo de conclusão acima de 1,5 × o máximo do S2 com 4 utilizadores); vídeos curtos falhados; legendagens concluídas (sem perda de trabalho).
- **Base:** **100 % afetados** (133 s em vez de 14 s), 0 perdidos, 5/5 legendagens refeitas.
- **Alvo / mínimo:** 0 % / ≤ 25 % afetados; 0 perdidos.

### 3.8 M2 — Acoplamento estático (modularidade)

- **Pergunta:** quantas funcionalidades de vídeo estão juntas no mesmo serviço?
- **Fluxo:** análise do código e da configuração, sem correr a solução. Para cada serviço do `docker-compose.yaml`, o script lê o `Dockerfile`, vê que ficheiros entram na imagem e procura as funcionalidades de vídeo: **edição** (efeitos de fotograma e de tempo), **legendagem** e **extração de fotogramas** (decisão D24). Calcula também tamanho e complexidade do código de vídeo, dependências, efeitos duplicados e a ramificação imagem/vídeo no `projects`.
- **Base:** as **3 funcionalidades no mesmo serviço** (`video_tool`); 8 efeitos duplicados entre imagem e vídeo.
- **Alvo / mínimo:** 1 / ≤ 2 funcionalidades por serviço.
- **Comando:** corre dentro do `correr.sh`; à parte: `../.venv/bin/python modularidade.py m2 --out ../<fase>/m2`.

### 3.9 M1 — Impacto de uma mudança (modularidade)

- **Pergunta:** se um programador fizer uma mudança típica, quantos serviços têm de ser reconstruídos/reiniciados e quantas funcionalidades de vídeo param entretanto?
- **Fluxo:** três mudanças de referência (**não são aplicadas ao produto**). O script recebe os ficheiros que cada uma toca e calcula, pelos `Dockerfile`, as unidades a reconstruir e a reiniciar e as funcionalidades interrompidas.
  - **C1** — trocar o modelo Whisper (uma linha de configuração do serviço da legendagem);
  - **C2** — corrigir o código da legendagem (`subtitles.py`);
  - **C3** — acrescentar um efeito de vídeo novo (sépia), escrito num **ramo descartável** que nunca é integrado; na base está em `medicoes/baseline/m1/C3_sonda.patch`.
- **Base:** C1 e C2 interrompem as **3** funcionalidades; C3 toca 6 ficheiros em 3 componentes e também interrompe as 3.
- **Alvo / mínimo:** C1 e C2 interrompem 1 / ≤ 2 funcionalidades.
- **Comandos** (em `Documentacao/medicoes/scripts/`):

```bash
# Base (serviço video_tool, ficheiro Tools/video/subtitles.py)
../.venv/bin/python modularidade.py m1 --ficheiros docker-compose.yaml:video_tool --nome C1 --out ../baseline/m1
../.venv/bin/python modularidade.py m1 --ficheiros Tools/video/subtitles.py --nome C2 --out ../baseline/m1
# C3: com o ramo da sonda em checkout
../.venv/bin/python modularidade.py m1 --diff <commit-de-partida>..<ramo-da-sonda> --nome C3 --out ../baseline/m1
# Final: o mesmo, com o serviço e o ficheiro onde a legendagem passar a estar
#   (ex.: docker-compose.yaml:video_subtitles e Tools/video_subtitles/subtitles.py) e a sonda C3 reescrita
../.venv/bin/python analisar.py ../<fase>        # junta o M1 ao resumo.md
```

### 3.10 Resultados das medições

`Documentacao/medicoes/<baseline|final>/`

| Ficheiro | Conteúdo |
|---|---|
| `resumo.md` | **Os números finais** (mediana, mín., máx., IQR) de todas as medições |
| `<cenário>/<cenário>.csv` | Um registo por trabalho medido (dados brutos) |
| `<cenário>/*_recursos.csv`, `*_sistema.csv` | Amostras de CPU, memória e réplicas por repetição |
| `<cenário>/logs_<cenário>.txt` | Logs dos serviços de vídeo e do `projects` (verificação cruzada) |
| `m1/`, `m2/` | Resultados da modularidade |
| `ambiente.json`, `terminal.log`, `execucao.log` | Máquina, Docker, commit e registo da execução |
| `prints/` | Capturas de ecrã |

**Verificação cruzada:** o serviço de vídeo escreve, por vídeo, `[video] msg=… ok frames=… t=XXs`. O número de vídeos e os tempos de processamento dos logs têm de bater com os CSV (na base: diferença inferior a 0,4 s por trabalho).

---

## 4. Testes de funcionamento

### 4.1 Testes de regressão da base (82 testes)

- **O que testam:** os testes automáticos que já vêm com a solução.
  - `Tools/video/tests` (74, pytest): processamento de vídeo (efeitos, `trim`, `speed`, codificação), legendagem com o reconhecimento de fala **simulado** e extração de fotogramas.
  - `projects/tests` (8, `node --test`): encadeamento do pipeline de vídeo, regras da extração de fotogramas, despacho do lote de trabalhos.
- **Fluxo:** constrói as imagens do `video_tool` e do `projects` a partir do código atual e corre cada conjunto num **contentor temporário** (`docker compose run --rm --no-deps`). Os outros serviços não arrancam: os testes verificam o código, não o sistema a correr.
- **Esperado:** 74/74 e 8/8 (base: tudo a passar). Depois do *refactoring* os testes de `Tools/video/tests` mudam de pasta com o código (D30), sem mudar o que verificam.

| Quando | Mac (duplo clique) | Terminal |
|---|---|---|
| Base | `testes_regressao/testes_inicial.command` | `cd Documentacao/testes_regressao && ./correr_testes.sh baseline` |
| Final | `testes_regressao/testes_final.command` | `cd Documentacao/testes_regressao && ./correr_testes.sh final` |

Resultados em `testes_regressao/<fase>/`: `pytest_video_tool.txt`, `node_projects.txt`, `ambiente.txt` (resumo) e `terminal.log`.

### 4.2 Teste de ponta a ponta (15 verificações)

- **O que testa:** o sistema completo a funcionar, pela API pública, para **imagens e vídeos**. Cobre o caminho das imagens, que os testes da base não cobrem (decisão D32).
- **Fluxo:** limpa os dados, lança a solução, espera pela API e corre três casos, cada um com uma conta e um projeto próprios; no fim pára os contentores.

| Caso | Projeto e pipeline | Verificações |
|---|---|---|
| **A** | Uma imagem (640×480): brilho → rotação 90° | Pré-visualização é o PNG rodado (480×640); processamento sem erro; 1 resultado; resultado é o PNG rodado |
| **B** | Uma imagem + um vídeo de 10 s: brilho → corte do vídeo (1–6 s) → legendas | Pré-visualização do vídeo em MP4 com ≤ 3,5 s; processamento sem erro; 2 resultados; a imagem só leva o brilho (640×480); o vídeo sai em MP4 com ≈ 5 s |
| **C** | Um vídeo de 10 s: brilho → extração de 3 fotogramas PNG | Processamento sem erro; 3 resultados; PNG 1280×720; nomes únicos |

- **Esperado:** 15/15 (base: 15/15).

| Quando | Mac (duplo clique) | Terminal |
|---|---|---|
| Base | `testes_regressao/ponta_a_ponta_inicial.command` | `cd Documentacao/testes_regressao && ./ponta_a_ponta.sh baseline` |
| Final | `testes_regressao/ponta_a_ponta_final.command` | `cd Documentacao/testes_regressao && ./ponta_a_ponta.sh final` |

Resultados em `testes_regressao/<fase>/`: `ponta_a_ponta.txt` (lista de verificações), `ponta_a_ponta.json` e `ponta_a_ponta_terminal.log`.

---

## 5. Ordem para a fase final (depois do *refactoring*)

1. `testes_regressao/testes_final.command` → 82 testes a passar.
2. `testes_regressao/ponta_a_ponta_final.command` → 15/15.
3. `medicoes/medicao_final.command` → S1–S4, M2, M3 (≈ 1 h 30).
4. M1 sobre o código novo (3.9).
5. Comparar `medicoes/baseline/resumo.md` com `medicoes/final/resumo.md` e com os alvos (`CONTEXTO_E_DECISOES_FASE2.md`, secção 4B).
