#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# setup-github-secrets.sh — Sube todos los secrets a GitHub
# Requiere: gh CLI autenticado como esemede
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="esemede/pixlit"

# Carga .env y .env.local si existen
[ -f .env ]       && set -a && source .env       && set +a
[ -f .env.local ] && set -a && source .env.local && set +a

echo "▶ Subiendo secrets a github.com/$REPO ..."

gh secret set CLOUDFLARE_API_TOKEN               --repo "$REPO" --body "${CF_TKN}"
gh secret set CLOUDFLARE_ACCOUNT_ID              --repo "$REPO" --body "${CF_ID}"
gh secret set NEXT_PUBLIC_SUPABASE_URL           --repo "$REPO" --body "${NEXT_PUBLIC_SUPABASE_URL}"
gh secret set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}"
gh secret set SUPABASE_SERVICE_ROLE_KEY          --repo "$REPO" --body "${SB_SK}"
gh secret set PP_CLIID                           --repo "$REPO" --body "${PP_CLIID}"
gh secret set PP_SCRT                            --repo "$REPO" --body "${PP_SCRT}"
gh secret set NEXT_PUBLIC_PAYPAL_CLIENT_ID       --repo "$REPO" --body "${PP_CLIID}"
gh secret set PAYPAL_PLAN_STARTER                --repo "$REPO" --body "${PAYPAL_PLAN_STARTER}"
gh secret set PAYPAL_WEBHOOK_ID                  --repo "$REPO" --body "${PAYPAL_WEBHOOK_ID:-PENDIENTE}"
gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --repo "$REPO" --body "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_live_placeholder}"

echo ""
echo "✅ Secrets configurados."
