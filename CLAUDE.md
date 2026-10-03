# Pixlit — guía para Claude

Antes de trabajar, carga los skills del proyecto en `.claude/skills/`:

- `pixlit-overview` — mapa del repo, stack, comandos, convenciones y errores preexistentes (baseline).
- `pixlit-notebook` — arquitectura del Cuaderno (canvas, zoom/pan, strokes, persistencia, paneles flotantes).
- `pixlit-verify` — cómo validar: typecheck vs baseline, lint, tests, build y smoke test con Playwright.

Reglas rápidas:
- UI y textos en español; estilos inline; `pnpm` como gestor.
- `tsc`/`eslint` tienen errores preexistentes: no agregues nuevos, no refactorices lo ajeno sin pedirlo.
- Push a `main` despliega a producción (Cloudflare). Trabaja en ramas y PRs.
- Nunca commitees `.env*` ni secretos.
