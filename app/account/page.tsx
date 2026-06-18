import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import AccountClient from "./AccountClient";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, sub_status, sub_provider, sub_current_period_end, voice_seconds_used, notebook_theme, display_name")
    .eq("id", user.id)
    .single();

  // Voice stats
  const plan        = (profile?.plan ?? "free") as keyof typeof PLANS;
  const planCfg     = PLANS[plan];
  const usedSec     = profile?.voice_seconds_used ?? 0;
  const maxSec      = planCfg.maxVoiceSeconds;
  const voicePct    = maxSec > 0 ? Math.min(100, (usedSec / maxSec) * 100) : 0;

  // Pages stats
  const { count: pageCount } = await supabase
    .from("notebook_pages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <AccountClient
      email={user.email ?? ""}
      displayName={profile?.display_name ?? ""}
      plan={plan}
      planCfg={planCfg}
      subStatus={profile?.sub_status ?? null}
      subProvider={profile?.sub_provider ?? null}
      subPeriodEnd={profile?.sub_current_period_end ?? null}
      voiceUsedSec={usedSec}
      voiceMaxSec={maxSec}
      voicePct={voicePct}
      pageCount={pageCount ?? 0}
      notebookTheme={profile?.notebook_theme ?? null}
    />
  );
}
