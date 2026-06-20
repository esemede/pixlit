#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-cf.sh — Configura el Worker pixlit en Cloudflare y sube env vars.
# Ejecutar UNA SOLA VEZ desde tu máquina local.
# Requiere: curl, jq  (brew install jq)
#
# Variables requeridas (exportar antes de correr):
#   export CLOUDFLARE_API_TOKEN="cfat_..."
#   export CLOUDFLARE_ACCOUNT_ID="6e82..."
#   export SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
#   (el resto son opcionales con fallback a REEMPLAZA)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?Falta CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Falta CLOUDFLARE_ACCOUNT_ID}"

CF_ID="$CLOUDFLARE_ACCOUNT_ID"
CF_TKN="$CLOUDFLARE_API_TOKEN"
WORKER="pixlit"
BASE="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer ${CF_TKN}" -H "Content-Type: application/json")

echo "▶ Subiendo secrets al Worker '${WORKER}' via wrangler..."

declare -A SECRETS
SECRETS["NEXT_PUBLIC_SUPABASE_URL"]="${NEXT_PUBLIC_SUPABASE_URL:-https://pureahggaxvrtfrgllzr.supabase.co}"
SECRETS["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_htXeHJ8T6Pezu_4yEHFNXw_OT4YMs-j}"
SECRETS["SUPABASE_SERVICE_ROLE_KEY"]="${SUPABASE_SERVICE_ROLE_KEY:?Falta SUPABASE_SERVICE_ROLE_KEY}"
SECRETS["NEXT_PUBLIC_APP_URL"]="${NEXT_PUBLIC_APP_URL:-https://pixlit.site}"
SECRETS["STRIPE_SECRET_KEY"]="${STRIPE_SECRET_KEY:-sk_live_REEMPLAZA}"
SECRETS["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_live_REEMPLAZA}"
SECRETS["STRIPE_WEBHOOK_SECRET"]="${STRIPE_WEBHOOK_SECRET:-whsec_REEMPLAZA}"
SECRETS["STRIPE_PRICE_STARTER"]="${STRIPE_PRICE_STARTER:-price_REEMPLAZA}"
SECRETS["STRIPE_PRICE_PRO"]="${STRIPE_PRICE_PRO:-price_REEMPLAZA}"
SECRETS["STRIPE_PRICE_BUSINESS"]="${STRIPE_PRICE_BUSINESS:-price_REEMPLAZA}"
SECRETS["MERCADOPAGO_ACCESS_TOKEN"]="${MERCADOPAGO_ACCESS_TOKEN:-APP_USR-REEMPLAZA}"
SECRETS["MERCADOPAGO_WEBHOOK_SECRET"]="${MERCADOPAGO_WEBHOOK_SECRET:-REEMPLAZA}"
SECRETS["PP_CLIID"]="${PP_CLIID:-REEMPLAZA}"
SECRETS["PP_SCRT"]="${PP_SCRT:-REEMPLAZA}"
SECRETS["PAYPAL_WEBHOOK_ID"]="${PAYPAL_WEBHOOK_ID:-REEMPLAZA}"
SECRETS["PAYPAL_PLAN_STARTER"]="${PAYPAL_PLAN_STARTER:-P-REEMPLAZA}"
SECRETS["PAYPAL_PLAN_PRO"]="${PAYPAL_PLAN_PRO:-P-REEMPLAZA}"
SECRETS["PAYPAL_PLAN_BUSINESS"]="${PAYPAL_PLAN_BUSINESS:-P-REEMPLAZA}"
SECRETS["KHIPU_RECEIVER_ID"]="${KHIPU_RECEIVER_ID:-REEMPLAZA}"
SECRETS["KHIPU_SECRET"]="${KHIPU_SECRET:-REEMPLAZA}"

for KEY in "${!SECRETS[@]}"; do
  VALUE="${SECRETS[$KEY]}"
  echo -n "  $KEY ... "
  echo "${VALUE}" | pnpm wrangler secret put "${KEY}" --name "${WORKER}" 2>&1 | tail -1
done

# ── Dominio personalizado pixlit.site → Worker pixlit ─────────────────
echo ""
echo "▶ Verificando ruta de dominio (Workers Routes)..."
ZONE_ID=$(curl -s "${BASE}/zones?name=pixlit.site" "${auth[@]}" | jq -r '.result[0].id // empty')

if [[ -n "$ZONE_ID" ]]; then
  RESULT=$(curl -s -X POST "${BASE}/zones/${ZONE_ID}/workers/routes" \
    "${auth[@]}" \
    --data "{\"pattern\":\"pixlit.site/*\",\"script\":\"${WORKER}\"}")
  echo "${RESULT}" | jq -r 'if .success then "✅ Ruta pixlit.site/* → \(.result.script)" else "⚠️  \(.errors[0].message // .errors)" end'
else
  echo "  ⚠️  Zona pixlit.site no encontrada — verifica que el dominio esté en Cloudflare"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "📋  Añade estos secrets en GitHub Actions:"
echo "    github.com/esemede/pixlit → Settings → Secrets and variables → Actions"
echo "════════════════════════════════════════════════════════════════════════"
echo "  CLOUDFLARE_API_TOKEN"
echo "  CLOUDFLARE_ACCOUNT_ID"
echo "  NEXT_PUBLIC_SUPABASE_URL"
echo "  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo "  (ver deploy-now.sh para la lista completa)"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "✅  Setup completo."
