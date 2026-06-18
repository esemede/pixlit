"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Plan, PlanId } from "@/lib/plans";
import type { NotebookTheme } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email:          string;
  displayName:    string;
  plan:           PlanId;
  planCfg:        Plan;
  subStatus:      string | null;
  subProvider:    string | null;
  subPeriodEnd:   string | null;
  voiceUsedSec:   number;
  voiceMaxSec:    number;
  voicePct:       number;
  pageCount:      number;
  notebookTheme:  NotebookTheme | null;
}

const BG_OPTIONS: { value: NotebookTheme["background"]; label: string }[] = [
  { value: "ruled",   label: "📄 Rayado" },
  { value: "grid",    label: "🔲 Cuadrícula" },
  { value: "dotted",  label: "·· Punteado" },
  { value: "blank",   label: "⬜ En blanco" },
];

export default function AccountClient({
  email, displayName, plan, planCfg, subStatus, subProvider,
  subPeriodEnd, voiceUsedSec, voiceMaxSec, voicePct, pageCount, notebookTheme,
}: Props) {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [checkoutOk,    setCheckoutOk]    = useState(false);
  const [activating,    setActivating]    = useState(false);
  const [activated,     setActivated]     = useState(false);
  const [name,          setName]          = useState(displayName);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // After PayPal checkout, poll /api/user/me until plan activates (max 90s)
  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    setCheckoutOk(true);
    window.history.replaceState({}, "", "/account");

    // Only poll when provider is paypal (Stripe/MP activate synchronously via redirect)
    if (searchParams.get("provider") !== "paypal") return;
    if (plan !== "free") return; // already activated (race: server rendered updated plan)

    setActivating(true);
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      try {
        const res  = await fetch("/api/user/me");
        const data = await res.json();
        if (data.plan && data.plan !== "free") {
          clearInterval(pollRef.current!);
          setActivating(false);
          setActivated(true);
          // Refresh server component to show updated plan/stats
          router.refresh();
        }
      } catch { /* ignore network hiccup */ }
      if (elapsed >= 90) {
        clearInterval(pollRef.current!);
        setActivating(false);
      }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [theme,     setTheme]     = useState<NotebookTheme>(
    notebookTheme ?? { background: "ruled", bgColor: "#1e1e2e", lineColor: "rgba(255,255,255,0.035)", marginColor: "rgba(139,92,246,0.08)" }
  );
  const [portalLoading, setPortalLoading] = useState(false);

  const supabase = createClient();

  const saveProfile = async () => {
    setSaving(true);
    await supabase.from("profiles").update({
      display_name:    name,
      notebook_theme:  theme,
    }).eq("id", (await supabase.auth.getUser()).data.user!.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openPortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const { url, error } = await res.json();
    if (url) window.location.href = url;
    else alert(error ?? "Error al abrir el portal");
    setPortalLoading(false);
  };

  const fmtSec = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 28, marginBottom: 32 }}>Mi cuenta</h1>

      {/* ── Checkout success / activation banner ── */}
      {(checkoutOk || activating || activated) && (
        <div style={{
          background: activated
            ? "rgba(34,197,94,0.18)"
            : activating
              ? "rgba(139,92,246,0.12)"
              : "rgba(34,197,94,0.12)",
          border: `1px solid ${activated ? "rgba(34,197,94,0.5)" : activating ? "rgba(139,92,246,0.4)" : "rgba(34,197,94,0.35)"}`,
          borderRadius: 10, padding: "14px 18px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12,
          color: activated ? "#86efac" : activating ? "#c4b5fd" : "#86efac",
        }}>
          <span style={{ fontSize: 22 }}>
            {activated ? "🎉" : activating ? "⏳" : "✅"}
          </span>
          <div>
            {activated ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15 }}>¡Plan activado!</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>Tu suscripción ya está activa. ¡Disfruta las funciones premium!</div>
              </>
            ) : activating ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Activando suscripción…</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>Confirmando el pago con PayPal. Esto tarda solo unos segundos.</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 15 }}>¡Pago recibido!</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Tu suscripción se está activando. Si el plan no se actualiza automáticamente, recarga la página.
                </div>
              </>
            )}
          </div>
          {!activating && (
            <button
              onClick={() => { setCheckoutOk(false); setActivated(false); }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 18, opacity: 0.7 }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Plan card */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Plan actual</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{
            background: plan === "free" ? "#222" : "rgba(139,92,246,0.2)",
            border:     `1px solid ${plan === "free" ? "#333" : "#8b5cf6"}`,
            borderRadius: 8, padding: "6px 14px",
            color: plan === "free" ? "#888" : "#a78bfa", fontWeight: 700, fontSize: 15,
          }}>
            {planCfg.name}
          </span>
          {subStatus && (
            <span style={{ color: subStatus === "active" ? "#22c55e" : "#f97316", fontSize: 13 }}>
              {subStatus === "active" ? "✓ Activo" : `⚠ ${subStatus}`}
            </span>
          )}
          {subPeriodEnd && (
            <span style={{ color: "#555", fontSize: 12 }}>
              Renueva: {new Date(subPeriodEnd).toLocaleDateString("es-CL")}
            </span>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {plan === "free" ? (
            <Link href="/pricing" style={btnPrimaryStyle}>Mejorar plan ✨</Link>
          ) : subProvider === "stripe" ? (
            <button onClick={openPortal} disabled={portalLoading} style={btnSecondaryStyle}>
              {portalLoading ? "Cargando…" : "Gestionar suscripción"}
            </button>
          ) : subProvider === "paypal" ? (
            <a
              href="https://www.paypal.com/myaccount/autopay/"
              target="_blank"
              rel="noopener noreferrer"
              style={btnSecondaryStyle}
            >
              🅿️ Gestionar en PayPal
            </a>
          ) : (
            <Link href="/pricing" style={btnSecondaryStyle}>Ver planes</Link>
          )}
        </div>
      </section>

      {/* Usage */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Uso</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={statCard}>
            <div style={{ color: "#888", fontSize: 12 }}>Páginas usadas</div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>
              {pageCount.toLocaleString()}
              <span style={{ color: "#555", fontSize: 13 }}>
                {" "}/{" "}{planCfg.maxPages === -1 ? "∞" : planCfg.maxPages}
              </span>
            </div>
          </div>
          <div style={statCard}>
            <div style={{ color: "#888", fontSize: 12 }}>Voz usada</div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>
              {planCfg.maxVoiceSeconds === 0
                ? <span style={{ color: "#555", fontSize: 14 }}>No disponible</span>
                : fmtSec(voiceUsedSec)
              }
            </div>
            {planCfg.maxVoiceSeconds > 0 && (
              <div style={{ marginTop: 6, background: "#222", borderRadius: 99, height: 4 }}>
                <div style={{
                  width:      `${voicePct}%`, height: "100%",
                  background: voicePct > 90 ? "#ef4444" : "#8b5cf6", borderRadius: 99,
                }} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Profile */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Perfil</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Correo</label>
            <input value={email} disabled style={{ ...inputStyle, opacity: 0.5 }} />
          </div>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Tu nombre" />
          </div>
        </div>
      </section>

      {/* Notebook theme (subscribers only) */}
      {plan !== "free" && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Tema del cuaderno</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Tipo de fondo</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {BG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(t => ({ ...t, background: opt.value }))}
                    style={{
                      background:  theme.background === opt.value ? "rgba(139,92,246,0.2)" : "#1a1a1a",
                      border:      `1px solid ${theme.background === opt.value ? "#8b5cf6" : "#333"}`,
                      borderRadius: 8, padding: "8px 12px",
                      color: theme.background === opt.value ? "#a78bfa" : "#888",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Color de fondo</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <input
                    type="color" value={theme.bgColor}
                    onChange={e => setTheme(t => ({ ...t, bgColor: e.target.value }))}
                    style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    value={theme.bgColor}
                    onChange={e => setTheme(t => ({ ...t, bgColor: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Color de líneas</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <input
                    type="color" value="#888888"
                    onChange={e => setTheme(t => ({ ...t, lineColor: e.target.value + "44" }))}
                    style={{ width: 40, height: 32, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    value={theme.lineColor}
                    onChange={e => setTheme(t => ({ ...t, lineColor: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Save button */}
      <button onClick={saveProfile} disabled={saving} style={{ ...btnPrimaryStyle, marginTop: 8 }}>
        {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar cambios"}
      </button>

      {/* Sign out */}
      <form action="/auth/signout" method="POST" style={{ marginTop: 24 }}>
        <button type="submit" style={{ ...btnDangerStyle }}>Cerrar sesión</button>
      </form>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const sectionStyle: React.CSSProperties = {
  background: "#111", border: "1px solid #222", borderRadius: 12,
  padding: "20px 22px", marginBottom: 16,
};
const h2Style: React.CSSProperties = { color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 12 };
const labelStyle: React.CSSProperties = { color: "#666", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
  padding: "10px 14px", color: "#fff", fontSize: 14, width: "100%",
  boxSizing: "border-box",
};
const statCard: React.CSSProperties = {
  background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px",
};
const btnPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", color: "#fff",
  border: "none", borderRadius: 10, padding: "12px 24px",
  fontWeight: 700, fontSize: 15, cursor: "pointer",
};
const btnSecondaryStyle: React.CSSProperties = {
  background: "#1a1a1a", color: "#a78bfa", border: "1px solid #333",
  borderRadius: 10, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};
const btnDangerStyle: React.CSSProperties = {
  background: "transparent", color: "#ef4444", border: "1px solid #2a2a2a",
  borderRadius: 10, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer",
};
