-- ── Shared access via notebook_shares ───────────────────────────────

-- notebooks: shared users can SELECT (not write — rename/delete stay owner-only)
create policy "notebooks: shared read" on notebooks
  for select using (
    exists (
      select 1 from notebook_shares s
      join auth.users u on u.id = auth.uid()
      where s.notebook_id = notebooks.id
        and s.shared_with_email = u.email
    )
  );

-- notebook_pages: shared users can SELECT always, and INSERT/UPDATE/DELETE only with permission='edit'
create policy "pages: shared read" on notebook_pages
  for select using (
    exists (
      select 1 from notebook_shares s
      join auth.users u on u.id = auth.uid()
      where s.notebook_id = notebook_pages.notebook_id
        and s.shared_with_email = u.email
    )
  );

create policy "pages: shared edit" on notebook_pages
  for all using (
    exists (
      select 1 from notebook_shares s
      join auth.users u on u.id = auth.uid()
      where s.notebook_id = notebook_pages.notebook_id
        and s.shared_with_email = u.email
        and s.permission = 'edit'
    )
  ) with check (
    exists (
      select 1 from notebook_shares s
      join auth.users u on u.id = auth.uid()
      where s.notebook_id = notebook_pages.notebook_id
        and s.shared_with_email = u.email
        and s.permission = 'edit'
    )
  );

-- voice_notes: same rule, joined through the page's notebook_id
create policy "voice_notes: shared read" on voice_notes
  for select using (
    exists (
      select 1 from notebook_pages p
      join notebook_shares s on s.notebook_id = p.notebook_id
      join auth.users u on u.id = auth.uid()
      where p.id = voice_notes.page_id
        and s.shared_with_email = u.email
    )
  );

create policy "voice_notes: shared edit" on voice_notes
  for all using (
    exists (
      select 1 from notebook_pages p
      join notebook_shares s on s.notebook_id = p.notebook_id
      join auth.users u on u.id = auth.uid()
      where p.id = voice_notes.page_id
        and s.shared_with_email = u.email
        and s.permission = 'edit'
    )
  ) with check (
    exists (
      select 1 from notebook_pages p
      join notebook_shares s on s.notebook_id = p.notebook_id
      join auth.users u on u.id = auth.uid()
      where p.id = voice_notes.page_id
        and s.shared_with_email = u.email
        and s.permission = 'edit'
    )
  );
