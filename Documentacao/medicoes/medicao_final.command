#!/bin/bash
# Duplo clique no Finder: medição final (depois do refactoring). Ver lancar_medicao.sh.
# A legendagem passa a estar no serviço video_subtitles (DESENHO_SOLUCAO.md): o M3 termina esse
# serviço e guardam-se os logs dos três serviços de vídeo (mesma verificação cruzada da base).
exec "$(cd "$(dirname "$0")" && pwd)/lancar_medicao.sh" final \
  --servico-legendas video_subtitles \
  --servicos-log video_effects video_subtitles video_frames projects
