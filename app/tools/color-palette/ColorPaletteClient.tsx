"use client";
import { useState, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";

// ─── Color Math ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function rotateHue(h: number, deg: number): number {
  return (h + deg + 360) % 360;
}

/** Generate 5 shades for a hue (10%, 30%, base, 65%, 80% lightness) */
function generateShades(h: number, s: number, baseL: number): { hex: string; l: number }[] {
  // Clamp saturation slightly for very light/dark extremes
  return [
    { hex: hslToHex(h, Math.min(s, 40), 95), l: 95 },
    { hex: hslToHex(h, Math.min(s, 60), 80), l: 80 },
    { hex: hslToHex(h, s, baseL),             l: baseL },
    { hex: hslToHex(h, Math.min(s + 5, 100), Math.max(baseL - 20, 15)), l: Math.max(baseL - 20, 15) },
    { hex: hslToHex(h, Math.min(s + 10, 100), Math.max(baseL - 40, 8)), l: Math.max(baseL - 40, 8) },
  ];
}

// ─── Harmony Systems ───────────────────────────────────────────────────────────

type HarmonyColor = { name: string; h: number; s: number; l: number; hex: string; shades: { hex: string; l: number }[] };
type Harmony = { id: string; label: string; description: string; theory: string; useCase: string; colors: HarmonyColor[] };

function buildHarmonies(hex: string): Harmony[] {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  const color = (name: string, hue: number, sat = s, lig = l): HarmonyColor => ({
    name, h: hue, s: sat, l: lig,
    hex: hslToHex(hue, sat, lig),
    shades: generateShades(hue, sat, lig),
  });

  return [
    {
      id: "monochromatic",
      label: "Monocromático",
      description: "Mismo matiz, diferente saturación y luminosidad",
      theory: "Usa un único matiz variando su saturación y brillo. Crea paletas cohesivas y elegantes sin tensión visual.",
      useCase: "UI minimalista, branding, diseño editorial",
      colors: [
        color("Pálido",   h, Math.max(s - 30, 10), Math.min(l + 35, 92)),
        color("Suave",    h, Math.max(s - 15, 20), Math.min(l + 18, 80)),
        color("Base",     h, s, l),
        color("Profundo", h, Math.min(s + 10, 100), Math.max(l - 18, 15)),
        color("Oscuro",   h, Math.min(s + 15, 100), Math.max(l - 35, 8)),
      ],
    },
    {
      id: "complementary",
      label: "Complementario",
      description: "Colores opuestos en el círculo cromático (180°)",
      theory: "El color opuesto genera máximo contraste. Usado correctamente crea dinamismo; en exceso puede ser agresivo.",
      useCase: "CTAs, énfasis, logotipos con alto impacto",
      colors: [
        color("Base",            h,              s,                    l),
        color("Base suave",      h,              Math.max(s - 20, 15), Math.min(l + 20, 88)),
        color("Complementario",  rotateHue(h, 180), s,                 l),
        color("Comp. suave",     rotateHue(h, 180), Math.max(s - 20, 15), Math.min(l + 20, 88)),
        color("Neutro",          h,              10,                   l > 50 ? 20 : 90),
      ],
    },
    {
      id: "analogous",
      label: "Análogo",
      description: "Colores adyacentes en el círculo cromático (±30°)",
      theory: "Los colores vecinos comparten temperatura y armonía natural. Se encuentran en la naturaleza y resultan agradables.",
      useCase: "Fondos, ilustraciones, diseño ambiental",
      colors: [
        color("−60°", rotateHue(h, -60), s, l),
        color("−30°", rotateHue(h, -30), s, l),
        color("Base",  h,                 s, l),
        color("+30°", rotateHue(h,  30), s, l),
        color("+60°", rotateHue(h,  60), s, l),
      ],
    },
    {
      id: "triadic",
      label: "Tríadico",
      description: "Tres colores equidistantes (120° entre sí)",
      theory: "Ofrece contraste fuerte con equilibrio visual. Cada color domina a 120°, creando tensión sin perder armonía.",
      useCase: "Arte, ilustración infantil, identidad vibrante",
      colors: [
        color("Primario",    h,                  s,                 l),
        color("Prim. suave", h,                  Math.max(s-20,15), Math.min(l+22,88)),
        color("Secundario",  rotateHue(h, 120),  s,                 l),
        color("Sec. suave",  rotateHue(h, 120),  Math.max(s-20,15), Math.min(l+22,88)),
        color("Terciario",   rotateHue(h, 240),  s,                 l),
      ],
    },
    {
      id: "split-complementary",
      label: "Split-Complementario",
      description: "Base + dos colores adyacentes al complemento (±150°)",
      theory: "Variante del complementario con menor tensión. Ofrece contraste rico pero más fácil de balancear en diseño.",
      useCase: "Diseño web, presentaciones, ilustración",
      colors: [
        color("Base",      h,                  s,                 l),
        color("Base tono", h,                  Math.max(s-15,20), Math.min(l+15,85)),
        color("Split A",   rotateHue(h, 150),  s,                 l),
        color("Split B",   rotateHue(h, 210),  s,                 l),
        color("Neutro",    h,                  8,                 l > 50 ? 18 : 92),
      ],
    },
    {
      id: "tetradic",
      label: "Tetrádico",
      description: "Cuatro colores en rectángulo (90° entre pares)",
      theory: "El sistema más rico: dos pares complementarios. Requiere elegir un color dominante para evitar el caos visual.",
      useCase: "Paletas de diseño completas, sistemas de UI complejos",
      colors: [
        color("Primario",     h,                 s, l),
        color("Secundario",   rotateHue(h,  90), s, l),
        color("Terciario",    rotateHue(h, 180), s, l),
        color("Cuaternario",  rotateHue(h, 270), s, l),
        color("Dominante",    h,                 s, Math.max(l - 25, 10)),
      ],
    },
  ];
}

