"use client";
import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

function generateUUID(): string {
  return crypto.randomUUID();
}

export default function UUIDGeneratorClient() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const generate = () => {
    setUuids(Array.from({ length: count }, generateUUID));
    setCopiedIndex(null);
  };

  const copyOne = (uuid: string, i: number) => {
    navigator.clipboard.writeText(uuid);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.join("\n"));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  return (
    <ToolLayout
      title="🆔 Generador UUID"
      description="Genera UUIDs v4 criptográficamente seguros usando la Web Crypto API del navegador."
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", marginBottom: "28px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
              CANTIDAD (1-50)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
            />
          </div>
          <button className="btn-primary" onClick={generate} style={{ padding: "10px 28px", whiteSpace: "nowrap" }}>
            🎲 Generar
          </button>
        </div>

        {uuids.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
              <button onClick={copyAll} style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: "13px" }}>
                {allCopied ? "✓ Todos copiados" : "📋 Copiar todos"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {uuids.map((uuid, i) => (
                <div
                  key={i}
                  style={{
                    background: "#111",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <code style={{ color: "#a78bfa", fontSize: "14px", fontFamily: "monospace", flex: 1 }}>
                    {uuid}
                  </code>
                  <button
                    onClick={() => copyOne(uuid, i)}
                    style={{ background: "none", border: "none", color: copiedIndex === i ? "#22c55e" : "#666", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}
                  >
                    {copiedIndex === i ? "✓" : "📋"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {uuids.length === 0 && (
          <div style={{ textAlign: "center", color: "#444", padding: "60px 0", fontSize: "15px" }}>
            Haz clic en Generar para crear tus UUIDs
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
