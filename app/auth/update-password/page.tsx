"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router   = useRouter();
  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Mínimo 8 caracteres."); return; }
    if (password !== password2) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/tools/notebook");
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={h1Style}>Nueva contraseña</h1>
        <p style={{ color: "#888", textAlign: "center", marginBottom: 16 }}>
          Elige una contraseña segura para tu cuenta.
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password" required placeholder="Nueva contraseña (mín. 8)" value={password}
            onChange={e => setPassword(e.target.value)} style={inputStyle} autoFocus
          />
          <input
            type="password" required placeholder="Repite la contraseña" value={password2}
            onChange={e => setPassword2(e.target.value)} style={inputStyle}
          />
          <button type="submit" disabled={loading} style={btnPrimaryStyle}>
            {loading ? "Guardando…" : "Actualizar contraseña"}
          </button>
        </form>
      </div>
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
const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
  padding: "10px 14px", color: "#fff", fontSize: 15, outline: "none",
};
const btnPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff",
  border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 14,
};
