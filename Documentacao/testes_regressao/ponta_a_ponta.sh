#!/bin/bash
# Teste de ponta a ponta (D32): lança a solução e processa imagens e vídeos pela API pública.
#   ./ponta_a_ponta.sh baseline   (antes do refactoring)
#   ./ponta_a_ponta.sh final      (depois do refactoring)
# No Mac, abre-se com duplo clique em ponta_a_ponta_inicial.command ou ponta_a_ponta_final.command.
# Resultados em <fase>/ponta_a_ponta.txt e .json; registo do Terminal em <fase>/ponta_a_ponta_terminal.log.
set -o pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

FASE="${1:?indicar baseline ou final}"
TESTES="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$TESTES/../.." && pwd)"
MEDICOES="$REPO/Documentacao/medicoes"
OUT="$TESTES/$FASE"
mkdir -p "$OUT"
exec > >(tee "$OUT/ponta_a_ponta_terminal.log") 2>&1
cd "$REPO" || exit 1

echo "=== Teste de ponta a ponta ($FASE) — $(date) ==="
echo "Commit: $(git log -1 --format='%h %s')"
if ! docker info >/dev/null 2>&1; then
  echo "Docker não está a correr: a abrir o Docker Desktop..."
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 5; done
fi

# Mesmo estado inicial das medições (D12): dados limpos, modelo Whisper mantido
docker compose down --remove-orphans
for v in image_data project_data rabbitmq_data seaweedfs_data subscription_data user_data; do
  docker volume rm "picturas_$v" >/dev/null 2>&1 && echo "  apagado picturas_$v"
done
docker compose up -d --build || { echo "ERRO: docker compose up falhou"; exit 1; }

echo "=== À espera que a API responda ==="
for i in $(seq 1 480); do
  code=$(curl -sk -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
         -d '{"password":"x"}' https://localhost:8080/api-gateway/users/nao-existe@picturas.test/login)
  case "$code" in 4??) echo "API pronta (HTTP $code)"; break ;; esac
  sleep 5
done
sleep 60

if [ ! -d "$MEDICOES/.venv" ]; then
  python3 -m venv "$MEDICOES/.venv"
  "$MEDICOES/.venv/bin/pip" install -q -r "$MEDICOES/requirements.txt"
fi
"$MEDICOES/.venv/bin/python" "$TESTES/ponta_a_ponta.py" --out "$OUT"
rc=$?

echo "=== A parar os contentores (os dados ficam) ==="
docker compose stop
[ $rc -eq 0 ] && echo "PONTA A PONTA OK" || echo "PONTA A PONTA COM FALHAS"
