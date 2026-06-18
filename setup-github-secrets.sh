#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# setup-github-secrets.sh
# Sube todos los secrets a GitHub para que el deploy automático funcione.
# Requiere: gh CLI autenticado  →  brew install gh && gh auth login
# Copia .env.example a .env y rellena los valores antes de correr esto.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="esemede/pixlit"

# Carga variables desde .env
if [ -f .env ]; then
  set -a; source .env; set +a
else
  echo "❌ No existe .env — copia .env.example y rellena los valores"
  exit 1
fi

echo "▶ Subiendo secrets a github.com/$REPO ..."

gh secret set CLOUDFLARE_API_TOKEN              --repo "$REPO" --body "$CF_TKN"
gh secret set CLOUDFLARE_ACCOUNT_ID             --repo "$REPO" --body "$CF_ID"
gh secret set NEXT_PUBLIC_SUPABASE_URL          --repo "$REPO" --body "$NEXT_PUBLIC_SUPABASE_URL"
gh secret set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
gh secret set SUPABASE_SERVICE_ROLE_KEY         --repo "$REPO" --body "$SB_SK"
gh secret set PP_CLIID                          --repo "$REPO" --body "$PP_CLIID"
gh secret set PP_SCRT                           --repo "$REPO" --body "$PP_SCRT"
gh secret set NEXT_PUBLIC_PAYPAL_CLIENT_ID      --repo "$REPO" --body "$PP_CLIID"
gh secret set PAYPAL_PLAN_STARTER               --repo "$REPO" --body "$PAYPAL_PLAN_STARTER"
gh secret set PAYPAL_WEBHOOK_ID                 --repo "$REPO" --body "${PAYPAL_WEBHOOK_ID:-PENDIENTE}"
gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --repo "$REPO" --body "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_live_placeholder}"

echo ""
echo "✅ Secrets configurados. Ahora corre:"
echo "   git add -A && git commit -m 'feat: ...' && git push origin main"
