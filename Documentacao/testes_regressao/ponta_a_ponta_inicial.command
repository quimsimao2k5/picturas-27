#!/bin/bash
# Duplo clique no Finder: teste de ponta a ponta antes do refactoring. Ver ponta_a_ponta.sh.
exec "$(cd "$(dirname "$0")" && pwd)/ponta_a_ponta.sh" baseline
