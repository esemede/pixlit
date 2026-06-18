import Link from "next/link";

const DOCS = [
  { href: "/legal/terms",    label: "Términos y Condiciones" },
  { href: "/legal/privacy",  label: "Política de Privacidad" },
  { href: "/legal/refund",   label: "Reembolsos y Cancelación" },
  { href: "/legal/licenses", label: "Licencias Open Source" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Legal nav */}
      <div style={{
        background: "#0a0a0a", borderBottom: "1px solid #1e1e1e",
        padding: "12px 24px", display: "flex", gap: 8, flexWrap: "wrap",
        position: "sticky", top: 64, zIndex: 30,
      }}>
        {DOCS.map(d => (
          <Link key={d.href} href={d.href} style={{
            color: "#888", fontSize: 12, fontWeight: 500,
            textDecoration: "none", padding: "4px 10px",
            border: "1px solid #1e1e1e", borderRadius: 6,
          }}>
            {d.label}
          </Link>
        ))}
        <span style={{ color: "#333", fontSize: 12, alignSelf: "center", marginLeft: 8 }}>
          · Última actualización: 17 jun 2026
        </span>
      </div>
      {children}
    </div>
  );
}
