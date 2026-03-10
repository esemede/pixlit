"use client";
import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function lighten(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * pct, g + (255 - g) * pct, b + (255 - b) * pct);
}

function darken(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - pct), g * (1 - pct), b * (1 - pct));
}

export default function ColorPaletteClient() {
  const [base, setBase] = useState("#8b5cf6");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const palette = [
    { label: "Lighter", hex: lighten(base, 0.6) },
    { label: "Light", hex: lighten(base, 0.3) },
    { label: "Base", hex: base },
    { label: "Dark", hex: darken(base, 0.3) },
    { label: "Darker", hex: darken(base, 0.6) },
  ];

  const copy = (hex: string, i: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const getTextColor = (hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? "#000" : "#fff";
  };

  return (
    <ToolLayout
      title="🎨 Generador de Paletas de Color"
      description="Selecciona un color base y obtén una paleta de 5 tonos con valores HEX y RGB. Copia cada uno al instante."
    >
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px", justifyContent: "center" }}>
          <input
            type="color"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            style={{ width: "60px", height: "60px", borderRadius: "12px", border: "none", cursor: "pointer" }}
          />
          <input
            type="text"
            value={base}
            onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBase(e.target.value); }}
            style={{ width: "160px", fontFamily: "monospace", fontSize: "18px", textAlign: "center" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
          {palette.map((color, i) => {
            const [r, g, b] = hexToRgb(color.hex);
            const textColor = getTextColor(color.hex);
            return (
              <div
                key={i}
                style={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #2a2a2a",
                  cursor: "pointer",
                }}
                onClick={() => copy(color.hex, i)}
              >
                <div
                  style={{
                    background: color.hex,
                    height: "100px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    color: textColor,
                    transition: "opacity 0.2s",
                  }}
                >
                  {copiedIdx === i ? "✓" : ""}
                </div>
                <div style={{ background: "#111", padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "12px", fontFamily: "monospace", marginBottom: "4px" }}>
                    {color.hex.toUpperCase()}
                  </div>
                  <div style={{ color: "#666", fontSize: "11px" }}>
                    rgb({r},{g},{b})
                  </div>
                  <div style={{ color: "#555", fontSize: "11px" }}>{color.label}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ color: "#555", fontSize: "13px", textAlign: "center", marginTop: "16px" }}>
          Haz clic en cualquier color para copiar el HEX
        </p>
      </div>
    </ToolLayout>
  );
}
