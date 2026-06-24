import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/** GET /api/notebooks/:id/share — list collaborators (owner only) */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: nb } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!nb) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("notebook_shares")
    .select("id, shared_with_email, permission, created_at")
    .eq("notebook_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collaborators: data });
}

/** POST /api/notebooks/:id/share — invite collaborator by email */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: nb } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!nb) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const email      = (body.email as string)?.trim().toLowerCase();
  const permission = body.permission === "view" ? "view" : "edit";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (email === user.email) {
    return NextResponse.json({ error: "No puedes invitarte a ti mismo" }, { status: 400 });
  }

  // Upsert (idempotent — re-invite updates permission)
  const { data, error } = await supabase
    .from("notebook_shares")
    .upsert(
      { notebook_id: id, owner_id: user.id, shared_with_email: email, permission },
      { onConflict: "notebook_id,shared_with_email" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collaborator: data }, { status: 201 });
}
