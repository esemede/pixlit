-- ── notebook_shares: Comparte un cuaderno con otros usuarios por email ──────

CREATE TABLE IF NOT EXISTS notebook_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id         UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email   TEXT NOT NULL,
  permission          TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (notebook_id, shared_with_email)
);

-- Índices para las queries frecuentes
CREATE INDEX IF NOT EXISTS idx_notebook_shares_notebook_id ON notebook_shares(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_shares_email       ON notebook_shares(shared_with_email);

-- RLS
ALTER TABLE notebook_shares ENABLE ROW LEVEL SECURITY;

-- El owner puede ver/insertar/eliminar sus propias invitaciones
CREATE POLICY "owner_manage_shares" ON notebook_shares
  FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- El invitado puede ver la invitación que le corresponde
-- (para que el front pueda verificar acceso)
CREATE POLICY "invitee_read_share" ON notebook_shares
  FOR SELECT
  USING (
    shared_with_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
