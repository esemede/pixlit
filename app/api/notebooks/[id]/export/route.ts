import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

type ShapeHint =
  | "line" | "arrow" | "circle" | "rectangle"
  | "diamond" | "triangle" | "parallelogram" | "cylinder" | "none";

interface Point    { x: number; y: number; pressure: number }
interface Stroke {
  tool:       string;
  color:      string;
  lineWidth:  number;
  points:     Point[];
  shape?:     ShapeHint;
  shapeData?: Record<string, number>;
  cornerPts?: { x: number; y: number }[];
}
interface PageRow {
  page_number: number;
  strokes:     Stroke[];
}

// ── SVG helpers ──────────────────────────────────────────────────────────────

function colorWithAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16) || 255;
  const g = parseInt(hex.slice(3, 5), 16) || 255;
  const b = parseInt(hex.slice(5, 7), 16) || 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function strokeToSVG(s: Stroke): string {
  const color = s.color.startsWith("#") ? s.color : "#ffffff";
  const alpha = s.tool === "highlighter" ? 0.38 : s.tool === "marker" ? 0.88 : 1;
  const fill  = colorWithAlpha(color, alpha);
  const lw    = s.lineWidth * 2;

  if (s.shape && s.shape !== "none" && s.shapeData) {
    const d = s.shapeData;
    const attr = `fill="none" stroke="${fill}" stroke-width="${lw}" stroke-linecap="round"`;
    switch (s.shape) {
      case "line":
        return `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" ${attr}/>`;
      case "arrow": {
        const dx = d.x2 - d.x1, dy = d.y2 - d.y1;
        const angle   = Math.atan2(dy, dx);
        const headLen = Math.min(Math.hypot(dx, dy) * 0.2, 28) + lw * 2;
        const a1x = d.x2 - headLen * Math.cos(angle - Math.PI / 6);
        const a1y = d.y2 - headLen * Math.sin(angle - Math.PI / 6);
        const a2x = d.x2 - headLen * Math.cos(angle + Math.PI / 6);
        const a2y = d.y2 - headLen * Math.sin(angle + Math.PI / 6);
        return `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" ${attr}/>
<path d="M${d.x2},${d.y2} L${a1x},${a1y} M${d.x2},${d.y2} L${a2x},${a2y}" ${attr}/>`;
      }
      case "circle":
        return `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" ${attr}/>`;
      case "rectangle": {
        const rx = Math.min(6, d.w * 0.08, d.h * 0.08);
        return `<rect x="${d.minX}" y="${d.minY}" width="${d.w}" height="${d.h}" rx="${rx}" ${attr}/>`;
      }
      case "diamond": {
        const { cx, cy, hw, hh } = d;
        return `<polygon points="${cx},${cy-hh} ${cx+hw},${cy} ${cx},${cy+hh} ${cx-hw},${cy}" ${attr}/>`;
      }
      case "triangle": {
        if (s.cornerPts && s.cornerPts.length === 3) {
          const pts = s.cornerPts.map(p => `${p.x},${p.y}`).join(" ");
          return `<polygon points="${pts}" ${attr}/>`;
        }
        return `<polygon points="${d.cx},${d.minY} ${d.minX},${d.maxY} ${d.maxX},${d.maxY}" ${attr}/>`;
      }
      case "parallelogram": {
        if (s.cornerPts && s.cornerPts.length >= 4) {
          const pts = s.cornerPts.slice(0, 4).map(p => `${p.x},${p.y}`).join(" ");
          return `<polygon points="${pts}" ${attr}/>`;
        }
        return "";
      }
      case "cylinder": {
        const { minX, minY, w, h } = d;
        const ry = Math.min(h * 0.12, 18);
        return `<line x1="${minX}" y1="${minY+ry}" x2="${minX}" y2="${minY+h-ry}" ${attr}/>
<line x1="${minX+w}" y1="${minY+ry}" x2="${minX+w}" y2="${minY+h-ry}" ${attr}/>
<ellipse cx="${minX+w/2}" cy="${minY+ry}" rx="${w/2}" ry="${ry}" ${attr}/>
<path d="M${minX},${minY+h-ry} A${w/2},${ry} 0 0,0 ${minX+w},${minY+h-ry}" ${attr}/>`;
      }
      default:
        return "";
    }
  }

  // Freehand path
  const pts = s.points;
  if (pts.length < 1) return "";
  if (pts.length === 1) {
    return `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="${lw/2}" fill="${fill}"/>`;
  }

  let path = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i];
    const mx = (prev.x + curr.x) / 2, my = (prev.y + curr.y) / 2;
    path += ` Q${prev.x},${prev.y} ${mx},${my}`;
  }
  const last = pts[pts.length - 1];
  path += ` L${last.x},${last.y}`;

  return `<path d="${path}" fill="none" stroke="${fill}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function pagesToSVG(pages: PageRow[], width = 816, height = 1056): string {
  const pagesSVG = pages.map(page => {
    const strokes = page.strokes.map(strokeToSVG).filter(Boolean).join("\n  ");
    const offsetY = (page.page_number - 1) * (height + 32);
    return `<g id="page-${page.page_number}" transform="translate(0,${offsetY})">
  <rect width="${width}" height="${height}" fill="#1e1e2e" rx="8"/>
  ${strokes}
