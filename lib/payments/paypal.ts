import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";

const PAYPAL_BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const creds  = Buffer.from(
    `${process.env.PP_CLIID}:${process.env.PP_SCRT}`,
  ).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body:    "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

async function ppFetch(path: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const res   = await fetch(`${PAYPAL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal API error ${res.status}: ${body}`);
  }
  return res.json();
}

const PLAN_IDS: Record<Exclude<PlanId, "free">, string> = {
  starter:  process.env.PAYPAL_PLAN_STARTER!,
  pro:      process.env.PAYPAL_PLAN_PRO!,
  business: process.env.PAYPAL_PLAN_BUSINESS!,
};

/** Create a PayPal subscription and return the approval URL */
export async function createPayPalSubscription({
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
  const planCfg = PLANS[plan];
  const sub = await ppFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id:    PLAN_IDS[plan],
      subscriber: { email_address: email },
      application_context: {
        return_url:   returnUrl,
        cancel_url:   cancelUrl,
        brand_name:   "Pixlit",
        user_action:  "SUBSCRIBE_NOW",
        shipping_preference: "NO_SHIPPING",
      },
      custom_id: JSON.stringify({ user_id: userId, plan }),
    }),
  });
  const approveLink = sub.links?.find((l: { rel: string }) => l.rel === "approve");
  return { subscriptionId: sub.id, approveUrl: approveLink?.href };
}

/** Verify a PayPal webhook signature */
export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  try {
    const result = await ppFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo:         headers.get("paypal-auth-algo"),
        cert_url:          headers.get("paypal-cert-url"),
        transmission_id:   headers.get("paypal-transmission-id"),
        transmission_sig:  headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id:        process.env.PAYPAL_WEBHOOK_ID,
        webhook_event:     JSON.parse(rawBody),
      }),
    });
    return result.verification_status === "SUCCESS";
  } catch { return false; }
}

/** Sync a PayPal subscription event to our DB */
export async function syncPayPalSubscription(event: Record<string, unknown>) {
  const admin    = createAdminClient();
  const resource = event.resource as Record<string, unknown>;
  const ref      = JSON.parse((resource?.custom_id as string) ?? "{}");
  const userId   = ref.user_id as string;
  const plan     = (ref.plan ?? "starter") as PlanId;

  if (!userId) return;

  const status   = resource.status as string;
  const isActive = ["ACTIVE", "APPROVED"].includes(status);
  const dbStatus = isActive ? "active" : status === "SUSPENDED" ? "past_due" : "canceled";

  await admin.from("subscriptions").upsert({
    user_id:         userId,
    provider:        "paypal",
    provider_sub_id: resource.id as string,
    plan,
    status:          dbStatus as "active" | "past_due" | "canceled",
  }, { onConflict: "provider,provider_sub_id" });

  await admin.from("profiles").update({
    plan:                isActive ? plan : "free",
    sub_status:          dbStatus as "active" | "past_due" | "canceled",
    sub_provider:        "paypal",
    sub_provider_sub_id: resource.id as string,
  }).eq("id", userId);
}
