#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# deploy-now.sh — Build + Deploy Pixlit a Cloudflare Workers
# Requiere estas variables de entorno antes de correr:
#
#   export CLOUDFLARE_API_TOKEN="cfat_..."
#   export CLOUDFLARE_ACCOUNT_ID="6e82..."
#   export SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
#   export PP_CLIID="BAAP..."
#   export PP_SCRT="EOT0..."
#   export PAYPAL_PLAN_STARTER="P-..."
#   export PAYPAL_WEBHOOK_ID="..."
#
# O bien crea un archivo .env.deploy (nunca lo subas al repo) y cópialo aquí.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?Falta CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Falta CLOUDFLARE_ACCOUNT_ID}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Falta SUPABASE_SERVICE_ROLE_KEY}"

CF_TKN="$CLOUDFLARE_API_TOKEN"
CF_ID="$CLOUDFLARE_ACCOUNT_ID"
WORKER="pixlit"

NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://pureahggaxvrtfrgllzr.supabase.co}"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_htXeHJ8T6Pezu_4yEHFNXw_OT4YMs-j}"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://pixlit.site}"
PP_CLIENT_ID="${PP_CLIID:-}"
PP_SECRET="${PP_SCRT:-}"

echo "▶ 1/4  Instalando dependencias..."
pnpm install

echo ""
echo "▶ 2/4  Build para Cloudflare Workers..."
NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
NEXT_PUBLIC_PAYPAL_CLIENT_ID="$PP_CLIENT_ID" \
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
push_secret "SUPABASE_SERVICE_ROLE_KEY"             "$SUPABASE_SERVICE_ROLE_KEY"
push_secret "NEXT_PUBLIC_APP_URL"                   "$NEXT_PUBLIC_APP_URL"
push_secret "PP_CLIID"                              "$PP_CLIENT_ID"
push_secret "PP_SCRT"                               "$PP_SECRET"
push_secret "NEXT_PUBLIC_PAYPAL_CLIENT_ID"          "$PP_CLIENT_ID"
push_secret "PAYPAL_PLAN_STARTER"                   "${PAYPAL_PLAN_STARTER:-}"
push_secret "PAYPAL_MODE"                           "live"
push_secret "PAYPAL_WEBHOOK_ID"                     "${PAYPAL_WEBHOOK_ID:-PENDIENTE}"

echo ""
echo "✅ Deploy completo. Visita https://pixlit.site"
