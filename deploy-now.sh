#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# deploy-now.sh — Build + Deploy Pixlit a Cloudflare Workers
# Requiere: .env con CF_TKN, CF_ID y demás vars configuradas.
# Ejecutar desde el directorio raíz del proyecto: bash deploy-now.sh
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -f .env ]; then
  set -a; source .env; set +a
else
  echo "❌ No existe .env — copia .env.example y rellena los valores"
  exit 1
fi

WORKER="pixlit"

echo "▶ 1/4  Instalando dependencias..."
pnpm install

echo ""
echo "▶ 2/4  Build para Cloudflare Workers..."
NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
NEXT_PUBLIC_APP_URL="https://pixlit.site" \
NEXT_PUBLIC_PAYPAL_CLIENT_ID="$PP_CLIID" \
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_live_placeholder}" \
npx opennextjs-cloudflare build

echo ""
echo "▶ 3/4  Desplegando Worker pixlit..."
CLOUDFLARE_API_TOKEN="$CF_TKN" \
CLOUDFLARE_ACCOUNT_ID="$CF_ID" \
npx wrangler deploy --config wrangler.jsonc --name "$WORKER"

echo ""
echo "▶ 4/4  Subiendo secrets al Worker..."
push_secret() {
  local KEY="$1" VAL="$2"
  printf '%s' "$VAL" | \
    CLOUDFLARE_API_TOKEN="$CF_TKN" \
    npx wrangler secret put "$KEY" --name "$WORKER"
}

push_secret "NEXT_PUBLIC_SUPABASE_URL"              "$NEXT_PUBLIC_SUPABASE_URL"
push_secret "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"  "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
push_secret "SUPABASE_SERVICE_ROLE_KEY"             "$SB_SK"
push_secret "NEXT_PUBLIC_APP_URL"                   "https://pixlit.site"
push_secret "PP_CLIID"                              "$PP_CLIID"
push_secret "PP_SCRT"                               "$PP_SCRT"
push_secret "NEXT_PUBLIC_PAYPAL_CLIENT_ID"          "$PP_CLIID"
push_secret "PAYPAL_PLAN_STARTER"                   "$PAYPAL_PLAN_STARTER"
push_secret "PAYPAL_MODE"                           "live"
push_secret "PAYPAL_WEBHOOK_ID"                     "${PAYPAL_WEBHOOK_ID:-PENDIENTE}"

echo ""
echo "✅ Deploy completo. Visita https://pixlit.site"
