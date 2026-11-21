#import "../template.typ": *

= Conclusões e Recomendações

== Adequação do padrão atual (global e do vídeo)

O padrão global (microsserviços com API Gateway, filas duráveis no RabbitMQ e orquestração no `projects`) é adequado ao vídeo, e foi ele que permitiu melhorá-lo sem mudar a arquitetura: bastou alinhar o vídeo com a decomposição por ferramenta que as imagens já seguiam. O padrão do vídeo da base (um _worker_ com o _pipeline_ todo numa mensagem) servia bem *um* vídeo de cada vez, com uma só descodificação e sem saídas parciais, mas não servia vários utilizadores nem a legendagem: os vídeos eram processados em série, uma legendagem atrasava um vídeo de 10 s em 141 s, e qualquer mudança ou falha na legendagem afetava todo o vídeo.

Depois do _refactoring_ (DA-1 e DA-2), o vídeo segue o padrão global. Os dois requisitos melhoraram no que se propunham: a espera de um vídeo curto durante uma legendagem caiu para *6,5 s*, passou a haver até *3* vídeos em paralelo com réplicas que acompanham a carga, cada funcionalidade de vídeo vive no seu serviço (M1 e M2 de *3* para *1*) e uma falha na legendagem deixou de atrasar os outros vídeos (*100 %* para *0 %* na mediana). O comportamento funcional foi preservado (101 + 10 testes e 15/15 verificações de ponta a ponta) e o tempo de um vídeo sozinho não piorou.

O que a equipa não conseguiu foi aumentar de forma relevante o débito (+12 %, abaixo do mínimo de 20 vídeos/min), porque numa só máquina as réplicas repartem o mesmo CPU; e o alvo da duração da rajada (S3) estava mal quantificado, porque dependia de um trabalho que não se divide.

== Sugestões de otimização

- Manter a separação por funcionalidade e as réplicas por fila, com a confirmação no fim e a escrita atómica que a base já tinha.
- Dimensionar os limites de memória de cada serviço a partir de medições e não de estimativas: a primeira medição final falhou por um limite de 1 GB escolhido sem dados (EV-36).
- Reduzir o tempo de arranque de uma réplica, que é hoje a maior parte da espera que resta (manter uma réplica de reserva quando há uma legendagem em curso, ou imagens Docker mais pequenas para os efeitos).
- Rever a quantificação do S3: medir a rajada sem a legendagem, ou o tempo até ao fim do último vídeo curto.

== Considerações para evolução futura

Numa só máquina, as réplicas dão paralelismo e isolamento, mas pouco débito extra. A capacidade só cresce com mais recursos, por exemplo vários nós com um orquestrador de contentores que faça o escalonamento a partir das filas (Kubernetes com KEDA ou HPA). Isso também dispensaria o acesso ao `docker.sock` a partir de um serviço, que é hoje o principal custo de segurança desta solução (EV-35). Ficam ainda por tratar as fragilidades do padrão global identificadas no diagnóstico: segurança (QS-09), carregamento em memória (QS-08) e confirmação das mensagens nas ferramentas de imagem (QS-10).

== Trabalho futuro

- *Valores não atingidos:* débito com N = 8 (18,8 contra o mínimo de 20 vídeos/min) e duração da rajada do S3; o primeiro precisa de mais recursos, o segundo de um alvo bem definido.
- *Hipóteses por confirmar:* H-05 (memória no carregamento de 1 GB), H-06 (perda de trabalho nas ferramentas de imagem), H-07 (`heartbeat=0`) e H-08 (custo do laço por fotograma em Python).
- *Duplicação:* os 8 efeitos de fotograma continuam implementados duas vezes (imagem e vídeo).
- *Robustez do M3:* reduzir a variação entre repetições (75 % em 2 de 5), que vem do arranque das réplicas e da disputa de CPU, e não da falha.

*Ligação à Fase 3.* O _refactoring_ facilita novas funcionalidades de vídeo: uma funcionalidade nova pode ser um serviço novo, com a sua fila, uma etapa no `videoStages` do `projects` e os seus próprios limites e réplicas no `autoscaler`, sem reconstruir nem reiniciar os serviços existentes. Um efeito novo de edição continua a tocar o _frontend_, o `projects` e o `video_effects` (M1, C3), mas já não interrompe a legendagem nem a extração. O `autoscaler` e o encadeamento por etapas passam a ser peças a manter, com testes próprios.
