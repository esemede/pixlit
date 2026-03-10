"use client";
import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

const directions = [
  { label: "→ Derecha", value: "to right" },
  { label: "← Izquierda", value: "to left" },
  { label: "↓ Abajo", value: "to bottom" },
  { label: "↑ Arriba", value: "to top" },
  { label: "↗ Diagonal ↗", value: "to top right" },
  { label: "↙ Diagonal ↙", value: "to bottom left" },
  { label: "135°", value: "135deg" },
  { label: "45°", value: "45deg" },
];

export default function CSSGradientClient() {
  const [color1, setColor1] = useState("#8b5cf6");
  const [color2, setColor2] = useState("#06b6d4");
  const [direction, setDirection] = useState("to right");
  const [copied, setCopied] = useState(false);

  const css = `background: linear-gradient(${direction}, ${color1}, ${color2});`;
  const gradient = `linear-gradient(${direction}, ${color1}, ${color2})`;

  const copy = () => {
    navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolLayout
      title="🌈 Generador de Gradientes CSS"
      description="Diseña gradientes lineales con preview en vivo y copia el CSS listo para usar en tu proyecto."
    >
      {/* Preview */}
      <div
        style={{
          height: "180px",
          borderRadius: "12px",
          background: gradient,
          marginBottom: "32px",
          border: "1px solid #2a2a2a",
          transition: "background 0.3s",
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        <div>
          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            COLOR 1
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="color"
              value={color1}
              onChange={(e) => setColor1(e.target.value)}
              style={{ width: "50px", height: "50px", borderRadius: "8px", border: "none", cursor: "pointer", background: "none" }}
            />
            <input
              type="text"
              value={color1}
              onChange={(e) => setColor1(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div>
          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            COLOR 2
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="color"
              value={color2}
              onChange={(e) => setColor2(e.target.value)}
              style={{ width: "50px", height: "50px", borderRadius: "8px", border: "none", cursor: "pointer", background: "none" }}
            />
            <input
              type="text"
              value={color2}
              onChange={(e) => setColor2(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div>
          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            DIRECCIÓN
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              color: "white",
              borderRadius: "8px",
              padding: "10px 14px",
              width: "100%",
              outline: "none",
            }}
          >
            {directions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CSS Output */}
      <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <code style={{ color: "#a78bfa", fontFamily: "monospace", fontSize: "14px", flex: 1 }}>
          {css}
        </code>
        <button onClick={copy} style={{ background: "none", border: "none", color: copied ? "#22c55e" : "#8b5cf6", cursor: "pointer", fontWeight: 600, fontSize: "13px", flexShrink: 0 }}>
          {copied ? "✓ Copiado" : "📋 Copiar CSS"}
        </button>
      </div>
    </ToolLayout>
  );
}
