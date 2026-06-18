import { NextResponse } from "next/server";
import { syncMPSubscription } from "@/lib/payments/mercadopago";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const body    = JSON.parse(rawBody) as Record<string, unknown>;

  // Verify MP signature (x-signature header)
  const xSig      = request.headers.get("x-signature") ?? "";
  const xReqId    = request.headers.get("x-request-id") ?? "";
  const [tsPart]  = xSig.split(",").filter(p => p.startsWith("ts="));
  const [v1Part]  = xSig.split(",").filter(p => p.startsWith("v1="));
  const ts  = tsPart?.split("=")[1] ?? "";
  const v1  = v1Part?.split("=")[1] ?? "";

  const dataId = (body.data as Record<string,unknown>)?.id ?? "";
  const toSign = `id:${dataId};request-id:${xReqId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "")
    .update(toSign)
    .digest("hex");

  // Only enforce in production
  if (process.env.NODE_ENV === "production" && expected !== v1) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const admin    = createAdminClient();
  const eventId  = `mp_${body.id ?? Date.now()}`;
  const eventType = body.type as string;

  // Log
  await admin.from("payment_events").upsert({
    provider:   "mercadopago",
    event_id:   eventId,
    event_type: eventType,
    payload:    body,
    processed:  false,
  }, { onConflict: "provider,event_id" });

  try {
    if (eventType === "subscription_preapproval") {
      const preapproval = body.data as Record<string, unknown>;
      await syncMPSubscription(preapproval);
    }
    await admin.from("payment_events").update({ processed: true })
      .eq("provider", "mercadopago").eq("event_id", eventId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "error";
    await admin.from("payment_events").update({ error: msg })
      .eq("provider", "mercadopago").eq("event_id", eventId);
  }

  return NextResponse.json({ ok: true });
}
