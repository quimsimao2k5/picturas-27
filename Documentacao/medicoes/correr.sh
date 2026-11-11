#!/usr/bin/env bash
# Corre a medição completa (inicial ou final) com o mesmo método.
#   ./correr.sh baseline      -> resultados em Documentacao/medicoes/baseline/
#   ./correr.sh final         -> resultados em Documentacao/medicoes/final/
# Pré-requisitos: solução lançada (docker compose up -d --build) e Python 3.10+ no anfitrião.
set -euo pipefail

FASE="${1:?indicar baseline ou final}"
shift || true
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/$FASE"
mkdir -p "$OUT"

if [ ! -d "$DIR/.venv" ]; then
  python3 -m venv "$DIR/.venv"
  "$DIR/.venv/bin/pip" install -q -r "$DIR/requirements.txt"
fi
PY="$DIR/.venv/bin/python"

cd "$DIR/scripts"
"$PY" ambiente.py --out "$OUT"
"$PY" modularidade.py m2 --out "$OUT/m2" > /dev/null
"$PY" cenarios.py todos --reps 5 --out "$OUT" "$@" 2>&1 | tee "$OUT/execucao.log"
"$PY" analisar.py "$OUT"
