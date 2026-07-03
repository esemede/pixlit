import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotebookClient from "./NotebookClient";

export default async function NotebookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/tools/notebook");

  const { data: notebook, error } = await supabase
    .from("notebooks")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) console.error("Failed to load user's default notebook:", error.message);

  if (notebook) redirect(`/tools/notebook/${notebook.id}`);

  // No notebook exists yet for this user (trigger failure, timing race, or
  // legacy account). Fall back to the local/anonymous canvas rather than
  // redirecting to a nonexistent route.
  return <NotebookClient />;
}
