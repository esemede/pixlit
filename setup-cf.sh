#!/usr/bin/env bash
# setup-cf.sh — configura Cloudflare para Pixlit
# Requiere .env con CF_TKN y CF_ID configurados

set -euo pipefail

if [ -f .env ]; then
  set -a; source .env; set +a
else
  echo "❌ .env no encontrado"; exit 1
fi

echo "Usando cuenta Cloudflare: $CF_ID"
echo "Configura el DNS y worker desde el dashboard: https://dash.cloudflare.com"
