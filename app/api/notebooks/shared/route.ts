import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/notebooks/shared — notebooks other people shared with the current user */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: shares, error: sharesError } = await supabase
    .from("notebook_shares")
    .select("notebook_id, owner_id, permission")
    .eq("shared_with_email", user.email);

  if (sharesError) return NextResponse.json({ error: sharesError.message }, { status: 500 });
  if (!shares || shares.length === 0) return NextResponse.json({ notebooks: [] });

  const notebookIds = [...new Set(shares.map(s => s.notebook_id))];
  const ownerIds    = [...new Set(shares.map(s => s.owner_id))];

  const [{ data: notebooks, error: notebooksError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("notebooks").select("id, name").in("id", notebookIds),
    supabase.from("profiles").select("id, email").in("id", ownerIds),
  ]);

  if (notebooksError) return NextResponse.json({ error: notebooksError.message }, { status: 500 });
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const notebookById = new Map((notebooks ?? []).map(n => [n.id, n]));
  const emailByOwnerId = new Map((profiles ?? []).map(p => [p.id, p.email]));

  const result = shares
    .map(share => {
      const notebook = notebookById.get(share.notebook_id);
      if (!notebook) return null;
      return {
        id: notebook.id,
        name: notebook.name,
        owner_email: emailByOwnerId.get(share.owner_id) ?? "",
        permission: share.permission,
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  return NextResponse.json({ notebooks: result });
}
