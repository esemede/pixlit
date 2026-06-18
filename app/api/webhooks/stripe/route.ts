import { NextResponse } from "next/server";
import { stripe, syncStripeSubscription } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

// CF Workers handles raw body via request.text() natively — no runtime directive needed.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig     = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: skip if already processed
  const { data: existing } = await admin
    .from("payment_events")
    .select("id, processed")
    .eq("provider", "stripe")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing?.processed) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Log event
  await admin.from("payment_events").upsert({
    provider:   "stripe",
    event_id:   event.id,
    event_type: event.type,
    payload:    event as unknown as Record<string, unknown>,
    processed:  false,
  }, { onConflict: "provider,event_id" });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed": {
        const inv    = event.data.object as Stripe.Invoice;
        const sub_id = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
        if (sub_id) {
          const sub = await stripe.subscriptions.retrieve(sub_id);
          await syncStripeSubscription(sub);
        }
        break;
      }
    }

    await admin.from("payment_events").update({ processed: true })
      .eq("provider", "stripe").eq("event_id", event.id);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "processing error";
    await admin.from("payment_events").update({ error: msg })
      .eq("provider", "stripe").eq("event_id", event.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
