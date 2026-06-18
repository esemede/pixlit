import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/plans";
import { createPayPalSubscription } from "@/lib/payments/paypal";

/**
 * POST /api/billing/paypal/subscribe
 * Body: { plan: PlanId }
 * Returns: { subscriptionId: string }
 *
 * Called by the PayPal JS SDK `createSubscription` callback.
 * The SDK takes the returned subscriptionId and opens the PayPal
 * approval popup/redirect. The backend webhook handles activation.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const plan = body.plan as PlanId | undefined;

  if (!plan || plan === "free") {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    const { subscriptionId } = await createPayPalSubscription({
      userId:    user.id,
      email:     user.email!,
      plan:      plan as Exclude<PlanId, "free">,
      returnUrl: `${appUrl}/account?checkout=success&provider=paypal`,
      cancelUrl: `${appUrl}/pricing?checkout=canceled`,
    });
    return NextResponse.json({ subscriptionId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al crear suscripción PayPal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
