# API para Agentes IA — Pixlit

Guía para que agentes como Claude Code, OpenCode, Codex u otros puedan leer, entender y generar notas en Pixlit.

## Autenticación

Todos los endpoints requieren una sesión de Supabase activa. Los agentes deben usar las credenciales del usuario (cookie de sesión o Bearer token).

```bash
# Ejemplo con curl (sesión activa)
curl -H "Authorization: Bearer <supabase-access-token>" \
     "https://pixlit.site/api/notebooks"
```

---

## Leer notas de un cuaderno

### Listar cuadernos del usuario

```
GET /api/notebooks
```

Respuesta:
```json
{ "notebooks": [{ "id": "uuid", "name": "Mi cuaderno", "created_at": "..." }] }
```

### Exportar como JSON semántico (para agentes)

```
GET /api/notebooks/{id}/export?format=semantic
```

Este es el formato más compacto para que un agente entienda el contenido sin procesar miles de puntos. Solo incluye las formas detectadas y sus posiciones.

Respuesta:
```json
{
  "format": "pixlit-semantic",
  "version": "1.0",
  "notebookId": "uuid",
  "pages": [
    {
      "page": 1,
      "shapeCount": 4,
      "freehandCount": 2,
      "description": "Page 1 contains: rectangle, rectangle, arrow, circle",
      "shapes": [
        { "type": "rectangle", "bounds": { "minX": 100, "minY": 50, "w": 200, "h": 100 } },
        { "type": "rectangle", "bounds": { "minX": 400, "minY": 50, "w": 200, "h": 100 } },
        { "type": "arrow",     "bounds": { "x1": 300, "y1": 100, "x2": 400, "y2": 100 } },
        { "type": "circle",    "bounds": { "cx": 600, "cy": 100, "r": 50 } }
      ]
    }
  ]
}
```

### Exportar como SVG (para visualizar o procesar como texto)

```
GET /api/notebooks/{id}/export?format=svg
```

El SVG es texto XML estándar que los agentes pueden leer, interpretar y modificar. Contiene todos los trazos convertidos a paths SVG, incluyendo formas geométricas reconocidas.

### Exportar con todos los datos de puntos

```
GET /api/notebooks/{id}/export?format=strokes
```

Incluye los arrays de puntos completos (útil para reproducir o modificar el dibujo exactamente). Ver [notebook-canvas-format.md](./notebook-canvas-format.md) para el schema completo.

---

## Generar notas desde agentes (Premium)

> Esta característica está planificada para el plan Pro/Business.

### Importar trazos

```
POST /api/notebooks/{id}/import
Content-Type: application/json

{
  "page": 1,
  "strokes": [
    {
      "tool": "pen",
      "color": "#3b82f6",
      "lineWidth": 4,
      "shape": "rectangle",
      "shapeData": { "minX": 100, "minY": 50, "w": 200, "h": 100 },
      "points": []
    },
    {
      "tool": "pen",
      "color": "#22c55e",
      "lineWidth": 4,
      "shape": "circle",
      "shapeData": { "cx": 400, "cy": 100, "r": 60 },
      "points": []
    },
    {
      "tool": "pen",
      "color": "#ffffff",
      "lineWidth": 3,
      "shape": "arrow",
      "shapeData": { "x1": 300, "y1": 100, "x2": 340, "y2": 100 },
      "points": []
    }
  ]
}
```

Para formas geométricas, los `points` pueden estar vacíos — el renderizador usa `shapeData` directamente.

---

## Colaboración en tiempo real

Cuando un usuario autenticado abre el cuaderno, el cliente se suscribe automáticamente al canal de Supabase Realtime:

```
Channel: notebook:{notebookId}
Event:   stroke
Payload: { stroke: Stroke, pageNum: number }
```

Cada trazo completado se emite por broadcast. Otros clientes suscritos al mismo canal reciben el trazo inmediatamente y lo renderizan.

Un agente puede suscribirse a este canal para observar en tiempo real lo que el usuario está dibujando, o para emitir trazos que aparezcan instantáneamente en el cuaderno del usuario.

```typescript
// Ejemplo con @supabase/supabase-js
const channel = supabase
  .channel(`notebook:${notebookId}`)
  .on("broadcast", { event: "stroke" }, ({ payload }) => {
    console.log("Nuevo trazo:", payload.stroke.shape ?? "freehand");
  })
  .subscribe();

// Emitir un trazo generado por el agente
await channel.send({
  type:    "broadcast",
  event:   "stroke",
  payload: {
    stroke: {
      tool:      "pen",
      color:     "#8b5cf6",
      lineWidth: 4,
      shape:     "rectangle",
      shapeData: { minX: 50, minY: 50, w: 300, h: 150 },
      points:    [],
    },
    pageNum: 0,
  },
});
```

---

## Casos de uso para agentes

### 1. Analizar un diagrama dibujado por el usuario

```bash
# 1. Obtener el cuaderno
curl ".../api/notebooks" → { notebooks: [{ id: "abc123" }] }

# 2. Exportar en formato semántico
curl ".../api/notebooks/abc123/export?format=semantic"

# 3. El agente interpreta las formas y su disposición espacial
# Ejemplo: detecta que hay dos rectángulos conectados por una flecha → diagrama de flujo
```

### 2. Generar un diagrama de arquitectura

Un agente puede generar los trazos de un diagrama de arquitectura basándose en una descripción:

```
"Dibuja un sistema con: frontend (rectángulo) → API Gateway (cilindro) → 3 microservicios (rectángulos) → Base de datos (cilindro)"
```

El agente traduce esto a un array de `Stroke` con `shape` y `shapeData`, y los importa via `POST /api/notebooks/{id}/import` o los emite por Realtime.

### 3. Exportar a SVG para procesamiento adicional

```bash
curl ".../api/notebooks/abc123/export?format=svg" -o diagrama.svg
# El agente puede leer el SVG como texto y entender la estructura geométrica
```

---

## Límites por plan

| Recurso              | Free | Starter | Pro | Business |
|----------------------|------|---------|-----|----------|
| Páginas por cuaderno | 5    | 20      | 100 | ∞        |
| Exportación JSON/SVG | ✓    | ✓       | ✓   | ✓        |
| Import via API       | —    | —       | ✓   | ✓        |
| Colaboración Realtime| ✓    | ✓       | ✓   | ✓        |
| Notas de voz         | —    | ✓       | ✓   | ✓        |
