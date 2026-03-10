"use client";
import { useState, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";

type Format = "image/png" | "image/jpeg" | "image/webp";

const formats: { label: string; mime: Format; ext: string }[] = [
  { label: "PNG", mime: "image/png", ext: "png" },
  { label: "JPG", mime: "image/jpeg", ext: "jpg" },
  { label: "WebP", mime: "image/webp", ext: "webp" },
];

export default function ImageConverterClient() {
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("image");
  const [format, setFormat] = useState<Format>("image/png");
  const [converted, setConverted] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (e) => { setSrc(e.target?.result as string); setConverted(null); };
    reader.readAsDataURL(file);
  };

  const convert = () => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      // White background for JPG
      if (format === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      setConverted(canvas.toDataURL(format, 0.92));
    };
    img.src = src;
  };

  const download = () => {
    if (!converted) return;
    const ext = formats.find((f) => f.mime === format)?.ext || "png";
    const a = document.createElement("a");
    a.href = converted;
    a.download = `${fileName}-converted.${ext}`;
    a.click();
  };

  return (
    <ToolLayout
      title="🔄 Convertidor de Imágenes"
      description="Convierte imágenes entre PNG, JPG y WebP al instante. Todo se procesa en tu navegador."
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
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
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔄</div>
        <p style={{ color: "#888" }}>Arrastra tu imagen aquí o haz clic</p>
        <p style={{ color: "#555", fontSize: "13px" }}>PNG, JPG, WebP, GIF…</p>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
      </div>

      {src && (
        <>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ color: "#aaa", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "12px" }}>
              CONVERTIR A
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              {formats.map((f) => (
                <button
                  key={f.mime}
                  onClick={() => setFormat(f.mime)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: format === f.mime ? "#8b5cf6" : "#333",
                    background: format === f.mime ? "rgba(139,92,246,0.15)" : "#111",
                    color: format === f.mime ? "#a78bfa" : "#888",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={convert} style={{ width: "100%", marginBottom: "24px" }}>
            🔄 Convertir
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #2a2a2a", color: "#888", fontSize: "12px", fontWeight: 600 }}>ORIGINAL</div>
              <img src={src} alt="Original" style={{ width: "100%", display: "block", maxHeight: "240px", objectFit: "contain" }} />
            </div>
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #2a2a2a", color: "#888", fontSize: "12px", fontWeight: 600 }}>CONVERTIDA</div>
              {converted ? (
                <img src={converted} alt="Converted" style={{ width: "100%", display: "block", maxHeight: "240px", objectFit: "contain" }} />
              ) : (
                <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: "14px" }}>
                  Convierte para ver el resultado
                </div>
              )}
            </div>
          </div>

          {converted && (
            <button className="btn-primary" onClick={download} style={{ width: "100%", marginTop: "16px" }}>
              ⬇️ Descargar imagen convertida
            </button>
          )}
        </>
      )}
    </ToolLayout>
  );
}
