"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useNotebook } from "@/lib/useNotebook";
import type { NotebookTheme } from "@/lib/supabase/types";
import NotebookToolsPanel, { type PanelTab } from "./NotebookToolsPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

type DrawTool = "pen" | "marker" | "eraser" | "highlighter" | "image";
type ShapeHint =
  | "line" | "arrow"
  | "circle"
  | "rectangle"
  | "diamond"
  | "triangle"
  | "parallelogram"
  | "cylinder"
  | "none";

interface Point { x: number; y: number; pressure: number }

interface Stroke {
  tool:          DrawTool;
  color:         string;
  lineWidth:     number;
  points:        Point[];
  shape?:        ShapeHint;
  shapeData?:    Record<string, number>;
  cornerPts?:    { x: number; y: number }[];
  // Image stroke fields
  imageDataUrl?: string;
  imgX?:         number;
  imgY?:         number;
  imgW?:         number;
  imgH?:         number;
}

interface Page { strokes: Stroke[] }

interface BgGradient { c1: string; c2: string; dir: string }

// ── LocalStorage ───────────────────────────────────────────────────────────────

const LOCAL_KEY = "pixlit-nb-v1";

interface LocalSave {
  version: 1;
  savedAt: number;
  pages:   Page[];
}

function lsSave(pages: Page[]) {
  try {
    const data: LocalSave = { version: 1, savedAt: Date.now(), pages };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {}
}

function lsLoad(): Page[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as LocalSave;
    if (data.version === 1 && Array.isArray(data.pages) && data.pages.length > 0)
      return data.pages;
    return null;
  } catch { return null; }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = [
  "#ffffff", "#f8f8f8", "#000000", "#1e1e1e",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
];

const TOOL_CFG: Record<DrawTool, { label: string; icon: string; op: GlobalCompositeOperation }> = {
  pen:         { label: "Pluma",      icon: "✒️",  op: "source-over"     },
  marker:      { label: "Marcador",   icon: "🖊️",  op: "source-over"     },
  highlighter: { label: "Resaltador", icon: "🖍️",  op: "multiply"        },
  eraser:      { label: "Borrador",   icon: "🧹",  op: "destination-out" },
};

// ── Geometry utilities ────────────────────────────────────────────────────────

function ptLineDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  if (len2 < 1) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function strokeLen(pts: Point[]) {
  return pts.reduce((s, p, i) => i === 0 ? 0 : s + Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y), 0);
}

function polyArea(pts: { x: number; y: number }[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
}

function circularity(pts: Point[]) {
  const P = strokeLen(pts);
  if (P < 1) return 0;
  return (4 * Math.PI * polyArea(pts)) / (P * P);
}

function rdp(pts: Point[], eps: number): Point[] {
  if (pts.length <= 2) return pts;
  let maxD = 0, idx = 1;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = ptLineDist(pts[i].x, pts[i].y, a.x, a.y, b.x, b.y);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const L = rdp(pts.slice(0, idx + 1), eps);
    const R = rdp(pts.slice(idx), eps);
    return [...L.slice(0, -1), ...R];
  }
  return [a, b];
}

function interiorAngle(a: {x:number;y:number}, b: {x:number;y:number}, c: {x:number;y:number}) {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  return Math.atan2(Math.abs(v1x * v2y - v1y * v2x), v1x * v2x + v1y * v2y);
}

// ── Shape detection ────────────────────────────────────────────────────────────

function simplify(pts: Point[], len: number): Point[] {
  const step = Math.max(1, Math.floor(pts.length / 120));
  const sub  = pts.filter((_, i) => i % step === 0);
  if (sub[sub.length - 1] !== pts[pts.length - 1]) sub.push(pts[pts.length - 1]);
  return rdp(sub, Math.max(4, len * 0.022));
}

function closedCorners(sim: Point[]): Point[] {
  const f = sim[0], l = sim[sim.length - 1];
  return Math.hypot(f.x - l.x, f.y - l.y) < 24 ? sim.slice(0, -1) : sim;
}

function isDiamond(corners: Point[]) {
  const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const [bw, bh] = [x1 - x0, y1 - y0];
  let score = 0;
  for (const p of corners) {
    const nearLR = Math.abs(p.x - x0) < bw * 0.2 || Math.abs(p.x - x1) < bw * 0.2;
    const nearTB = Math.abs(p.y - y0) < bh * 0.2 || Math.abs(p.y - y1) < bh * 0.2;
    if (nearLR !== nearTB) score++;
  }
  return score >= corners.length - 1;
}

function isParallelogram(corners: Point[]) {
  if (corners.length < 4) return false;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const ang = interiorAngle(corners[(i+n-1)%n], corners[i], corners[(i+1)%n]) * (180/Math.PI);
    if (Math.abs(ang - 90) < 18) return false;
  }
  const v01 = { x: corners[1].x - corners[0].x, y: corners[1].y - corners[0].y };
  const v32 = { x: corners[2].x - corners[3].x, y: corners[2].y - corners[3].y };
  const dot = (v01.x * v32.x + v01.y * v32.y) /
    (Math.hypot(v01.x, v01.y) * Math.hypot(v32.x, v32.y) + 1e-6);
  return Math.abs(dot) > 0.82;
}

function isArrow(pts: Point[], simplified: Point[]) {
  if (simplified.length < 3) return false;
  const n = simplified.length;
  const ang = interiorAngle(simplified[n-3], simplified[n-2], simplified[n-1]) * (180/Math.PI);
  return ang < 60;
}

