import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

/** GET /api/notebooks/:id/pages — list page metadata */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notebook_pages")
    .select("id, page_number, created_at, updated_at")
    .eq("notebook_id", id)
    .eq("user_id", user.id)
    .order("page_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data });
}

/** POST /api/notebooks/:id/pages — add a new blank page */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan  = profile?.plan ?? "free";
  const limit = PLANS[plan as keyof typeof PLANS].maxPages;

  const { count } = await supabase
    .from("notebook_pages")
    .select("id", { count: "exact", head: true })
    .eq("notebook_id", id)
    .eq("user_id", user.id);

  if (limit !== -1 && (count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Plan limit reached. Upgrade to add more pages.`, plan, limit },
      { status: 403 },
    );
  }

  const nextNum = (count ?? 0) + 1;
  const { data, error } = await supabase
    .from("notebook_pages")
    .insert({ notebook_id: id, user_id: user.id, page_number: nextNum, strokes: [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data }, { status: 201 });
}
