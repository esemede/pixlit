# Pixlit Canvas Format (PCF) v1.0

El formato nativo del cuaderno de Pixlit. Es JSON, más compacto que PNG/JPEG para edición y colaboración, y legible por agentes IA.

## Estructura

```json
{
  "format": "pixlit-canvas",
  "version": "1.0",
  "exportedAt": "2026-06-20T10:00:00.000Z",
  "notebookId": "uuid-del-cuaderno",
  "pages": [
    {
      "page": 1,
      "strokes": [ ...Stroke[] ]
    }
  ],
  "semantic": [
    {
      "page": 1,
      "shapeCount": 3,
      "freehandCount": 2,
      "shapes": [ ...SemanticShape[] ],
      "description": "Page 1 contains: rectangle, circle, arrow"
    }
  ]
}
```

## Stroke

```typescript
interface Stroke {
  tool:       "pen" | "marker" | "highlighter" | "eraser";
  color:      string;       // hex, e.g. "#3b82f6"
  lineWidth:  number;       // 1–20
  points:     Point[];      // array de puntos con presión
  shape?:     ShapeHint;    // forma detectada automáticamente
  shapeData?: Record<string, number>;  // parámetros geométricos
  cornerPts?: { x: number; y: number }[];  // vértices para polígonos
}

interface Point {
  x:        number;  // coordenada horizontal en píxeles del canvas
  y:        number;  // coordenada vertical en píxeles del canvas
  pressure: number;  // 0.0–1.0 (presión del stylus, 0.5 si no hay)
}
```

## ShapeHint

Cuando el modo "Figuras" está activo, los trazos cerrados o rectos se snappean a formas geométricas:

| ShapeHint       | Descripción                    | shapeData keys              |
|-----------------|--------------------------------|-----------------------------|
| `"none"`        | Trazo libre (freehand)         | —                           |
| `"line"`        | Línea recta                    | x1, y1, x2, y2              |
| `"arrow"`       | Flecha con punta               | x1, y1, x2, y2              |
| `"circle"`      | Círculo / elipse               | cx, cy, r                   |
| `"rectangle"`   | Rectángulo (con radio esquinas)| minX, minY, w, h            |
| `"diamond"`     | Rombo (decisión en diagramas)  | cx, cy, hw, hh              |
| `"triangle"`    | Triángulo                      | cx, cy, minX, minY, maxX, maxY + cornerPts |
| `"parallelogram"` | Paralelogramo (I/O en flowcharts) | — + cornerPts          |
| `"cylinder"`    | Cilindro (base de datos)       | minX, minY, w, h            |

## localStorage

El cuaderno se guarda en localStorage cada 60 segundos bajo la clave `pixlit-nb-v1`:

```json
{
  "version": 1,
  "savedAt": 1750420800000,
  "pages": [ ...Page[] ]
}
```

Los usuarios no autenticados conservan su trabajo entre sesiones via localStorage. Cuando se autentican, Supabase sincroniza la versión del servidor (que tiene prioridad).

## Exportaciones disponibles

| Formato   | Endpoint / método                    | Uso principal                    |
|-----------|--------------------------------------|----------------------------------|
| JSON (PCF)| `GET /api/notebooks/{id}/export`     | Agentes IA, backup, intercambio  |
| SVG       | `GET /api/notebooks/{id}/export?format=svg` | Visualización, impresión, agentes |
| Semántico | `GET /api/notebooks/{id}/export?format=semantic` | Agentes (solo formas, sin puntos) |
| PNG       | botón en la UI (client-side)         | Imagen raster                    |
| PDF       | botón en la UI (client-side, print)  | Impresión                        |
| Descarga JSON | botón 🤖 en la UI                | Exportar localmente              |

### Filtrar por página

```
GET /api/notebooks/{id}/export?format=strokes&page=2
```

Devuelve solo la página 2.
