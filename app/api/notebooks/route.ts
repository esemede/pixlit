import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, canCreateNotebook } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

/** GET /api/notebooks — list user's notebooks */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notebooks")
    .select("id, name, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notebooks: data });
}

/** POST /api/notebooks — create a new notebook (enforces per-plan limit) */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan    = (profile?.plan ?? "free") as PlanId;
  const planCfg = PLANS[plan];

  // Count existing notebooks
  const { count } = await supabase
    .from("notebooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const current = count ?? 0;
  if (!canCreateNotebook(plan, current)) {
    return NextResponse.json(
      {
        error: planCfg.maxNotebooks === 1
          ? "Tu plan solo permite 1 cuaderno. Actualiza a Business para tener cuadernos ilimitados."
          : `Tu plan permite máximo ${planCfg.maxNotebooks} cuadernos.`,
        plan,
        limit: planCfg.maxNotebooks,
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name as string)?.trim() || "Nuevo Cuaderno";

  const { data, error } = await supabase
    .from("notebooks")
    .insert({ user_id: user.id, name })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notebook: data }, { status: 201 });
}
