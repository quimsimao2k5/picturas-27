#!/bin/bash
# Repete o M3 da base com a falha aos 55 % do progresso da legendagem (decisão D33).
# O código da base (commit 0f70be2) é posto numa pasta ao lado, ../picturas-27-base
# (git worktree), sem mexer no código desta pasta. A solução de base é lançada a partir
# daí, com o mesmo método do lancar_medicao.sh (dados limpos, D12), e corre-se só o M3.
# O M3 anterior (falha aos 20 %) fica guardado em baseline/m3_20pct/.
# No Mac, abre-se com duplo clique em m3_base.command.
set -o pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

COMMIT_BASE=0f70be2
MEDICOES="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$MEDICOES/../.." && pwd)"
BASE="$(cd "$REPO/.." && pwd)/picturas-27-base"
OUT="$MEDICOES/baseline"
exec > >(tee -a "$OUT/m3_55_terminal.log") 2>&1

echo "=== M3 da base aos 55 % — início: $(date) ==="
if [ ! -d "$BASE" ]; then
  git -C "$REPO" worktree add --detach "$BASE" "$COMMIT_BASE" || { echo "ERRO: git worktree falhou"; exit 1; }
fi
echo "Código da base: $BASE ($(git -C "$BASE" log -1 --format='%h %s'))"
# Só o script dos cenários é o atualizado (opção --m3-progresso); o resto é o da base
cp "$MEDICOES/scripts/cenarios.py" "$BASE/Documentacao/medicoes/scripts/cenarios.py"

if ! docker info >/dev/null 2>&1; then
  echo "Docker não está a correr: a abrir o Docker Desktop..."
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 5; done
fi
echo "Docker: $(docker version --format '{{.Server.Version}}') · CPUs $(docker info --format '{{.NCPU}}') · memória $(docker info --format '{{.MemTotal}}')"

cd "$BASE" || exit 1
echo "=== Limpeza dos dados (mantém picturas_whisper_models): $(date) ==="
docker compose down --remove-orphans
for v in image_data project_data rabbitmq_data seaweedfs_data subscription_data user_data; do
  docker volume rm "picturas_$v" 2>/dev/null && echo "  apagado picturas_$v"
done

echo "=== docker compose up -d --build (código da base): $(date) ==="
docker compose up -d --build || { echo "ERRO: docker compose up falhou"; exit 1; }

echo "=== À espera que a API responda: $(date) ==="
for i in $(seq 1 480); do
  code=$(curl -sk -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
         -d '{"password":"x"}' https://localhost:8080/api-gateway/users/nao-existe@picturas.test/login)
  case "$code" in 4??) echo "API pronta (HTTP $code) após $((i*5)) s"; break ;; esac
  sleep 5
done
sleep 60   # margem para os workers se ligarem ao RabbitMQ
docker compose ps --format '{{.Service}}\t{{.Status}}'

# Guarda o M3 de 20 % (e o resumo da altura) antes de gravar o novo em baseline/m3
if [ -d "$OUT/m3" ] && [ ! -d "$OUT/m3_20pct" ]; then
  mv "$OUT/m3" "$OUT/m3_20pct"
  cp "$OUT/resumo.md" "$OUT/m3_20pct/resumo_com_m3_20pct.md"
  cp "$OUT/resumo.json" "$OUT/m3_20pct/resumo_com_m3_20pct.json"
fi
rm -rf "$OUT/m3"

PY="$MEDICOES/.venv/bin/python"
[ -x "$PY" ] || { python3 -m venv "$MEDICOES/.venv" && "$MEDICOES/.venv/bin/pip" install -q -r "$MEDICOES/requirements.txt"; }
echo "=== M3 (5 repetições, falha aos 55 %): $(date) ==="
cd "$BASE/Documentacao/medicoes/scripts" || exit 1
caffeinate -dimsu "$PY" cenarios.py m3 --reps 5 --out "$OUT" \
  --servico-legendas video_tool --m3-progresso 55 2>&1 | tee "$OUT/m3_55_execucao.log"
rc=$?
cd "$MEDICOES/scripts" && "$PY" analisar.py "$OUT"

cd "$BASE" && docker compose stop
echo "=== Fim: $(date) · código de saída $rc ==="
[ $rc -eq 0 ] && echo "CONCLUÍDO" || echo "TERMINOU COM ERRO"
echo "(A pasta $BASE pode ser apagada no fim: git worktree remove --force ../picturas-27-base)"
