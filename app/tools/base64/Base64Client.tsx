"use client";
import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

type Tab = "encode" | "decode";

export default function Base64Client() {
  const [tab, setTab] = useState<Tab>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const process = () => {
    setError("");
    try {
      if (tab === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input))));
      }
    } catch {
      setError("Texto inválido para decodificar");
      setOutput("");
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabStyle = (t: Tab) => ({
    padding: "8px 24px",
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    fontWeight: 600,
    fontSize: "14px",
    background: tab === t ? "#8b5cf6" : "transparent",
    color: tab === t ? "white" : "#888",
    transition: "all 0.2s",
  });

  return (
    <ToolLayout
      title="🔡 Base64 Encode / Decode"
      description="Codifica texto a Base64 o decodifica Base64 a texto plano. Útil para APIs, tokens y transmisión de datos."
    >
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "#111", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        <button style={tabStyle("encode")} onClick={() => { setTab("encode"); setInput(""); setOutput(""); setError(""); }}>
          🔒 Encode
        </button>
        <button style={tabStyle("decode")} onClick={() => { setTab("decode"); setInput(""); setOutput(""); setError(""); }}>
          🔓 Decode
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            {tab === "encode" ? "TEXTO PLANO" : "BASE64"}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            style={{ fontFamily: "monospace", fontSize: "13px", resize: "vertical" }}
            placeholder={tab === "encode" ? "Escribe el texto a codificar..." : "Pega el texto Base64 a decodificar..."}
          />
          <button className="btn-primary" onClick={process} style={{ width: "100%", marginTop: "12px" }}>
            {tab === "encode" ? "🔒 Encode" : "🔓 Decode"}
          </button>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600 }}>
              {tab === "encode" ? "BASE64" : "TEXTO PLANO"}
            </label>
            {output && (
              <button onClick={copy} style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: "13px" }}>
                {copied ? "✓ Copiado" : "📋 Copiar"}
              </button>
            )}
          </div>
          {error ? (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "16px", color: "#f87171", fontSize: "13px" }}>
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
              minHeight: "200px",
              maxHeight: "400px",
              overflow: "auto",
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
