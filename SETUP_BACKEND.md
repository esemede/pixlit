# Setup Backend — Pixlit

## 1. Instalar dependencias

```bash
pnpm install
```

Las nuevas dependencias son:
- `@supabase/supabase-js` + `@supabase/ssr` — cliente y auth
- `stripe` — SDK de Stripe

---

## 2. Completar `.env.local`

El archivo ya tiene `SUPABASE_SERVICE_ROLE_KEY` (tu `SB_SK`).  
Falta completar con los datos de tu proyecto Supabase:

```
# Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://TU_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

---

## 3. Ejecutar migración SQL en Supabase

Copia el contenido de `supabase/migrations/001_initial.sql` y pégalo en:  
**Supabase Dashboard → SQL Editor → New query → Run**

Esto crea:
- `profiles` — usuarios con plan, tema, voz usada
- `notebooks` + `notebook_pages` — cuadernos y páginas
- `voice_notes` — metadatos de audios
- `subscriptions` + `payment_events` — historial de pagos
- Storage bucket `voice-notes` (privado)
- RLS policies en todas las tablas

---

## 4. Configurar Stripe (para aceptar pagos con tarjeta)

1. Crea cuenta en [stripe.com](https://stripe.com)
2. Crea 3 productos con suscripción mensual:
   - **Starter** → USD $4.99/mes
   - **Pro** → USD $12.99/mes  
   - **Business** → USD $29.99/mes
3. Copia los **Price IDs** a `.env.local`:
   ```
   STRIPE_PRICE_STARTER=price_xxx
   STRIPE_PRICE_PRO=price_xxx
   STRIPE_PRICE_BUSINESS=price_xxx
   ```
4. Webhook URL: `https://TU_DOMINIO/api/webhooks/stripe`  
   Eventos a escuchar:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

---

## 5. Configurar MercadoPago (opcional)

1. Crea cuenta en [mercadopago.com.co/developers](https://www.mercadopago.com.co/developers)
2. Copia el **Access Token** a `.env.local`
3. Webhook: `https://TU_DOMINIO/api/webhooks/mercadopago`

---

## 6. Configurar PayPal (opcional)

1. Crea app en [developer.paypal.com](https://developer.paypal.com)
2. Crea 3 **Billing Plans** vía API o dashboard
3. Copia Client ID, Secret y Plan IDs a `.env.local`
4. Webhook: `https://TU_DOMINIO/api/webhooks/paypal`

---

## 7. Configurar Khipu (Chile, pago anual — opcional)

1. Crea cuenta en [khipu.com](https://khipu.com/merchant/profile)
2. Copia Receiver ID y Secret a `.env.local`
3. Webhook: `https://TU_DOMINIO/api/webhooks/khipu`

---

## 8. Correr en desarrollo

```bash
pnpm dev
```

Para testear webhooks de Stripe localmente:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Estructura de archivos creados

```
lib/
  supabase/client.ts       # Browser client
  supabase/server.ts       # Server + Admin client
  supabase/types.ts        # TypeScript types (auto-gen reemplaza esto)
  plans.ts                 # Definición de planes y límites
  useNotebook.ts           # Hook de persistencia para el notebook
  payments/
    stripe.ts              # Checkout, portal, sync webhook
    mercadopago.ts         # Preapproval, sync
    paypal.ts              # Subscriptions, verify, sync
    khipu.ts               # Payment, verify signature

middleware.ts              # Session refresh + route protection

app/
  auth/login/              # Formulario login + magic link
  auth/signup/             # Registro
  auth/callback/           # OAuth/magic link callback
  auth/signout/            # POST logout
  pricing/                 # Página de planes con selector de proveedor
  account/                 # Perfil, uso, gestión de plan y tema

  api/
    notebooks/             # CRUD notebooks
    notebooks/[id]/pages/  # CRUD páginas
    voice-notes/           # Upload y URLs firmadas de audio
    billing/plans/         # Planes disponibles + plan actual
    billing/checkout/      # Crear sesión de pago (4 proveedores)
    billing/portal/        # Portal Stripe
    webhooks/stripe/       # Webhook Stripe
    webhooks/mercadopago/  # Webhook MercadoPago
    webhooks/paypal/       # Webhook PayPal
    webhooks/khipu/        # Webhook Khipu

supabase/
  migrations/001_initial.sql  # Schema completo
```

---

## Planes configurados

| Plan      | USD/mes | CLP/mes | Páginas   | Voz         |
|-----------|---------|---------|-----------|-------------|
| Gratis    | $0      | $0      | 100       | No          |
| Starter   | $4.99   | $4.900  | 500       | 30 min      |
| Pro ⭐    | $12.99  | $12.900 | 2.000     | 3 horas     |
| Business  | $29.99  | $29.900 | Ilimitado | 15 horas    |

Khipu cobra **precio anual con 15% descuento** (10 meses en vez de 12).
