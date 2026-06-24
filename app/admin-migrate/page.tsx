// TEMPORARY PAGE — delete after migration runs
export const dynamic = "force-dynamic";
export const runtime = "edge";

const SECRET = "pixlit-migrate-002-shares";

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
CREATE INDEX IF NOT EXISTS idx_notebook_shares_email ON notebook_shares(shared_with_email);
ALTER TABLE notebook_shares ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notebook_shares' AND policyname='owner_manage_shares') THEN
    CREATE POLICY "owner_manage_shares" ON notebook_shares FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notebook_shares' AND policyname='invitee_read_share') THEN
    CREATE POLICY "invitee_read_share" ON notebook_shares FOR SELECT USING (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;
END $$;
`;

export default async function MigratePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const secret = sp?.secret ?? "";

  if (secret !== SECRET) {
    return (
      <html><body style={{ fontFamily: "monospace", background: "#111", color: "#ef4444", padding: "2em" }}>
        <h2>⛔ Unauthorized</h2>
      </body></html>
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let status = 0;
  let body = "";
  let ok = false;

  try {
    const res = await fetch(`${url}/rest/v1/sql`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    });
    status = res.status;
    body = await res.text();
    ok = res.ok;
  } catch (e) {
    body = String(e);
    status = 500;
  }

  const color = ok ? "#22c55e" : "#ef4444";

  return (
    <html>
      <body style={{ fontFamily: "monospace", background: "#0f0f0f", color: "#e5e5e5", padding: "2em" }}>
        <h2>Migration 002_notebook_shares</h2>
        <p>Status: <strong style={{ color }}>{status} {ok ? "✅ OK" : "❌ Error"}</strong></p>
        <p>Supabase URL: {url ? url.slice(0, 40) + "…" : "⚠️ missing"}</p>
        <p>Service Key: {key ? "✓ present (" + key.slice(0, 12) + "…)" : "⚠️ missing"}</p>
        <pre style={{ background: "#1a1a1a", padding: "1em", borderRadius: "8px", whiteSpace: "pre-wrap", color: ok ? "#86efac" : "#fca5a5" }}>
          {body || "(empty response)"}
        </pre>
      </body>
    </html>
  );
}
