"use client";

/**
 * PayPalSubscribeButton
 * ---------------------
 * Renders the official PayPal subscription button using @paypal/react-paypal-js.
 * Must be rendered inside <PayPalScriptProvider> (handled by the parent page).
 *
 * Flow:
 *  1. User clicks the PayPal button → SDK opens approval popup/redirect
 *  2. createSubscription() calls our API → returns the PayPal subscriptionId
 *  3. User approves inside PayPal
 *  4. onApprove() fires → redirect to /account?checkout=success
 *  5. PayPal webhook (BILLING.SUBSCRIPTION.ACTIVATED) activates the plan in DB
 */

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import type { PlanId } from "@/lib/plans";

interface Props {
  plan:       Exclude<PlanId, "free">;
  onError?:   (msg: string) => void;
}

export default function PayPalSubscribeButton({ plan, onError }: Props) {
  const router = useRouter();
  const [{ isPending }] = usePayPalScriptReducer();

  return (
    <div style={{ minHeight: 45 }}>
      {isPending && (
        <div style={{
          background: "#1a1a1a", borderRadius: 8, height: 45,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#555", fontSize: 13,
        }}>
          Cargando PayPal…
        </div>
      )}

      <PayPalButtons
        style={{
          layout:  "vertical",
          color:   "blue",
          shape:   "rect",
          label:   "subscribe",
          height:  45,
        }}
        createSubscription={async () => {
          const res = await fetch("/api/billing/paypal/subscribe", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ plan }),
          });

          if (res.status === 401) {
            router.push("/auth/login?next=/pricing");
            return "";
          }

          const data = await res.json();
          if (data.error) {
            onError?.(data.error);
            throw new Error(data.error);
          }
          return data.subscriptionId as string;
        }}
        onApprove={async ({ subscriptionID }) => {
          // Subscription created & approved. Webhook will activate it.
          // We pass the subscriptionID as a query param so the success page
          // can display it, but activation is async via webhook.
          router.push(
            `/account?checkout=success&provider=paypal&sub=${subscriptionID ?? ""}`,
          );
        }}
        onCancel={() => {
          onError?.("Pago cancelado.");
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          onError?.("Error al procesar el pago con PayPal. Intenta de nuevo.");
        }}
      />
    </div>
  );
}
