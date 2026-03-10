"use client";
import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

function randomSlug(len = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function URLShortenerClient() {
  const [url, setUrl] = useState("");
  const [short, setShort] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const shorten = () => {
    setError("");
    if (!url) { setError("Ingresa una URL"); return; }
    try {
      new URL(url);
    } catch {
      setError("URL inválida. Asegúrate de incluir https://");
      return;
    }
    setShort(`https://pixlit.io/${randomSlug()}`);
  };

  const copy = () => {
    navigator.clipboard.writeText(short);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolLayout
      title="🔗 Acortador de URLs"
      description="Convierte URLs largas en links cortos y fáciles de compartir."
    >
      <div style={{ maxWidth: "580px", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && shorten()}
            placeholder="https://tusitio.com/url-muy-larga..."
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={shorten} style={{ whiteSpace: "nowrap" }}>
            🔗 Acortar
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px 16px", color: "#f87171", fontSize: "14px", marginBottom: "16px" }}>
            ❌ {error}
          </div>
        )}

        {short && (
          <div
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "12px",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>Tu URL acortada</div>
              <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: "18px" }}>{short}</div>
            </div>
            <button
              className="btn-primary"
              onClick={copy}
              style={{ flexShrink: 0, padding: "8px 20px" }}
            >
              {copied ? "✓ Copiado" : "📋 Copiar"}
            </button>
          </div>
        )}

        {/* Mockup notice */}
        <div
          style={{
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: "10px",
            padding: "16px 20px",
          }}
        >
          <div style={{ color: "#fbbf24", fontWeight: 700, marginBottom: "6px" }}>
            ⚠️ Modo demo
          </div>
          <p style={{ color: "#888", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
            Los links generados son <strong>ficticios</strong> (no funcionan). El backend real con redirección,
            analytics y QR por link estará disponible en <strong>Pixlit Pro</strong>. ¡Próximamente!
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
