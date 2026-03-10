"use client";
import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function WordCounterClient() {
  const [text, setText] = useState("");

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  const lines = text ? text.split("\n").length : 0;
  const sentences = text.split(/[.!?]+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const stats = [
    { label: "Palabras", value: words, icon: "📝" },
    { label: "Caracteres", value: chars, icon: "🔤" },
    { label: "Sin espacios", value: charsNoSpace, icon: "⬜" },
    { label: "Líneas", value: lines, icon: "↵" },
    { label: "Oraciones", value: sentences, icon: "💬" },
    { label: "Tiempo lectura", value: `~${readTime} min`, icon: "⏱️" },
  ];

  return (
    <ToolLayout
      title="📝 Contador de Palabras"
      description="Pega o escribe tu texto para obtener estadísticas en tiempo real: palabras, caracteres, líneas y tiempo de lectura."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "28px", alignItems: "start" }}>
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            placeholder="Escribe o pega tu texto aquí..."
            style={{ resize: "vertical", fontSize: "15px", lineHeight: "1.6" }}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button className="btn-secondary" onClick={() => setText("")} style={{ fontSize: "13px", padding: "8px 16px" }}>
              🗑️ Limpiar
            </button>
            <span style={{ color: "#555", fontSize: "13px", display: "flex", alignItems: "center" }}>
              {chars} caracteres
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "160px" }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: "10px",
                padding: "14px 18px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>{s.icon}</div>
              <div style={{ color: "#8b5cf6", fontWeight: 800, fontSize: "22px" }}>{s.value}</div>
              <div style={{ color: "#666", fontSize: "12px", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
