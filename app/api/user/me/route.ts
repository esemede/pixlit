import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

/**
 * GET /api/user/me
 * Returns the current user's auth state and plan details.
 * Used by the frontend to poll for plan activation after payment.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, sub_status, sub_provider, sub_current_period_end")
    .eq("id", user.id)
    .single();

  const plan    = (profile?.plan ?? "free") as PlanId;
  const planCfg = PLANS[plan];

  return NextResponse.json({
    user:           { id: user.id, email: user.email },
    plan,
    planName:       planCfg.name,
    isPaid:         plan !== "free",
    sub_status:     profile?.sub_status   ?? null,
    sub_provider:   profile?.sub_provider ?? null,
    sub_period_end: profile?.sub_current_period_end ?? null,
  });
}
