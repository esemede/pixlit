import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

/** GET /api/voice-notes?page_id=xxx — list voice notes for a page (or all) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("page_id");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("voice_notes")
    .select("id, page_id, label, duration_seconds, file_size_bytes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (pageId) query = query.eq("page_id", pageId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ voice_notes: data });
}

/** POST /api/voice-notes — upload an audio file */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan allows voice notes
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, voice_seconds_used")
    .eq("id", user.id)
    .single();

  const plan    = (profile?.plan ?? "free") as keyof typeof PLANS;
  const planCfg = PLANS[plan];

  if (planCfg.maxVoiceSeconds === 0) {
    return NextResponse.json(
      { error: "Voice notes are not available on the free plan. Upgrade to unlock." },
      { status: 403 },
    );
  }

  const formData    = await request.formData();
  const file        = formData.get("audio") as File | null;
  const pageId      = formData.get("page_id") as string | null;
  const label       = formData.get("label") as string | null;
  const durationSec = Number(formData.get("duration_seconds") ?? 0);

  if (!file) return NextResponse.json({ error: "audio file required" }, { status: 400 });

  // Check voice quota
  const usedSec = profile?.voice_seconds_used ?? 0;
  if (
    planCfg.maxVoiceSeconds !== -1 &&
    usedSec + durationSec > planCfg.maxVoiceSeconds
  ) {
    return NextResponse.json(
      { error: `Voice quota exceeded. Used: ${Math.round(usedSec / 60)} min / ${planCfg.maxVoiceSeconds / 60} min.` },
      { status: 403 },
    );
  }

  // Upload to Supabase Storage
  const ext          = file.name.split(".").pop() ?? "webm";
  const storagePath  = `${user.id}/${Date.now()}.${ext}`;
  const arrayBuffer  = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("voice-notes")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Save record
  const { data: vn, error: dbError } = await supabase
    .from("voice_notes")
    .insert({
      user_id:          user.id,
      page_id:          pageId ?? null,
      storage_path:     storagePath,
      duration_seconds: durationSec,
      file_size_bytes:  file.size,
      label:            label ?? null,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Update voice_seconds_used on profile
  await supabase
    .from("profiles")
    .update({ voice_seconds_used: usedSec + durationSec })
    .eq("id", user.id);

  return NextResponse.json({ voice_note: vn }, { status: 201 });
}
