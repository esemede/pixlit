#!/usr/bin/env bash
# Doble-clic en Finder para ejecutar desde Mac
set -euo pipefail

DIR="/Users/semoreno/Projects/pixlit"
cd "$DIR"

if [ -f .env ]; then
  set -a; source .env; set +a
else
  echo "❌ No existe .env — configúralo primero"
  read -rp "Presiona Enter para cerrar..."; exit 1
fi

echo "▶ 1/3  Removiendo git lock..."
rm -f .git/index.lock

echo "▶ 2/3  GitHub secrets..."
bash setup-github-secrets.sh

echo "▶ 3/3  Commit + Push..."
git add -A
git commit -m "feat: deploy" || true
git push origin main

echo ""
echo "✅ ¡Listo! https://github.com/esemede/pixlit/actions"
read -rp "Presiona Enter para cerrar..."
