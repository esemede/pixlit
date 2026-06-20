#!/usr/bin/env bash
# ── Pixlit: set GH secrets + commit + push ───────────────────────────────────
# Requiere que las variables de entorno estén exportadas antes de correr,
# o edita un .env.deploy local (nunca subir al repo).
set -euo pipefail

REPO="esemede/pixlit"
DIR="/Users/semoreno/Projects/pixlit"

cd "$DIR"

echo "▶ 1/3  Subiendo secrets a GitHub..."
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  # Lee valores de entorno — no hardcodear aquí
  gh secret set CLOUDFLARE_API_TOKEN              --repo "$REPO" --body "${CLOUDFLARE_API_TOKEN:?}"
  gh secret set CLOUDFLARE_ACCOUNT_ID             --repo "$REPO" --body "${CLOUDFLARE_ACCOUNT_ID:?}"
  gh secret set NEXT_PUBLIC_SUPABASE_URL          --repo "$REPO" --body "${NEXT_PUBLIC_SUPABASE_URL:-https://pureahggaxvrtfrgllzr.supabase.co}"
  gh secret set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_htXeHJ8T6Pezu_4yEHFNXw_OT4YMs-j}"
  gh secret set SUPABASE_SERVICE_ROLE_KEY         --repo "$REPO" --body "${SUPABASE_SERVICE_ROLE_KEY:?}"
  gh secret set PP_CLIID                          --repo "$REPO" --body "${PP_CLIID:-PENDIENTE}"
  gh secret set PP_SCRT                           --repo "$REPO" --body "${PP_SCRT:-PENDIENTE}"
  gh secret set NEXT_PUBLIC_PAYPAL_CLIENT_ID      --repo "$REPO" --body "${PP_CLIID:-PENDIENTE}"
  gh secret set PAYPAL_PLAN_STARTER               --repo "$REPO" --body "${PAYPAL_PLAN_STARTER:-PENDIENTE}"
  gh secret set PAYPAL_WEBHOOK_ID                 --repo "$REPO" --body "${PAYPAL_WEBHOOK_ID:-PENDIENTE}"
  gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --repo "$REPO" --body "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-pk_live_placeholder}"
  echo "   ✅ Secrets OK"
else
  echo "   ⚠️  gh CLI no disponible — instala con: brew install gh && gh auth login"
fi

echo ""
echo "▶ 2/3  Commit..."
git add -A
git status --short
git commit -m "chore: deploy" || echo "   (nada nuevo que commitear)"

echo ""
echo "▶ 3/3  Push a main..."
git push origin main

echo ""
echo "✅ ¡Listo! Revisa: https://github.com/$REPO/actions"
echo ""
read -rp "Presiona Enter para cerrar..."
