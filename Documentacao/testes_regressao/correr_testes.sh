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

# Constrói as imagens a partir do código atual, para testar exatamente esse código
echo "=== Construir as imagens do video_tool e do projects ==="
docker compose build video_tool projects || { echo "ERRO: build falhou"; exit 1; }

echo "=== Tools/video/tests (pytest, dentro da imagem do video_tool) ==="
docker compose run --rm --no-deps video_tool \
  sh -c "pip install -q pytest && python -m pytest -v -p no:cacheprovider tests" \
  | tee "$OUT/pytest_video_tool.txt"
rc_video=$?

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
  echo "Execução: dentro das imagens Docker do video_tool e do projects (docker compose run --rm --no-deps)"
  echo
  echo "Tools/video/tests: $(grep -Eo '[0-9]+ (passed|failed)[^=]*' "$OUT/pytest_video_tool.txt" | tail -1) (código de saída $rc_video)"
  echo "projects/tests:    $(grep -E '(ℹ|#) (pass|fail) ' "$OUT/node_projects.txt" | tr '\n' ' ') (código de saída $rc_projects)"
} > "$OUT/ambiente.txt"
cat "$OUT/ambiente.txt"
[ $rc_video -eq 0 ] && [ $rc_projects -eq 0 ] && echo "TESTES OK" || echo "HÁ TESTES A FALHAR"
