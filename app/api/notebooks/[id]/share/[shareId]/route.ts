import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; shareId: string }> };

/** DELETE /api/notebooks/:id/share/:shareId — revoke access */
export async function DELETE(_req: Request, { params }: Params) {
  const { id, shareId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only the notebook owner can revoke
  const { error } = await supabase
    .from("notebook_shares")
    .delete()
    .eq("id", shareId)
    .eq("notebook_id", id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
