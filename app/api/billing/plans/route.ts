import { NextResponse } from "next/server";
import { PLAN_LIST } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

/** GET /api/billing/plans — return plan list + current user plan */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let currentPlan = "free";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("plan, sub_status, sub_current_period_end")
      .eq("id", user.id)
      .single();
    currentPlan = data?.plan ?? "free";
  }

  return NextResponse.json({ plans: PLAN_LIST, currentPlan });
}
