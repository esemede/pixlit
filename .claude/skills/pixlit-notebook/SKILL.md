---
name: pixlit-notebook
description: Arquitectura interna del Cuaderno de Notas de Pixlit (NotebookClient.tsx) — capas de canvas, coordenadas, zoom/pan, strokes y figuras, persistencia local/servidor, realtime y el espacio de trabajo con paneles flotantes (FloatingPanel/WorkspaceMenu/workspaceLayout). Úsalo antes de modificar el cuaderno, sus herramientas, paneles o layout.
---

# Cuaderno de Notas — cómo funciona

Archivos en `app/tools/notebook/`. El grueso está en `NotebookClient.tsx` (~1.9k líneas, un solo componente).

## Layout del espacio de trabajo
- El componente raíz es un `div` **`position: fixed`** que cubre el viewport bajo la navbar (`top: 64`, o `0` en pantalla completa), `zIndex 45`. Mientras está montado se bloquea el scroll del `body`.
- **La hoja es el fondo**: `wrapperRef` es `position:absolute; inset:0` y contiene la *zoom layer* con 3 canvas apilados:
  1. `bgCanvasRef` — fondo (color/gradiente + líneas ruled/grid/dotted + margen). Separado para que el borrador (`destination-out`) no lo borre.
  2. `canvasRef` — trazos confirmados de la página actual.
  3. `overlayRef` — trazo en vivo; recibe los pointer events.
- **Todos los controles flotan encima** como `FloatingPanel`s (hermanos del wrapper, no hijos, así la rueda del mouse sobre un panel no hace zoom/pan del canvas).
- `NotebooksPanel` (modal) se renderiza dentro del contenedor para que funcione en pantalla completa (`containerRef.requestFullscreen()`).

## Paneles flotantes
- `workspaceLayout.ts`: tipos `PanelId` (`tools | style | sheet | pages | file | extras`), `PANEL_META` (título/icono/orientable), `defaultPrefs(narrow)` y el hook **`useWorkspaceLayout()`** basado en `useSyncExternalStore` (snapshot de servidor = defaults ⇒ sin mismatch de hidratación). Persiste en `localStorage["pixlit-nb-workspace-v1"]` y sincroniza entre pestañas (evento `storage`).
- Preferencias: por panel `{visible, collapsed, orientation, ax, ay, dx, dy, w, h}`; globales `opacity`, `locked`, `hideAll` (modo enfoque), `paperRatio`.
- **Anclaje**: cada panel se ancla a `left|center|right` × `top|bottom` con offsets en px (`anchorStyle`). Al soltar un drag/resize, `rectToAnchor` elige el ancla más cercana (tercios horizontales, mitades verticales) y hace clamp dentro del contenedor ⇒ los paneles siguen pegados a su borde al redimensionar la ventana.
- `FloatingPanel.tsx`: cabecera = handle de arrastre (pointer capture), doble clic pliega; botones orientación (⇆/⇅), plegar (▾/▸), ocultar (×); grip inferior derecho para redimensionar (doble clic ⇒ tamaño auto); el último panel tocado sube de z-index. El contenido es una *render prop* `(orientation) => ReactNode` y el body es flex `row`/`column` con wrap.
- `WorkspaceMenu.tsx`: botón ☰ fijo abajo a la izquierda (siempre visible, es la vía para recuperar paneles ocultos): checkboxes por panel, modo enfoque, bloquear, opacidad, restablecer y atajos. También muestra badges de estado ("Figuras activo", "En vivo").
- Para **agregar un panel nuevo**: añade el id a `PanelId`, `PANEL_META`, `PANEL_ORDER` y `defaultPrefs`; agrega su render en `panelContent` dentro de `NotebookClient`. `sanitize()` completa ids nuevos con defaults en prefs guardadas antiguas (si cambias la forma de las prefs de modo incompatible, sube la versión/clave).
- Atajo `Tab` alterna modo enfoque. Los atajos de teclado se ignoran si el foco está en input/textarea/select/contentEditable.

## Coordenadas, tamaño y zoom
- Buffer del canvas = `anchoViewport × devicePixelRatio`; alto = ancho × `ratio`. `applyFit()` recalcula el tamaño y pone `zoom = 1/dpr`, `pan = 0` (se llama en ResizeObserver del wrapper, fullscreen y cambio de ratio).
- `CANVAS_PRESETS`: **`Pantalla` (ratio 0) = la hoja ocupa exactamente el área visible** (alto = alto del viewport; es el default), más Carta, A4, A5, Cuadrado, Horizontal, 16:9. El ratio vive en `workspace.paperRatio` (persistido) y se lee en `applyFit` vía `canvasRatioRef`.
- Zoom/pan con CSS transform en la zoom layer (`applyZoomPan`): Ctrl/⌘+rueda (centrado en cursor), rueda/trackpad = pan, pinch con 2 punteros, Espacio+arrastrar o botón medio = pan.
- Los puntos de los strokes están en **píxeles del buffer** (no CSS). Ojo: cambiar el ancho del viewport cambia la escala del buffer (comportamiento heredado).

## Strokes y dibujo
- `Stroke { tool, color, lineWidth, points[{x,y,pressure}], shape?, shapeData?, cornerPts?, imageDataUrl?/imgX/imgY/imgW/imgH }`. Formato documentado en `docs/notebook-canvas-format.md` (PCF).
- Herramientas `TOOL_CFG`: pen, marker, highlighter (`multiply`), eraser (`destination-out`); `image` es un tipo de stroke interno (QR/imagen insertada).
- Modo Figuras (`s`): `detectShape` (RDP + circularidad) convierte el trazo en line/arrow/circle/rectangle/diamond/triangle/parallelogram/cylinder; `renderShape` los dibuja.
- Anti-palma: rechaza touch si hay pen activo, <800ms desde el último pen o área de contacto grande.
- Estado mutable en refs (`pagesRef`, `toolRef`, ...) sincronizadas con `useEffect` para que los handlers nativos no se re-registren.
- `role === "view"` bloquea dibujo, undo, clear, páginas, inserción y exportaciones.

## Persistencia y colaboración
- Anónimo: `localStorage["pixlit-nb-v1"]` cada 60 s y con Ctrl+S.
- Autenticado (`useNotebook`): `loadPage`/`savePage` (debounce) contra `/api/notebooks/:id/pages/:num`; `addPage` respeta límites de plan (redirige a `/pricing?reason=pages`).
- Realtime: canal `notebook:<id>` con broadcast `stroke` (`{stroke, pageNum}`).
- Voz: `/api/voice-notes` (plan premium; UI de grabación aún no expuesta).

## Verificación
Usa el skill `pixlit-verify` (smoke test con Playwright que arrastra paneles, cambia hoja y valida persistencia).
