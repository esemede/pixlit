import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/** GET /api/voice-notes/:id/url — get a signed URL for playback */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: vn, error } = await supabase
    .from("voice_notes")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !vn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error: signErr } = await supabase.storage
    .from("voice-notes")
    .createSignedUrl(vn.storage_path, 3600); // 1 hour

  if (signErr) return NextResponse.json({ error: signErr.message }, { status: 500 });
  return NextResponse.json({ url: signed.signedUrl });
}

/** DELETE /api/voice-notes/:id */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: vn } = await supabase
    .from("voice_notes")
    .select("storage_path, duration_seconds")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!vn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from storage
  await supabase.storage.from("voice-notes").remove([vn.storage_path]);

  // Delete record
  await supabase.from("voice_notes").delete().eq("id", id);

  // Update quota
  const { data: profile } = await supabase
    .from("profiles").select("voice_seconds_used").eq("id", user.id).single();
  const newUsed = Math.max(0, (profile?.voice_seconds_used ?? 0) - vn.duration_seconds);
  await supabase.from("profiles").update({ voice_seconds_used: newUsed }).eq("id", user.id);

  return NextResponse.json({ deleted: true });
}
