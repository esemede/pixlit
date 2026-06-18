// ── Subscription Plan Definitions ─────────────────────────────────────────────
// Prices in USD (charged via each payment provider)
// Chilean prices approximate at 1 USD ≈ CLP 970

export type PlanId = "free" | "starter" | "pro" | "business";

export interface Plan {
  id:                PlanId;
  name:              string;
  description:       string;
  priceUSD:          number;       // monthly, 0 = free
  priceCLP:          number;       // Chilean pesos
  maxPages:          number;       // -1 = unlimited
  maxVoiceSeconds:   number;       // -1 = unlimited, 0 = none
  maxNotebooks:      number;       // -1 = unlimited; free/starter/pro = 1
  features:          string[];
  highlighted?:      boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id:              "free",
    name:            "Gratis",
    description:     "Para empezar a dibujar",
    priceUSD:        0,
    priceCLP:        0,
    maxPages:        100,
    maxVoiceSeconds: 0,
    maxNotebooks:    1,
    features: [
      "100 páginas por cuaderno",
      "Todas las herramientas de dibujo",
      "Exportar PNG y PDF",
      "Reconocimiento de figuras",
      "Palm rejection para tableta",
    ],
  },
  starter: {
    id:              "starter",
    name:            "Premium",
    description:     "Para uso regular",
    priceUSD:        5.00,
    priceCLP:        4850,
    maxPages:        500,
    maxVoiceSeconds: 30 * 60,       // 30 minutos
    maxNotebooks:    1,
    features: [
      "500 páginas por cuaderno",
      "30 min de notas de voz",
      "Temas de fondo personalizados",
      "Sincronización entre dispositivos",
      "Todo lo del plan Gratis",
    ],
  },
  pro: {
    id:              "pro",
    name:            "Pro",
    description:     "Para usuarios intensivos",
    priceUSD:        12.99,
    priceCLP:        12900,
    maxPages:        2000,
    maxVoiceSeconds: 3 * 60 * 60,   // 3 horas
    maxNotebooks:    1,
    highlighted:     true,
    features: [
      "2.000 páginas por cuaderno",
      "3 horas de notas de voz",
      "Temas premium exclusivos",
      "Exportar en alta resolución",
      "Soporte prioritario",
      "Todo lo del plan Starter",
    ],
  },
  business: {
    id:              "business",
    name:            "Business",
    description:     "Sin límites",
    priceUSD:        29.99,
    priceCLP:        29900,
    maxPages:        -1,
    maxVoiceSeconds: 15 * 60 * 60,  // 15 horas
    maxNotebooks:    -1,
    features: [
      "Páginas ilimitadas",
      "15 horas de notas de voz",
      "API access (próximamente)",
      "Múltiples cuadernos",
      "Respaldo automático",
      "Todo lo del plan Pro",
    ],
  },
};

export const PLAN_LIST: Plan[] = Object.values(PLANS);

/** Returns true if the user can create another notebook */
export function canCreateNotebook(plan: PlanId, currentNotebooks: number): boolean {
  const p = PLANS[plan];
  return p.maxNotebooks === -1 || currentNotebooks < p.maxNotebooks;
}

/** Returns true if the user can add more pages */
export function canAddPage(plan: PlanId, currentPages: number): boolean {
  const p = PLANS[plan];
  return p.maxPages === -1 || currentPages < p.maxPages;
}

/** Returns true if the user can record more voice seconds */
export function canAddVoice(plan: PlanId, currentSeconds: number, addSeconds: number): boolean {
  const p = PLANS[plan];
  if (p.maxVoiceSeconds === 0) return false;
  if (p.maxVoiceSeconds === -1) return true;
  return currentSeconds + addSeconds <= p.maxVoiceSeconds;
}

/** Human-readable page limit */
export function pageLimitLabel(plan: PlanId): string {
  const p = PLANS[plan];
  return p.maxPages === -1 ? "Ilimitadas" : `${p.maxPages.toLocaleString()}`;
}

/** Human-readable voice limit */
export function voiceLimitLabel(plan: PlanId): string {
  const p = PLANS[plan];
  if (p.maxVoiceSeconds === 0) return "No incluido";
  if (p.maxVoiceSeconds === -1) return "Ilimitado";
  const mins = p.maxVoiceSeconds / 60;
  return mins >= 60 ? `${mins / 60}h` : `${mins} min`;
}
