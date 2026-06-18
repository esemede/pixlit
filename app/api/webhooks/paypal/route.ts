import { NextResponse } from "next/server";
import { verifyPayPalWebhook, syncPayPalSubscription } from "@/lib/payments/paypal";
import { createAdminClient } from "@/lib/supabase/server";

// Events that mutate the subscription plan in our DB
const SYNC_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
]);

// Events we log but intentionally skip syncing
// CREATED = APPROVAL_PENDING (user hasn't approved yet)
// PAYMENT.SALE.COMPLETED fires after each successful billing cycle — no plan change needed
const SKIP_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CREATED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REVERSED",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const body    = JSON.parse(rawBody) as Record<string, unknown>;

  const valid = await verifyPayPalWebhook(request.headers, rawBody);
  if (!valid && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const admin     = createAdminClient();
  const eventId   = body.id as string;
  const eventType = body.event_type as string;

  // Always store the raw event for audit / replay
  await admin.from("payment_events").upsert(
    {
      provider:   "paypal",
      event_id:   eventId,
      event_type: eventType,
      payload:    body,
      processed:  false,
    },
    { onConflict: "provider,event_id" },
  );

  // Intentionally-skipped events — mark as processed and return early
  if (SKIP_EVENTS.has(eventType)) {
    await admin
      .from("payment_events")
      .update({ processed: true })
      .eq("provider", "paypal")
      .eq("event_id", eventId);
    return NextResponse.json({ ok: true, skipped: eventType });
  }

  // Events that require syncing the subscription to our DB
  if (SYNC_EVENTS.has(eventType)) {
    try {
      await syncPayPalSubscription(body);
      await admin
        .from("payment_events")
        .update({ processed: true })
        .eq("provider", "paypal")
        .eq("event_id", eventId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "error";
      await admin
        .from("payment_events")
        .update({ error: msg })
        .eq("provider", "paypal")
        .eq("event_id", eventId);
    }
  }
  // Unknown events are stored but not processed — allows manual replay later

  return NextResponse.json({ ok: true });
}
