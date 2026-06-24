"use client";

import { useState, useEffect, useCallback } from "react";

interface Collaborator {
  id: string;
  shared_with_email: string;
  permission: "view" | "edit";
  created_at: string;
}

interface Props {
  isOpen: boolean;
  notebookId: string | null;
  notebookName: string;
  onClose: () => void;
}

export default function ShareModal({ isOpen, notebookId, notebookName, onClose }: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email,        setEmail]          = useState("");
  const [permission,   setPermission]     = useState<"view" | "edit">("edit");
  const [loading,      setLoading]        = useState(false);
  const [adding,       setAdding]         = useState(false);
  const [removingId,   setRemovingId]     = useState<string | null>(null);
  const [error,        setError]          = useState<string | null>(null);
  const [copied,       setCopied]         = useState(false);

  const load = useCallback(async () => {
    if (!notebookId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/share`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (isOpen && notebookId) { load(); setError(null); }
  }, [isOpen, notebookId, load]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !em.includes("@")) { setError("Email inválido"); return; }
    if (!notebookId) return;
    setAdding(true); setError(null);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/share`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: em, permission }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al invitar"); return; }
      setEmail("");
      await load();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!notebookId) return;
    setRemovingId(id);
    try {
      await fetch(`/api/notebooks/${notebookId}/share/${id}`, { method: "DELETE" });
      setCollaborators(c => c.filter(x => x.id !== id));
    } finally {
      setRemovingId(null);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/tools/notebook`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 300,
    background: "rgba(0,0,0,0.65)", display: "flex",
    alignItems: "center", justifyContent: "center",
  };

  const panel: React.CSSProperties = {
    background: "#18181b", border: "1px solid #2a2a2a", borderRadius: 14,
    boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
    width: "min(520px, 94vw)", maxHeight: "85vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
  };

  const btn = (color = "#8b5cf6", ghost = false): React.CSSProperties => ({
    background:   ghost ? "transparent" : color,
    border:       ghost ? `1px solid ${color}55` : "none",
    borderRadius: 8,
    color:        ghost ? color : "white",
    fontSize:     12, fontWeight: 600,
    padding:      "7px 14px",
    cursor:       "pointer",
    whiteSpace:   "nowrap",
    transition:   "opacity 0.15s",
  });

  const permBadge = (p: string): React.CSSProperties => ({
    display:      "inline-flex", alignItems: "center",
    padding:      "2px 8px", borderRadius: 99,
    fontSize:     10, fontWeight: 700,
    background:   p === "edit" ? "rgba(139,92,246,0.2)" : "rgba(34,197,94,0.15)",
    color:        p === "edit" ? "#a78bfa" : "#86efac",
    border:       p === "edit" ? "1px solid #8b5cf644" : "1px solid #22c55e44",
  });

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #2a2a2a" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#e5e5e5" }}>🔗 Compartir cuaderno</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{notebookName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* Copy link */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e1e", background: "#111" }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
            Colaboradores con acceso pueden ver o editar en tiempo real vía Supabase Realtime.
          </div>
          <button onClick={copyLink} style={{ ...btn(copied ? "#22c55e" : "#444", true), fontSize: 11 }}>
            {copied ? "✓ Link copiado" : "📋 Copiar link del notebook"}
          </button>
        </div>

        {/* Add collaborator */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #222" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 8 }}>Invitar por email</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              placeholder="usuario@email.com"
              style={{
                flex: 1, background: "#0f0f0f", border: "1px solid #333",
                borderRadius: 8, color: "#e5e5e5", fontSize: 13, padding: "7px 12px",
                outline: "none",
              }}
            />
            <select
              value={permission}
              onChange={e => setPermission(e.target.value as "view" | "edit")}
              style={{
                background: "#0f0f0f", border: "1px solid #333", borderRadius: 8,
                color: "#aaa", fontSize: 12, padding: "7px 10px", cursor: "pointer",
              }}
            >
              <option value="edit">✏️ Editar</option>
              <option value="view">👁 Ver</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={adding}
              style={{ ...btn(), opacity: adding ? 0.6 : 1 }}
            >
              {adding ? "…" : "Invitar"}
            </button>
          </div>
          {error && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 6 }}>{error}</div>}
        </div>

        {/* Collaborators list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading ? (
            <div style={{ color: "#555", fontSize: 12, padding: "20px", textAlign: "center" }}>Cargando…</div>
          ) : collaborators.length === 0 ? (
            <div style={{ color: "#444", fontSize: 12, padding: "24px", textAlign: "center" }}>
              Sin colaboradores todavía.<br />
              <span style={{ color: "#333", fontSize: 11 }}>Invita a alguien arriba.</span>
            </div>
          ) : (
            collaborators.map(c => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 20px", borderBottom: "1px solid #1a1a1a",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `hsl(${c.shared_with_email.charCodeAt(0) * 17 % 360}, 55%, 35%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
                }}>
                  {c.shared_with_email[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.shared_with_email}
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>
                    Invitado {new Date(c.created_at).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                  </div>
                </div>

                <span style={permBadge(c.permission)}>
                  {c.permission === "edit" ? "Editar" : "Ver"}
                </span>

                <button
                  onClick={() => handleRemove(c.id)}
                  disabled={removingId === c.id}
                  style={{
                    background: "none", border: "1px solid #2a2a2a", borderRadius: 6,
                    color: removingId === c.id ? "#555" : "#666",
                    fontSize: 11, padding: "3px 9px", cursor: "pointer",
                  }}
                  title="Revocar acceso"
                >
                  {removingId === c.id ? "…" : "✕"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer note */}
        <div style={{ padding: "10px 20px", borderTop: "1px solid #1e1e1e", background: "#0f0f0f" }}>
          <div style={{ fontSize: 10, color: "#444", lineHeight: 1.5 }}>
            ● Los cambios se sincronizan en tiempo real vía Supabase Realtime.<br />
            ● El colaborador necesita una cuenta en Pixlit para acceder.
          </div>
        </div>

      </div>
    </div>
  );
}
