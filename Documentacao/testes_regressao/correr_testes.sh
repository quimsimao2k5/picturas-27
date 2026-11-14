#!/bin/bash
# Testes de regressão da solução (os que já vêm com o repositório), sempre da mesma forma.
#   ./correr_testes.sh baseline   (antes do refactoring)
#   ./correr_testes.sh final      (depois do refactoring)
# No Mac, abre-se com duplo clique em testes_inicial.command ou testes_final.command.
# Correm dentro das imagens Docker da solução (não precisam de ffmpeg nem de Node no anfitrião),
# como indica o README.md. Resultados em <fase>/.
set -o pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

FASE="${1:?indicar baseline ou final}"
TESTES="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$TESTES/../.." && pwd)"
OUT="$TESTES/$FASE"
mkdir -p "$OUT"
exec > >(tee "$OUT/terminal.log") 2>&1
cd "$REPO" || exit 1

echo "=== Testes de regressão ($FASE) — $(date) ==="
if ! docker info >/dev/null 2>&1; then
  echo "Docker não está a correr: a abrir o Docker Desktop..."
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 5; done
fi

# Constrói as imagens a partir do código atual, para testar exatamente esse código.
# Base: um só video_tool. Depois do refactoring: video_effects, video_subtitles,
# video_frames e autoscaler (cada conjunto de testes corre na imagem do seu serviço).
if [ -d Tools/video_effects ]; then
  SERVICOS_PY="video_effects video_subtitles video_frames autoscaler"
else
  SERVICOS_PY="video_tool"
fi
echo "=== Construir as imagens ($SERVICOS_PY projects) ==="
docker compose build $SERVICOS_PY projects || { echo "ERRO: build falhou"; exit 1; }

PYTEST="pip install -q pytest && python -m pytest -v -p no:cacheprovider"
rc_video=0
resumo_py=""
corre_pytest() {  # corre_pytest <nome> <ficheiro> <serviço> <comando> [opções do docker compose run]
  local nome="$1" ficheiro="$OUT/$2" svc="$3" cmd="$4"; shift 4
  echo "=== $nome (pytest, dentro da imagem do $svc) ==="
  docker compose run --rm --no-deps "$@" "$svc" sh -c "$cmd" | tee "$ficheiro"
  local rc=$?
  [ $rc -eq 0 ] || rc_video=$rc
  resumo_py="$resumo_py
$(printf '%-28s' "$nome:") $(grep -Eo '[0-9]+ (passed|failed)[^=]*' "$ficheiro" | tail -1) (código de saída $rc)"
}

if [ "$SERVICOS_PY" = "video_tool" ]; then
  corre_pytest "Tools/video/tests" pytest_video_tool.txt video_tool "$PYTEST tests"
else
  corre_pytest "Tools/video_effects/tests" pytest_video_effects.txt video_effects "$PYTEST tests video_common/tests"
  corre_pytest "Tools/video_subtitles/tests" pytest_video_subtitles.txt video_subtitles "$PYTEST tests"
  corre_pytest "Tools/video_frames/tests" pytest_video_frames.txt video_frames "$PYTEST tests"
  # testes do pipeline completo (os três serviços encadeados como o projects faz):
  # correm na imagem da legendagem, que tem todas as dependências, com Tools/ montado só para leitura
  corre_pytest "Tools/tests/video_pipeline" pytest_video_pipeline.txt video_subtitles \
    "$PYTEST /src/tests/video_pipeline" -v "$REPO/Tools:/src:ro" -e PYTHONDONTWRITEBYTECODE=1
  corre_pytest "autoscaler/tests" pytest_autoscaler.txt autoscaler "$PYTEST tests"
fi

echo "=== projects/tests (node --test, dentro da imagem do projects) ==="
docker compose run --rm --no-deps projects \
  sh -c "node --test --test-reporter=spec tests/*.test.js" \
  | tee "$OUT/node_projects.txt"
rc_projects=$?

{
  echo "Testes de regressão — $FASE — $(date -u +%Y-%m-%dT%H:%MZ)"
  echo "Commit: $(git rev-parse HEAD) ($(git log -1 --format=%s))"
  echo "Alterações locais ao código: $(git status --short -- . ':!Documentacao' | wc -l | tr -d ' ') ficheiros"
  echo "Máquina: $(sysctl -n hw.model 2>/dev/null) · $(sysctl -n machdep.cpu.brand_string 2>/dev/null)"
  echo "Docker: $(docker version --format '{{.Server.Version}}')"
  echo "Execução: dentro das imagens Docker de $SERVICOS_PY e do projects (docker compose run --rm --no-deps)"
  echo "${resumo_py#?}"
  echo "$(printf '%-28s' "projects/tests:") $(grep -E '(ℹ|#) (pass|fail) ' "$OUT/node_projects.txt" | tr '\n' ' ') (código de saída $rc_projects)"
} > "$OUT/ambiente.txt"
cat "$OUT/ambiente.txt"
[ $rc_video -eq 0 ] && [ $rc_projects -eq 0 ] && echo "TESTES OK" || echo "HÁ TESTES A FALHAR"
