"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { PLAN_LIST } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

// Lazy-load PayPalSubscribeButton (client-only, avoids SSR issues)
const PayPalSubscribeButton = dynamic(
  () => import("@/components/PayPalSubscribeButton"),
  { ssr: false, loading: () => <div style={ppLoadingStyle}>Cargando PayPal…</div> },
);

type Provider = "stripe" | "mercadopago" | "paypal" | "khipu";

const PROVIDERS: { id: Provider; label: string; icon: string; note?: string }[] = [
  { id: "stripe",      label: "Tarjeta de crédito / débito", icon: "💳" },
  { id: "paypal",      label: "PayPal",                      icon: "🅿️" },
  { id: "mercadopago", label: "MercadoPago",                 icon: "🛒", note: "Latam" },
  { id: "khipu",       label: "Khipu",                       icon: "🏦", note: "Chile · transferencia" },
];

export default function PricingPage() {
  const router   = useRouter();
  const [loading,  setLoading]  = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("stripe");
  const [error,    setError]    = useState<string | null>(null);

  // Non-PayPal checkout (Stripe / MercadoPago / Khipu)
  const checkout = async (plan: Exclude<PlanId, "free">) => {
    setLoading(plan); setError(null);
    const res = await fetch("/api/billing/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan, provider }),
    });
    const data = await res.json();
    if (data.error) {
      if (res.status === 401) { router.push(`/auth/login?next=/pricing`); return; }
      setError(data.error); setLoading(null); return;
    }
    if (data.url) window.location.href = data.url;
    setLoading(null);
  };

  const isPayPal = provider === "paypal";

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "sb",
        vault:    true,
        intent:   "subscription",
        currency: "USD",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={badgeStyle}>💎 Planes y Precios</div>
          <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, color: "#fff", marginTop: 16, marginBottom: 12 }}>
            Elige tu plan
          </h1>
          <p style={{ color: "#888", fontSize: 18 }}>Sin compromisos. Cancela cuando quieras.</p>
        </div>

        {/* Provider selector */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 36 }}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => { setProvider(p.id); setError(null); }}
              style={{
                background:   provider === p.id ? "rgba(139,92,246,0.25)" : "#111",
                border:       `1px solid ${provider === p.id ? "#8b5cf6" : "#2a2a2a"}`,
                borderRadius: 10, padding: "8px 14px",
                color:        provider === p.id ? "#a78bfa" : "#888",
                fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {p.icon} {p.label}
              {p.note && <span style={{ fontSize: 11, opacity: 0.7 }}>({p.note})</span>}
            </button>
          ))}
        </div>

        {/* PayPal info banner */}
        {isPayPal && (
          <div style={ppInfoStyle}>
            <span style={{ fontSize: 18 }}>🅿️</span>
            <span>
              Paga de forma segura con tu cuenta PayPal o tarjeta vinculada.
              La suscripción se activa automáticamente tras la aprobación.
            </span>
          </div>
        )}

        {error && (
          <div style={{ ...errorStyle, maxWidth: 600, margin: "0 auto 24px" }}>{error}</div>
        )}

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
          {PLAN_LIST.map(plan => {
            const isFree      = plan.id === "free";
            const isHighlight = plan.highlighted;
            return (
              <div
                key={plan.id}
                style={{
                  background:   isHighlight ? "linear-gradient(135deg,#1e1a3a,#16213e)" : "#111",
                  border:       `1px solid ${isHighlight ? "#8b5cf6" : "#2a2a2a"}`,
                  borderRadius: 16, padding: "28px 24px",
                  position: "relative", display: "flex", flexDirection: "column", gap: 16,
                }}
              >
                {isHighlight && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "#8b5cf6", color: "#fff", borderRadius: 99, padding: "3px 14px",
                    fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    Más popular
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{plan.name}</div>
                  <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>{plan.description}</div>
                </div>

                <div>
                  {plan.priceUSD === 0 ? (
                    <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>Gratis</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>
                        ${plan.priceUSD.toFixed(2)}
                      </span>
                      <span style={{ color: "#888", fontSize: 14 }}> USD/mes</span>
                      {isPayPal && (
                        <div style={{ color: "#f59e0b", fontSize: 12, marginTop: 2 }}>
                          + 19% IVA → total ${(plan.priceUSD * 1.19).toFixed(2)} USD/mes
                        </div>
                      )}
                      <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                        ≈ ${plan.priceCLP.toLocaleString("es-CL")} CLP
                        {provider === "khipu" && " · pago anual"}
                      </div>
                    </>
                  )}
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ color: "#ccc", fontSize: 13, display: "flex", gap: 8 }}>
                      <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isFree ? (
                  <a href="/auth/signup" style={{ ...btnSecondaryStyle, textAlign: "center", textDecoration: "none", display: "block" }}>
                    Empezar gratis
                  </a>
                ) : isPayPal ? (
                  /* ── PayPal branded button ── */
                  <PayPalSubscribeButton
                    plan={plan.id as Exclude<PlanId, "free">}
                    onError={msg => setError(msg)}
                  />
                ) : (
                  /* ── Stripe / MP / Khipu redirect ── */
                  <button
                    onClick={() => checkout(plan.id as Exclude<PlanId, "free">)}
                    disabled={loading === plan.id}
                    style={{ ...btnPrimaryStyle, opacity: loading === plan.id ? 0.7 : 1 }}
                  >
                    {loading === plan.id ? "Redirigiendo…" : `Suscribirse · ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ snippet */}
        <div style={{ marginTop: 64, textAlign: "center", color: "#555", fontSize: 14 }}>
          <p>¿Tienes preguntas? Escríbenos a hola@pixlit.app</p>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const badgeStyle: React.CSSProperties = {
  display: "inline-block", background: "rgba(139,92,246,0.15)",
  border: "1px solid rgba(139,92,246,0.3)", borderRadius: 99,
  padding: "6px 16px", fontSize: 13, color: "#a78bfa", fontWeight: 600,
};
const btnPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", color: "#fff",
  border: "none", borderRadius: 10, padding: "12px 16px",
  fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%",
};
const btnSecondaryStyle: React.CSSProperties = {
  background: "#1a1a1a", color: "#a78bfa", border: "1px solid #333",
  borderRadius: 10, padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 14,
};
const ppInfoStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  background: "rgba(0,112,240,0.1)", border: "1px solid rgba(0,112,240,0.25)",
  borderRadius: 10, padding: "10px 16px", color: "#93c5fd",
  fontSize: 13, maxWidth: 700, margin: "0 auto 24px",
};
const ppLoadingStyle: React.CSSProperties = {
  background: "#1a1a1a", borderRadius: 8, height: 45, fontSize: 13,
  display: "flex", alignItems: "center", justifyContent: "center", color: "#555",
};
