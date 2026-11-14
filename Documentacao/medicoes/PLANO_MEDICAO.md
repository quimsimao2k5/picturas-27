# Plano de Medição — Fase 2 (Par A: Elasticidade + Modularidade do processamento de vídeo)

Este documento fixa o **método de medição** dos dois requisitos não funcionais escolhidos pela equipa (decisões D1, D6–D10 do `CONTEXTO_E_DECISOES_FASE2.md`). O mesmo método, com os mesmos scripts, vídeos e máquina, é usado na **medição inicial** (`baseline/`, sobre o commit `0523102`) e na **medição final** (`final/`, depois do refactoring). Os valores-alvo **não** estão aqui: são definidos na quantificação de cada requisito, a partir dos valores da medição inicial.

---

## 1. Ambiente

| Item | Valor |
|---|---|
| Máquina | Computador de medição da equipa (D3); modelo e processador registados automaticamente em `ambiente.json` |
| Docker Desktop | 8 CPU, 6 GB de memória, 1 GB de swap (iguais nas duas medições) |
| Solução | `docker compose up -d --build` no repositório, sem outras aplicações pesadas abertas |
| Commit | Registado em `ambiente.json` (medição inicial: `0523102`) |
| Acesso | Só pela interface pública: `https://localhost:8080` (nginx), como o utilizador |

O script `ambiente.py` grava a máquina, o processador, os recursos do Docker, o commit, as alterações locais e as imagens em execução.

## 2. Vídeos

| Vídeo | Duração | Uso | Origem |
|---|---|---|---|
| `sample_10s_720p.mp4` | 10 s | Vídeo curto em S1, S2, S3, S4 e M3 | `samples/video/` (repositório) |
| `speech_mandela_177s_1080p.webm` | 177 s, com fala | Legendagem em S1, S3 e M3 | `samples/video/` (repositório) |
| `02_curto_720p_30s.mp4` | 30 s | S4 | `Documentacao/medicoes/videos/` (copiado dos vídeos de teste da equipa) |
| `01_demo_1080p_150s.mp4` | 150 s | S4 | `Documentacao/medicoes/videos/` |

Pipelines: **brilho** = `brightness` com `brightness: 1.2` (efeito por fotograma, descodifica e codifica o vídeo inteiro); **legendagem** = `subtitles`.

## 3. Procedimento comum a todos os cenários

Cada trabalho é feito por um **utilizador de teste próprio**, criado pelo script com o percurso completo da aplicação:

1. registo de conta **premium** (os vídeos de 150 s e 177 s passam o limite de 60 s da conta gratuita; a conta premium não tem quota diária) e login;
2. criação de um projeto e carregamento do vídeo;
3. definição do pipeline;
4. ligação ao WebSocket com o token do utilizador;
5. pedido de processamento (`POST /process`);
6. espera pelos eventos do WebSocket; no fim, a conta e o projeto são apagados.

Os passos 1–4 **não contam** para os tempos. Instantes registados por trabalho:

| Instante | Definição |
|---|---|
| `submetido` | Resposta 201 ao pedido de processamento |
| `início` | Primeiro evento `video-progress` (não pré-visualização) do projeto: o trabalho começou a ser processado |
| `fim` | Evento `process-update`: o resultado foi gravado e o utilizador é avisado |

Métricas derivadas: **tempo de espera** = início − submetido; **tempo de conclusão** = fim − submetido. São tempos vistos pelo utilizador, independentes da arquitetura interna, por isso comparáveis antes e depois do refactoring.

**Aquecimento:** antes das medições corre uma legendagem e um brilho que são descartados (descarga do modelo Whisper e caches).

**Repetições:** 5 por cenário (D9). Para cada métrica reporta-se a mediana, o mínimo, o máximo e o intervalo interquartil (IQR). Há 10 s de pausa entre repetições e um tempo máximo de 30 min por trabalho (acima disso conta como falha).

**Recursos:** durante S1, S2, S3 e M3, o `monitor.py` amostra a cada 2 s: CPU e memória por contentor (`docker stats`), número de réplicas de cada serviço e mensagens prontas e em processamento em cada fila do RabbitMQ.

## 4. Elasticidade — cenários S1 a S4 (D7)

