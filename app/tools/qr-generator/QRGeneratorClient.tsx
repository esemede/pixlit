"use client";
import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import ToolLayout from "@/components/ToolLayout";

export default function QRGeneratorClient() {
  const [text, setText] = useState("https://pixlit.io");
  const [size, setSize] = useState(256);
  const canvasRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-pixlit.png";
    a.click();
  };

  return (
    <ToolLayout
      title="🔲 Generador QR"
      description="Convierte cualquier texto o URL en un código QR descargable. Sin límites, sin registro."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
        <div>
          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            TEXTO O URL
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="https://tuurl.com o cualquier texto..."
            style={{ resize: "vertical", marginBottom: "20px" }}
          />

          <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            TAMAÑO: {size}px
          </label>
          <input
            type="range"
            min={128}
            max={512}
            step={32}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#8b5cf6", marginBottom: "24px" }}
          />

          <button className="btn-primary" onClick={downloadQR} style={{ width: "100%" }}>
            ⬇️ Descargar PNG
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div ref={canvasRef}>
            {text.trim() ? (
              <div style={{ background: "white", padding: "16px", borderRadius: "12px" }}>
                <QRCodeCanvas
                  value={text || " "}
                  size={Math.min(size, 280)}
                  level="H"
                  includeMargin={false}
                />
              </div>
            ) : (
              <div style={{ color: "#555", textAlign: "center", fontSize: "14px" }}>
                Escribe algo para ver el QR
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
