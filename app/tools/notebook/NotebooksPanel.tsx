"use client";

import { useState, useRef } from "react";
import type { Notebook } from "@/lib/useNotebook";
import ShareModal from "./ShareModal";

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
  const [newName,         setNewName]         = useState("");
  const [creating,        setCreating]        = useState(false);
  const [renamingId,      setRenamingId]      = useState<string | null>(null);
  const [renameVal,       setRenameVal]       = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [shareTarget,     setShareTarget]     = useState<{ id: string; name: string } | null>(null);
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
    setConfirmDeleteId(null);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const commitRename = async (id: string) => {
    if (renameVal.trim()) await onRename(id, renameVal.trim());
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setDeletingId(id);
    const ok = await onDelete(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (ok && activeId === id && notebooks.length > 1) {
      const other = notebooks.find(n => n.id !== id);
      if (other) onSwitch(other.id);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("es", {
    day: "2-digit", month: "short", year: "numeric",
  });

  // ── Styles ────────────────────────────────────────────────────────────────

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.6)", display: "flex",
    alignItems: "center", justifyContent: "center",
  };

  const panel: React.CSSProperties = {
    background: "#18181b", border: "1px solid #2a2a2a", borderRadius: 14,
    boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
    width: "min(560px, 94vw)", maxHeight: "85vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
  };

  const iconBtn = (color = "#555", active = false): React.CSSProperties => ({
    display:      "flex", alignItems: "center", justifyContent: "center",
    background:   active ? `${color}22` : "transparent",
    border:       `1px solid ${active ? color + "55" : "#2a2a2a"}`,
    borderRadius: 7,
    color:        active ? color : "#555",
    fontSize:     11, padding: "4px 8px", cursor: "pointer",
    whiteSpace:   "nowrap", gap: 3,
    transition:   "all 0.15s",
  });

  return (
    <>
      <div
        style={overlay}
        onClick={e => { if (e.target === e.currentTarget) { setConfirmDeleteId(null); onClose(); } }}
      >
        <div style={panel}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "16px 20px", borderBottom: "1px solid #2a2a2a",
          }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#e5e5e5", flex: 1 }}>
              📚 Mis Cuadernos
              <span style={{ marginLeft: 8, fontSize: 11, color: "#444", fontWeight: 400 }}>
                ({notebooks.length})
              </span>
            </span>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
            >×</button>
          </div>

          {/* Notebook grid */}
          <div style={{ overflowY: "auto", flex: 1, padding: "12px" }}>
            {notebooks.length === 0 && (
              <div style={{ color: "#555", fontSize: 13, padding: "32px", textAlign: "center" }}>
                Sin cuadernos. Crea uno abajo.
              </div>
            )}

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 10,
            }}>
              {notebooks.map(nb => {
                const isActive      = activeId === nb.id;
                const isDelConfirm  = confirmDeleteId === nb.id;
                const isDeleting    = deletingId === nb.id;
                const isRenaming    = renamingId === nb.id;

                return (
                  <div
                    key={nb.id}
                    onClick={() => { if (!isRenaming && !isDelConfirm) { onSwitch(nb.id); onClose(); } }}
                    style={{
                      background:   isActive ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.03)",
                      border:       isActive ? "1px solid rgba(139,92,246,0.4)" : "1px solid #2a2a2a",
                      borderRadius: 10, padding: "12px 14px",
                      cursor:       isRenaming ? "default" : "pointer",
                      display:      "flex", flexDirection: "column", gap: 8,
                      transition:   "border-color 0.15s, background 0.15s",
                      position:     "relative",
                    }}
                  >
                    {/* Active badge */}
                    {isActive && (
                      <div style={{
                        position: "absolute", top: 8, right: 8,
                        background: "#8b5cf6", borderRadius: 99,
                        fontSize: 9, fontWeight: 700, color: "white", padding: "2px 7px",
                      }}>activo</div>
                    )}

                    {/* Icon + name */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>📓</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            onBlur={() => commitRename(nb.id)}
                            onKeyDown={e => {
                              e.stopPropagation();
                              if (e.key === "Enter")  commitRename(nb.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: "100%", background: "#0f0f0f",
                              border: "1px solid #8b5cf6", borderRadius: 6,
                              color: "#e5e5e5", fontSize: 13, padding: "3px 8px", outline: "none",
                            }}
                            autoFocus
                          />
                        ) : (
                          <div style={{
                            color:       isActive ? "#c4b5fd" : "#e5e5e5",
                            fontSize:    13, fontWeight: 600,
                            overflow:    "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            paddingRight: isActive ? 48 : 0,
                          }}>
                            {nb.name}
                          </div>
                        )}
                        <div style={{ color: "#444", fontSize: 10, marginTop: 2 }}>
                          {fmt(nb.updated_at)}
                        </div>
                      </div>
                    </div>

                    {/* Confirm delete */}
                    {isDelConfirm && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: 8, padding: "8px 10px", fontSize: 11,
                          display: "flex", flexDirection: "column", gap: 6,
                        }}
                      >
                        <span style={{ color: "#fca5a5" }}>
                          ¿Eliminar "{nb.name}"? No se puede deshacer.
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleDelete(nb.id)}
                            disabled={isDeleting}
                            style={{
                              flex: 1, background: "#ef4444", border: "none", borderRadius: 6,
                              color: "white", fontSize: 11, fontWeight: 700, padding: "5px",
                              cursor: "pointer", opacity: isDeleting ? 0.6 : 1,
                            }}
                          >
                            {isDeleting ? "Eliminando…" : "Sí, eliminar"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              flex: 1, background: "none", border: "1px solid #333", borderRadius: 6,
                              color: "#888", fontSize: 11, padding: "5px", cursor: "pointer",
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action row */}
                    {!isDelConfirm && !isRenaming && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{ display: "flex", gap: 5, marginTop: 2 }}
                      >
                        <button
                          onClick={() => { onSwitch(nb.id); onClose(); }}
                          style={iconBtn(isActive ? "#8b5cf6" : "#555", isActive)}
                          title="Abrir"
                        >↗ Abrir</button>
                        <button
                          onClick={() => setShareTarget({ id: nb.id, name: nb.name })}
                          style={iconBtn("#22c55e")}
                          title="Compartir con colaboradores"
                        >🔗 Compartir</button>
                        <button
                          onClick={() => startRename(nb)}
                          style={iconBtn()}
                          title="Renombrar"
                        >✏️</button>
                        <button
                          onClick={() => handleDelete(nb.id)}
                          disabled={notebooks.length <= 1}
                          style={iconBtn("#ef4444")}
                          title="Eliminar"
                        >🗑</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                {creating ? "…" : "+ Nuevo"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Share modal — layered on top */}
      {shareTarget && (
        <ShareModal
          isOpen
          notebookId={shareTarget.id}
          notebookName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}
