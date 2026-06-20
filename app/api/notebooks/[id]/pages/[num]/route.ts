import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; num: string }> };

/** GET /api/notebooks/:id/pages/:num — get strokes for a page */
export async function GET(_req: Request, { params }: Params) {
  const { id, num } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notebook_pages")
    .select("id, page_number, strokes, updated_at")
    .eq("notebook_id", id)
    .eq("user_id", user.id)
    .eq("page_number", Number(num))
    .single();

  if (error?.code === "PGRST116") {
    // Page doesn't exist yet — return empty strokes
    return NextResponse.json({ page: null, strokes: [] });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data, strokes: data.strokes ?? [] });
}

/** PUT /api/notebooks/:id/pages/:num — upsert strokes */
export async function PUT(request: Request, { params }: Params) {
  const { id, num } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.strokes)) {
    return NextResponse.json({ error: "strokes array required" }, { status: 400 });
  }

  // Upsert: create page if it doesn't exist, update if it does
  const { data, error } = await supabase
    .from("notebook_pages")
    .upsert(
      {
        notebook_id:  id,
        user_id:      user.id,
        page_number:  Number(num),
        strokes:      body.strokes,
      },
      { onConflict: "notebook_id,page_number" },
    )
    .select("id, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, id: data.id, updated_at: data.updated_at });
}

/** DELETE /api/notebooks/:id/pages/:num — delete page and renumber subsequent pages */
export async function DELETE(_req: Request, { params }: Params) {
  const { id, num } = await params;
  const pageNum = Number(num);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete the target page
  const { error: delErr } = await supabase
    .from("notebook_pages")
    .delete()
    .eq("notebook_id", id)
    .eq("user_id",     user.id)
    .eq("page_number", pageNum);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // Shift page_number for all pages after the deleted one
  const { data: later } = await supabase
    .from("notebook_pages")
    .select("id, page_number")
    .eq("notebook_id", id)
    .eq("user_id",     user.id)
    .gt("page_number", pageNum)
    .order("page_number", { ascending: true });

  if (later && later.length > 0) {
    for (const p of later) {
      await supabase
        .from("notebook_pages")
        .update({ page_number: p.page_number - 1 })
        .eq("id", p.id);
    }
  }

  return NextResponse.json({ deleted: true });
}
