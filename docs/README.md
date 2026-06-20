# Pixlit — Documentación Técnica

Pixlit es una suite de herramientas online para developers y creadores, con el **Cuaderno de Notas** como herramienta principal. La landing page (`/`) abre directamente el cuaderno listo para trabajar.

## Arquitectura general

```
pixlit/
├── app/
│   ├── page.tsx                    # Homepage = Notebook (minimal mode)
│   ├── layout.tsx                  # Root layout: Navbar + main + Footer
│   ├── tools/
│   │   ├── page.tsx                # Grilla de todas las herramientas
│   │   ├── notebook/
│   │   │   ├── NotebookClient.tsx  # Componente principal del cuaderno
│   │   │   └── page.tsx            # Wrapper con metadata
│   │   └── [otras herramientas]/
│   └── api/
│       ├── notebooks/
│       │   ├── route.ts            # CRUD de cuadernos
│       │   └── [id]/
│       │       ├── pages/          # CRUD de páginas
│       │       ├── pages/[num]/    # Páginas individuales
│       │       └── export/         # Exportación para agentes IA
│       └── voice-notes/            # Notas de voz
├── components/
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/
│   ├── useNotebook.ts              # Hook de persistencia en Supabase
│   └── supabase/                   # Cliente Supabase (client/server)
└── docs/                           # Esta documentación
```

## Stack tecnológico

| Capa        | Tecnología                          |
|-------------|-------------------------------------|
| Framework   | Next.js 16 (App Router)             |
| UI          | React 19, estilos inline            |
| Base de datos | Supabase (PostgreSQL + Realtime)  |
| Auth        | Supabase Auth                       |
| Deploy      | Cloudflare via OpenNext             |
| Pagos       | Stripe, PayPal, MercadoPago, Khipu  |

## Funcionalidades del cuaderno

- **Herramientas de dibujo**: pluma, marcador, resaltador, borrador
- **Reconocimiento de figuras**: círculo, rectángulo, diamante, triángulo, flecha, etc.
- **Multi-página**: páginas ilimitadas (según plan)
- **Presión de stylus**: soporte para tablets y lápices digitales
- **Anti-palma**: filtro inteligente para dibujo con stylus
- **Temas**: ruled, grid, dotted, blanco
- **Exportación**: PNG, PDF, JSON (para agentes IA), SVG
- **Autoguardado local**: localStorage cada 60 segundos
- **Sync en la nube**: Supabase (usuarios autenticados)
- **Colaboración en vivo**: Supabase Realtime Broadcast
- **Notas de voz**: grabación y almacenamiento (plan premium)

## Documentos

- [`notebook-canvas-format.md`](./notebook-canvas-format.md) — Formato de canvas nativo (PCF)
- [`agent-api.md`](./agent-api.md) — API para agentes IA
