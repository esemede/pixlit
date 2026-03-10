"use client";
import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function JSONFormatterClient() {
  const [input, setInput] = useState('{"name":"Pixlit","tools":12,"free":true}');
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolLayout
      title="📋 Formateador JSON"
      description="Pega tu JSON para formatearlo, validarlo o minificarlo. Detección de errores en tiempo real."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            INPUT JSON
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={16}
            style={{ fontFamily: "monospace", fontSize: "13px", resize: "vertical" }}
            placeholder='{"key": "value"}'
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button className="btn-primary" onClick={format} style={{ flex: 1 }}>
              ✨ Formatear
            </button>
            <button className="btn-secondary" onClick={minify} style={{ flex: 1 }}>
              🗜️ Minificar
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600 }}>OUTPUT</label>
            {output && (
              <button onClick={copy} style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: "13px" }}>
                {copied ? "✓ Copiado" : "📋 Copiar"}
              </button>
            )}
          </div>
          {error ? (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "16px", color: "#f87171", fontSize: "13px", fontFamily: "monospace" }}>
              ❌ {error}
            </div>
          ) : (
            <pre style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              padding: "12px 14px",
              color: "#a78bfa",
              fontSize: "13px",
              fontFamily: "monospace",
              overflow: "auto",
              minHeight: "300px",
              maxHeight: "400px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}>
              {output || <span style={{ color: "#444" }}>El resultado aparecerá aquí...</span>}
            </pre>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
