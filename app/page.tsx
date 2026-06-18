import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pixlit - Herramientas Online Gratis",
  description:
    "Suite de herramientas online gratuitas: QR, imágenes, JSON, contraseñas, colores y más. Rápido, privado, sin registro.",
};

const tools = [
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
  {
    href: "/tools/notebook",
    icon: "📓",
    name: "Cuaderno de Notas",
    desc: "Dibuja y escribe con stylus, touch o mouse. Páginas múltiples y exportación PNG.",
  },
];

const proFeatures = [
  "🚀 Sin anuncios en todas las herramientas",
  "📦 Procesamiento de imágenes en lote (hasta 50 archivos)",
  "🔗 Acortador de URLs real con analytics",
  "🎨 Paletas de colores ilimitadas + exportar",
  "🔐 Gestor de contraseñas integrado",
  "📊 Historial y guardado de proyectos",
  "⚡ Procesamiento prioritario",
  "🛠️ API REST para developers",
];

export default function Home() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 24px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "72px" }}>
        <div
          style={{
            display: "inline-block",
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: "999px",
            padding: "6px 16px",
            fontSize: "13px",
            color: "#a78bfa",
            marginBottom: "20px",
            fontWeight: 600,
          }}
        >
          ⚡ 13 herramientas gratuitas
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Herramientas para <br />
          devs y creadores
        </h1>
        <p
          style={{
            color: "#888",
            fontSize: "18px",
            maxWidth: "500px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Rápidas, privadas y gratuitas. Todo se procesa en tu navegador — sin
          servidores, sin registro.
        </p>
      </div>

      {/* Tools Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "16px",
          marginBottom: "96px",
        }}
      >
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
            <div
              className="card"
              style={{
                padding: "24px",
                cursor: "pointer",
                height: "100%",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                {tool.icon}
              </div>
              <h3
                style={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: "16px",
                  marginBottom: "8px",
                }}
              >
                {tool.name}
              </h3>
              <p style={{ color: "#888", fontSize: "14px", lineHeight: 1.5 }}>
                {tool.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Ad Slot */}
      <div
        className="ad-slot"
        style={{ height: "90px", marginBottom: "96px" }}
      >
        📢 AD SLOT — 728×90 Leaderboard
      </div>

      {/* Pro Section */}
      <div
        id="pro"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: "20px",
          padding: "60px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(139,92,246,0.2)",
            border: "1px solid rgba(139,92,246,0.4)",
            borderRadius: "999px",
            padding: "6px 16px",
            fontSize: "13px",
            color: "#a78bfa",
            marginBottom: "20px",
            fontWeight: 600,
          }}
        >
          ✨ Premium
        </div>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 900,
            marginBottom: "16px",
            color: "white",
          }}
        >
          Pixlit Pro
        </h2>
        <p style={{ color: "#888", fontSize: "16px", marginBottom: "40px" }}>
          Desbloquea el poder completo de todas las herramientas
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "12px",
            maxWidth: "800px",
            margin: "0 auto 40px",
            textAlign: "left",
          }}
        >
          {proFeatures.map((feature, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "14px 18px",
                color: "#ddd",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {feature}
            </div>
          ))}
        </div>

        <button
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "16px 40px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            opacity: 0.7,
          }}
        >
          Próximamente 🚀
        </button>
        <p style={{ color: "#555", fontSize: "12px", marginTop: "12px" }}>
          Sé el primero en enterarte cuando lancemos
        </p>
      </div>
    </div>
  );
}
