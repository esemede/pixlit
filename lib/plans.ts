// ── Subscription Plan Definitions ─────────────────────────────────────────────
// Prices in USD (charged via each payment provider)
// Chilean prices approximate at 1 USD ≈ CLP 970

export type PlanId = "free" | "starter" | "pro" | "business";

const MB = 1024 * 1024;
const GB = 1024 * MB;

export interface Plan {
  id:                PlanId;
  name:              string;
  description:       string;
  priceUSD:          number;       // monthly, 0 = free
  priceCLP:          number;       // Chilean pesos
  maxPages:          number;       // -1 = unlimited
  maxVoiceSeconds:   number;       // -1 = unlimited, 0 = none
  maxNotebooks:      number;       // -1 = unlimited
  maxStorageBytes:   number;       // total server-side quota across pages, voice notes, files, etc.
  features:          string[];
  highlighted?:      boolean;
}

export interface PlanEntitlements {
  plan:                 PlanId | "anonymous";
  localOnly:            boolean;
  canUseServerStorage:  boolean;
  canShareViaWeb:       boolean;
  maxPages:             number;
  maxVoiceSeconds:      number;
  maxNotebooks:         number;
  maxStorageBytes:      number;
}

export const ANONYMOUS_ENTITLEMENTS: PlanEntitlements = {
  plan:                "anonymous",
  localOnly:           true,
  canUseServerStorage: false,
  canShareViaWeb:      false,
  maxPages:            -1,
  maxVoiceSeconds:     0,
  maxNotebooks:        1,
  maxStorageBytes:     0,
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id:              "free",
    name:            "Gratis con cuenta",
    description:     "Para uso personal liviano con sincronización web",
    priceUSD:        0,
    priceCLP:        0,
    maxPages:        100,
    maxVoiceSeconds: 10 * 60,       // 10 minutos dentro de la cuota de almacenamiento
    maxNotebooks:    5,
    maxStorageBytes: 50 * MB,
    features: [
      "Hasta 5 notas sincronizadas",
      "50 MB de almacenamiento total",
      "10 min de notas de voz",
      "Todas las herramientas de dibujo",
      "Exportar PNG y PDF",
      "Compartir vía web con login",
    ],
  },
  starter: {
    id:              "starter",
    name:            "Premium",
    description:     "Notas ilimitadas dentro de una cuota acordada",
    priceUSD:        5.00,
    priceCLP:        4850,
    maxPages:        500,
    maxVoiceSeconds: 30 * 60,       // 30 minutos
    maxNotebooks:    -1,
    maxStorageBytes: 1 * GB,
    features: [
      "Notas ilimitadas",
      "1 GB de almacenamiento total",
      "500 páginas por nota",
      "30 min de notas de voz",
      "Temas de fondo personalizados",
      "Sincronización entre dispositivos",
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
    maxNotebooks:    -1,
    maxStorageBytes: 5 * GB,
    highlighted:     true,
    features: [
      "Notas ilimitadas",
      "5 GB de almacenamiento total",
      "2.000 páginas por nota",
      "3 horas de notas de voz",
      "Temas premium exclusivos",
      "Exportar en alta resolución",
      "Soporte prioritario",
    ],
  },
  business: {
    id:              "business",
    name:            "Business",
    description:     "Más almacenamiento para equipos",
    priceUSD:        29.99,
    priceCLP:        29900,
    maxPages:        -1,
    maxVoiceSeconds: 15 * 60 * 60,  // 15 horas
    maxNotebooks:    -1,
    maxStorageBytes: 20 * GB,
    features: [
      "Notas y páginas ilimitadas",
      "20 GB de almacenamiento total",
      "15 horas de notas de voz",
      "API access (próximamente)",
      "Múltiples cuadernos",
      "Respaldo automático",
      "Todo lo del plan Pro",
    ],
  },
};

export const PLAN_LIST: Plan[] = Object.values(PLANS);

export function getAnonymousEntitlements(): PlanEntitlements {
  return ANONYMOUS_ENTITLEMENTS;
}

export function getPlanEntitlements(plan: PlanId): PlanEntitlements {
  const p = PLANS[plan];
  return {
    plan,
    localOnly:           false,
    canUseServerStorage: true,
    canShareViaWeb:      true,
    maxPages:            p.maxPages,
    maxVoiceSeconds:     p.maxVoiceSeconds,
    maxNotebooks:        p.maxNotebooks,
    maxStorageBytes:     p.maxStorageBytes,
  };
}

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

/** Returns true if the requested bytes fit inside the plan storage quota. */
export function canFitStorage(plan: PlanId, currentBytes: number, addBytes: number): boolean {
  const p = PLANS[plan];
  return currentBytes + addBytes <= p.maxStorageBytes;
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

/** Human-readable storage limit */
export function storageLimitLabel(plan: PlanId): string {
  const bytes = PLANS[plan].maxStorageBytes;
  if (bytes >= GB && bytes % GB === 0) return `${bytes / GB} GB`;
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  return `${bytes.toLocaleString()} bytes`;
}
