# Compartir cuadernos con permisos reales — Design

## Problema

Hoy `ShareModal.copyLink()` copia `${origin}/tools/notebook` — un link genérico sin id de cuaderno. Además, aunque la tabla `notebook_shares` ya registra colaboradores por email con permiso `view`/`edit`, **ninguna ruta API ni policy RLS la consulta**: todo el acceso (`notebooks`, `notebook_pages`, `voice_notes`) está hardcodeado a `user_id = auth.uid()` (dueño). Resultado: compartir un cuaderno hoy no le da acceso a nadie.

## Alcance

Solo el subsistema de compartir/permisos. Canvas infinito y herramienta de selección/mover son specs separados.

## Diseño

### 1. Rutas

- `app/tools/notebook/[id]/page.tsx` — ruta dinámica; carga `NotebookClient` con `initialNotebookId={id}`.
- `app/tools/notebook/page.tsx` (sin id) — redirige server-side al primer cuaderno propio del usuario (o a `/tools/notebook/new` si no tiene ninguno aún).
- Sin sesión → redirect a `/auth/login?redirectTo=/tools/notebook/<id>`.

### 2. Helper de acceso — `lib/notebookAccess.ts`

```ts
type Role = "owner" | "edit" | "view" | null;

async function resolveNotebookAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  notebookId: string,
): Promise<{ role: Role; ownerId: string | null }>
```

Lógica: si `notebooks.user_id === userId` → `owner`. Si no, busca fila en `notebook_shares` con `notebook_id` + `shared_with_email = userEmail` → `role = permission` (`view`|`edit`). Si no hay fila → `role = null`.

Todas las rutas API bajo `app/api/notebooks/[id]/**` usan este helper en vez de `.eq("user_id", user.id)`:

| Ruta | Requiere |
|---|---|
| `GET /api/notebooks/[id]` (nueva, para cargar metadata) | `role != null` |
| `PATCH /api/notebooks/[id]` (rename) | `role === "owner"` |
| `DELETE /api/notebooks/[id]` | `role === "owner"` |
| `GET /api/notebooks/[id]/pages`, `/pages/[num]` | `role != null` |
| `PUT /api/notebooks/[id]/pages/[num]`, `POST /pages`, `DELETE /pages/[num]` | `role ∈ {owner, edit}` |
| `GET/POST/DELETE /api/notebooks/[id]/share*` | `role === "owner"` |
| `GET /api/notebooks/[id]/export` | `role != null` |

Límite de páginas al crear (`POST /pages`): se consulta el plan de `ownerId` (dueño del cuaderno), no de quien hace la request.

### 3. RLS (Supabase)

Nueva migración `003_notebook_shares_access.sql`:

- `notebooks`: agrega policy `SELECT` para `shared_with_email` match vía subquery a `notebook_shares` + `auth.users`.
- `notebook_pages`: agrega policy `SELECT` igual (para cualquier rol) y policy `INSERT/UPDATE/DELETE` solo si `permission = 'edit'`.
- `voice_notes`: igual que `notebook_pages`, ligado a `page_id → notebook_pages.notebook_id`.

Estas policies son la defensa en profundidad; las rutas API además ya no confían en RLS pura porque usan `createClient()` con contexto de usuario (no service role), así que RLS aplica automáticamente — deben quedar coherentes con el helper de arriba.

### 4. Frontend

- `useNotebook.ts`: acepta `initialNotebookId`. Agrega `refreshSharedNotebooks()` (`GET /api/notebooks/shared` — nueva ruta que lista `notebook_shares` donde `shared_with_email = user.email`, con join a `notebooks.name` y `profiles.email` del dueño). Expone `role: Role` del cuaderno activo.
- `NotebooksPanel.tsx`: agrega sección "Compartidos conmigo" debajo de "Mis cuadernos", mostrando nombre del dueño + badge de permiso.
- `NotebookClient.tsx`: cuando `role === "view"` — deshabilita herramientas de dibujo/borrado, oculta botones de exportar (PNG/PDF/JSON) y el botón de compartir; muestra badge "Solo lectura". Cuando `role === "edit"` — todo el canvas activo, pero sin acceso al `ShareModal` (solo el dueño gestiona colaboradores).
- `ShareModal.copyLink()`: cambia a `${origin}/tools/notebook/${notebookId}`.

### 5. Invitación a no-usuarios

Sin cambios de infraestructura: `notebook_shares.shared_with_email` ya no requiere que el usuario exista. Cuando esa persona se registra con ese email, `resolveNotebookAccess` la reconoce automáticamente. No se envía email de invitación (fuera de alcance).

## Fuera de alcance

- Envío de email de invitación.
- Expiración de links o de invitaciones.
- Roles más granulares que view/edit (p.ej. comentar).
- Auditoría de accesos.

## Testing

- RLS: verificar con service-role tests que un usuario sin fila en `notebook_shares` no puede leer `notebook_pages` de otro.
- API: casos view intenta `PUT` página → 403; edit puede; owner puede todo incluyendo `share`.
- E2E manual: invitar por email → login con ese email → ve el cuaderno; revocar acceso → dejar de ver.
