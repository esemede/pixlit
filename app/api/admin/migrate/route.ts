// TEMPORARY — delete after migration runs
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MIGRATION_SECRET = "pixlit-migrate-002-shares";

const SQL = `
CREATE TABLE IF NOT EXISTS notebook_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id         UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email   TEXT NOT NULL,
  permission          TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notebook_id, shared_with_email)
);

CREATE INDEX IF NOT EXISTS idx_notebook_shares_notebook_id ON notebook_shares(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_shares_email       ON notebook_shares(shared_with_email);

ALTER TABLE notebook_shares ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notebook_shares' AND policyname = 'owner_manage_shares'
  ) THEN
    CREATE POLICY "owner_manage_shares" ON notebook_shares
      FOR ALL
      USING  (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notebook_shares' AND policyname = 'invitee_read_share'
  ) THEN
    CREATE POLICY "invitee_read_share" ON notebook_shares
      FOR SELECT
      USING (
        shared_with_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== MIGRATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Missing env" }, { status: 500 });

  // Use the Supabase REST SQL endpoint (requires service_role)
  const res = await fetch(`${url}/rest/v1/sql`, {
    method:  "POST",
    headers: {
      "apikey":        key,
      "Authorization": `Bearer ${key}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ query: SQL }),
  });

  const body = await res.text();
  const html = `<!DOCTYPE html><html><body style="font-family:monospace;padding:2em;background:#111;color:#eee">
<h2>Migration 002_notebook_shares</h2>
<p>HTTP Status: <strong>${res.status}</strong></p>
<pre style="background:#222;padding:1em;border-radius:8px;white-space:pre-wrap">${body.replace(/</g,"&lt;")}</pre>
</body></html>`;
  return new Response(html, {
    status: res.ok ? 200 : 500,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
