#!/bin/bash
# Duplo clique no Finder: testes de regressão depois do refactoring. Ver correr_testes.sh.
exec "$(cd "$(dirname "$0")" && pwd)/correr_testes.sh" final
