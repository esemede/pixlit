"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const params = useSearchParams();
  const [email,   setEmail]   = useState(params.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [sent,    setSent]    = useState(false);

  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/update-password`,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSent(true); setLoading(false);
  };

  if (sent) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 48, textAlign: "center" }}>📬</div>
        <h2 style={h2Style}>Correo enviado</h2>
        <p style={{ color: "#888", textAlign: "center" }}>
          Revisa tu bandeja en <strong style={{ color: "#a78bfa" }}>{email}</strong>.
          El link expira en 1 hora.
        </p>
        <Link href="/auth/login" style={{ ...btnSecondaryStyle, textAlign: "center", textDecoration: "none", display: "block" }}>
          ← Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h1 style={h1Style}>Recuperar contraseña</h1>
      <p style={{ color: "#888", textAlign: "center", marginBottom: 16 }}>
        Te enviaremos un link para crear una nueva contraseña.
      </p>

      {error && <div style={errorStyle}>{error}</div>}

      <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email" required placeholder="correo@ejemplo.com" value={email}
          onChange={e => setEmail(e.target.value)} style={inputStyle}
          autoFocus
        />
        <button type="submit" disabled={loading} style={btnPrimaryStyle}>
          {loading ? "Enviando…" : "Enviar link de recuperación"}
        </button>
      </form>

      <Link href="/auth/login" style={{ color: "#666", fontSize: 13, textAlign: "center", textDecoration: "none" }}>
        ← Volver al login
      </Link>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div style={pageStyle}>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center",
  justifyContent: "center", padding: "24px",
};
const cardStyle: React.CSSProperties = {
  width: "100%", maxWidth: 420, background: "#111",
  border: "1px solid #2a2a2a", borderRadius: 16, padding: "36px 32px",
  display: "flex", flexDirection: "column", gap: 12,
};
const h1Style: React.CSSProperties = { color: "#fff", fontWeight: 800, fontSize: 24, textAlign: "center", marginBottom: 4 };
const h2Style: React.CSSProperties = { color: "#fff", fontWeight: 700, fontSize: 20, textAlign: "center" };
const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
  padding: "10px 14px", color: "#fff", fontSize: 15, outline: "none",
};
const btnPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff",
  border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer",
};
const btnSecondaryStyle: React.CSSProperties = {
  background: "#1e1e2e", color: "#a78bfa", border: "1px solid #8b5cf6",
  borderRadius: 8, padding: "11px", fontWeight: 600, fontSize: 14, cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 14,
};
