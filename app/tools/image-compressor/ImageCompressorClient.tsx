"use client";
import { useState, useRef, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function ImageCompressorClient() {
  const [original, setOriginal] = useState<{ src: string; size: number; name: string } | null>(null);
  const [compressed, setCompressed] = useState<{ src: string; size: number } | null>(null);
  const [quality, setQuality] = useState(80);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setOriginal({ src, size: file.size, name: file.name });
      setCompressed(null);
    };
    reader.readAsDataURL(file);
  };

  const compress = useCallback(() => {
    if (!original) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", quality / 100);
      const size = Math.round(((dataUrl.length - 22) * 3) / 4);
      setCompressed({ src: dataUrl, size });
    };
    img.src = original.src;
  }, [original, quality]);

  const download = () => {
    if (!compressed || !original) return;
    const a = document.createElement("a");
    a.href = compressed.src;
    a.download = `compressed-${original.name.replace(/\.[^.]+$/, ".jpg")}`;
    a.click();
  };

  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  const saving = original && compressed
    ? Math.round((1 - compressed.size / original.size) * 100)
    : 0;

  return (
    <ToolLayout
      title="🖼️ Compresor de Imágenes"
      description="Comprime imágenes directamente en tu navegador usando Canvas API. Tus archivos nunca salen de tu dispositivo."
    >
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#8b5cf6" : "#333"}`,
          borderRadius: "12px",
          padding: "48px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(139,92,246,0.05)" : "#111",
          transition: "all 0.2s",
          marginBottom: "24px",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🖼️</div>
        <p style={{ color: "#888" }}>Arrastra una imagen aquí o haz clic para seleccionar</p>
        <p style={{ color: "#555", fontSize: "13px" }}>JPG, PNG, WebP</p>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
      </div>

      {original && (
        <>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600 }}>CALIDAD: {quality}%</label>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#8b5cf6", marginBottom: "12px" }}
            />
            <button className="btn-primary" onClick={compress} style={{ width: "100%" }}>
              🗜️ Comprimir
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Original */}
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a2a", color: "#888", fontSize: "13px", fontWeight: 600 }}>
                ORIGINAL — {fmtSize(original.size)}
              </div>
              <img src={original.src} alt="Original" style={{ width: "100%", display: "block", maxHeight: "250px", objectFit: "contain" }} />
            </div>

            {/* Compressed */}
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a2a", color: "#888", fontSize: "13px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                <span>COMPRIMIDA {compressed ? `— ${fmtSize(compressed.size)}` : ""}</span>
                {saving > 0 && <span style={{ color: "#22c55e", fontWeight: 700 }}>-{saving}%</span>}
              </div>
              {compressed ? (
                <img src={compressed.src} alt="Compressed" style={{ width: "100%", display: "block", maxHeight: "250px", objectFit: "contain" }} />
              ) : (
                <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>
                  Haz clic en Comprimir
                </div>
              )}
            </div>
          </div>

          {compressed && (
            <button className="btn-primary" onClick={download} style={{ width: "100%", marginTop: "16px" }}>
              ⬇️ Descargar imagen comprimida
            </button>
          )}
        </>
      )}
    </ToolLayout>
  );
}
