"use client";

import { useCallback, useSyncExternalStore, type CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PanelId = "tools" | "style" | "sheet" | "pages" | "file" | "extras";

export type AnchorX = "left" | "center" | "right";
export type AnchorY = "top" | "bottom";
export type Orientation = "horizontal" | "vertical";

/**
 * A floating panel is anchored to one edge/corner of the workspace so it keeps
 * its place when the viewport is resized. `dx`/`dy` are CSS px measured from
 * the anchored edge (for `center`, `dx` is the offset of the panel's center
 * from the workspace's horizontal center).
 */
export interface PanelState {
  visible:     boolean;
  collapsed:   boolean;
  orientation: Orientation;
  ax:          AnchorX;
  ay:          AnchorY;
  dx:          number;
  dy:          number;
  /** Explicit size set by the user via the resize grip; null = auto. */
  w:           number | null;
  h:           number | null;
}

export interface WorkspacePrefs {
  version:  1;
  panels:   Record<PanelId, PanelState>;
  /** Panel background opacity, 0.4–1. */
  opacity:  number;
  /** When locked, panels can't be dragged or resized. */
  locked:   boolean;
  /** Focus mode: every panel hidden, only the sheet and the menu button remain. */
  hideAll:  boolean;
  /** Sheet aspect ratio (h / w). 0 = fill the available screen. */
  paperRatio: number;
}

export const PANEL_META: Record<PanelId, { title: string; icon: string; orientable: boolean }> = {
  tools:  { title: "Herramientas", icon: "✒️", orientable: true  },
  style:  { title: "Color y grosor", icon: "🎨", orientable: true  },
  sheet:  { title: "Hoja",          icon: "📄", orientable: true  },
  pages:  { title: "Páginas",       icon: "🗂️", orientable: true  },
  file:   { title: "Archivo",       icon: "💾", orientable: true  },
  extras: { title: "Extras",        icon: "🛠️", orientable: false },
};

export const PANEL_ORDER: PanelId[] = ["tools", "style", "sheet", "pages", "file", "extras"];

const STORAGE_KEY = "pixlit-nb-workspace-v1";

const panel = (p: Partial<PanelState> & Pick<PanelState, "ax" | "ay" | "dx" | "dy">): PanelState => ({
  visible: true, collapsed: false, orientation: "horizontal", w: null, h: null, ...p,
});

export function defaultPrefs(narrow = false): WorkspacePrefs {
  return {
    version: 1,
    opacity: 0.96,
    locked:  false,
    hideAll: false,
    paperRatio: 0,
    panels: {
      tools:  panel({ ax: "left",   ay: "top",    dx: 12, dy: 12, orientation: "vertical" }),
      style:  panel({ ax: "center", ay: "top",    dx: 0,  dy: 12, collapsed: narrow }),
      sheet:  panel({ ax: "right",  ay: "top",    dx: 12, dy: narrow ? 56 : 12, orientation: "vertical", collapsed: true }),
      pages:  panel({ ax: "center", ay: "bottom", dx: 0,  dy: narrow ? 56 : 12 }),
      file:   panel({ ax: "right",  ay: "bottom", dx: 12, dy: 12, collapsed: narrow }),
      extras: panel({ ax: "right",  ay: "top",    dx: 12, dy: 64, visible: false }),
    },
  };
}

// ── Persistence (external store so SSR/hydration stay consistent) ────────────

const SERVER_SNAPSHOT = defaultPrefs();
let cache: WorkspacePrefs | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown, narrow: boolean): WorkspacePrefs {
  const base = defaultPrefs(narrow);
  if (!raw || typeof raw !== "object" || (raw as WorkspacePrefs).version !== 1) return base;
  const r = raw as Partial<WorkspacePrefs>;
  const panels = { ...base.panels };
  for (const id of PANEL_ORDER) {
    const p = r.panels?.[id];
    if (p && typeof p === "object") panels[id] = { ...base.panels[id], ...p };
  }
  return {
    ...base,
    opacity:    typeof r.opacity === "number" ? Math.min(1, Math.max(0.4, r.opacity)) : base.opacity,
    locked:     !!r.locked,
    hideAll:    !!r.hideAll,
    paperRatio: typeof r.paperRatio === "number" && r.paperRatio >= 0 ? r.paperRatio : base.paperRatio,
    panels,
  };
}

