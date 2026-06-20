import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Herramientas — Pixlit",
  description:
    "Suite de herramientas online gratuitas: QR, imágenes, JSON, contraseñas, colores y más. Rápido, privado, sin registro.",
};

const tools = [
  {
    href: "/",
    icon: "📓",
    name: "Cuaderno de Notas",
    desc: "Dibuja y escribe con stylus, touch o mouse. Páginas múltiples, exportación PNG y colaboración en vivo.",
    highlight: true,
  },
  {
    href: "/tools/qr-generator",
    icon: "🔲",
    name: "Generador QR",
    desc: "Convierte texto o URLs en códigos QR descargables al instante.",
  },
  {
    href: "/tools/url-shortener",
    icon: "🔗",
    name: "Acortador de URLs",
    desc: "Acorta URLs largas en links compactos y fáciles de compartir.",
  },
  {
    href: "/tools/image-compressor",
    icon: "🖼️",
    name: "Compresor de Imágenes",
    desc: "Reduce el peso de tus imágenes sin perder calidad visible.",
  },
  {
    href: "/tools/image-converter",
    icon: "🔄",
    name: "Convertidor de Imágenes",
    desc: "Convierte entre PNG, JPG y WebP directamente en el navegador.",
  },
  {
    href: "/tools/json-formatter",
    icon: "📋",
    name: "Formateador JSON",
    desc: "Formatea, valida y minifica JSON con resaltado de errores.",
  },
  {
    href: "/tools/base64",
    icon: "🔡",
    name: "Base64 Encode/Decode",
    desc: "Codifica y decodifica texto en Base64 de forma instantánea.",
  },
  {
    href: "/tools/password-generator",
    icon: "🔐",
    name: "Generador de Contraseñas",
    desc: "Genera contraseñas seguras con opciones personalizables.",
  },
  {
    href: "/tools/word-counter",
    icon: "📝",
    name: "Contador de Palabras",
    desc: "Cuenta palabras, caracteres, líneas y tiempo de lectura.",
  },
  {
    href: "/tools/color-palette",
    icon: "🎨",
    name: "Paleta de Colores",
    desc: "Genera paletas de 5 tonos a partir de un color base.",
  },
  {
    href: "/tools/css-gradient",
    icon: "🌈",
    name: "Gradientes CSS",
    desc: "Crea gradientes CSS lineales con preview en tiempo real.",
  },
  {
    href: "/tools/uuid-generator",
    icon: "🆔",
    name: "Generador UUID",
    desc: "Genera uno o varios UUID v4 únicos y cópialos al instante.",
  },
  {
    href: "/tools/timestamp",
    icon: "⏱️",
    name: "Conversor Timestamp",
    desc: "Convierte timestamps Unix a fechas legibles y viceversa.",
  },
];

export default function ToolsPage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 24px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "56px" }}>
        <div style={{
          display: "inline-block",
          background: "rgba(139,92,246,0.15)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: "999px",
          padding: "6px 16px",
          fontSize: "13px",
          color: "#a78bfa",
          marginBottom: "20px",
          fontWeight: 600,
        }}>
          ⚡ {tools.length} herramientas gratuitas
        </div>
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: "16px",
          background: "linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Herramientas para<br />devs y creadores
        </h1>
        <p style={{ color: "#888", fontSize: "16px", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
          Rápidas, privadas y gratuitas. Todo se procesa en tu navegador.
        </p>
      </div>

      {/* Tools Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "16px",
      }}>
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{
              padding: "24px",
              cursor: "pointer",
              height: "100%",
              border: tool.highlight
                ? "1px solid rgba(139,92,246,0.5)"
                : undefined,
              background: tool.highlight
                ? "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(109,40,217,0.04) 100%)"
                : undefined,
            }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{tool.icon}</div>
              <h3 style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>
                {tool.name}
                {tool.highlight && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 600,
                    background: "rgba(139,92,246,0.3)", color: "#c4b5fd",
                    padding: "2px 7px", borderRadius: 999,
                  }}>Principal</span>
                )}
              </h3>
              <p style={{ color: "#888", fontSize: "14px", lineHeight: 1.5 }}>{tool.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
