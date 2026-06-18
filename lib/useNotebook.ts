"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseNotebookOptions {
  onLimitReached?: (plan: string, limit: number) => void;
}

interface SaveState { status: "idle" | "saving" | "saved" | "error"; error?: string }

export function useNotebook({ onLimitReached }: UseNotebookOptions = {}) {
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [isAuth,     setIsAuth]     = useState(false);
  const [saveState,  setSaveState]  = useState<SaveState>({ status: "idle" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load auth state + default notebook ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setIsAuth(false); return; }
      setIsAuth(true); setUserId(user.id);

      // Get or create notebook
      const res  = await fetch("/api/notebooks");
      const data = await res.json();
      if (data.notebooks?.length > 0) {
        setNotebookId(data.notebooks[0].id);
      }
    });
  }, []);

  /** Load strokes for a given page number */
  const loadPage = useCallback(async (pageNumber: number): Promise<unknown[] | null> => {
    if (!notebookId) return null;
    const res  = await fetch(`/api/notebooks/${notebookId}/pages/${pageNumber}`);
    const data = await res.json();
    if (res.ok) return data.strokes ?? [];
    return null;
  }, [notebookId]);

  /** Save strokes — debounced 1.5s */
  const savePage = useCallback((pageNumber: number, strokes: unknown[]) => {
    if (!notebookId || !isAuth) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSaveState({ status: "saving" });
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/pages/${pageNumber}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ strokes }),
        });
        const data = await res.json();
        if (res.status === 403) {
          onLimitReached?.(data.plan, data.limit);
          setSaveState({ status: "error", error: data.error });
        } else if (!res.ok) {
          setSaveState({ status: "error", error: data.error });
        } else {
          setSaveState({ status: "saved" });
          setTimeout(() => setSaveState({ status: "idle" }), 2000);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error al guardar";
        setSaveState({ status: "error", error: msg });
      }
    }, 1500);
  }, [notebookId, isAuth, onLimitReached]);

  /** Add a new page (server-side, checks plan limit) */
  const addPage = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!notebookId) return { ok: false, error: "Sin cuaderno" };
    const res  = await fetch(`/api/notebooks/${notebookId}/pages`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true };
  }, [notebookId]);

  return { notebookId, userId, isAuth, saveState, loadPage, savePage, addPage };
}