| Cenário | Objetivo | Passos | Métricas (unidade) |
|---|---|---|---|
| **S1** Bloqueio pela legendagem | Quanto uma legendagem atrasa um trabalho curto de outro utilizador | (a) controlo: brilho no vídeo de 10 s, sozinho; (b) legendagem do vídeo de 177 s; quando começa (primeiro progresso), outro utilizador pede brilho no vídeo de 10 s | Tempo de conclusão do curto sozinho e com legendagem (s); tempo de espera do curto (s); **atraso causado pela legendagem** = diferença (s); tempo da legendagem (s) |
| **S2** Carga concorrente | Como o sistema responde a vários pedidos ao mesmo tempo | N ∈ {1, 2, 4, 8} utilizadores pedem, no mesmo instante, brilho no vídeo de 10 s | Makespan (s); **débito** (vídeos/min); máximo de vídeos em processamento simultâneo; tempo médio e máximo de conclusão (s); espera média (s); trabalhos com erro |
| **S3** Adaptação à carga | Se os recursos acompanham a carga e voltam ao normal | 30 s de calma; rajada de 8 brilhos no vídeo de 10 s + 1 legendagem do de 177 s, pedidos ao mesmo tempo; 120 s de calma depois do último fim | **Réplicas** dos serviços de vídeo (máximo e variação); máximo de vídeos à espera e em processamento simultâneo (calculados a partir dos instantes de cada trabalho); CPU média dos serviços de vídeo durante a rajada (%); duração da rajada (s) |
| **S4** Tempo de edição / duração | Efeito colateral do refactoring no desempenho de um vídeo sozinho (REQ-VID-EDIT-010) | Brilho nos vídeos de 10 s, 30 s e 150 s, um de cada vez | Tempo de conclusão (s); **razão tempo / duração do vídeo** |

Na solução de base espera-se: S1 com atraso próximo da duração da legendagem, S2 com débito constante (os trabalhos são feitos um a um), S3 com 1 réplica sempre. Estas expectativas são o diagnóstico a confirmar; não são valores-alvo.

## 5. Modularidade — métricas M1 a M3 (D8)

| Métrica | O que mede | Método | Instrumento |
|---|---|---|---|
| **M1** Impacto de uma mudança | Quantas unidades implantáveis e funcionalidades de vídeo são afetadas por uma mudança típica | Para cada mudança de referência, lista dos ficheiros alterados; o script indica as unidades (serviços Compose) a reconstruir e a reiniciar, a partir do que cada Dockerfile copia, e as responsabilidades de vídeo interrompidas | `modularidade.py m1` |
| **M2** Acoplamento estático | Como o processamento de vídeo está dividido | Responsabilidades de vídeo por unidade implantável (consumir trabalhos de vídeo, efeitos por fotograma, efeitos de tempo, legendagem, extração de fotogramas, codificação); SLOC e complexidade ciclomática do Python de vídeo; dependências entre módulos; dispersão dos procedimentos de vídeo pelos componentes; efeitos duplicados entre imagem e vídeo; tamanho e ramificação do orquestrador | `modularidade.py m2` (radon e análise do código) |
| **M3** Isolamento de falhas | Se uma falha na legendagem afeta os outros trabalhos de vídeo | Legendagem do vídeo de 177 s; a 55 % do progresso (já na etapa da legendagem; D33, eram 20 % na primeira medição da base), 4 utilizadores pedem brilho no vídeo de 10 s; 5 s depois o serviço que faz a legendagem é terminado (`SIGKILL`) e arrancado 5 s depois | % de trabalhos curtos afetados (com erro, ou com tempo de conclusão acima de 1,5 × o tempo máximo de S2 com N = 4); trabalhos curtos com erro; legendagens concluídas |

**Escala do M1 e do M2 (decisão D24):** contam-se **funcionalidades de vídeo** — edição (efeitos de fotograma e de tempo), legendagem e extração de fotogramas. O script deteta 6 responsabilidades técnicas no código; duas delas (consumir trabalhos da fila e codificar com ffmpeg) são infraestrutura comum a todos os serviços de vídeo e não contam como funcionalidades. As 6 continuam nos resultados como detalhe. A base foi recalculada com esta escala a partir do mesmo código (`0523102`), sem medir de novo: os valores antigos mantêm-se iguais.

Mudanças de referência para M1 (decisão D18). Não são aplicadas ao produto: servem só para medir o impacto de uma mudança típica, antes e depois do *refactoring*.

| ID | Mudança | Ficheiros alterados na base |
|---|---|---|
| C1 | Alterar a configuração da legendagem (ex.: modelo Whisper) | `docker-compose.yaml` (bloco do `video_tool`) |
| C2 | Corrigir a lógica da legendagem | `Tools/video/subtitles.py` |
| C3 | Acrescentar um efeito de vídeo novo (REQ-VID-EDIT-013): sépia, só para vídeo e para todo o projeto | Os da sonda `baseline/m1/C3_sonda.patch`, escrita num ramo descartável a partir de `0523102` e nunca integrada: `Tools/video/effects.py`, `projects/utils/video.js`, `frontend/lib/tool-types.ts`, `frontend/components/toolbar/toolbar.tsx`, `frontend/components/toolbar/sepia-tool.tsx` (novo), `frontend/app/dashboard/[pid]/page.tsx` |

## 6. Como correr

**No Mac:** duplo clique em `Documentacao/medicoes/medicao_inicial.command` (ou `medicao_final.command`). Noutro sistema:

```bash
cd Documentacao/medicoes
./lancar_medicao.sh baseline   # final: ver medicao_final.command (indica os serviços de vídeo novos ao M3 e aos logs)
```