// ─── UI Helpers ────────────────────────────────────────────────────────────────

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function textOn(hex: string) { return luminance(hex) > 0.5 ? "#000" : "#fff"; }

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ColorPaletteClient() {
  const [base, setBase] = useState("#8b5cf6");
  const [activeHarmony, setActiveHarmony] = useState("complementary");
  const [copied, setCopied] = useState<string | null>(null);
  const [showShades, setShowShades] = useState(false);

  const harmonies = buildHarmonies(base.length === 7 ? base : "#8b5cf6");
  const harmony = harmonies.find((h) => h.id === activeHarmony) ?? harmonies[0];

  const copy = useCallback((hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1800);
  }, []);

  const s: Record<string, React.CSSProperties> = {
    wrap:  { maxWidth: "860px", margin: "0 auto", fontFamily: "system-ui, sans-serif" },
    picker: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px", justifyContent: "center" },
    input:  { type: "color" } as React.CSSProperties,
    hexInput: { width: "140px", fontFamily: "monospace", fontSize: "17px", textAlign: "center", background: "#111", color: "#fff", border: "1px solid #333", borderRadius: "8px", padding: "8px" },
    tabs:   { display: "flex", flexWrap: "wrap" as const, gap: "8px", marginBottom: "20px", justifyContent: "center" },
    infoBox:{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "14px 18px", marginBottom: "24px" },
    grid:   { display: "grid", gap: "12px" },
    swatch: { borderRadius: "10px", overflow: "hidden", border: "1px solid #2a2a2a", cursor: "pointer" },
    meta:   { background: "#111", padding: "10px 8px", textAlign: "center" as const },
    shadeRow:{ display: "flex", gap: "4px", marginTop: "6px" },
    toggle:  { background: "none", border: "1px solid #333", color: "#888", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "12px" },
  };

  return (
    <ToolLayout
      title="🎨 Generador de Paletas de Color"
      description="Genera paletas basadas en sistemas de armonía cromática: complementario, análogo, tríadico y más."
    >
      <div style={s.wrap}>

        {/* Picker */}
        <div style={s.picker}>
          <input
            type="color"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            style={{ width: "58px", height: "58px", borderRadius: "12px", border: "none", cursor: "pointer", padding: "2px" }}
          />
          <input
            type="text"
            value={base}
            onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBase(e.target.value); }}
            style={s.hexInput}
          />
          <div style={{ color: "#555", fontSize: "12px", textAlign: "center", lineHeight: 1.4 }}>
            {(() => { const [r,g,b] = hexToRgb(base.length===7?base:"#8b5cf6"); const [h,sv,l]=rgbToHsl(r,g,b); return `HSL(${h}°, ${sv}%, ${l}%)`; })()}
          </div>
        </div>

        {/* Harmony tabs */}
        <div style={s.tabs}>
          {harmonies.map((h) => (
            <button
              key={h.id}
              onClick={() => setActiveHarmony(h.id)}
              style={{
                padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: 600,
                background: activeHarmony === h.id ? base : "#1a1a1a",
                color: activeHarmony === h.id ? textOn(base) : "#888",
                transition: "all 0.2s",
              }}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Theory info */}
        <div style={s.infoBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>{harmony.label}</div>
              <div style={{ color: "#aaa", fontSize: "13px", marginBottom: "6px" }}>{harmony.theory}</div>
              <div style={{ color: "#666", fontSize: "12px" }}>
                <span style={{ color: "#555" }}>Ideal para: </span>
                <span style={{ color: "#888" }}>{harmony.useCase}</span>
              </div>
            </div>
            <button style={s.toggle} onClick={() => setShowShades(!showShades)}>
              {showShades ? "Ocultar tonos" : "Ver tonos"}
            </button>
          </div>
        </div>

        {/* Palette grid */}
        <div style={{
          ...s.grid,
          gridTemplateColumns: `repeat(${harmony.colors.length}, 1fr)`,
        }}>
          {harmony.colors.map((color, i) => {
            const [r, g, b] = hexToRgb(color.hex);
            const tc = textOn(color.hex);
            return (
              <div key={i} style={s.swatch} onClick={() => copy(color.hex)}>
                {/* Main swatch */}
                <div
                  style={{
                    background: color.hex,
                    height: "120px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    transition: "opacity 0.2s",
                    opacity: copied === color.hex ? 0.85 : 1,
                  }}
                >
                  {copied === color.hex && (
                    <span style={{ color: tc, fontSize: "20px" }}>✓</span>
                  )}
                </div>

                {/* Shades strip */}
                {showShades && (
                  <div style={{ display: "flex", height: "28px" }}>
                    {color.shades.map((sh, si) => (
                      <div
                        key={si}
                        style={{ flex: 1, background: sh.hex, cursor: "pointer", position: "relative" }}
                        onClick={(e) => { e.stopPropagation(); copy(sh.hex); }}
                        title={sh.hex}
                      />
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div style={s.meta}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "11px", fontFamily: "monospace", marginBottom: "3px" }}>
                    {color.hex.toUpperCase()}
                  </div>
                  <div style={{ color: "#555", fontSize: "10px", marginBottom: "2px" }}>
                    rgb({r},{g},{b})
                  </div>
                  <div style={{ color: "#666", fontSize: "10px" }}>
                    hsl({color.h}°,{color.s}%,{color.l}%)
                  </div>
                  <div style={{ color: "#444", fontSize: "10px", marginTop: "3px" }}>{color.name}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wheel visualization */}
        <div style={{ marginTop: "28px", display: "flex", justifyContent: "center" }}>
          <WheelViz base={base} harmony={harmony} />
        </div>

        <p style={{ color: "#444", fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
          Clic en cualquier color para copiar el HEX · {showShades ? "Clic en una franja para copiar su tono" : "Activa \"Ver tonos\" para ver variaciones"}
        </p>
      </div>
    </ToolLayout>
  );
}

// ─── Color Wheel SVG ───────────────────────────────────────────────────────────

function WheelViz({ base, harmony }: { base: string; harmony: Harmony }) {
  const cx = 90, cy = 90, R = 72, r = 20;
  const toXY = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  // Draw rainbow wheel segments
  const segments = 360;
  const paths = Array.from({ length: segments }, (_, i) => {
    const a1 = (i / segments) * 360, a2 = ((i + 1) / segments) * 360;
    const p1 = toXY(a1, R), p2 = toXY(a2, R), p3 = toXY(a2, r), p4 = toXY(a1, r);
    return `M${p1.x},${p1.y} A${R},${R} 0 0,1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${r},${r} 0 0,0 ${p4.x},${p4.y} Z`;
  });

  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx={cx} cy={cy} r={R + 2} fill="#1a1a1a" />
      {paths.map((d, i) => (
        <path key={i} d={d} fill={`hsl(${i},70%,55%)`} />
      ))}
      <circle cx={cx} cy={cy} r={r - 1} fill="#111" />

      {/* Dots for each harmony color */}
      {harmony.colors.map((c, i) => {
        const pos = toXY(c.h, (R + r) / 2);
        return (
          <g key={i}>
            <circle cx={pos.x} cy={pos.y} r={7} fill={c.hex} stroke="#111" strokeWidth={1.5} />
          </g>
        );
      })}

      {/* Lines connecting harmony colors */}
      {harmony.colors.slice(1).map((c, i) => {
        const p0 = toXY(harmony.colors[0].h, (R + r) / 2);
        const p1 = toXY(c.h, (R + r) / 2);
        return (
          <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
            stroke="#fff" strokeWidth={0.8} strokeOpacity={0.25} strokeDasharray="3,3" />
        );
      })}
    </svg>
  );
}
