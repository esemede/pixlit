import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/legal/terms",    label: "Términos" },
  { href: "/legal/privacy",  label: "Privacidad" },
  { href: "/legal/refund",   label: "Reembolsos" },
  { href: "/legal/licenses", label: "Licencias" },
];

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #2a2a2a",
        padding: "32px 24px",
        textAlign: "center",
        color: "#666",
        fontSize: "14px",
        background: "#0f0f0f",
      }}
    >
      <p>
        © {new Date().getFullYear()} ⚡ Pixlit — Herramientas online gratuitas.
        Hecho con ❤️
      </p>
      <div style={{ marginTop: 12, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {LEGAL_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{ color: "#555", textDecoration: "none", fontSize: 12 }}
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
