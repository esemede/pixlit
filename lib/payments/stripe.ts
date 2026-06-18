import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
});

const PRICE_IDS: Record<Exclude<PlanId, "free">, string> = {
  starter:  process.env.STRIPE_PRICE_STARTER!,
  pro:      process.env.STRIPE_PRICE_PRO!,
  business: process.env.STRIPE_PRICE_BUSINESS!,
};

/** Create or retrieve a Stripe customer for a user */
export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("sub_provider_cust_id, sub_provider")
    .eq("id", userId)
    .single();

  if (profile?.sub_provider === "stripe" && profile.sub_provider_cust_id) {
    return profile.sub_provider_cust_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await admin.from("profiles").update({
    sub_provider:          "stripe",
    sub_provider_cust_id:  customer.id,
  }).eq("id", userId);

  return customer.id;
}

/** Create a Stripe Checkout session for a subscription */
export async function createCheckoutSession({
  userId,
  email,
  plan,
  successUrl,
  cancelUrl,
}: {
  userId:     string;
  email:      string;
  plan:       Exclude<PlanId, "free">;
  successUrl: string;
  cancelUrl:  string;
}): Promise<Stripe.Checkout.Session> {
  const customerId = await getOrCreateCustomer(userId, email);

  return stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       "subscription",
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  cancelUrl,
    metadata:    { user_id: userId, plan },
    subscription_data: {
      metadata: { user_id: userId, plan },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });
}

/** Create a Stripe Customer Portal session */
export async function createPortalSession(userId: string, returnUrl: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("sub_provider_cust_id")
    .eq("id", userId)
    .single();

  if (!profile?.sub_provider_cust_id) {
    throw new Error("No Stripe customer found");
  }

  return stripe.billingPortal.sessions.create({
    customer:   profile.sub_provider_cust_id,
    return_url: returnUrl,
  });
}

/** Sync a Stripe subscription to our DB */
export async function syncStripeSubscription(sub: Stripe.Subscription) {
  const admin  = createAdminClient();
  const userId = sub.metadata?.user_id;
  const plan   = (sub.metadata?.plan ?? "starter") as PlanId;

  if (!userId) return;

  const status = sub.status as string;
  const isActive = ["active", "trialing"].includes(status);

  // In API version 2025-03-31.basil+, current_period_start/end moved from
  // Subscription to SubscriptionItem (sub.items.data[N].current_period_start/end)
  const item = sub.items.data[0];
  const periodStart = item?.current_period_start ?? 0;
  const periodEnd   = item?.current_period_end   ?? 0;

  // Upsert into subscriptions table
  await admin.from("subscriptions").upsert({
    user_id:               userId,
    provider:              "stripe",
    provider_sub_id:       sub.id,
    provider_customer_id:  typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    plan,
    status:                sub.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete",
    current_period_start:  new Date(periodStart * 1000).toISOString(),
    current_period_end:    new Date(periodEnd   * 1000).toISOString(),
    cancel_at_period_end:  sub.cancel_at_period_end,
    canceled_at:           sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  }, { onConflict: "provider,provider_sub_id" });

  // Update profile plan
  await admin.from("profiles").update({
    plan:                    isActive ? plan : "free",
    sub_status:              sub.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete",
    sub_provider:            "stripe",
    sub_provider_sub_id:     sub.id,
    sub_current_period_end:  new Date(periodEnd * 1000).toISOString(),
  }).eq("id", userId);
}
