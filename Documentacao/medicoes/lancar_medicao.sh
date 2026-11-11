#!/bin/bash
# Lança a solução e corre uma medição completa da Fase 2 (par A), sempre com o mesmo método.
#   ./lancar_medicao.sh baseline   (medição inicial)
#   ./lancar_medicao.sh final      (medição final, depois do refactoring)
# No Mac, abre-se com duplo clique em medicao_inicial.command ou medicao_final.command.
# Tudo o que aparece no Terminal fica também em <fase>/terminal.log.
set -o pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

FASE="${1:?indicar baseline ou final}"
MEDICOES="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$MEDICOES/../.." && pwd)"
mkdir -p "$MEDICOES/$FASE"
exec > >(tee -a "$MEDICOES/$FASE/terminal.log") 2>&1

echo "=== Medição ($FASE) — início: $(date) ==="
cd "$REPO" || { echo "Não encontrei $REPO"; exit 1; }
echo "Commit: $(git log -1 --format='%h %s')"
echo "Python: $(command -v python3) $(python3 --version 2>&1)"

if ! docker info >/dev/null 2>&1; then
  echo "Docker não está a correr: a abrir o Docker Desktop..."
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 5; done
fi
echo "Docker: $(docker version --format '{{.Server.Version}}') · CPUs $(docker info --format '{{.NCPU}}') · memória $(docker info --format '{{.MemTotal}}')"

# Estado inicial limpo (decisão D12): apaga os dados da instância (contas, projetos,
# ficheiros, filas) e mantém só o modelo Whisper já descarregado.
echo "=== Limpeza dos dados (mantém picturas_whisper_models): $(date) ==="
docker compose down --remove-orphans
for v in image_data project_data rabbitmq_data seaweedfs_data subscription_data user_data; do
  docker volume rm "picturas_$v" 2>/dev/null && echo "  apagado picturas_$v"
done
docker volume ls --filter name=picturas_

echo "=== docker compose up -d --build: $(date) ==="
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

echo "=== Medição completa: $(date) ==="
# caffeinate impede o Mac de adormecer durante a medição
caffeinate -dimsu "$MEDICOES/correr.sh" "$FASE"
rc=$?
echo "=== Fim: $(date) · código de saída $rc ==="
[ $rc -eq 0 ] && echo "CONCLUÍDO" || echo "TERMINOU COM ERRO"
