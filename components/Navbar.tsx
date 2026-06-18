"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    <nav style={navStyle}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <span style={logoStyle}>⚡ Pixlit</span>
      </Link>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/pricing" style={linkStyle}>Precios</Link>

        {!loading && (
          user ? (
            <>
              <Link href="/account" style={linkStyle}>Mi cuenta</Link>
              <Link href="/tools/notebook" style={btnStyle}>Cuaderno 📓</Link>
            </>
          ) : (
            <>
              <Link href="/auth/login"  style={linkStyle}>Iniciar sesión</Link>
              <Link href="/auth/signup" style={btnStyle}>Registro gratis</Link>
            </>
          )
        )}

        {loading && <div style={{ width: 32, height: 32 }} />}
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
  background: "rgba(15,15,15,0.95)", backdropFilter: "blur(10px)",
  borderBottom: "1px solid #2a2a2a", height: "64px",
  display: "flex", alignItems: "center", padding: "0 24px",
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
