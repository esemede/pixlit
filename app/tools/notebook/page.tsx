import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NotebookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/tools/notebook");

  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  redirect(notebook ? `/tools/notebook/${notebook.id}` : "/tools/notebook/new");
}
