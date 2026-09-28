"use client";

import { useState, type ReactNode } from "react";
import { PANEL_META, PANEL_ORDER, type PanelId, type WorkspacePrefs } from "./workspaceLayout";

interface Props {
  prefs:        WorkspacePrefs;
  onToggle:     (id: PanelId, visible: boolean) => void;
  onSetOpacity: (v: number) => void;
  onSetLocked:  (v: boolean) => void;
  onSetHideAll: (v: boolean) => void;
  onReset:      () => void;
  /** Status chips shown next to the menu button (e.g. "En vivo"). */
  badges?:      ReactNode;
}

/**
 * Always-visible launcher in the bottom-left corner of the workspace. It is
 * the way back when every panel has been hidden, and holds the layout options.
 */
export default function WorkspaceMenu({
  prefs, onToggle, onSetOpacity, onSetLocked, onSetHideAll, onReset, badges,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      position: "absolute", left: 12, bottom: 12, zIndex: 1000,
      display: "flex", alignItems: "flex-end", gap: 6,
    }}>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(v => !v)}
          title="Espacio de trabajo: paneles y disposición"
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: open ? "rgba(139,92,246,0.4)" : "rgba(20,20,28,0.92)",
            border: `1px solid ${open ? "#8b5cf6" : "#34344a"}`,
            color: "white", fontSize: 17, cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            backdropFilter: "blur(12px)",
          }}
        >☰</button>

        {open && (
          <div style={{
            position: "absolute", left: 0, bottom: 46, width: 250,
            maxHeight: "calc(100vh - 140px)", overflowY: "auto",
            background: "rgba(20,20,28,0.98)", backdropFilter: "blur(16px)",
            border: "1px solid #34344a", borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            padding: 12, color: "#ddd", fontSize: 12,
          }}>
            <div style={sectionTitle}>PANELES</div>
            {PANEL_ORDER.map(id => {
              const visible = prefs.panels[id].visible && !prefs.hideAll;
              return (
                <label key={id} style={row}>
                  <input
                    type="checkbox" checked={visible}
                    onChange={() => onToggle(id, !visible)}
                    style={{ accentColor: "#8b5cf6" }}
                  />
                  <span>{PANEL_META[id].icon}</span>
                  <span style={{ flex: 1 }}>{PANEL_META[id].title}</span>
                </label>
              );
            })}

            <div style={{ ...sectionTitle, marginTop: 12 }}>DISPOSICIÓN</div>
            <label style={row}>
              <input type="checkbox" checked={prefs.hideAll}
                onChange={e => onSetHideAll(e.target.checked)} style={{ accentColor: "#8b5cf6" }} />
              <span style={{ flex: 1 }}>Modo enfoque (ocultar todo)</span>
              <kbd style={kbd}>Tab</kbd>
            </label>
            <label style={row}>
              <input type="checkbox" checked={prefs.locked}
                onChange={e => onSetLocked(e.target.checked)} style={{ accentColor: "#8b5cf6" }} />
              <span style={{ flex: 1 }}>Bloquear posición de paneles</span>
            </label>
            <label style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 4 }}>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Opacidad de paneles</span>
                <span style={{ color: "#777" }}>{Math.round(prefs.opacity * 100)}%</span>
              </span>
              <input
                type="range" min={40} max={100} value={Math.round(prefs.opacity * 100)}
                onChange={e => onSetOpacity(Number(e.target.value) / 100)}
                style={{ accentColor: "#8b5cf6" }}
              />
            </label>
            <button
              onClick={onReset}
              style={{
                width: "100%", marginTop: 8, padding: "6px 8px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid #333",
                color: "#bbb", fontSize: 12, cursor: "pointer",
              }}
            >↺ Restablecer disposición</button>

            <div style={{ ...sectionTitle, marginTop: 12 }}>ATAJOS</div>
            <div style={{ color: "#777", fontSize: 11, lineHeight: 1.6 }}>
              <div><kbd style={kbd}>p</kbd> <kbd style={kbd}>m</kbd> <kbd style={kbd}>h</kbd> <kbd style={kbd}>e</kbd> herramientas</div>
              <div><kbd style={kbd}>s</kbd> figuras · <kbd style={kbd}>f</kbd> pantalla completa</div>
              <div><kbd style={kbd}>Ctrl+Z</kbd> deshacer · <kbd style={kbd}>Ctrl+S</kbd> guardar</div>
              <div><kbd style={kbd}>Espacio</kbd>+arrastrar mover · <kbd style={kbd}>Ctrl</kbd>+rueda zoom</div>
              <div>Doble clic en la cabecera de un panel lo pliega</div>
            </div>
          </div>
        )}
      </div>
      {badges}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  color: "#666", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6,
};

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "4px 2px", cursor: "pointer",
};

const kbd: React.CSSProperties = {
  background: "#111", border: "1px solid #333", borderRadius: 4,
  padding: "0 4px", fontSize: 10, color: "#aaa", fontFamily: "inherit",
};
