import { NextResponse } from "next/server";
import { verifyKhipuNotification, activateKhipuPlan } from "@/lib/payments/khipu";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Khipu sends application/x-www-form-urlencoded
  const text    = await request.text();
  const params  = new URLSearchParams(text);
  const body: Record<string, string> = {};
  params.forEach((v, k) => { body[k] = v; });

  const signature = request.headers.get("x-khipu-signature") ?? body.signature ?? "";

  // Verify
  const valid = verifyKhipuNotification(body, signature);
  if (!valid && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const admin     = createAdminClient();
  const eventId   = `khipu_${body.notification_token ?? Date.now()}`;
  const eventType = body.payment_status ?? "notification";

  await admin.from("payment_events").upsert({
    provider:   "khipu",
    event_id:   eventId,
    event_type: eventType,
    payload:    body,
    processed:  false,
  }, { onConflict: "provider,event_id" });

  try {
    if (body.payment_status === "done" || body.payment_status === "verifying") {
      await activateKhipuPlan(body.payment_id ?? eventId, body.custom ?? "{}");
    }
    await admin.from("payment_events").update({ processed: true })
      .eq("provider", "khipu").eq("event_id", eventId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "error";
    await admin.from("payment_events").update({ error: msg })
      .eq("provider", "khipu").eq("event_id", eventId);
  }

  return NextResponse.json({ ok: true });
}
