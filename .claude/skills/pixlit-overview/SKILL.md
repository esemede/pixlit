---
name: pixlit-overview
description: Mapa del repo Pixlit (Next.js 16 + Supabase + Cloudflare/OpenNext). Úsalo al empezar cualquier tarea en este repo para ubicar archivos, convenciones, comandos y trampas conocidas (errores de tipos preexistentes, deploy por CI, pagos).
---

# Pixlit — visión general

Suite de herramientas web cuyo producto principal es el **Cuaderno de Notas** (canvas de dibujo con stylus, figuras, multi-página, sync y colaboración). La home `/` ya es el cuaderno.

## Stack
- **Next.js 16 App Router**, React 19, TypeScript. Estilos **inline** (`style={{...}}`) casi en todo; Tailwind 4 está instalado pero apenas se usa. Tema oscuro: fondo `#0f0f0f`, acento violeta `#8b5cf6`, bordes `#2a2a2a`.
- **Supabase**: Auth, Postgres con RLS, Realtime (broadcast) y Storage (`voice-notes`).
- **Deploy**: Cloudflare Workers vía `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`).
- **Pagos**: Stripe, PayPal, MercadoPago, Khipu (`lib/payments/*`, webhooks en `app/api/webhooks/*`). Planes y cuotas en `lib/plans.ts` y `lib/storageQuota.ts`.
- Gestor de paquetes: **pnpm 9** (`packageManager` en package.json). UI y textos en **español**.

## Mapa de archivos
| Ruta | Qué es |
|---|---|
| `app/page.tsx` | Home → `<NotebookClient minimal />` |
| `app/tools/notebook/page.tsx` | Redirige al primer cuaderno del usuario (login requerido) |
| `app/tools/notebook/[id]/page.tsx` | Cuaderno por id (login requerido) |
| `app/tools/notebook/NotebookClient.tsx` | Componente principal del cuaderno (canvas, eventos, render de paneles) — ver skill `pixlit-notebook` |
| `app/tools/notebook/FloatingPanel.tsx`, `WorkspaceMenu.tsx`, `workspaceLayout.ts` | Paneles flotantes del espacio de trabajo |
| `app/tools/notebook/NotebookToolsPanel.tsx` | Contenido del panel "Extras" (QR, paleta, gradiente) |
| `app/tools/notebook/NotebooksPanel.tsx`, `ShareModal.tsx` | Modal de cuadernos y de compartir |
| `app/tools/*/` | Otras herramientas simples (`page.tsx` + `XxxClient.tsx`, usan `components/ToolLayout.tsx`) |
| `app/api/notebooks/**` | CRUD cuadernos/páginas, share, export para agentes |
| `app/api/voice-notes/**`, `app/api/billing/**`, `app/api/webhooks/**` | Voz, facturación, webhooks de pago |
| `lib/useNotebook.ts` | Hook de persistencia (Supabase + API), roles, autosave con debounce |
| `lib/notebookAccess.ts` | `resolveNotebookAccess` → `owner` / `edit` / `view` / null |
| `lib/supabase/{client,server,types}.ts` | Clientes Supabase y tipos `Database` |
| `middleware.ts` | Refresca sesión; protege `/account`, `/api/notebooks`, `/api/voice-notes`, `/api/billing` |
| `components/Navbar.tsx` | Navbar **fija de 64px** (`zIndex 50`) — el layout asume ese alto |
| `supabase/migrations/*.sql` | Esquema + RLS (profiles, notebooks, notebook_pages, notebook_shares, voice_notes, subscriptions, payment_events) |
| `docs/` | Docs técnicas (formato PCF del canvas, API para agentes, specs/plans previos en `docs/superpowers/`) |
| `tests/` | `storage-quota-contract.test.mjs` (node:test) y `plan-entitlements.test.ts` (vitest, **no instalado**) |

## Comandos
```bash
pnpm install --frozen-lockfile
pnpm dev                     # next dev (necesita env de Supabase, ver pixlit-verify)
pnpm build                   # next build
npx tsc --noEmit             # typecheck (ver baseline abajo)
npx eslint <paths>           # lint
node --test tests/storage-quota-contract.test.mjs
```

## Trampas conocidas (baseline, no las "arregles" sin que te lo pidan)
- `next.config.ts` tiene `typescript.ignoreBuildErrors: true`. `tsc --noEmit` da **~85 líneas de error preexistentes**, casi todas `never` por `lib/supabase/types.ts` desactualizado; en el cuaderno: `TOOL_CFG` sin clave `image` y el tema `"none"`. Compara contra el baseline: tu cambio no debe añadir errores nuevos.
- `eslint` también tiene errores preexistentes (react-hooks del compilador de React, `prefer-const`, comillas sin escapar). Revisa sólo lo que tocas.
- CI (`.github/workflows/deploy.yml`) sólo hace build OpenNext + deploy: push a `main` → producción; PR → worker de preview `pixlit-pr-<n>` y comentario con la URL. No corre lint ni tests.
- `middleware.ts` usa `NEXT_PUBLIC_SUPABASE_URL!`: sin env, cualquier request revienta. Para correr local sin backend usa valores dummy (ver `pixlit-verify`).
- Nunca commitees `.env*`, ni toques secretos de `deploy-now.sh`, `setup-cf.sh`, `setup-github-secrets.sh`.
- Migraciones: numeradas `00N_*.sql`; se aplican a mano en Supabase (ver `SETUP_BACKEND.md`). Si agregas tabla, actualiza también `lib/supabase/types.ts`.

## Convenciones
- Componentes cliente con `"use client"`, estilos inline, comentarios de sección `// ── Título ────`.
- Textos de UI en español; atajos y `title=` descriptivos en los botones.
- Rutas API: `createClient()` de `lib/supabase/server`, validan rol con `resolveNotebookAccess` y cuota con `assertStorageQuota`.
