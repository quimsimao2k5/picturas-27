#import "../template.typ": *

#set heading(numbering: "A.1.")
#counter(heading).update(0)

= Instruções de execução

O guia completo está em `Documentacao/COMO_TESTAR.md`; o método das medições em `Documentacao/medicoes/PLANO_MEDICAO.md` e o fluxo dos _scripts_ em `Documentacao/medicoes/FLUXO_DAS_MEDICOES.md`.

== Pré-requisitos

- Docker Desktop (os resultados oficiais usaram 8 CPU, 6 GB de memória e 1 GB de _swap_), Python 3.10 ou superior e Git. Não é preciso `ffmpeg` nem Node no anfitrião.
- Os lançadores *apagam os dados da instância* (contas, projetos, ficheiros, filas), mantendo só o modelo Whisper já descarregado: não os correr numa instância com dados a guardar.
- Durante as medições: computador ligado à corrente e sem trabalho pesado em simultâneo.
- No Mac, cada lançador abre-se com duplo clique no Finder (ficheiros `.command`); noutro sistema corre-se o `.sh` equivalente no Terminal.

== Lançar a solução

```
git clone https://github.com/quimsimao2k5/picturas-27.git
cd picturas-27
docker compose up -d --build
```

A aplicação fica em `https://localhost:8080`. O _commit_ de partida (`0523102`) lança-se da mesma forma; o nome do projeto Compose (`picturas`) é o mesmo da Fase 1, por isso os volumes antigos devem ser apagados antes do primeiro arranque.

== Repetir os testes de funcionamento

#tabela(
  colunas: (3.4cm, 1fr, 1fr),
  [Teste], [Base (duplo clique / Terminal)], [Depois do _refactoring_],
  [Regressão (82 na base, 111 no final)], [`testes_regressao/testes_inicial.command` · `./correr_testes.sh baseline`], [`testes_final.command` · `./correr_testes.sh final`],
  [Ponta a ponta (15 verificações)], [`ponta_a_ponta_inicial.command` · `./ponta_a_ponta.sh baseline`], [`ponta_a_ponta_final.command` · `./ponta_a_ponta.sh final`],
)

Os resultados ficam em `Documentacao/testes_regressao/<fase>/`.

== Repetir as medições

#tabela(
  colunas: (3.4cm, 1fr),
  [Medição], [Como correr (em `Documentacao/medicoes/`)],
  [Medição inicial (S1–S4, M2, M3)], [Com o código no _commit_ de partida: `medicao_inicial.command` ou `./lancar_medicao.sh baseline` (≈ 1 h 30 mais ≈ 8 min de _build_)],
  [Medição final], [`medicao_final.command` ou `./lancar_medicao.sh final --servico-legendas video_subtitles --servicos-log video_effects video_subtitles video_frames projects`],
  [M3 da base, sem mudar de ramo], [`m3_base.command`: lança o código da base numa pasta ao lado (`git worktree`) e corre só o M3],
  [Um só cenário], [`cd scripts && ../.venv/bin/python cenarios.py s1 --reps 5 --out ../verificacao` (`s1`, `s2`, `s3`, `s4` ou `m3`), depois `analisar.py ../verificacao`],
  [M1 (C1, C2, C3)], [`modularidade.py m1` com os ficheiros de cada mudança; C3 num ramo descartável com a sonda `C3_sonda.patch` (comandos em `COMO_TESTAR.md`, secção 3.9)],
)

Os resultados ficam em `Documentacao/medicoes/<baseline|final>/`: `resumo.md` com os números finais, um CSV por cenário com os dados brutos, amostras de recursos, _logs_ dos serviços para a verificação cruzada e `ambiente.json` com a máquina, o Docker e o _commit_.

= Glossário

#tabela(
  colunas: (4cm, 1fr),
  [Termo], [Definição],
  [_Apply_], [Pedido de processamento de um projeto: aplica o _pipeline_ a todas as imagens e vídeos],
  [_Pipeline_], [Sequência ordenada de ferramentas (efeitos) definida pelo utilizador num projeto],
  [Etapa], [Parte do _pipeline_ de um vídeo tratada por um só serviço (efeitos, legendagem ou extração); o `projects` envia uma etapa de cada vez],
  [Réplica], [Cópia de um contentor de um serviço que consome a mesma fila],
  [`autoscaler`], [Serviço novo que lê o tamanho das filas de vídeo e cria ou remove réplicas dos serviços de vídeo],
  [_Competing Consumers_], [Padrão em que vários consumidores leem a mesma fila e cada mensagem é tratada por um só],
  [_Ack_ manual], [Confirmação da mensagem ao RabbitMQ só no fim do trabalho; se o consumidor cair antes, a mensagem volta à fila],
  [Escrita atómica], [O resultado é escrito num ficheiro temporário e só substitui o anterior quando está completo],
  [Cenário de qualidade (QS-nn)], [Descrição verificável de um requisito de qualidade, com fonte, estímulo, artefacto, ambiente, resposta e medida],
  [Tática (TAT-nn)], [Decisão de desenho que influencia a resposta a um estímulo de um atributo de qualidade (Bass, Clements e Kazman)],
  [Decisão arquitetural (DA-n)], [Registo, ao estilo ADR, da tática escolhida, das alternativas e das consequências],
  [Evidência (EV-nn) / Hipótese (H-nn)], [Referência verificável que sustenta uma afirmação / afirmação ainda por confirmar, com o modo de o fazer],
  [S1 a S4], [Cenários de medição da elasticidade: bloqueio pela legendagem, carga concorrente, adaptação à carga e tempo de um vídeo sozinho (secção 6.2)],
  [M1 a M3], [Métricas da modularidade: impacto de uma mudança, divisão do processamento de vídeo e isolamento de uma falha (secção 6.2)],
  [C1, C2, C3], [Mudanças de referência do M1: trocar o modelo Whisper, corrigir o código da legendagem, acrescentar um efeito novo (sépia)],
  [Espera / conclusão], [Tempo do _Apply_ aceite ao primeiro evento de progresso / ao aviso de resultado gravado],
  [Débito], [Vídeos concluídos por minuto],
  [IQR], [Intervalo interquartil: diferença entre o 3.º e o 1.º quartis das repetições],
  [Funcionalidade de vídeo], [Edição (efeitos de fotograma e de tempo), legendagem automática ou extração de fotogramas],
  [CC], [Complexidade ciclomática de uma função (número de caminhos independentes)],
)
