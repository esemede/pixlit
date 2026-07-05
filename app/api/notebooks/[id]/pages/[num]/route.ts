import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { resolveNotebookAccess, canWrite } from "@/lib/notebookAccess";
import { assertStorageQuota, estimateJsonBytes, formatBytes } from "@/lib/storageQuota";

type Params = { params: Promise<{ id: string; num: string }> };

/** GET /api/notebooks/:id/pages/:num — get strokes for a page (any role) */
export async function GET(_req: Request, { params }: Params) {
  const { id, num } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("notebook_pages")
    .select("id, page_number, strokes, updated_at")
    .eq("notebook_id", id)
    .eq("page_number", Number(num))
    .single();

  if (error?.code === "PGRST116") {
    return NextResponse.json({ page: null, strokes: [] });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data, strokes: data.strokes ?? [] });
}

/** PUT /api/notebooks/:id/pages/:num — upsert strokes (owner or edit) */
export async function PUT(request: Request, { params }: Params) {
  const { id, num } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!canWrite(access.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.strokes)) {
    return NextResponse.json({ error: "strokes array required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", access.ownerId!)
    .single();

  const plan = (profile?.plan ?? "free") as PlanId;
  const planCfg = PLANS[plan];
  const { data: existingPage } = await supabase
    .from("notebook_pages")
    .select("strokes")
    .eq("notebook_id", id)
    .eq("user_id", access.ownerId!)
    .eq("page_number", Number(num))
    .maybeSingle();

  const existingPageBytes = estimateJsonBytes(existingPage?.strokes ?? []);
  const incomingPageBytes = estimateJsonBytes(body.strokes);
  const quota = await assertStorageQuota({
    supabase,
    userId: access.ownerId!,
    plan,
    addBytes: incomingPageBytes,
    replacedBytes: existingPageBytes,
  });

  if (!quota.ok) {
    return NextResponse.json(
      {
        error: `Límite de almacenamiento del plan ${planCfg.name} excedido. Usarías ${formatBytes(quota.projectedBytes)} de ${formatBytes(quota.limitBytes)}.`,
        plan,
        limit: quota.limitBytes,
        used: quota.totalBytes,
        projected: quota.projectedBytes,
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("notebook_pages")
    .upsert(
      { notebook_id: id, user_id: access.ownerId!, page_number: Number(num), strokes: body.strokes },
      { onConflict: "notebook_id,page_number" },
    )
    .select("id, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, id: data.id, updated_at: data.updated_at });
}

/** DELETE /api/notebooks/:id/pages/:num — delete page, renumber later pages (owner or edit) */
export async function DELETE(_req: Request, { params }: Params) {
  const { id, num } = await params;
  const pageNum = Number(num);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!canWrite(access.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: delErr } = await supabase
    .from("notebook_pages")
    .delete()
    .eq("notebook_id", id)
    .eq("page_number", pageNum);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const { data: later } = await supabase
    .from("notebook_pages")
    .select("id, page_number")
    .eq("notebook_id", id)
    .gt("page_number", pageNum)
    .order("page_number", { ascending: true });

  if (later && later.length > 0) {
    for (const p of later) {
      await supabase.from("notebook_pages").update({ page_number: p.page_number - 1 }).eq("id", p.id);
    }
  }

  return NextResponse.json({ deleted: true });
}
