import type { SupabaseClient } from "@supabase/supabase-js";

export type NotebookRole = "owner" | "edit" | "view" | null;
export interface NotebookAccess { role: NotebookRole; ownerId: string | null }

/** Resolves what role (if any) a user has on a notebook: owner, edit, view, or null. */
export async function resolveNotebookAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  notebookId: string,
): Promise<NotebookAccess> {
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, user_id")
    .eq("id", notebookId)
    .single();

  if (!notebook) return { role: null, ownerId: null };
  if (notebook.user_id === userId) return { role: "owner", ownerId: notebook.user_id };

  const { data: share } = await supabase
    .from("notebook_shares")
    .select("permission")
    .eq("notebook_id", notebookId)
    .eq("shared_with_email", userEmail)
    .single();

  if (!share) return { role: null, ownerId: notebook.user_id };
  return { role: share.permission as "view" | "edit", ownerId: notebook.user_id };
}

export function canWrite(role: NotebookRole): boolean {
  return role === "owner" || role === "edit";
}
