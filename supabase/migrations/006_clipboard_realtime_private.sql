-- Portapapeles P2P: canal Realtime privado por usuario.
-- Solo el dueño (auth.uid()) puede suscribirse y emitir en el topic
-- `clipboard:<uid>`. El contenido ya viaja cifrado de extremo a extremo; esto
-- impide además que otros usuarios autenticados (o anónimos) espíen la
-- señalización o la inunden.
-- Las políticas son aditivas y acotadas a este topic: no afectan a otros canales.

drop policy if exists "clipboard_realtime_select_own" on realtime.messages;
drop policy if exists "clipboard_realtime_insert_own" on realtime.messages;

create policy "clipboard_realtime_select_own"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'clipboard:' || (select auth.uid())::text
  );

create policy "clipboard_realtime_insert_own"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'clipboard:' || (select auth.uid())::text
  );