</g>`;
  }).join("\n");

  const totalHeight = pages.length * (height + 32) - 32;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
  <title>Pixlit Canvas Export</title>
  <desc>Exported from Pixlit Notebook — Pixlit Canvas Format v1.0</desc>
${pagesSVG}
</svg>`;
}

// ── Semantic extraction ───────────────────────────────────────────────────────

function extractSemantic(pages: PageRow[]) {
  return pages.map(page => {
    const shapes = page.strokes
      .filter(s => s.shape && s.shape !== "none")
      .map(s => ({
        type:      s.shape,
        color:     s.color,
        bounds:    s.shapeData,
        cornerPts: s.cornerPts,
      }));

    const freehand = page.strokes.filter(s => !s.shape || s.shape === "none");

    return {
      page:          page.page_number,
      shapeCount:    shapes.length,
      freehandCount: freehand.length,
      shapes,
      description:   shapes.length > 0
        ? `Page ${page.page_number} contains: ${shapes.map(s => s.type).join(", ")}`
        : `Page ${page.page_number} contains ${freehand.length} freehand stroke(s)`,
    };
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request, { params }: Params) {
  const { id }    = await params;
  const url       = new URL(req.url);
  const format    = url.searchParams.get("format") ?? "strokes";
  const pageParam = url.searchParams.get("page");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!notebook) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });

  // Fetch pages
  let query = supabase
    .from("notebook_pages")
    .select("page_number, strokes")
    .eq("notebook_id", id)
    .eq("user_id", user.id)
    .order("page_number", { ascending: true });

  if (pageParam) query = query.eq("page_number", Number(pageParam));

  const { data: pages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pageRows = (pages ?? []) as PageRow[];

  switch (format) {
    case "svg": {
      const svg = pagesToSVG(pageRows);
      return new Response(svg, {
        headers: {
          "Content-Type":        "image/svg+xml",
          "Content-Disposition": `attachment; filename="pixlit-canvas.svg"`,
        },
      });
    }

    case "semantic": {
      return NextResponse.json({
        format:     "pixlit-semantic",
        version:    "1.0",
        exportedAt: new Date().toISOString(),
        notebookId: id,
        pages:      extractSemantic(pageRows),
      });
    }

    case "strokes":
    default: {
      return NextResponse.json({
        format:     "pixlit-canvas",
        version:    "1.0",
        exportedAt: new Date().toISOString(),
        notebookId: id,
        pages: pageRows.map(p => ({
          page:    p.page_number,
          strokes: p.strokes,
        })),
        semantic: extractSemantic(pageRows),
      });
    }
  }
}