function detectShape(pts: Point[]): {
  shape: ShapeHint;
  data:  Record<string, number>;
  cornerPts?: { x: number; y: number }[];
} {
  if (pts.length < 6) return { shape: "none", data: {} };

  const len   = strokeLen(pts);
  const first = pts[0], last = pts[pts.length - 1];
  const span  = Math.hypot(last.x - first.x, last.y - first.y);
  const closed = span < len * 0.14;
  const sim    = simplify(pts, len);

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const bw = maxX - minX, bh = maxY - minY;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

  if (!closed) {
    const maxDev = Math.max(...pts.map(p => ptLineDist(p.x, p.y, first.x, first.y, last.x, last.y)));
    if (maxDev < len * 0.07) {
      if (isArrow(pts, sim))
        return { shape: "arrow", data: { x1: first.x, y1: first.y, x2: last.x, y2: last.y } };
      return { shape: "line", data: { x1: first.x, y1: first.y, x2: last.x, y2: last.y } };
    }
    return { shape: "none", data: {} };
  }

  const corners = closedCorners(sim);
  const n       = corners.length;
  const circ    = circularity(pts);

  if (circ > 0.70 && n <= 5) {
    const radii = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
    const avgR  = radii.reduce((s, r) => s + r, 0) / radii.length;
    const cv    = Math.sqrt(radii.reduce((s, r) => s + (r - avgR)**2, 0) / radii.length) / avgR;
    if (cv < 0.20)
      return { shape: "circle", data: { cx, cy, r: avgR } };
  }

  if (n === 3) {
    return {
      shape: "triangle",
      data: { cx, cy, minX, minY, maxX, maxY },
      cornerPts: corners.map(p => ({ x: p.x, y: p.y })),
    };
  }

  if (n >= 4 && n <= 6) {
    const c4 = corners.slice(0, 4);
    if (isDiamond(c4))
      return { shape: "diamond", data: { cx, cy, hw: bw / 2, hh: bh / 2 } };
    if (isParallelogram(c4))
      return { shape: "parallelogram", data: {}, cornerPts: c4.map(p => ({ x: p.x, y: p.y })) };
    if (bh >= bw * 1.5)
      return { shape: "cylinder", data: { minX, minY, w: bw, h: bh } };
    return { shape: "rectangle", data: { minX, minY, w: bw, h: bh } };
  }

  if (circ > 0.55) {
    const radii = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
    const avgR  = radii.reduce((s, r) => s + r, 0) / radii.length;
    return { shape: "circle", data: { cx, cy, r: avgR } };
  }

  return { shape: "none", data: {} };
}

// ── Shape rendering ────────────────────────────────────────────────────────────

