import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveNotebookAccess } from "@/lib/notebookAccess";

type Params = { params: Promise<{ id: string }> };

/** GET /api/notebooks/:id — metadata + resolved role for the current user */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, name, created_at, updated_at")
    .eq("id", id)
    .single();

  return NextResponse.json({ notebook, role: access.role });
}

/** PATCH /api/notebooks/:id — rename (owner only) */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (access.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = (body.name as string)?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { error } = await supabase.from("notebooks").update({ name }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/notebooks/:id — delete notebook and all pages (owner only) */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (access.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await supabase.from("notebook_pages").delete().eq("notebook_id", id);
  const { error } = await supabase.from("notebooks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
