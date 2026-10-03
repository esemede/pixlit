"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  anchorStyle, rectToAnchor, PANEL_META,
  type Orientation, type PanelId, type PanelState,
} from "./workspaceLayout";

// Shared stacking counter: the last panel touched goes on top.
let zCounter = 10;

interface Props {
  id:        PanelId;
  state:     PanelState;
  opacity:   number;
  locked:    boolean;
  onChange:  (patch: Partial<PanelState>) => void;
  /** Content; receives the current orientation so it can re-flow. */
  children:  (orientation: Orientation) => ReactNode;
  /** Minimum size for the resize grip. */
  minW?:     number;
  minH?:     number;
}

type Live = { left: number; top: number; width: number; height: number; mode: "drag" | "resize" };

/**
 * Floating, draggable, resizable and collapsible panel that lives on top of the
 * notebook sheet. Its position is anchored to the nearest edge of the
 * workspace (see workspaceLayout.ts) so it survives viewport resizes.
 */
export default function FloatingPanel({
  id, state, opacity, locked, onChange, children, minW = 60, minH = 40,
}: Props) {
  const meta   = PANEL_META[id];
  const ref    = useRef<HTMLDivElement>(null);
  const origin = useRef<{ mx: number; my: number; rect: Omit<Live, "mode"> } | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [z,    setZ]    = useState(10);

  const bringToFront = () => setZ(++zCounter);

  const begin = (e: React.PointerEvent, mode: Live["mode"]) => {
    bringToFront();
    if (locked || e.button !== 0) return;
    const el = ref.current, parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    e.preventDefault();
    e.stopPropagation();
    const pr = parent.getBoundingClientRect();
    const r  = el.getBoundingClientRect();
    const rect = { left: r.left - pr.left, top: r.top - pr.top, width: r.width, height: r.height };
    origin.current = { mx: e.clientX, my: e.clientY, rect };
    setLive({ ...rect, mode });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    const o = origin.current;
    if (!o || !live) return;
    const dx = e.clientX - o.mx, dy = e.clientY - o.my;
    if (live.mode === "drag") {
      setLive({ ...live, left: o.rect.left + dx, top: o.rect.top + dy });
    } else {
      setLive({
        ...live,
        width:  Math.max(minW, o.rect.width  + dx),
        height: Math.max(minH, o.rect.height + dy),
      });
    }
  };

  const end = () => {
    const parent = ref.current?.offsetParent as HTMLElement | null;
    if (live && parent) {
      const bounds = { width: parent.clientWidth, height: parent.clientHeight };
      const rect = {
        left: live.left, top: live.top,
        width:  Math.min(live.width,  bounds.width),
        height: Math.min(live.height, bounds.height),
      };
      const anchor = rectToAnchor(rect, bounds);
      onChange(live.mode === "resize"
        ? { ...anchor, w: Math.round(rect.width), h: Math.round(rect.height) }
        : anchor);
    }
    origin.current = null;
    setLive(null);
  };

  const placement: React.CSSProperties = live
    ? { position: "absolute", left: live.left, top: live.top }
    : anchorStyle(state);

  const width  = live?.mode === "resize" ? live.width  : state.collapsed ? undefined : state.w ?? undefined;
  const height = live?.mode === "resize" ? live.height : state.collapsed ? undefined : state.h ?? undefined;
  const vertical = state.orientation === "vertical";
  const compact  = vertical && !state.collapsed;

  return (
    <div
      ref={ref}
      data-panel={id}
      onPointerDown={bringToFront}
      style={{
        ...placement,
        zIndex: z,
        width, height,
        maxWidth:  "calc(100% - 8px)",
        maxHeight: "calc(100% - 8px)",
        display: "flex", flexDirection: "column",
        background: `rgba(20,20,28,${opacity})`,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid #34344a",
        borderRadius: 12,
        boxShadow: live ? "0 20px 60px rgba(0,0,0,0.65)" : "0 10px 32px rgba(0,0,0,0.45)",
        color: "white",
        userSelect: "none",
        touchAction: "none",
        transition: live ? "none" : "box-shadow 0.15s",
      }}
    >
      {/* Header / drag handle */}
      <div
        onPointerDown={e => begin(e, "drag")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={() => onChange({ collapsed: !state.collapsed })}
        title={locked ? meta.title : `${meta.title} — arrastra para mover, doble clic para plegar`}
        style={{
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2,
          justifyContent: compact ? "center" : undefined,
          padding: compact ? "3px 2px" : "3px 4px 3px 6px",
          borderBottom: state.collapsed ? "none" : "1px solid #2a2a3a",
          cursor: locked ? "default" : live?.mode === "drag" ? "grabbing" : "grab",
          // Narrow vertical toolbars: the content decides the width, the header wraps
          ...(compact ? { width: 0, minWidth: "100%", boxSizing: "border-box" } : {}),
        }}
      >
        {!locked && <span style={{ color: "#555", fontSize: 10, letterSpacing: -1 }}>⠿</span>}
        <span style={{ fontSize: 12 }}>{meta.icon}</span>
        {(state.collapsed || !vertical) && (
          <span style={{
            color: "#9a9ab0", fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            textTransform: "uppercase", whiteSpace: "nowrap", marginRight: "auto", paddingLeft: 2,
          }}>{meta.title}</span>
        )}
        <span style={{ display: "flex", gap: 1, marginLeft: compact ? undefined : "auto" }}>
          {meta.orientable && !state.collapsed && (
            <HeaderBtn small={compact}
              title={vertical ? "Orientación horizontal" : "Orientación vertical"}
              onClick={() => onChange({ orientation: vertical ? "horizontal" : "vertical", w: null, h: null })}
            >{vertical ? "⇆" : "⇅"}</HeaderBtn>
          )}
          <HeaderBtn small={compact}
            title={state.collapsed ? "Expandir" : "Plegar"}
            onClick={() => onChange({ collapsed: !state.collapsed })}
          >{state.collapsed ? "▸" : "▾"}</HeaderBtn>
          <HeaderBtn small={compact} title="Ocultar panel" onClick={() => onChange({ visible: false })}>×</HeaderBtn>
        </span>
      </div>

      {/* Body */}
      {!state.collapsed && (
        <div style={{
          flex: 1, minHeight: 0, overflow: "auto",
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          flexWrap: "wrap",
          alignItems: vertical ? "stretch" : "center",
          gap: 6, padding: 8,
        }}>
          {children(state.orientation)}
        </div>
      )}

      {/* Resize grip */}
      {!state.collapsed && !locked && (
        <div
          onPointerDown={e => begin(e, "resize")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onDoubleClick={() => onChange({ w: null, h: null })}
          title="Redimensionar (doble clic: tamaño automático)"
          style={{
            position: "absolute", right: 0, bottom: 0, width: 14, height: 14,
            cursor: "nwse-resize",
            background: "linear-gradient(135deg, transparent 50%, #55557a 50%, #55557a 60%, transparent 60%, transparent 72%, #55557a 72%, #55557a 82%, transparent 82%)",
            borderBottomRightRadius: 12,
          }}
        />
      )}
    </div>
  );
}

function HeaderBtn({ children, title, onClick, small = false }: {
  children: ReactNode; title: string; onClick: () => void; small?: boolean;
}) {
  return (
    <button
      title={title}
      onPointerDown={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      onClick={onClick}
      style={{
        background: "none", border: "none", color: "#777", cursor: "pointer",
        fontSize: small ? 11 : 13, lineHeight: 1, padding: 0, borderRadius: 5,
        width: small ? 16 : 20, height: small ? 16 : 20,
      }}
    >{children}</button>
  );
}
