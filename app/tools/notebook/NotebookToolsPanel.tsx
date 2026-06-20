"use client";

import { useRef, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";

// ── Color utilities (subset from ColorPaletteClient) ─────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  let r = parseInt(h.slice(0, 2), 16) / 255;
  let g = parseInt(h.slice(2, 4), 16) / 255;
  let b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const lit = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lit > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(hue * 360), Math.round(sat * 100), Math.round(lit * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return `#${v.toString(16).padStart(2,"0").repeat(3)}`; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${[r,g,b].map(v => v.toString(16).padStart(2,"0")).join("")}`;
}

function generatePalette(baseHex: string): string[] {
  const [h, s, l] = hexToHsl(baseHex);
  return [
    hslToHex(h, Math.min(s, 40), 95),
    hslToHex(h, Math.min(s, 60), 80),
    hslToHex(h, s, l),
    hslToHex(h, Math.min(s + 5, 100), Math.max(l - 20, 15)),
    hslToHex(h, Math.min(s + 10, 100), Math.max(l - 40, 8)),
  ];
}

// ── QR size presets ───────────────────────────────────────────────────────────

const QR_PRESETS = [
  { label: "64",  value: 64  },
  { label: "128", value: 128 },
  { label: "256", value: 256 },
  { label: "512", value: 512 },
];

const GRADIENT_DIRS = [
  { label: "→", value: "to right" },
  { label: "←", value: "to left"  },
  { label: "↓", value: "to bottom"},
  { label: "↑", value: "to top"   },
  { label: "↗", value: "to top right"   },
  { label: "↙", value: "to bottom left" },
  { label: "⤢", value: "135deg" },
  { label: "⤡", value: "45deg"  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type PanelTab = "qr" | "color" | "gradient";

interface Props {
  isOpen:           boolean;
  activeTab:        PanelTab;
  onClose:          () => void;
  onTabChange:      (tab: PanelTab) => void;
  onInsertImage:    (dataUrl: string, size: number) => void;
  onSetBgColor:     (color: string) => void;
  onSetBgGradient:  (c1: string, c2: string, dir: string) => void;
  onClearGradient:  () => void;
  onSetDrawColor:   (color: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotebookToolsPanel({
  isOpen, activeTab, onClose, onTabChange,
  onInsertImage, onSetBgColor, onSetBgGradient, onClearGradient, onSetDrawColor,
}: Props) {
  // QR state
  const [qrText,    setQrText]    = useState("https://pixlit.site");
  const [qrSize,    setQrSize]    = useState(256);
  const [qrCustom,  setQrCustom]  = useState("");
  const [qrFg,      setQrFg]      = useState("#000000");
  const [qrBg,      setQrBg]      = useState("#ffffff");
  const [qrTranspBg, setQrTranspBg] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Color state
  const [baseColor, setBaseColor] = useState("#8b5cf6");
  const palette = generatePalette(baseColor);

  // Gradient state
  const [gColor1, setGColor1] = useState("#8b5cf6");
  const [gColor2, setGColor2] = useState("#06b6d4");
  const [gDir,    setGDir]    = useState("to right");

  // Drag state
  const panelRef   = useRef<HTMLDivElement>(null);
  const [pos,      setPos]      = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const panel  = panelRef.current;
    const parent = panel?.parentElement;
    if (!panel || !parent) return;

    const pr = panel.getBoundingClientRect();
    const cr = parent.getBoundingClientRect();
    const currentX = pr.left - cr.left;
    const currentY = pr.top  - cr.top;

    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: currentX, py: currentY };
    setPos({ x: currentX, y: currentY });
    setDragging(true);
    panel.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.mx;
    const dy = e.clientY - dragOrigin.current.my;
    setPos({ x: dragOrigin.current.px + dx, y: dragOrigin.current.py + dy });
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    dragOrigin.current = null;
  }, []);

  if (!isOpen) return null;

  const handleInsertQR = () => {
    const canvas = qrContainerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const finalSize = qrCustom ? Number(qrCustom) || qrSize : qrSize;
    const dataUrl = canvas.toDataURL("image/png");
    onInsertImage(dataUrl, finalSize);
  };

  const resolvedQrSize = qrCustom ? (Number(qrCustom) || qrSize) : qrSize;

  const posStyle: React.CSSProperties = pos
    ? { position: "absolute", left: pos.x, top: pos.y }
    : { position: "absolute", right: 12, bottom: 12 };

  return (
    <div
      ref={panelRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        ...posStyle,
        width:        300,
        background:   "rgba(20,20,28,0.97)",
        backdropFilter: "blur(16px)",
        border:       "1px solid #3a3a4a",
        borderRadius: 14,
        boxShadow:    "0 16px 48px rgba(0,0,0,0.6)",
        zIndex:       100,
        overflow:     "hidden",
        userSelect:   "none",
      }}>
      {/* Header + tabs */}
      <div
        onPointerDown={onHeaderPointerDown}
        style={{
          borderBottom: "1px solid #2a2a3a", padding: "10px 12px 0",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: "#888", fontSize: 11, marginRight: 6, letterSpacing: 1 }}>⠿⠿</span>
          <span style={{ color: "#aaa", fontSize: 12, fontWeight: 700, flex: 1 }}>HERRAMIENTAS</span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#555", cursor: "pointer",
              fontSize: 18, lineHeight: 1, padding: "0 2px",
            }}
          >×</button>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { id: "qr",       label: "🔲 QR"      },
            { id: "color",    label: "🎨 Colores"  },
            { id: "gradient", label: "🌈 Gradiente"},
          ] as { id: PanelTab; label: string }[]).map(tab => (
            <button key={tab.id} onPointerDown={e => e.stopPropagation()} onClick={() => onTabChange(tab.id)} style={{
              background:   activeTab === tab.id ? "rgba(139,92,246,0.25)" : "none",
              borderTop:    activeTab === tab.id ? "1px solid rgba(139,92,246,0.6)" : "1px solid transparent",
              borderRight:  activeTab === tab.id ? "1px solid rgba(139,92,246,0.6)" : "1px solid transparent",
              borderLeft:   activeTab === tab.id ? "1px solid rgba(139,92,246,0.6)" : "1px solid transparent",
              borderBottom: "none",
              borderRadius: "7px 7px 0 0",
              color:        activeTab === tab.id ? "#c4b5fd" : "#666",
              cursor:       "pointer",
              fontSize:     11,
              fontWeight:   600,
              padding:      "5px 10px",
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 14, maxHeight: 480, overflowY: "auto" }}>

        {/* ── QR TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "qr" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>TEXTO / URL</label>
              <textarea
                value={qrText}
                onChange={e => setQrText(e.target.value)}
                rows={2}
                placeholder="https://tuurl.com"
                style={{
                  width: "100%", resize: "vertical", background: "#111",
                  border: "1px solid #333", borderRadius: 8, color: "white",
                  fontSize: 12, padding: "7px 10px", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Size presets */}
            <div>
              <label style={labelStyle}>TAMAÑO (px)</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                {QR_PRESETS.map(p => (
                  <button key={p.value}
                    onClick={() => { setQrSize(p.value); setQrCustom(""); }}
                    style={{
                      ...presetBtn,
                      background: qrSize === p.value && !qrCustom ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
                      border:     qrSize === p.value && !qrCustom ? "1px solid #8b5cf6" : "1px solid #333",
                      color:      qrSize === p.value && !qrCustom ? "white" : "#777",
                    }}
                  >{p.label}</button>
                ))}
              </div>
              <input
                type="number"
                min={32} max={1024}
                value={qrCustom}
                onChange={e => setQrCustom(e.target.value)}
                placeholder="Personalizado…"
                style={{
                  width: "100%", background: "#111", border: "1px solid #333",
                  borderRadius: 8, color: "white", fontSize: 12,
                  padding: "6px 10px", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Colors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>COLOR QR</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={qrFg} onChange={e => setQrFg(e.target.value)}
                    style={colorInput} />
                  <span style={{ color: "#666", fontSize: 11 }}>{qrFg}</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>FONDO QR</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {!qrTranspBg && (
                    <input type="color" value={qrBg} onChange={e => setQrBg(e.target.value)}
                      style={colorInput} />
                  )}
                  <button
                    onClick={() => setQrTranspBg(v => !v)}
                    style={{
                      ...presetBtn,
                      background: qrTranspBg ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
                      border:     qrTranspBg ? "1px solid #8b5cf6" : "1px solid #333",
                      color:      qrTranspBg ? "white" : "#777",
                      fontSize:   10,
                    }}
                  >{qrTranspBg ? "Transp. ✓" : "Transp."}</button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div ref={qrContainerRef} style={{
                background: qrTranspBg ? "transparent" : qrBg,
                padding: 8, borderRadius: 8,
                border: "1px solid #333",
                display: "inline-block",
              }}>
                {qrText.trim() ? (
                  <QRCodeCanvas
                    value={qrText || " "}
                    size={Math.min(resolvedQrSize, 220)}
                    level="H"
                    fgColor={qrFg}
                    bgColor={qrTranspBg ? "transparent" : qrBg}
                    includeMargin={false}
                  />
                ) : (
                  <div style={{ width: 100, height: 100, color: "#444", fontSize: 11,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Escribe algo
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleInsertQR}
              disabled={!qrText.trim()}
              style={{
                background:   qrText.trim() ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : "#222",
                border:       "none", borderRadius: 9, color: "white",
                fontSize:     13, fontWeight: 700, padding: "10px",
                cursor:       qrText.trim() ? "pointer" : "not-allowed",
                opacity:      qrText.trim() ? 1 : 0.5,
              }}
            >
              ↙ Insertar QR en nota
            </button>
          </div>
        )}

        {/* ── COLOR TAB ──────────────────────────────────────────────────── */}
        {activeTab === "color" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>COLOR BASE</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)}
                  style={colorInput} />
                <span style={{ color: "#666", fontSize: 11 }}>{baseColor}</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>PALETA GENERADA</label>
              <div style={{ display: "flex", gap: 4 }}>
                {palette.map((c, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                    <div style={{ background: c, height: 36, borderRadius: 6, cursor: "pointer" }}
                      title={c}
                      onClick={() => {}} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button onClick={() => onSetDrawColor(c)} style={{
                        ...miniBtn, background: "rgba(139,92,246,0.15)", borderColor: "#8b5cf6",
                      }} title="Usar para dibujar">✒️</button>
                      <button onClick={() => onSetBgColor(c)} style={{
                        ...miniBtn, background: "rgba(34,197,94,0.1)", borderColor: "#22c55e",
                      }} title="Fondo de nota">🗒️</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <div style={{ fontSize: 10, color: "#555" }}>✒️ = color de pluma</div>
                <div style={{ fontSize: 10, color: "#555" }}>🗒️ = fondo de nota</div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>FONDO PERSONALIZADO</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={baseColor}
                  onChange={e => { setBaseColor(e.target.value); }}
                  style={colorInput} />
                <button onClick={() => onSetBgColor(baseColor)} style={{
                  ...presetBtn, flex: 1,
                  background: "rgba(34,197,94,0.15)", border: "1px solid #22c55e", color: "#86efac",
                }}>
                  Aplicar a nota
                </button>
              </div>
            </div>

            {/* Dark theme presets */}
            <div>
              <label style={labelStyle}>FONDOS RÁPIDOS</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {[
                  { label: "Noche",    color: "#1e1e2e" },
                  { label: "Oscuro",   color: "#111827" },
                  { label: "Pizarra",  color: "#1e293b" },
                  { label: "Grafito",  color: "#1a1a1a" },
                  { label: "Beige",    color: "#fdf6e3" },
                  { label: "Blanco",   color: "#ffffff" },
                  { label: "Papel",    color: "#f5f5dc" },
                  { label: "Cielo",    color: "#0f172a" },
                ].map(p => (
                  <button key={p.color} onClick={() => onSetBgColor(p.color)} style={{
                    ...presetBtn,
                    background: p.color,
                    border: "1px solid #444",
                    color: parseInt(p.color.slice(1), 16) > 0x888888 ? "#111" : "#eee",
                    minWidth: 60,
                  }}>{p.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GRADIENT TAB ───────────────────────────────────────────────── */}
        {activeTab === "gradient" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Preview */}
            <div style={{
              height: 70, borderRadius: 10,
              background: `linear-gradient(${gDir}, ${gColor1}, ${gColor2})`,
              border: "1px solid #333",
              transition: "background 0.3s",
            }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>COLOR 1</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={gColor1} onChange={e => setGColor1(e.target.value)}
                    style={colorInput} />
                  <input value={gColor1} onChange={e => setGColor1(e.target.value)}
                    style={{ ...textInput, width: 70, fontSize: 11 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>COLOR 2</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={gColor2} onChange={e => setGColor2(e.target.value)}
                    style={colorInput} />
                  <input value={gColor2} onChange={e => setGColor2(e.target.value)}
                    style={{ ...textInput, width: 70, fontSize: 11 }} />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>DIRECCIÓN</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {GRADIENT_DIRS.map(d => (
                  <button key={d.value} onClick={() => setGDir(d.value)} style={{
                    ...presetBtn,
                    background: gDir === d.value ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
                    border:     gDir === d.value ? "1px solid #8b5cf6" : "1px solid #333",
                    color:      gDir === d.value ? "white" : "#666",
                    fontSize:   16, width: 32, height: 32, padding: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{d.label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onSetBgGradient(gColor1, gColor2, gDir)} style={{
                flex: 1, background: `linear-gradient(${gDir},${gColor1},${gColor2})`,
                border: "none", borderRadius: 9, color: "white",
                fontSize: 13, fontWeight: 700, padding: "10px",
                cursor: "pointer",
              }}>
                Aplicar a nota
              </button>
              <button onClick={onClearGradient} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid #333",
                borderRadius: 9, color: "#666", fontSize: 12, padding: "10px 12px",
                cursor: "pointer",
              }}>
                Limpiar
              </button>
            </div>

            {/* Gradient presets */}
            <div>
              <label style={labelStyle}>DEGRADADOS RÁPIDOS</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { label: "Purpura → Cyan",    c1: "#8b5cf6", c2: "#06b6d4", dir: "to right"  },
                  { label: "Atardecer",          c1: "#f97316", c2: "#ef4444", dir: "to right"  },
                  { label: "Bosque",             c1: "#14532d", c2: "#052e16", dir: "to bottom" },
                  { label: "Océano",             c1: "#1e3a5f", c2: "#0f172a", dir: "to bottom" },
                  { label: "Aurora",             c1: "#7c3aed", c2: "#0891b2", dir: "45deg"     },
                  { label: "Medianoche",         c1: "#0f0c29", c2: "#302b63", dir: "to right"  },
                ].map(p => (
                  <button key={p.label} onClick={() => { setGColor1(p.c1); setGColor2(p.c2); setGDir(p.dir); }} style={{
                    background: `linear-gradient(${p.dir}, ${p.c1}, ${p.c2})`,
                    border: "1px solid #333", borderRadius: 8,
                    color: "white", fontSize: 11, fontWeight: 600,
                    padding: "8px 12px", cursor: "pointer", textAlign: "left",
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}>{p.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Style constants ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  color: "#555", fontSize: 10, fontWeight: 700, letterSpacing: 1,
  display: "block", marginBottom: 6,
};

const presetBtn: React.CSSProperties = {
  borderRadius: 7, padding: "4px 8px", cursor: "pointer",
  fontSize: 12, fontWeight: 600, transition: "all 0.15s",
};

const miniBtn: React.CSSProperties = {
  borderRadius: 5, padding: "2px 4px", cursor: "pointer",
  fontSize: 11, border: "1px solid", background: "none",
  color: "white", width: "100%",
};

const colorInput: React.CSSProperties = {
  width: 36, height: 28, borderRadius: 6, border: "1px solid #444",
  cursor: "pointer", padding: 2, background: "none",
};

const textInput: React.CSSProperties = {
  background: "#111", border: "1px solid #333", borderRadius: 7,
  color: "white", fontSize: 12, padding: "4px 8px",
};
