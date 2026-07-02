import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  redirect(notebook ? `/tools/notebook/${notebook.id}` : "/tools/notebook/new");
}
