"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const next    = params.get("next") ?? "/tools/notebook";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${location.origin}/auth/callback?next=${next}`,
      },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true); setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${next}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  if (done) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 48, textAlign: "center" }}>✅</div>
        <h2 style={h2Style}>¡Cuenta creada!</h2>
        <p style={{ color: "#888", textAlign: "center" }}>
          Revisa tu correo <strong style={{ color: "#a78bfa" }}>{email}</strong> para confirmar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h1 style={h1Style}>Crear cuenta gratis</h1>
      <p style={{ color: "#888", textAlign: "center", marginBottom: 8 }}>
        ¿Ya tienes cuenta?{" "}
        <Link href={`/auth/login?next=${next}`} style={{ color: "#a78bfa" }}>
          Inicia sesión
        </Link>
      </p>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Google OAuth */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        style={btnGoogleStyle}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
        </svg>
        Continuar con Google
      </button>

      <div style={dividerStyle}>
        <span style={{ background: "#111", padding: "0 10px", color: "#444", fontSize: 12 }}>
          o regístrate con correo
        </span>
      </div>

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="text" required placeholder="Tu nombre" value={name}
          onChange={e => setName(e.target.value)} style={inputStyle}
        />
        <input
          type="email" required placeholder="correo@ejemplo.com" value={email}
          onChange={e => setEmail(e.target.value)} style={inputStyle}
        />
        <input
          type="password" required placeholder="Contraseña (mín. 8 caracteres)" value={password}
          onChange={e => setPassword(e.target.value)} style={inputStyle}
        />
        <button type="submit" disabled={loading} style={btnPrimaryStyle}>
          {loading ? "Creando cuenta…" : "Crear cuenta gratis"}
        </button>
      </form>

      <p style={{ color: "#555", fontSize: 12, textAlign: "center", marginTop: 4 }}>
        Al registrarte aceptas nuestros{" "}
        <Link href="/legal/terms" style={{ color: "#777" }}>términos de servicio</Link>
        {" "}y la{" "}
        <Link href="/legal/privacy" style={{ color: "#777" }}>política de privacidad</Link>.
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div style={pageStyle}>
      <Suspense>
        <SignupForm />
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
  display: "flex", flexDirection: "column", gap: 8,
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
const btnGoogleStyle: React.CSSProperties = {
  background: "#fff", color: "#111", border: "1px solid #ddd",
  borderRadius: 8, padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
};
const dividerStyle: React.CSSProperties = {
  position: "relative", textAlign: "center",
  borderTop: "1px solid #2a2a2a", margin: "4px 0",
};
const errorStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 14,
};
