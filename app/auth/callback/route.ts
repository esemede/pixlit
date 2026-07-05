import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/tools/notebook";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (user?.email && serviceRoleKey) {
        const metadata = user.user_metadata ?? {};
        const displayName = metadataString(metadata, "full_name")
          ?? metadataString(metadata, "name")
          ?? user.email.split("@")[0];
        const avatarUrl = metadataString(metadata, "avatar_url")
          ?? metadataString(metadata, "picture");

        const admin = createAdminClient();
        await admin
          .from("profiles")
          .upsert({
            id: user.id,
            email: user.email,
            display_name: displayName,
            avatar_url: avatarUrl,
          }, { onConflict: "id", ignoreDuplicates: true });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}
