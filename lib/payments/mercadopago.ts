import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";

const MP_BASE = "https://api.mercadopago.com";

async function mpFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MercadoPago API error ${res.status}: ${body}`);
  }
  return res.json();
}

/** Create a MercadoPago Preference (one-time redirect checkout)
 *  MP subscriptions use "preapproval" — we handle that separately.
 *  For simplicity, we use preapproval_plan (recurring).
 */
export async function createMPSubscription({
  userId,
  email,
  plan,
  backUrl,
}: {
  userId:  string;
  email:   string;
  plan:    Exclude<PlanId, "free">;
  backUrl: string;
}) {
  const planCfg = PLANS[plan];
  const body = {
    reason:          `Pixlit ${planCfg.name}`,
    auto_recurring: {
      frequency:       1,
      frequency_type:  "months",
      transaction_amount: planCfg.priceUSD, // USD; set to priceCLP for local CLP
      currency_id:     "USD",
    },
    payer_email:     email,
    back_url:        backUrl,
    external_reference: JSON.stringify({ user_id: userId, plan }),
  };

  return mpFetch("/preapproval", { method: "POST", body: JSON.stringify(body) });
}

/** Sync a MercadoPago preapproval to our DB */
export async function syncMPSubscription(preapproval: Record<string, unknown>) {
  const admin = createAdminClient();
  const ref   = JSON.parse((preapproval.external_reference as string) ?? "{}");
  const userId = ref.user_id as string;
  const plan   = (ref.plan ?? "starter") as PlanId;

  if (!userId) return;

  const status    = preapproval.status as string;
  const isActive  = status === "authorized";
  const dbStatus  = isActive ? "active" : status === "paused" ? "past_due" : "canceled";

  await admin.from("subscriptions").upsert({
    user_id:          userId,
    provider:         "mercadopago",
    provider_sub_id:  preapproval.id as string,
    plan,
    status:           dbStatus as "active" | "past_due" | "canceled",
  }, { onConflict: "provider,provider_sub_id" });

  await admin.from("profiles").update({
    plan:         isActive ? plan : "free",
    sub_status:   dbStatus as "active" | "past_due" | "canceled",
    sub_provider: "mercadopago",
    sub_provider_sub_id: preapproval.id as string,
  }).eq("id", userId);
}
