import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/payments/stripe";

/** POST /api/billing/portal — Stripe customer portal */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  try {
    const session = await createPortalSession(user.id, `${appUrl}/account`);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "portal failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
