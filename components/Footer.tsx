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
    </footer>
  );
}
