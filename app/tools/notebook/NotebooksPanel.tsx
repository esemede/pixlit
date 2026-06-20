"use client";

import { useState, useRef } from "react";
import type { Notebook } from "@/lib/useNotebook";

interface Props {
  isOpen: boolean;
  notebooks: Notebook[];
  activeId: string | null;
  onClose: () => void;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => Promise<{ ok: boolean; notebook?: Notebook; error?: string }>;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export default function NotebooksPanel({
  isOpen, notebooks, activeId, onClose,
  onSwitch, onCreate, onRename, onDelete,
}: Props) {
  const [newName,    setNewName]    = useState("");
  const [creating,   setCreating]   = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal,  setRenameVal]  = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const name = newName.trim() || "Nuevo Cuaderno";
    setCreating(true); setError(null);
    const res = await onCreate(name);
    setCreating(false);
    if (!res.ok) { setError(res.error ?? "Error al crear"); return; }
    setNewName("");
    if (res.notebook) onSwitch(res.notebook.id);
  };

  const startRename = (nb: Notebook) => {
    setRenamingId(nb.id);
    setRenameVal(nb.name);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const commitRename = async (id: string) => {
    if (renameVal.trim()) await onRename(id, renameVal.trim());
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    const ok = await onDelete(id);
    setDeletingId(null);
    if (ok && activeId === id && notebooks.length > 1) {
      const other = notebooks.find(n => n.id !== id);
      if (other) onSwitch(other.id);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("es", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.55)", display: "flex",
    alignItems: "center", justifyContent: "center",
  };

  const panel: React.CSSProperties = {
    background: "#18181b", border: "1px solid #2a2a2a", borderRadius: 14,
    boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
    width: "min(480px, 92vw)", maxHeight: "80vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
  };

  const row: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 16px", borderBottom: "1px solid #222",
    cursor: "pointer",
  };

  const btnSm = (color = "#8b5cf6"): React.CSSProperties => ({
    background: "none", border: `1px solid ${color}33`, borderRadius: 6,
    color, fontSize: 11, padding: "3px 9px", cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #2a2a2a" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#e5e5e5", flex: 1 }}>📚 Mis Cuadernos</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {notebooks.length === 0 && (
            <p style={{ color: "#555", fontSize: 13, padding: "24px", textAlign: "center" }}>
              Sin cuadernos. Crea uno abajo.
            </p>
          )}
          {notebooks.map(nb => (
            <div key={nb.id} style={{
              ...row,
              background: activeId === nb.id ? "rgba(139,92,246,0.08)" : "transparent",
            }}
              onClick={() => { if (renamingId !== nb.id) { onSwitch(nb.id); onClose(); } }}
            >
              <span style={{ fontSize: 18 }}>📓</span>

              {renamingId === nb.id ? (
                <input
                  ref={renameInputRef}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => commitRename(nb.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitRename(nb.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, background: "#0f0f0f", border: "1px solid #8b5cf6",
                    borderRadius: 6, color: "#e5e5e5", fontSize: 13, padding: "3px 8px",
                    outline: "none",
                  }}
                  autoFocus
                />
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: activeId === nb.id ? "#c4b5fd" : "#e5e5e5", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nb.name}
                    {activeId === nb.id && <span style={{ marginLeft: 6, fontSize: 10, color: "#8b5cf6", fontWeight: 400 }}>activo</span>}
                  </div>
                  <div style={{ color: "#555", fontSize: 10 }}>{fmt(nb.updated_at)}</div>
                </div>
              )}

              <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => startRename(nb)} style={btnSm("#888")} title="Renombrar">✏️</button>
                <button
                  onClick={() => handleDelete(nb.id)}
                  disabled={notebooks.length <= 1}
                  style={deletingId === nb.id ? btnSm("#ef4444") : btnSm("#666")}
                  title={deletingId === nb.id ? "¿Confirmar?" : "Eliminar"}
                >
                  {deletingId === nb.id ? "¿Eliminar?" : "🗑"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create new */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #222" }}>
          {error && <p style={{ color: "#ef4444", fontSize: 11, marginBottom: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              placeholder="Nombre del nuevo cuaderno…"
              style={{
                flex: 1, background: "#0f0f0f", border: "1px solid #333",
                borderRadius: 8, color: "#e5e5e5", fontSize: 13, padding: "7px 12px",
                outline: "none",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                background: "#8b5cf6", border: "none", borderRadius: 8,
                color: "white", fontSize: 12, fontWeight: 600, padding: "7px 14px",
                cursor: creating ? "default" : "pointer", opacity: creating ? 0.6 : 1,
              }}
            >
              {creating ? "…" : "+ Crear"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
