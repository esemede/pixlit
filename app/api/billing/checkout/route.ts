import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/plans";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { createMPSubscription } from "@/lib/payments/mercadopago";
import { createPayPalSubscription } from "@/lib/payments/paypal";
import { createKhipuPayment } from "@/lib/payments/khipu";

/**
 * POST /api/billing/checkout
 * Body: { plan: PlanId, provider: "stripe"|"mercadopago"|"paypal"|"khipu" }
 * Returns: { url: string } — redirect user to this URL
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const plan     = body.plan     as PlanId | undefined;
  const provider = body.provider as "stripe" | "mercadopago" | "paypal" | "khipu" | undefined;

  if (!plan || plan === "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!provider) {
    return NextResponse.json({ error: "provider required" }, { status: 400 });
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL!;
  const returnUrl = `${appUrl}/account?checkout=success`;
  const cancelUrl = `${appUrl}/pricing?checkout=canceled`;

  try {
    switch (provider) {
      case "stripe": {
        const session = await createCheckoutSession({
          userId: user.id, email: user.email!, plan: plan as Exclude<PlanId, "free">,
          successUrl: returnUrl, cancelUrl,
        });
        return NextResponse.json({ url: session.url });
      }

      case "mercadopago": {
        const pref = await createMPSubscription({
          userId: user.id, email: user.email!, plan: plan as Exclude<PlanId, "free">, backUrl: returnUrl,
        });
        return NextResponse.json({ url: pref.init_point });
      }

      case "paypal": {
        const { approveUrl } = await createPayPalSubscription({
          userId: user.id, email: user.email!, plan: plan as Exclude<PlanId, "free">, returnUrl, cancelUrl,
        });
        return NextResponse.json({ url: approveUrl });
      }

      case "khipu": {
        const payment = await createKhipuPayment({
          userId: user.id, email: user.email!, plan: plan as Exclude<PlanId, "free">, returnUrl, cancelUrl,
        });
        return NextResponse.json({ url: payment.payment_url });
      }

      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