function load(): WorkspacePrefs {
  const narrow = typeof window !== "undefined" && window.innerWidth < 700;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? JSON.parse(raw) : null, narrow);
  } catch {
    return defaultPrefs(narrow);
  }
}

function getSnapshot(): WorkspacePrefs {
  if (!cache) cache = load();
  return cache;
}

function getServerSnapshot(): WorkspacePrefs {
  return SERVER_SNAPSHOT;
}

function emit() { listeners.forEach(l => l()); }

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Keep several open tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = load();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: WorkspacePrefs) {
  cache = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  emit();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWorkspaceLayout() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((fn: (p: WorkspacePrefs) => WorkspacePrefs) => {
    write(fn(getSnapshot()));
  }, []);

  const updatePanel = useCallback((id: PanelId, patch: Partial<PanelState>) => {
    update(p => ({ ...p, panels: { ...p.panels, [id]: { ...p.panels[id], ...patch } } }));
  }, [update]);

  const togglePanel = useCallback((id: PanelId, visible?: boolean) => {
    update(p => {
      const cur = p.panels[id];
      const nextVisible = visible ?? !cur.visible;
      return {
        ...p,
        // Showing a panel while in focus mode leaves focus mode
        hideAll: nextVisible ? false : p.hideAll,
        panels: { ...p.panels, [id]: { ...cur, visible: nextVisible, collapsed: nextVisible ? false : cur.collapsed } },
      };
    });
  }, [update]);

  const reset = useCallback(() => {
    update(p => ({ ...defaultPrefs(window.innerWidth < 700), paperRatio: p.paperRatio }));
  }, [update]);

  return { prefs, update, updatePanel, togglePanel, reset };
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** CSS placement for an anchored panel. */
export function anchorStyle(s: PanelState): CSSProperties {
  const st: CSSProperties = { position: "absolute" };
  if (s.ax === "left")  st.left  = s.dx;
  if (s.ax === "right") st.right = s.dx;
  if (s.ax === "center") {
    st.left = "50%";
    st.transform = `translateX(calc(-50% + ${s.dx}px))`;
  }
  if (s.ay === "top")    st.top    = s.dy;
  if (s.ay === "bottom") st.bottom = s.dy;
  return st;
}

/**
 * Convert an absolute rect (relative to the workspace) into the nearest
 * anchor + offsets, clamped so the panel stays inside the workspace.
 */
export function rectToAnchor(
  rect: { left: number; top: number; width: number; height: number },
  bounds: { width: number; height: number },
): Pick<PanelState, "ax" | "ay" | "dx" | "dy"> {
  const left = Math.max(0, Math.min(rect.left, bounds.width  - rect.width));
  const top  = Math.max(0, Math.min(rect.top,  bounds.height - rect.height));
  const cx = left + rect.width / 2;
  const cy = top  + rect.height / 2;

  let ax: AnchorX, dx: number;
  if (cx < bounds.width / 3)          { ax = "left";   dx = left; }
  else if (cx > bounds.width * 2 / 3) { ax = "right";  dx = bounds.width - (left + rect.width); }
  else                                { ax = "center"; dx = cx - bounds.width / 2; }

  let ay: AnchorY, dy: number;
  if (cy < bounds.height / 2) { ay = "top";    dy = top; }
  else                        { ay = "bottom"; dy = bounds.height - (top + rect.height); }

  return { ax, ay, dx: Math.round(dx), dy: Math.round(dy) };
}
