"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(15,15,15,0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #2a2a2a",
        height: "64px",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
      }}
    >
      <Link href="/" style={{ textDecoration: "none" }}>
        <span
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.5px",
          }}
        >
          ⚡ Pixlit
        </span>
      </Link>
      <div style={{ flex: 1 }} />
      <Link
        href="/#pro"
        style={{
          background: "#8b5cf6",
          color: "white",
          padding: "6px 16px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "14px",
          transition: "background 0.2s",
        }}
      >
        Pro ✨
      </Link>
    </nav>
  );
}
