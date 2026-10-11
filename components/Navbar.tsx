"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NavbarContext } from "./NavbarContext";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const context = useContext(NavbarContext);
  const isCollapsed = context?.isCollapsed ?? false;
  const toggleCollapsed = context?.toggleCollapsed ?? (() => {});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user); setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav style={{
      ...navStyle,
      height: isCollapsed ? "32px" : "64px",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 4 }}>
        <button
          onClick={toggleCollapsed}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#888"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#666"}
          title={isCollapsed ? "Expandir navbar" : "Colapsar navbar"}
        >
          {isCollapsed ? "▲" : "▼"}
        </button>

        {!isCollapsed && (
          <>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={logoStyle}>⚡ Pixlit</span>
            </Link>

            <div style={{ flex: 1 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/tools" style={linkStyle}>Herramientas</Link>
              <Link href="/pricing" style={linkStyle}>Precios</Link>

              {!loading && (
                user ? (
                  <Link href="/account" style={btnStyle}>Mi cuenta</Link>
                ) : (
                  <>
                    <Link href="/auth/login"  style={linkStyle}>Iniciar sesión</Link>
                    <Link href="/auth/signup" style={btnStyle}>Registro gratis</Link>
                  </>
                )
              )}

              {loading && <div style={{ width: 32, height: 32 }} />}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
  background: "rgba(15,15,15,0.95)", backdropFilter: "blur(10px)",
  borderBottom: "1px solid #2a2a2a",
  display: "flex", alignItems: "center", padding: "0 12px",
  transition: "height 0.3s ease",
};
const logoStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.5px",
};
const linkStyle: React.CSSProperties = {
  color: "#888", fontWeight: 500, fontSize: 14, textDecoration: "none",
  padding: "6px 10px",
};
const btnStyle: React.CSSProperties = {
  background: "#8b5cf6", color: "white", padding: "6px 14px",
  borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 14,
};