O `lancar_medicao.sh` limpa os dados da instância (mantendo o modelo Whisper, D12), corre `docker compose up -d --build`, espera que a API responda e chama o `correr.sh`; tudo o que aparece no Terminal fica em `<fase>/terminal.log`. O `correr.sh` cria um ambiente Python isolado (`.venv`), regista o ambiente, corre M2, o aquecimento e os cenários S4, S1, S2, S3 e M3, e gera o resumo. Cada cenário pode também correr sozinho (`python scripts/cenarios.py s1 --reps 5 --out baseline`). M1 corre à parte, porque não precisa da solução a correr (ver a seguir). Depois do refactoring, se a legendagem passar para outro serviço, indica-se esse serviço em M3 com `--servico-legendas <serviço>`; é a única opção que muda.

**M1 (impacto de uma mudança),** a correr em `Documentacao/medicoes/scripts/`:

```bash
# C1 — configuração da legendagem: indica o serviço que faz a legendagem (na base, video_tool)
python modularidade.py m1 --ficheiros docker-compose.yaml:video_tool --nome C1 --out ../baseline/m1
# C2 — código da legendagem: indica o ficheiro que a implementa (na base, Tools/video/subtitles.py)
python modularidade.py m1 --ficheiros Tools/video/subtitles.py --nome C2 --out ../baseline/m1
# C3 — efeito novo: num ramo descartável com a sonda aplicada (e com esse ramo em checkout)
python modularidade.py m1 --diff <commit-de-partida>..<ramo-da-sonda> --nome C3 --out ../baseline/m1
```

Na medição final repetem-se as três mudanças sobre o código refatorado: C1 e C2 com o serviço e o ficheiro onde a legendagem passar a estar, e C3 com o mesmo efeito sépia escrito de novo como a nova arquitetura exigir (o número de ficheiros e de serviços tocados é precisamente o que se mede). O `analisar.py` junta os resultados ao `resumo.md`.

Duração da medição completa: **1 h 24 min** na medição inicial (mais ≈ 8 min de construção das imagens).

## 7. Resultados

```
Documentacao/medicoes/<baseline|final>/
  ambiente.json            máquina, Docker, commit, imagens
  terminal.log             tudo o que apareceu no Terminal (limpeza, arranque e medição)
  execucao.log             registo da execução
  resumo.md / resumo.json  mediana, mín., máx. e IQR de cada métrica
  s1/ s2/ s3/ s4/ m3/      um CSV por cenário (um registo por trabalho), amostras de recursos
                           e logs com hora dos serviços de vídeo e do projects (logs_<cenário>.txt)
  m2/  m1/                 métricas de modularidade (JSON)
  prints/                  capturas de ecrã para o relatório
```

### Verificação dos resultados

- Os valores são todos gerados pelos scripts; nenhum é escrito à mão. O `ambiente.json` regista o commit e o `git status` (o código da aplicação não foi alterado).
- **Verificação cruzada:** em cada cenário guardam-se os logs, com hora, do `video_tool` e do `projects` (`logs_<cenário>.txt`). O `video_tool` regista, por vídeo, `[video] msg=… ok frames=… t=XXs`: é uma fonte independente destes scripts para confirmar o número de trabalhos e os seus tempos de processamento. Depois do refactoring, indicam-se os serviços de vídeo novos com `--servicos-log`.
- **Repetição por outra pessoa:** qualquer elemento pode repetir um cenário na mesma máquina (ex.: `python scripts/cenarios.py s1 --reps 1 --out verificacao`) e comparar a ordem de grandeza.

## 8. Limitações e questões para a equipa

- **Início do processamento:** é medido pelo primeiro evento de progresso que chega ao utilizador; se o worker demorar a enviar o primeiro progresso, a espera fica ligeiramente sobrestimada. O critério é o mesmo nas duas medições.
- **Conta premium criada diretamente no registo**, sem passar pelo fluxo de subscrição (que não é objeto da medição).
- **Amostragem de recursos (constatado na medição inicial):** cada amostra demora cerca de 7 s, e não 2 s (`docker stats` e a consulta às filas são lentos), e a consulta às filas do RabbitMQ não devolve dados. O monitor não é alterado, para o instrumento ser o mesmo nas duas medições. Por isso, **as métricas de fila e de paralelismo calculam-se a partir dos instantes de cada trabalho** (`analisar.py`, função `concorrencia`): vídeos à espera = submetidos e ainda sem progresso; vídeos em processamento simultâneo = entre o primeiro progresso e o fim. Este cálculo é exato e não depende de como a fila é implementada. O instante `fim` inclui gravar o resultado e avisar o utilizador (0,3–0,9 s na verificação cruzada com o log do `video_tool`), por isso, para o paralelismo, o processamento conta até `fim − 1 s`: sobreposições mais curtas são o worker a começar o vídeo seguinte enquanto o anterior é gravado, e não processamento em paralelo.
- **Uma só máquina:** a elasticidade é medida dentro dos 8 CPU e 6 GB atribuídos ao Docker; não há escalonamento entre máquinas.
- **Questão:** as mudanças de referência de M1 (C1–C3) e o ramo de sonda para C3 precisam de aprovação da equipa.