function renderShape(ctx: CanvasRenderingContext2D, s: Stroke) {
  const d  = s.shapeData!;
  const lw = s.lineWidth * 2;
  ctx.lineWidth = lw;
  ctx.beginPath();

  switch (s.shape) {
    case "line": {
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.stroke();
      break;
    }
    case "arrow": {
      const dx = d.x2 - d.x1, dy = d.y2 - d.y1;
      const angle   = Math.atan2(dy, dx);
      const headLen = Math.min(Math.hypot(dx, dy) * 0.2, 28) + lw * 2;
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(d.x2, d.y2);
      ctx.lineTo(d.x2 - headLen * Math.cos(angle - Math.PI / 6), d.y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(d.x2, d.y2);
      ctx.lineTo(d.x2 - headLen * Math.cos(angle + Math.PI / 6), d.y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      break;
    }
    case "circle": {
      ctx.arc(d.cx, d.cy, d.r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "rectangle": {
      const r = Math.min(6, d.w * 0.08, d.h * 0.08);
      ctx.roundRect(d.minX, d.minY, d.w, d.h, r);
      ctx.stroke();
      break;
    }
    case "triangle": {
      const pts = s.cornerPts;
      if (pts && pts.length === 3) {
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.closePath();
      } else {
        ctx.moveTo(d.cx, d.minY);
        ctx.lineTo(d.minX, d.maxY);
        ctx.lineTo(d.maxX, d.maxY);
        ctx.closePath();
      }
      ctx.stroke();
      break;
    }
    case "diamond": {
      const { cx, cy, hw, hh } = d;
      ctx.moveTo(cx,      cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx,      cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "parallelogram": {
      const pts = s.cornerPts;
      if (pts && pts.length >= 4) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      }
      ctx.stroke();
      break;
    }
    case "cylinder": {
      const { minX, minY, w, h } = d;
      const ry = Math.min(h * 0.12, 18);
      ctx.moveTo(minX, minY + ry);
      ctx.lineTo(minX, minY + h - ry);
      ctx.moveTo(minX + w, minY + ry);
      ctx.lineTo(minX + w, minY + h - ry);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(minX + w / 2, minY + ry, w / 2, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(minX + w / 2, minY + h - ry, w / 2, ry, 0, 0, Math.PI);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

// ── Stroke rendering ───────────────────────────────────────────────────────────

function strokeAlpha(t: DrawTool) {
  if (t === "marker")      return 0.88;
  if (t === "highlighter") return 0.38;
  return 1;
}

function strokeW(t: DrawTool, base: number, pressure: number) {
  const p = Math.max(0.15, pressure);
  if (t === "pen")         return base * p * 1.8;
  if (t === "marker")      return base * 2.6;
  if (t === "highlighter") return base * 5;
  return base * 3;
}

function renderStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const pts = s.points;
  if (pts.length < 1) return;

  const hex = s.color.startsWith("#") ? s.color : "#ffffff";
  const r   = parseInt(hex.slice(1, 3), 16) || 255;
  const g   = parseInt(hex.slice(3, 5), 16) || 255;
  const b   = parseInt(hex.slice(5, 7), 16) || 255;
  const a   = strokeAlpha(s.tool);

  ctx.save();
  ctx.globalCompositeOperation = TOOL_CFG[s.tool].op;
  ctx.lineCap  = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;

  if (s.shape && s.shape !== "none" && s.shapeData) {
    renderShape(ctx, s);
    ctx.restore();
    return;
  }

  if (pts.length === 1) {
    const w = strokeW(s.tool, s.lineWidth, pts[0].pressure);
    ctx.beginPath();
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.arc(pts[0].x, pts[0].y, w / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const mx   = (prev.x + curr.x) / 2;
      const my   = (prev.y + curr.y) / 2;
      ctx.lineWidth = strokeW(s.tool, s.lineWidth, (prev.pressure + curr.pressure) / 2);
      ctx.beginPath();
      if (i === 1) {
        ctx.moveTo(prev.x, prev.y);
      } else {
        const pp = pts[i - 2];
        ctx.moveTo((pp.x + prev.x) / 2, (pp.y + prev.y) / 2);
      }
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      ctx.stroke();
    }
    const last = pts[pts.length - 1], sl = pts[pts.length - 2];
    ctx.lineWidth = strokeW(s.tool, s.lineWidth, last.pressure);
    ctx.beginPath();
    ctx.moveTo((sl.x + last.x) / 2, (sl.y + last.y) / 2);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Merge canvases ────────────────────────────────────────────────────────────
function mergeCanvases(main: HTMLCanvasElement, overlay: HTMLCanvasElement) {
  const tmp = document.createElement("canvas");
  tmp.width  = main.width;
  tmp.height = main.height;
  const ctx  = tmp.getContext("2d")!;
  ctx.drawImage(main,    0, 0);
  ctx.drawImage(overlay, 0, 0);
  return tmp;
}

const LETTER_RATIO = 11 / 8.5;

const CANVAS_PRESETS = [
  { label: "Carta",      ratio: 11 / 8.5  },
  { label: "A4",         ratio: 297 / 210 },
  { label: "A5",         ratio: 210 / 148 },
  { label: "Cuadrado",   ratio: 1         },
  { label: "Horizontal", ratio: 8.5 / 11  },
  { label: "16:9",       ratio: 9 / 16    },
];

function gradientCoords(dir: string, w: number, h: number): [number, number, number, number] {
  switch (dir) {
    case "to right":       return [0, 0, w, 0];
    case "to left":        return [w, 0, 0, 0];
    case "to bottom":      return [0, 0, 0, h];
    case "to top":         return [0, h, 0, 0];
    case "to top right":   return [0, h, w, 0];
    case "to bottom left": return [w, 0, 0, h];
    case "135deg":         return [0, 0, w, h];
    case "45deg":          return [w, h, 0, 0];
    default:               return [0, 0, w, 0];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotebookClient({ minimal = false }: { minimal?: boolean }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const overlayRef   = useRef<HTMLCanvasElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const realtimeRef  = useRef<RealtimeChannel | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [pages, setPages]           = useState<Page[]>([{ strokes: [] }]);
  const [pageIdx, setPageIdx]       = useState(0);
  const [tool, setTool]             = useState<DrawTool>("pen");
  const [color, setColor]           = useState("#ffffff");
  const [lineWidth, setLineWidth]   = useState(4);
  const [canvasSize, setCanvasSize] = useState({ w: 816, h: 1056 });
  const [shapeMode, setShapeMode]   = useState(false);
  const [palmReject, setPalmReject] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabletDetected, setTabletDetected] = useState(false);
  const [theme, setTheme]           = useState<NotebookTheme>({
    background: "ruled", bgColor: "#1e1e2e",
    lineColor: "rgba(255,255,255,0.035)", marginColor: "rgba(139,92,246,0.08)",
  });
  const [bgGradient,  setBgGradient]  = useState<BgGradient | null>(null);
  const [canvasRatio, setCanvasRatio] = useState(LETTER_RATIO);
  const [panelOpen,   setPanelOpen]   = useState(false);
  const [panelTab,    setPanelTab]    = useState<PanelTab>("qr");
  const [localSavedAt, setLocalSavedAt] = useState<number | null>(null);

  const [isRecording,   setIsRecording]   = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    notebookId,
    isAuth,
    saveState,
    loadPage: loadPageFromServer,
    savePage: savePageToServer,
    addPage: addPageToServer,
  } = useNotebook({
    onLimitReached: () => { window.location.href = "/pricing?reason=pages"; },
  });

  const themeRef       = useRef(theme);
  const notebookIdRef  = useRef(notebookId);
  const bgGradientRef  = useRef(bgGradient);
  useEffect(() => { themeRef.current      = theme;      }, [theme]);
  useEffect(() => { notebookIdRef.current = notebookId; }, [notebookId]);
  useEffect(() => { bgGradientRef.current = bgGradient; }, [bgGradient]);

  // ── Load theme from profile ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    fetch("/api/billing/plans").then(r => r.json()).then(() => {});
  }, [isAuth]);

  // ── Mutable refs ─────────────────────────────────────────────────────────
  const pagesRef      = useRef<Page[]>([{ strokes: [] }]);
  const undoStack     = useRef<Page[][]>([[{ strokes: [] }]]);
  const toolRef       = useRef<DrawTool>("pen");
  const colorRef      = useRef("#ffffff");
  const lwRef         = useRef(4);
  const shapeModeRef  = useRef(false);
  const palmRejectRef = useRef(true);
  const pageIdxRef    = useRef(0);

  useEffect(() => { toolRef.current      = tool;      }, [tool]);
  useEffect(() => { colorRef.current     = color;     }, [color]);
  useEffect(() => { lwRef.current        = lineWidth; }, [lineWidth]);
  useEffect(() => { shapeModeRef.current = shapeMode; }, [shapeMode]);
  useEffect(() => { palmRejectRef.current = palmReject; }, [palmReject]);
  useEffect(() => { pageIdxRef.current    = pageIdx;  }, [pageIdx]);
  useEffect(() => { pagesRef.current      = pages;    }, [pages]);

  const drawing      = useRef(false);
  const curStroke    = useRef<Stroke | null>(null);
  const activePenId  = useRef<number | null>(null);
  const lastPenTime  = useRef(0);
  const rejectedIds  = useRef(new Set<number>());

  // ── Load from localStorage on mount (anonymous users get their work back) ─
  useEffect(() => {
    const saved = lsLoad();
    if (saved) {
      pagesRef.current = saved;
      setPages([...saved]);
    }
  }, []);

  // ── localStorage auto-save every 60 seconds ────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      lsSave(pagesRef.current);
      setLocalSavedAt(Date.now());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (!wrapperRef.current) return;
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      if (width > 0 && height > 0)
        setCanvasSize({ w: Math.round(width), h: Math.round(height) });
    });
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Redraw ────────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t  = themeRef.current;
    const bg = bgGradientRef.current;

    // Background: gradient or solid color
    if (bg) {
      const [x1, y1, x2, y2] = gradientCoords(bg.dir, canvas.width, canvas.height);
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, bg.c1);
      grad.addColorStop(1, bg.c2);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = t.bgColor;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = t.lineColor;
    ctx.lineWidth   = 1;
    if (t.background === "ruled" || t.background === "grid") {
      for (let y = 40; y < canvas.height; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    }
    if (t.background === "grid") {
      for (let x = 40; x < canvas.width; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
    }
    if (t.background === "dotted") {
      ctx.fillStyle = t.lineColor;
      for (let y = 32; y < canvas.height; y += 32) {
        for (let x = 32; x < canvas.width; x += 32) {
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.strokeStyle = t.marginColor;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, 0); ctx.lineTo(48, canvas.height); ctx.stroke();

    const page = pagesRef.current[pageIdxRef.current];
    if (page) {
      page.strokes.forEach(s => {
        if (s.tool === "image" && s.imageDataUrl) {
          const img = imageCacheRef.current.get(s.imageDataUrl);
          if (img) ctx.drawImage(img, s.imgX ?? 0, s.imgY ?? 0, s.imgW ?? 256, s.imgH ?? 256);
        } else {
          renderStroke(ctx, s);
        }
      });
    }
  }, []);

  useEffect(() => { redraw(); }, [redraw, canvasSize, pageIdx, theme, bgGradient]);

  // ── Load page from server (authenticated) ─────────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    loadPageFromServer(pageIdx + 1).then(strokes => {
      if (strokes === null) return;
      const next = pagesRef.current.map((p, i) =>
        i === pageIdx ? { strokes: strokes as Stroke[] } : p
      );
      pagesRef.current = next;
      setPages([...next]);
      setTimeout(redraw, 0);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, pageIdx, loadPageFromServer]);

  // ── Supabase Realtime collaboration ───────────────────────────────────────
  useEffect(() => {
    if (!notebookId) return;
    const supabase = createClient();
    const channel  = supabase
      .channel(`notebook:${notebookId}`)
      .on("broadcast", { event: "stroke" }, ({ payload }) => {
        const { stroke, pageNum } = payload as { stroke: Stroke; pageNum: number };
        const next = pagesRef.current.map((p, i) =>
          i === pageNum ? { strokes: [...p.strokes, stroke] } : p
        );
        pagesRef.current = next;
        setPages([...next]);
        if (pageNum === pageIdxRef.current) setTimeout(redraw, 0);
      })
      .subscribe();

    realtimeRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      realtimeRef.current = null;
    };
  }, [notebookId, redraw]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Pointer events ────────────────────────────────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const getPos = (e: PointerEvent): Point => {
      const rect = overlay.getBoundingClientRect();
      return {
        x:        (e.clientX - rect.left) * (overlay.width  / rect.width),
        y:        (e.clientY - rect.top)  * (overlay.height / rect.height),
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      };
    };

    const shouldReject = (e: PointerEvent) => {
      if (!palmRejectRef.current)           return false;
      if (e.pointerType === "pen")          return false;
      if (e.pointerType === "mouse")        return false;
      if (activePenId.current !== null)     return true;
      if (Date.now() - lastPenTime.current < 800) return true;
      if ((e.width ?? 0) > 28 || (e.height ?? 0) > 28) return true;
      return false;
    };

    const renderLive = () => {
      const s = curStroke.current;
      if (!s) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      renderStroke(ctx, s);
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      if (e.pointerType === "pen") {
        setTabletDetected(true);
        activePenId.current = e.pointerId;
        lastPenTime.current = Date.now();
      }
      if (shouldReject(e)) { rejectedIds.current.add(e.pointerId); return; }

      overlay.setPointerCapture(e.pointerId);
      drawing.current   = true;
      curStroke.current = {
        tool:      toolRef.current,
        color:     colorRef.current,
        lineWidth: lwRef.current,
        points:    [getPos(e)],
      };
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (e.pointerType === "pen") lastPenTime.current = Date.now();
      if (rejectedIds.current.has(e.pointerId)) return;
      if (!drawing.current || !curStroke.current) return;
      curStroke.current.points.push(getPos(e));
      renderLive();
    };

    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      if (e.pointerType === "pen") { activePenId.current = null; lastPenTime.current = Date.now(); }
      if (rejectedIds.current.has(e.pointerId)) { rejectedIds.current.delete(e.pointerId); return; }
      if (!drawing.current || !curStroke.current) return;

      drawing.current = false;
      const stroke = { ...curStroke.current, points: [...curStroke.current.points] };
      curStroke.current = null;

      if (shapeModeRef.current && stroke.tool !== "eraser") {
        const { shape, data, cornerPts } = detectShape(stroke.points);
        if (shape !== "none") {
          stroke.shape     = shape;
          stroke.shapeData = data;
          if (cornerPts) stroke.cornerPts = cornerPts;
        }
      }

      const idx  = pageIdxRef.current;
      const next = pagesRef.current.map((p, i) =>
        i === idx ? { strokes: [...p.strokes, stroke] } : p
      );
      pagesRef.current = next;
      undoStack.current[idx] = [...(undoStack.current[idx] ?? []), { strokes: [...next[idx].strokes] }];
      setPages([...next]);

      overlay.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);
      redraw();

      // Broadcast stroke to collaborators
      if (realtimeRef.current) {
        realtimeRef.current.send({
          type:    "broadcast",
          event:   "stroke",
          payload: { stroke, pageNum: idx },
        });
      }

      savePageToServer(idx + 1, next[idx].strokes as unknown[]);
    };

    overlay.addEventListener("pointerdown",   onDown, { passive: false });
    overlay.addEventListener("pointermove",   onMove, { passive: false });
    overlay.addEventListener("pointerup",     onUp);
    overlay.addEventListener("pointercancel", onUp);

    return () => {
      overlay.removeEventListener("pointerdown",   onDown);
      overlay.removeEventListener("pointermove",   onMove);
      overlay.removeEventListener("pointerup",     onUp);
      overlay.removeEventListener("pointercancel", onUp);
    };
  }, [redraw, savePageToServer]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if (e.key === "p") setTool("pen");
      if (e.key === "m") setTool("marker");
      if (e.key === "h") setTool("highlighter");
      if (e.key === "e") setTool("eraser");
      if (e.key === "s") setShapeMode(v => !v);
      if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleFullscreen]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const idx   = pageIdxRef.current;
    const stack = undoStack.current[idx] ?? [];
    let restored: Page;
    if (stack.length < 2) {
      restored = { strokes: [] };
      undoStack.current[idx] = [];
    } else {
      stack.pop();
      restored = stack[stack.length - 1];
    }
    const next = pagesRef.current.map((p, i) => i === idx ? { ...restored, strokes: [...restored.strokes] } : p);
    pagesRef.current = next;
    setPages([...next]);
    setTimeout(redraw, 0);
  }, [redraw]);

  const clearPage = useCallback(() => {
    const idx  = pageIdxRef.current;
    const next = pagesRef.current.map((p, i) => i === idx ? { strokes: [] } : p);
    pagesRef.current = next;
    undoStack.current[idx] = [];
    setPages([...next]);
    setTimeout(redraw, 0);
  }, [redraw]);

  const addPage = useCallback(async () => {
    if (isAuth) {
      const { ok, error } = await addPageToServer();
      if (!ok) {
        if (error?.includes("limit")) window.location.href = "/pricing?reason=pages";
        return;
      }
    }
    const next = [...pagesRef.current, { strokes: [] }];
    pagesRef.current = next;
    undoStack.current.push([]);
    setPages([...next]);
    setPageIdx(next.length - 1);
  }, [isAuth, addPageToServer]);

  const deletePage = useCallback(async (idx: number) => {
    if (pagesRef.current.length <= 1) return;
    const next = pagesRef.current.filter((_, i) => i !== idx);
    pagesRef.current = next;
    undoStack.current = undoStack.current.filter((_, i) => i !== idx);
    const newIdx = Math.min(pageIdxRef.current, next.length - 1);
    setPages([...next]);
    setPageIdx(newIdx);
    setTimeout(redraw, 0);
    if (isAuth && notebookIdRef.current) {
      await fetch(`/api/notebooks/${notebookIdRef.current}/pages/${idx + 1}`, { method: "DELETE" });
    }
  }, [isAuth, redraw]);

  const exportPNG = useCallback(() => {
    const main = canvasRef.current, ov = overlayRef.current;
    if (!main || !ov) return;
    const tmp = mergeCanvases(main, ov);
    const a   = document.createElement("a");
    a.download = `pixlit-notebook-p${pageIdxRef.current + 1}.png`;
    a.href = tmp.toDataURL("image/png");
    a.click();
  }, []);

  const exportPDF = useCallback(() => {
    const main = canvasRef.current, ov = overlayRef.current;
    if (!main || !ov) return;
    const dataUrl = mergeCanvases(main, ov).toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) { alert("Permite ventanas emergentes para exportar PDF."); return; }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pixlit Notebook — Página ${pageIdxRef.current + 1}</title>
<style>
  @page { size: letter portrait; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #fff; }
  img { display: block; width: 100%; height: 100vh; object-fit: contain;
        -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<img src="${dataUrl}" />
<script>
  window.addEventListener("load", () => { setTimeout(() => { window.print(); }, 200); });
</script>
</body>
</html>`);
    win.document.close();
  }, []);

  // ── Export JSON for agents ─────────────────────────────────────────────────
  const exportAgentJSON = useCallback(() => {
    const allPages = pagesRef.current;
    const semantic = allPages.map((page, idx) => ({
      page: idx + 1,
      shapes: page.strokes
        .filter(s => s.shape && s.shape !== "none")
        .map(s => ({ type: s.shape, bounds: s.shapeData, cornerPts: s.cornerPts })),
      strokeCount: page.strokes.length,
    }));
    const output = {
      format:  "pixlit-canvas",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      pages: allPages.map((p, i) => ({ page: i + 1, strokes: p.strokes })),
      semantic,
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const a    = document.createElement("a");
    a.download = "pixlit-canvas.json";
    a.href     = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  // ── Insert image (QR or any raster) onto canvas ──────────────────────────
  const insertImage = useCallback((dataUrl: string, displaySize: number) => {
    const img = new Image();
    img.onload = () => {
      imageCacheRef.current.set(dataUrl, img);
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Place centered on the visible canvas
      const scale = displaySize / Math.max(img.width, 1);
      const w = img.width  * scale;
      const h = img.height * scale;
      const x = (canvas.width  - w) / 2;
      const y = (canvas.height - h) / 2;
      const imageStroke: Stroke = {
        tool: "image", color: "#000000", lineWidth: 1, points: [],
        imageDataUrl: dataUrl, imgX: x, imgY: y, imgW: w, imgH: h,
      };
      const idx  = pageIdxRef.current;
      const next = pagesRef.current.map((p, i) =>
        i === idx ? { strokes: [...p.strokes, imageStroke] } : p
      );
      pagesRef.current = next;
      undoStack.current[idx] = [...(undoStack.current[idx] ?? []), { strokes: [...next[idx].strokes] }];
      setPages([...next]);
      setTimeout(redraw, 0);
      savePageToServer(idx + 1, next[idx].strokes as unknown[]);
    };
    img.src = dataUrl;
  }, [redraw, savePageToServer]);

  const handleSetBgColor = useCallback((c: string) => {
    setBgGradient(null);
    setTheme(t => ({ ...t, bgColor: c }));
  }, []);

  const handleSetBgGradient = useCallback((c1: string, c2: string, dir: string) => {
    setBgGradient({ c1, c2, dir });
  }, []);

  const handleClearGradient = useCallback(() => {
    setBgGradient(null);
  }, []);

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!isAuth) { window.location.href = "/auth/login?next=/tools/notebook"; return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setIsRecording(true); setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { alert("No se pudo acceder al micrófono."); }
  }, [isAuth]);

  const stopRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.stop();
    mr.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    await new Promise<void>(res => { mr.onstop = () => res(); });
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const fd   = new FormData();
    fd.append("audio", blob, `nota-${Date.now()}.webm`);
    fd.append("page_id",         "");
    fd.append("duration_seconds", String(recordingTime));
    fd.append("label",            `Voz P${pageIdx + 1}`);

    const res = await fetch("/api/voice-notes", { method: "POST", body: fd });
    if (!res.ok) {
      const d = await res.json();
      if (res.status === 403) window.location.href = "/pricing?reason=voice";
      else alert(d.error ?? "Error al guardar nota de voz");
    }
  }, [recordingTime, pageIdx]);

  // ── Style helpers ─────────────────────────────────────────────────────────
  const btnTool = (active: boolean): React.CSSProperties => ({
    background:   active ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.05)",
    border:       active ? "1px solid #8b5cf6"     : "1px solid #333",
    borderRadius: "8px", padding: "7px 11px",
    color: "white", cursor: "pointer", fontSize: "18px", transition: "all 0.15s",
  });

  const btnToggle = (active: boolean, accent = "#8b5cf6"): React.CSSProperties => ({
    background:   active ? `${accent}33` : "rgba(255,255,255,0.05)",
    border:       active ? `1px solid ${accent}` : "1px solid #333",
    borderRadius: "8px", padding: "5px 12px",
    color:     active ? "white" : "#666",
    cursor:    "pointer", fontSize: "12px", fontWeight: 600,
    display:   "flex", alignItems: "center", gap: "5px", transition: "all 0.15s",
  });

  // ── Theme switcher ────────────────────────────────────────────────────────
  const THEMES: { label: string; value: NotebookTheme }[] = [
    { label: "Ruled",  value: { background: "ruled",  bgColor: "#1e1e2e", lineColor: "rgba(255,255,255,0.035)", marginColor: "rgba(139,92,246,0.08)" } },
    { label: "Grid",   value: { background: "grid",   bgColor: "#1a1a1a", lineColor: "rgba(255,255,255,0.04)",  marginColor: "rgba(139,92,246,0.08)" } },
    { label: "Dotted", value: { background: "dotted", bgColor: "#111827", lineColor: "rgba(255,255,255,0.08)",  marginColor: "rgba(139,92,246,0.1)"  } },
    { label: "Blanco", value: { background: "none",   bgColor: "#ffffff", lineColor: "transparent",             marginColor: "transparent"            } },
  ];

  // ── Shared JSX ────────────────────────────────────────────────────────────
  const toolbarJSX = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", padding: "10px 0" }}>
      {/* Draw tools */}
      <div style={{ display: "flex", gap: "5px" }}>
        {(Object.keys(TOOL_CFG) as DrawTool[]).map(t => (
          <button key={t} onClick={() => setTool(t)} title={`${TOOL_CFG[t].label} (${t[0]})`} style={btnTool(tool === t)}>
            {TOOL_CFG[t].icon}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 28, background: "#333" }} />

      {/* Colors */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 22, height: 22, borderRadius: "50%", background: c,
            border: color === c ? "2px solid #8b5cf6" : "2px solid transparent",
            outline: color === c ? "1px solid white" : "none",
            outlineOffset: 1, cursor: "pointer", padding: 0,
          }} />
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          title="Color personalizado"
          style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #444",
            cursor: "pointer", padding: 0, background: "none" }} />
      </div>

      <div style={{ width: 1, height: 28, background: "#333" }} />

      {/* Stroke width */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ color: "#888", fontSize: "11px" }}>Grosor</span>
        <input type="range" min={1} max={20} value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          style={{ width: 72, accentColor: "#8b5cf6" }} />
        <span style={{ color: "#aaa", fontSize: "11px", minWidth: 16 }}>{lineWidth}</span>
      </div>

      <div style={{ width: 1, height: 28, background: "#333" }} />

      {/* Feature toggles */}
      <button onClick={() => setShapeMode(v => !v)} style={btnToggle(shapeMode)} title="s">
        ⬡ Figuras
      </button>
      <button onClick={() => setPalmReject(v => !v)}
        style={btnToggle(palmReject, palmReject ? "#22c55e" : "#888")}>
        {palmReject ? "🤚✕ Anti-palma ON" : "🤚 Anti-palma OFF"}
      </button>

      {/* Theme switcher */}
      <select
        value={THEMES.findIndex(t => t.value.background === theme.background)}
        onChange={e => setTheme(THEMES[Number(e.target.value)].value)}
        style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
          color: "#aaa", fontSize: 12, padding: "5px 8px", cursor: "pointer",
        }}
      >
        {THEMES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
      </select>

      {/* Canvas size presets */}
      <select
        value={CANVAS_PRESETS.findIndex(p => Math.abs(p.ratio - canvasRatio) < 0.01)}
        onChange={e => {
          const idx = Number(e.target.value);
          if (idx >= 0) setCanvasRatio(CANVAS_PRESETS[idx].ratio);
        }}
        style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
          color: "#aaa", fontSize: 12, padding: "5px 8px", cursor: "pointer",
        }}
      >
        {CANVAS_PRESETS.map((p, i) => <option key={i} value={i}>📄 {p.label}</option>)}
      </select>

      {tabletDetected && (
        <span style={{ fontSize: "11px", color: "#22c55e" }}>✒️ Tablet</span>
      )}

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <button className="btn-secondary" onClick={handleUndo} title="Ctrl+Z"
        style={{ fontSize: "12px", padding: "5px 9px" }}>↩ Deshacer</button>
      <button className="btn-secondary" onClick={clearPage}
        style={{ fontSize: "12px", padding: "5px 9px" }}>🗑 Limpiar</button>
      <button className="btn-secondary" onClick={exportPNG}
        style={{ fontSize: "12px", padding: "5px 10px" }}>⬇ PNG</button>
      <button className="btn-secondary" onClick={exportPDF}
        style={{ fontSize: "12px", padding: "5px 10px" }}>⬇ PDF</button>
      <button className="btn-secondary" onClick={exportAgentJSON} title="Exportar para agentes IA"
        style={{ fontSize: "12px", padding: "5px 10px" }}>🤖 JSON</button>
      <button onClick={toggleFullscreen} style={{ ...btnTool(isFullscreen), fontSize: "14px", padding: "5px 10px" }} title="f">
        {isFullscreen ? "⛶ Salir" : "⛶ Pantalla completa"}
      </button>

      {/* Tools panel toggle */}
      <button onClick={() => setPanelOpen(v => !v)} style={{
        ...btnTool(panelOpen), fontSize: "14px", padding: "5px 12px",
      }} title="QR, Colores, Gradientes">
        🛠️
      </button>

      {/* Voice recorder */}
      {isRecording ? (
        <button onClick={stopRecording} style={{
          ...btnTool(true), background: "rgba(239,68,68,0.3)", border: "1px solid #ef4444",
          fontSize: "12px", padding: "5px 10px", animation: "pulse 1s infinite",
        }}>
          ⏹ {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
        </button>
      ) : (
        <button onClick={startRecording} style={{ ...btnTool(false), fontSize: "12px", padding: "5px 10px" }}>
          🎙 Voz
        </button>
      )}

      {/* Save indicators */}
      {isAuth && (
        <span style={{
          fontSize: 11, color:
            saveState.status === "saving" ? "#888" :
            saveState.status === "saved"  ? "#22c55e" :
            saveState.status === "error"  ? "#ef4444" : "transparent",
        }}>
          {saveState.status === "saving" ? "⏳ Guardando…"
          : saveState.status === "saved"  ? "✓ Guardado"
          : saveState.status === "error"  ? "⚠ Error"
          : ""}
        </span>
      )}
      {!isAuth && localSavedAt && (
        <span style={{ fontSize: 10, color: "#555" }} title={`Guardado local: ${new Date(localSavedAt).toLocaleTimeString()}`}>
          💾 local
        </span>
      )}

      {/* Auth gate */}
      {!isAuth && (
        <Link href="/auth/login?next=/" style={{
          fontSize: 12, color: "#a78bfa", textDecoration: "none", padding: "5px 10px",
          border: "1px solid #8b5cf6", borderRadius: 8,
        }}>
          ☁ Sync
        </Link>
      )}
    </div>
  );

  const pagesBarJSX = (
    <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "0 0 8px" }}>
      {pages.map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
          <button onClick={() => setPageIdx(i)} style={{
            background:   pageIdx === i ? "#8b5cf6" : "rgba(255,255,255,0.06)",
            border:       pageIdx === i ? "1px solid #8b5cf6" : "1px solid #333",
            borderRadius: pages.length > 1 ? "6px 0 0 6px" : "6px",
            borderRight:  pages.length > 1 ? "none" : undefined,
            padding: "3px 10px",
            color: "white", cursor: "pointer", fontSize: "12px",
            fontWeight: pageIdx === i ? 700 : 400,
          }}>{i + 1}</button>
          {pages.length > 1 && (
            <button
              onClick={() => deletePage(i)}
              title="Eliminar página"
              style={{
                background:   pageIdx === i ? "#8b5cf6" : "rgba(255,255,255,0.06)",
                border:       pageIdx === i ? "1px solid #8b5cf6" : "1px solid #333",
                borderLeft:   "1px solid rgba(255,255,255,0.12)",
                borderRadius: "0 6px 6px 0",
                padding: "3px 6px",
                color: pageIdx === i ? "rgba(255,255,255,0.7)" : "#555",
                cursor: "pointer", fontSize: "11px", lineHeight: 1,
              }}
            >×</button>
          )}
        </div>
      ))}
      <button onClick={addPage} style={{
        background: "rgba(255,255,255,0.03)", border: "1px dashed #444",
        borderRadius: "6px", padding: "3px 9px",
        color: "#666", cursor: "pointer", fontSize: "12px",
      }}>+ Página</button>

      {notebookId && isAuth && (
        <span style={{ fontSize: 10, color: "#444", marginLeft: 8 }}>
          ID: {notebookId.slice(0, 8)}
        </span>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={minimal
      ? { height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", background: "var(--background)" }
      : { minHeight: "100vh", background: "var(--background)" }
    }>

      {/* Page header — only in non-minimal, non-fullscreen mode */}
      {!minimal && !isFullscreen && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 6 }}>
            📓 Cuaderno de Notas
          </h1>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>
            Dibuja con stylus, touch o mouse. Tamaño carta, responsive y exportable a PNG o PDF.
          </p>
        </div>
      )}

      {/* Sticky toolbar — only when not fullscreen */}
      {!isFullscreen && (
        <div style={{
          position: minimal ? "sticky" : "sticky",
          top: 64, zIndex: 40,
          background: "rgba(15,15,15,0.97)", backdropFilter: "blur(10px)",
          borderBottom: "1px solid #2a2a2a", borderTop: "1px solid #2a2a2a",
          padding: "0 24px",
          flexShrink: 0,
        }}>
          {toolbarJSX}
          {pagesBarJSX}
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        style={isFullscreen ? {
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#1e1e2e",
          display: "flex", flexDirection: "column",
        } : minimal ? {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 24px",
          minHeight: 0,
          position: "relative",
        } : {
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Toolbar inside fullscreen overlay */}
        {isFullscreen && (
          <div style={{
            width: "100%",
            background: "rgba(15,15,20,0.97)",
            borderBottom: "1px solid #2a2a2a",
            padding: "0 16px", flexShrink: 0,
          }}>
            {toolbarJSX}
            {pagesBarJSX}
          </div>
        )}

        {/* Canvas wrapper — aspect ratio applied in all non-fullscreen modes */}
        <div
          ref={wrapperRef}
          style={isFullscreen ? {
            // Fullscreen: fill all space, let the drawing area use all pixels
            position: "relative",
            flex: 1, width: "100%", minHeight: 0,
            overflow: "hidden",
            touchAction: "none", userSelect: "none",
            WebkitUserSelect: "none",
          } : {
            // Normal & minimal: respect chosen aspect ratio, centered, capped by viewport
            position: "relative",
            width: "100%",
            maxWidth: 900,
            aspectRatio: `${1 / canvasRatio}`,
            maxHeight: "calc(100vh - 64px - 160px)",
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid #2a2a2a",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            touchAction: "none", userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <canvas ref={overlayRef} width={canvasSize.w} height={canvasSize.h}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              cursor: tool === "eraser" ? "cell" : "crosshair",
            }} />
          {shapeMode && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(139,92,246,0.85)", borderRadius: 6,
              padding: "3px 10px", fontSize: 11, color: "white", fontWeight: 700,
              pointerEvents: "none",
            }}>⬡ Figuras activo</div>
          )}
          {realtimeRef.current && (
            <div style={{
              position: "absolute", top: 10, left: 10,
              background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#86efac",
              pointerEvents: "none",
            }}>● En vivo</div>
          )}
        </div>

        {/* Tools panel (QR / Color / Gradient) */}
        <NotebookToolsPanel
          isOpen={panelOpen}
          activeTab={panelTab}
          onClose={() => setPanelOpen(false)}
          onTabChange={setPanelTab}
          onInsertImage={insertImage}
          onSetBgColor={handleSetBgColor}
          onSetBgGradient={handleSetBgGradient}
          onClearGradient={handleClearGradient}
          onSetDrawColor={setColor}
        />
      </div>

      {/* Footer hints — only in non-minimal, non-fullscreen mode */}
      {!minimal && !isFullscreen && (
        <div style={{
          maxWidth: 900, margin: "12px auto 40px", padding: "0 24px",
          display: "flex", gap: 16, flexWrap: "wrap", color: "#555", fontSize: 11,
        }}>
          <span>✒️ Stylus + anti-palma</span>
          <span>⬡ Modo Figuras activo con "s"</span>
          <span>🛠️ QR · Colores · Gradientes</span>
          <span>🤖 JSON para agentes IA</span>
          <span>⌨️ p·m·h·e · s · f · Ctrl+Z</span>
        </div>
      )}
    </div>
  );
}
