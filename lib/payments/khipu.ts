/**
 * Khipu — transferencia bancaria chilena
 * https://khipu.com/page/api-nuevo
 * Khipu no tiene suscripciones recurrentes nativas.
 * Usamos cobros anuales: el usuario paga 1 año por adelantado.
 */

import crypto from "crypto";
import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";

const KHIPU_API = "https://payment-api.khipu.com/v3";

function khipuHeaders(path: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const toSign    = `POST\n${KHIPU_API}${path}\n${body}\n${timestamp}`;
  const signature = crypto
    .createHmac("sha256", process.env.KHIPU_SECRET!)
    .update(toSign)
    .digest("hex");
  return {
    "x-khipu-receiver-id": process.env.KHIPU_RECEIVER_ID!,
    "x-khipu-signature":   signature,
    "x-khipu-timestamp":   timestamp,
    "Content-Type":        "application/json",
  };
}

/** Create a Khipu payment (annual, CLP) */
export async function createKhipuPayment({
  userId,
  email,
  plan,
  returnUrl,
  cancelUrl,
}: {
  userId:    string;
  email:     string;
  plan:      Exclude<PlanId, "free">;
  returnUrl: string;
  cancelUrl: string;
}) {
  const planCfg   = PLANS[plan];
  // Annual price with ~15% discount
  const annualCLP = Math.round(planCfg.priceCLP * 10); // 10 months for 12

  const bodyObj = {
    subject:           `Pixlit ${planCfg.name} — suscripción anual`,
    currency:          "CLP",
    amount:            annualCLP,
    payer_email:       email,
    return_url:        returnUrl,
    cancel_url:        cancelUrl,
    custom:            JSON.stringify({ user_id: userId, plan, period: "annual" }),
    notify_url:        `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/khipu`,
    expires_date:      new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h
    send_email:        false,
  };
  const bodyStr = JSON.stringify(bodyObj);

  const res = await fetch(`${KHIPU_API}/payments`, {
    method:  "POST",
    headers: khipuHeaders("/payments", bodyStr),
    body:    bodyStr,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Khipu error ${res.status}: ${err}`);
  }
  return res.json() as Promise<{
    payment_id: string;
    payment_url: string;
    simplified_transfer_url: string;
  }>;
}

/** Verify Khipu notification signature */
export function verifyKhipuNotification(
  body: Record<string, string>,
  signature: string,
): boolean {
  // Khipu signs the notification_token
  const expected = crypto
    .createHmac("sha256", process.env.KHIPU_SECRET!)
    .update(body.notification_token ?? "")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/** Activate a user plan after successful Khipu payment */
export async function activateKhipuPlan(paymentId: string, custom: string) {
  const admin  = createAdminClient();
  const ref    = JSON.parse(custom ?? "{}");
  const userId = ref.user_id as string;
  const plan   = (ref.plan ?? "starter") as PlanId;

  if (!userId) return;

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 year

  await admin.from("subscriptions").upsert({
    user_id:               userId,
    provider:              "khipu",
    provider_sub_id:       paymentId,
    plan,
    status:                "active",
    current_period_start:  new Date().toISOString(),
    current_period_end:    periodEnd.toISOString(),
  }, { onConflict: "provider,provider_sub_id" });

  await admin.from("profiles").update({
    plan,
    sub_status:             "active",
    sub_provider:           "khipu",
    sub_provider_sub_id:    paymentId,
    sub_current_period_end: periodEnd.toISOString(),
  }).eq("id", userId);
}
