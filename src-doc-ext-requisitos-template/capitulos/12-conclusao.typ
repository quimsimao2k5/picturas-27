#import "../template.typ": *

= Conclusão

#orientacao[
  Sintetizem os contributos (não repitam o conteúdo): o que o MVP de vídeo valida, o que ficou por fazer e
  porquê, e que lições tiram do processo. Terminem com a ligação à Fase 2: que requisitos não funcionais
  consideram prioritários para melhoria por _refactoring_.
]

O MVP mostra que o PictuRAS consegue receber, validar, guardar, reproduzir e processar vídeo sem alterar as funcionalidades de imagem. Valida, em particular, o carregamento de ficheiros grandes com progresso real, a validação de contentores e codecs no servidor, os limites por perfil, a entrega progressiva por URL assinado, o limite de transmissões simultâneas e o ciclo de vida completo de um processamento demorado, incluindo a reserva e a devolução de quota, a repetição após falha, o cancelamento e a retoma após um reinício.

*O que ficou por fazer:* a medição formal das metas de tempo, a prioridade do Premium na fila de recortes e a correção dos defeitos da solução de base T-04 e T-05. Ficaram de fora por terem menos impacto na validação do MVP do que o fluxo funcional completo, que foi a prioridade.

*Lições do processo:* fechar cedo as decisões transversais (formatos, limites, quota, retenção) evitou incoerências entre os três casos de uso. A implementação revelou lacunas nos casos de uso, como o espaço do resultado do recorte (E7) ou a contagem de transmissões quando o navegador é fechado à força, que foram decididas pela equipa e levadas de volta aos MD. Ter os identificadores dos requisitos nos nomes dos testes tornou a rastreabilidade até à verificação direta.

*Ligação à Fase 2:* os requisitos não funcionais prioritários para _refactoring_ são a escalabilidade do processamento (REQ-VID-TRIM-058: de 5 recortes num contentor para processamento distribuído por um _broker_), o desempenho e a capacidade da reprodução (REQ-VID-PLAY-034, 044, 045) e a compatibilidade de formatos e codecs (UC-VID-002/DQ-006: WebM, MKV, H.265, VP9, Opus), que exigirá transcodificação.
