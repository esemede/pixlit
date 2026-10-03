---
name: pixlit-verify
description: Cómo validar cambios en Pixlit antes de commitear — typecheck contra baseline, lint, tests, build de producción y smoke test visual del cuaderno con Playwright/Chromium sin backend real. Úsalo después de cualquier cambio de código, en especial en app/tools/notebook.
---

# Verificar cambios en Pixlit

Ejecuta en este orden y compara con el baseline (hay errores preexistentes; lo importante es **no añadir nuevos**).

## 1. Typecheck (baseline)
```bash
npx tsc --noEmit 2>&1 | wc -l                 # baseline ≈ 85 líneas
npx tsc --noEmit 2>&1 | grep "tools/notebook" # baseline: TOOL_CFG sin 'image', tema "none", page.tsx 'never'
```

## 2. Lint de lo tocado
```bash
npx eslint app/tools/notebook   # o las rutas cambiadas
```
Preexistente: warnings de vars sin usar en NotebookClient, `prefer-const` en NotebookToolsPanel, comillas en NotebooksPanel, setState-in-effect en ShareModal.

## 3. Tests
```bash
node --test tests/storage-quota-contract.test.mjs   # contrato de cuotas (node:test)
# tests/plan-entitlements.test.ts usa vitest, que NO está en devDependencies
```

## 4. Build de producción (lo que corre CI)
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy pnpm build
```

## 5. Smoke test visual del cuaderno
Sin backend: env dummy ⇒ `getUser()` falla y la home (`/`) queda en modo anónimo (localStorage).
```bash
SP=<scratchpad>
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy \
  nohup npx next dev -p 3100 > $SP/dev.log 2>&1 &
(cd $SP && [ -d node_modules/playwright ] || npm i playwright@1)
cp .claude/skills/pixlit-verify/smoke.mjs $SP/ && (cd $SP && BASE_URL=http://localhost:3100 OUT=$SP node smoke.mjs)
```
Luego mira las capturas `smoke-*.png` con Read.

Notas:
- No uses `playwright install`: Chromium está en `/opt/pw-browsers/chromium-*/chrome-linux/chrome` (el script lo detecta). La versión puede no coincidir con la del paquete playwright, por eso se pasa `executablePath`.
- En `next dev` el indicador "N" de Next ocupa la esquina inferior izquierda y tapa el botón ☰ del workspace: en tests usa `dispatchEvent("click")` en vez de `click()`.
- Para detener el server usa `fuser -k 3100/tcp` (o guarda el PID). **No** uses `pkill -f "next..."`: el patrón también coincide con el propio comando bash y lo mata (exit 144).
- Rutas `/tools/notebook*` requieren login: prueba el cuaderno en `/`.
