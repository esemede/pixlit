# Notebook Sharing Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make notebook sharing actually work — link carries the notebook id, and access (view/edit/owner) is enforced server-side everywhere instead of hardcoded to the owner.

**Architecture:** One access-resolution helper (`lib/notebookAccess.ts`) used by every API route under `app/api/notebooks/[id]/**`, backed by RLS policies that mirror the same rule. A new dynamic page route carries the notebook id in the URL. Frontend reads the resolved `role` and disables editing/export/share UI for `view`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS + `@supabase/ssr`), TypeScript. No test framework is present in this repo — verification steps below are manual `curl`/SQL checks, matching existing project convention (zero automated tests today).

## Global Constraints

- Link format: `/tools/notebook/<id>` (spec §1).
- No session → redirect to `/auth/login?next=/tools/notebook/<id>` (spec §1).
- `view` role: read-only, no draw, no export (PNG/PDF/JSON), no share management (spec §4).
- `edit` role: full canvas, but cannot manage collaborators (spec §4).
- Page-count plan limit is checked against the notebook **owner's** plan, not the actor's (spec §2).
- Invitations to non-existent users stay pending in `notebook_shares`; no email is sent (spec §5, out of scope).
- Every DB access path (API route AND RLS) must agree on the same rule — RLS is defense in depth, not the only gate.

---

### Task 1: RLS migration for shared access

**Files:**
- Create: `supabase/migrations/003_notebook_shares_access.sql`

**Interfaces:**
- Produces: RLS policies on `notebooks`, `notebook_pages`, `voice_notes` that allow a row when `auth.uid()` matches a `notebook_shares.shared_with_email` (via `auth.users.email`) for that `notebook_id`, in addition to the existing owner policies.

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply and verify with the Supabase SQL editor (or `supabase db push` against the project)**

Run in the SQL editor as two different test users (A owns a notebook, B has a `notebook_shares` row with `permission='view'`):

```sql
-- as B, should return 1 row (the shared notebook)
select id from notebooks where id = '<notebook-id-owned-by-A>';

-- as B, should raise a permission-denied / affect 0 rows (view-only, no edit)
update notebook_pages set strokes = '[]' where notebook_id = '<notebook-id-owned-by-A>' and page_number = 1;
```

Expected: first query returns the row, second updates 0 rows (blocked by RLS).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_notebook_shares_access.sql
git commit -m "feat: RLS policies for shared notebook access"
```

---

### Task 2: Access-resolution helper

**Files:**
- Create: `lib/notebookAccess.ts`

**Interfaces:**
- Produces:
  ```ts
  export type NotebookRole = "owner" | "edit" | "view" | null;
  export interface NotebookAccess { role: NotebookRole; ownerId: string | null }
  export async function resolveNotebookAccess(
    supabase: SupabaseClient,
    userId: string,
    userEmail: string,
    notebookId: string,
  ): Promise<NotebookAccess>
  ```
- Consumes: an already-authenticated Supabase server client (from `lib/supabase/server.ts`).

- [ ] **Step 1: Implement the helper**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotebookRole = "owner" | "edit" | "view" | null;
export interface NotebookAccess { role: NotebookRole; ownerId: string | null }

/** Resolves what role (if any) a user has on a notebook: owner, edit, view, or null. */
export async function resolveNotebookAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  notebookId: string,
): Promise<NotebookAccess> {
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, user_id")
    .eq("id", notebookId)
    .single();

  if (!notebook) return { role: null, ownerId: null };
  if (notebook.user_id === userId) return { role: "owner", ownerId: notebook.user_id };

  const { data: share } = await supabase
    .from("notebook_shares")
    .select("permission")
    .eq("notebook_id", notebookId)
    .eq("shared_with_email", userEmail)
    .single();

  if (!share) return { role: null, ownerId: notebook.user_id };
  return { role: share.permission as "view" | "edit", ownerId: notebook.user_id };
}

export function canWrite(role: NotebookRole): boolean {
  return role === "owner" || role === "edit";
}
```

- [ ] **Step 2: Manual verification**

```bash
cd /Users/semoreno/Projects/pixlit && npx tsc --noEmit
```

Expected: no type errors involving `notebookAccess.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/notebookAccess.ts
git commit -m "feat: add resolveNotebookAccess helper"
```

---

### Task 3: Rewrite notebook + pages API routes to use the helper

**Files:**
- Modify: `app/api/notebooks/[id]/route.ts`
- Modify: `app/api/notebooks/[id]/pages/route.ts`
- Modify: `app/api/notebooks/[id]/pages/[num]/route.ts`
- Modify: `app/api/notebooks/[id]/export/route.ts`

**Interfaces:**
- Consumes: `resolveNotebookAccess`, `canWrite` from Task 2 (`@/lib/notebookAccess`).

- [ ] **Step 1: Add `GET` and gate `PATCH`/`DELETE` in `app/api/notebooks/[id]/route.ts`**

Replace the file contents with:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveNotebookAccess } from "@/lib/notebookAccess";

type Params = { params: Promise<{ id: string }> };

/** GET /api/notebooks/:id — metadata + resolved role for the current user */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, name, created_at, updated_at")
    .eq("id", id)
    .single();

  return NextResponse.json({ notebook, role: access.role });
}

/** PATCH /api/notebooks/:id — rename (owner only) */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (access.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = (body.name as string)?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { error } = await supabase.from("notebooks").update({ name }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/notebooks/:id — delete notebook and all pages (owner only) */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (access.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await supabase.from("notebook_pages").delete().eq("notebook_id", id);
  const { error } = await supabase.from("notebooks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Gate `app/api/notebooks/[id]/pages/route.ts`**

Replace `.eq("user_id", user.id)` ownership checks with role checks. Full file:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { resolveNotebookAccess, canWrite } from "@/lib/notebookAccess";

type Params = { params: Promise<{ id: string }> };

/** GET /api/notebooks/:id/pages — list page metadata (any role) */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("notebook_pages")
    .select("id, page_number, created_at, updated_at")
    .eq("notebook_id", id)
    .order("page_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data });
}

/** POST /api/notebooks/:id/pages — add a blank page (owner or edit; limit from owner's plan) */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!canWrite(access.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", access.ownerId!)
    .single();

  const plan  = profile?.plan ?? "free";
  const limit = PLANS[plan as keyof typeof PLANS].maxPages;

  const { count } = await supabase
    .from("notebook_pages")
    .select("id", { count: "exact", head: true })
    .eq("notebook_id", id);

  if (limit !== -1 && (count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Plan limit reached. Upgrade to add more pages.`, plan, limit },
      { status: 403 },
    );
  }

  const nextNum = (count ?? 0) + 1;
  const { data, error } = await supabase
    .from("notebook_pages")
    .insert({ notebook_id: id, user_id: access.ownerId!, page_number: nextNum, strokes: [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data }, { status: 201 });
}
```

- [ ] **Step 3: Gate `app/api/notebooks/[id]/pages/[num]/route.ts`**

Full file:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveNotebookAccess, canWrite } from "@/lib/notebookAccess";

type Params = { params: Promise<{ id: string; num: string }> };

/** GET /api/notebooks/:id/pages/:num — get strokes for a page (any role) */
export async function GET(_req: Request, { params }: Params) {
  const { id, num } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!access.role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("notebook_pages")
    .select("id, page_number, strokes, updated_at")
    .eq("notebook_id", id)
    .eq("page_number", Number(num))
    .single();

  if (error?.code === "PGRST116") {
    return NextResponse.json({ page: null, strokes: [] });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data, strokes: data.strokes ?? [] });
}

/** PUT /api/notebooks/:id/pages/:num — upsert strokes (owner or edit) */
export async function PUT(request: Request, { params }: Params) {
  const { id, num } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!canWrite(access.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.strokes)) {
    return NextResponse.json({ error: "strokes array required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notebook_pages")
    .upsert(
      { notebook_id: id, user_id: access.ownerId!, page_number: Number(num), strokes: body.strokes },
      { onConflict: "notebook_id,page_number" },
    )
    .select("id, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, id: data.id, updated_at: data.updated_at });
}

/** DELETE /api/notebooks/:id/pages/:num — delete page, renumber later pages (owner or edit) */
export async function DELETE(_req: Request, { params }: Params) {
  const { id, num } = await params;
  const pageNum = Number(num);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!canWrite(access.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: delErr } = await supabase
    .from("notebook_pages")
    .delete()
    .eq("notebook_id", id)
    .eq("page_number", pageNum);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const { data: later } = await supabase
    .from("notebook_pages")
    .select("id, page_number")
    .eq("notebook_id", id)
    .gt("page_number", pageNum)
    .order("page_number", { ascending: true });

  if (later && later.length > 0) {
    for (const p of later) {
      await supabase.from("notebook_pages").update({ page_number: p.page_number - 1 }).eq("id", p.id);
    }
  }

  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 4: Gate `app/api/notebooks/[id]/export/route.ts`**

In the `GET` handler, replace the ownership block:

```ts
  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!notebook) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
```

with:

```ts
  const access = await resolveNotebookAccess(supabase, user.id, user.email!, id);
  if (!access.role) return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
```

and add the import at the top: `import { resolveNotebookAccess } from "@/lib/notebookAccess";`

Then find the subsequent `.eq("user_id", user.id)` on the `notebook_pages` query in the same file and remove it (the RLS policy from Task 1 plus the role check above already scope it correctly).

- [ ] **Step 5: Typecheck**

```bash
cd /Users/semoreno/Projects/pixlit && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual verification (requires a running dev server + two test accounts A/B, B invited with `view`)**

```bash
# as B's session cookie, GET a page from A's notebook — expect 200
curl -s -b "<B-cookie>" http://localhost:3000/api/notebooks/<nb-id>/pages/1

# as B's session cookie, PUT strokes — expect 403 (view-only)
curl -s -b "<B-cookie>" -X PUT -H "Content-Type: application/json" \
  -d '{"strokes":[]}' http://localhost:3000/api/notebooks/<nb-id>/pages/1
```

Expected: first call `200`, second call `403 {"error":"Forbidden"}`.

- [ ] **Step 7: Commit**

```bash
git add app/api/notebooks
git commit -m "feat: enforce role-based access on notebook API routes"
```

---

### Task 4: "Shared with me" listing route

**Files:**
- Create: `app/api/notebooks/shared/route.ts`

**Interfaces:**
- Produces: `GET /api/notebooks/shared` → `{ notebooks: { id, name, owner_email, permission }[] }`

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/notebooks/shared — notebooks other people shared with the current user */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notebook_shares")
    .select("permission, notebook:notebooks(id, name), owner:profiles!notebook_shares_owner_id_fkey(email)")
    .eq("shared_with_email", user.email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notebooks = (data ?? [])
    .filter(row => row.notebook)
    .map(row => ({
      id: (row.notebook as unknown as { id: string; name: string }).id,
      name: (row.notebook as unknown as { id: string; name: string }).name,
      owner_email: (row.owner as unknown as { email: string } | null)?.email ?? "",
      permission: row.permission,
    }));

  return NextResponse.json({ notebooks });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/semoreno/Projects/pixlit && npx tsc --noEmit
```

Expected: no errors. If the `notebook_shares_owner_id_fkey` constraint name differs, check it with:

```bash
grep -n "owner_id" supabase/migrations/002_notebook_shares.sql
```

(It references `auth.users(id)`, so adjust the embed to `owner:profiles!inner(email)` joined manually if Supabase can't infer the FK to `profiles` — verify by hitting the route and checking for a Postgrest embedding error in the response.)

- [ ] **Step 3: Manual verification**

```bash
curl -s -b "<B-cookie>" http://localhost:3000/api/notebooks/shared
```

Expected: `200` with the notebook A shared with B, including `permission: "view"`.

- [ ] **Step 4: Commit**

```bash
git add app/api/notebooks/shared
git commit -m "feat: add GET /api/notebooks/shared endpoint"
```

---

### Task 5: Dynamic notebook route + login redirect

**Files:**
- Create: `app/tools/notebook/[id]/page.tsx`
- Modify: `app/tools/notebook/page.tsx`

**Interfaces:**
- Consumes: `NotebookClient` (existing component), extended in Task 6 to accept `initialNotebookId`.

- [ ] **Step 1: Create the dynamic route**

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotebookClient from "../NotebookClient";

export const metadata: Metadata = {
  title: "Cuaderno de Notas — Pixlit",
  description: "Cuaderno de notas digital con reconocimiento de figuras, stylus, múltiples páginas y exportación PNG/PDF.",
};

type Params = { params: Promise<{ id: string }> };

export default async function NotebookByIdPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/auth/login?next=/tools/notebook/${id}`);

  return <NotebookClient initialNotebookId={id} />;
}
```

- [ ] **Step 2: Redirect the id-less route to the user's first notebook**

Replace `app/tools/notebook/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NotebookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/tools/notebook");

  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  redirect(notebook ? `/tools/notebook/${notebook.id}` : "/tools/notebook/new");
}
```

Note: `/tools/notebook/new` will 404 for now — every signed-up user gets a default notebook via the `handle_new_notebook` trigger (see `supabase/migrations/001_initial.sql:84-95`), so this branch is a safety net, not the common path. Wiring an actual "create notebook" landing is out of scope for this plan.

- [ ] **Step 3: Typecheck and smoke test**

```bash
cd /Users/semoreno/Projects/pixlit && npx tsc --noEmit && npm run dev
```

Visit `http://localhost:3000/tools/notebook` while logged in — expect a redirect to `/tools/notebook/<your-notebook-id>`.

- [ ] **Step 4: Commit**

```bash
git add app/tools/notebook/page.tsx "app/tools/notebook/[id]"
git commit -m "feat: dynamic /tools/notebook/[id] route with login redirect"
```

---

### Task 6: `useNotebook` accepts an initial id and exposes role

**Files:**
- Modify: `lib/useNotebook.ts`

**Interfaces:**
- Consumes: `GET /api/notebooks/:id` (Task 3, returns `{ notebook, role }`), `GET /api/notebooks/shared` (Task 4).
- Produces: `useNotebook({ initialNotebookId?, onLimitReached? })` returns additionally `role: NotebookRole`, `sharedNotebooks: SharedNotebook[]`, `refreshSharedNotebooks(): Promise<void>`.

- [ ] **Step 1: Add the `initialNotebookId` param, `role` state, and shared-notebooks list**

Modify `lib/useNotebook.ts`:

```ts
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotebookRole } from "@/lib/notebookAccess";

interface UseNotebookOptions {
  initialNotebookId?: string;
  onLimitReached?: (plan: string, limit: number) => void;
}

interface SaveState { status: "idle" | "saving" | "saved" | "error"; error?: string }

export interface Notebook {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SharedNotebook {
  id: string;
  name: string;
  owner_email: string;
  permission: "view" | "edit";
}

export function useNotebook({ initialNotebookId, onLimitReached }: UseNotebookOptions = {}) {
  const [notebookId, setNotebookId] = useState<string | null>(initialNotebookId ?? null);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [isAuth,     setIsAuth]     = useState(false);
  const [role,       setRole]       = useState<NotebookRole>(null);
  const [saveState,  setSaveState]  = useState<SaveState>({ status: "idle" });
  const [notebooks,  setNotebooks]  = useState<Notebook[]>([]);
  const [sharedNotebooks, setSharedNotebooks] = useState<SharedNotebook[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshNotebooks = useCallback(async () => {
    const res  = await fetch("/api/notebooks");
    const data = await res.json();
    if (data.notebooks) setNotebooks(data.notebooks);
    return data.notebooks as Notebook[] | undefined;
  }, []);

  const refreshSharedNotebooks = useCallback(async () => {
    const res  = await fetch("/api/notebooks/shared");
    const data = await res.json();
    if (data.notebooks) setSharedNotebooks(data.notebooks);
  }, []);

  // Resolve role whenever the active notebook changes
  useEffect(() => {
    if (!notebookId) { setRole(null); return; }
    fetch(`/api/notebooks/${notebookId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setRole(data?.role ?? null));
  }, [notebookId]);

  // Load auth state + notebooks (own + shared)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setIsAuth(false); return; }
      setIsAuth(true); setUserId(user.id);
      const list = await refreshNotebooks();
      await refreshSharedNotebooks();
      if (!initialNotebookId && list && list.length > 0) setNotebookId(list[0].id);
    });
  }, [refreshNotebooks, refreshSharedNotebooks, initialNotebookId]);

  /** Switch active notebook */
  const switchNotebook = useCallback((id: string) => {
    setNotebookId(id);
  }, []);
```

(the rest of the file — `createNotebook`, `renameNotebook`, `deleteNotebook`, `loadPage`, `savePage`, `addPage` — stays as-is; only the final `return` changes:)

```ts
  return {
    notebookId, userId, isAuth, role, saveState,
    notebooks, sharedNotebooks, refreshNotebooks, refreshSharedNotebooks, switchNotebook,
    createNotebook, renameNotebook, deleteNotebook,
    loadPage, savePage, addPage,
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/semoreno/Projects/pixlit && npx tsc --noEmit
```

Expected: no errors. `NotebookClient.tsx` and `NotebooksPanel.tsx` will show errors until Tasks 7–8 update their call sites — that's expected at this point; confirm the only errors are in those two files.

- [ ] **Step 3: Commit**

```bash
git add lib/useNotebook.ts
git commit -m "feat: useNotebook supports initial id, role, and shared notebooks"
```

---

### Task 7: NotebookClient — accept initial id, enforce view-only UI

**Files:**
- Modify: `app/tools/notebook/NotebookClient.tsx`

**Interfaces:**
- Consumes: `useNotebook({ initialNotebookId, onLimitReached })` → `{ ..., role }` (Task 6).

- [ ] **Step 1: Accept `initialNotebookId` prop**

Find the component signature (search for `export default function NotebookClient`) and change it to accept and pass through the prop:

```tsx
export default function NotebookClient({ initialNotebookId }: { initialNotebookId?: string } = {}) {
```

Find the `useNotebook({` call and add the option:

```tsx
  const { notebookId, userId, isAuth, role, saveState, notebooks, sharedNotebooks,
          refreshNotebooks, refreshSharedNotebooks, switchNotebook,
          createNotebook, renameNotebook, deleteNotebook, loadPage, savePage, addPage } =
    useNotebook({ initialNotebookId, onLimitReached: handleLimitReached });
```

(keep whatever the existing `onLimitReached` handler name is — only add `initialNotebookId` and destructure `role`/`sharedNotebooks`/`refreshSharedNotebooks` alongside the existing fields.)

- [ ] **Step 2: Gate drawing input on `role === "view"`**

Find the pointer-down handler for the canvas (search for `onPointerDown` on the main drawing `<canvas>`) and add a guard at the top of the handler body:

```tsx
  if (role === "view") return;
```

Do the same at the top of any function that mutates strokes directly (`insertImage`, undo/redo triggers, eraser, page add/delete) — guard each with `if (role === "view") return;` as the first line.

- [ ] **Step 3: Hide export/share controls for view-only**

Find the JSX for the export buttons (PNG/PDF/JSON/🤖) and the "Compartir" button that opens `ShareModal`. Wrap each with:

```tsx
{role !== "view" && (
  /* existing export button JSX */
)}
```

```tsx
{role === "owner" && (
  /* existing "Compartir" button JSX that opens ShareModal */
)}
```

(Share management is owner-only per spec §4; edit collaborators still see the canvas but not the share button.)

- [ ] **Step 4: Add a read-only badge**

Near the notebook title/header JSX, add:

```tsx
{role === "view" && (
  <span style={{
    fontSize: 11, fontWeight: 700, color: "#86efac",
    background: "rgba(34,197,94,0.15)", border: "1px solid #22c55e44",
    borderRadius: 999, padding: "2px 10px",
  }}>
    Solo lectura
  </span>
)}
```

- [ ] **Step 5: Typecheck**

```bash
cd /Users/semoreno/Projects/pixlit && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

Log in as B (view-only collaborator), visit `/tools/notebook/<A's-notebook-id>`: confirm the "Solo lectura" badge shows, drawing on the canvas does nothing, and export/share buttons are gone. Log in as A (owner): confirm everything still works as before.

- [ ] **Step 7: Commit**

```bash
git add app/tools/notebook/NotebookClient.tsx
git commit -m "feat: NotebookClient respects view-only role"
```

---

### Task 8: NotebooksPanel "Compartidos conmigo" + ShareModal link fix

**Files:**
- Modify: `app/tools/notebook/NotebooksPanel.tsx`
- Modify: `app/tools/notebook/ShareModal.tsx`

**Interfaces:**
- Consumes: `sharedNotebooks: SharedNotebook[]` and `switchNotebook` from `useNotebook` (Task 6), already passed into `NotebooksPanel` as props from `NotebookClient`.

- [ ] **Step 1: Fix the copy-link URL**

In `app/tools/notebook/ShareModal.tsx`, find `copyLink`:

```tsx
  const copyLink = async () => {
    const url = `${window.location.origin}/tools/notebook`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
```

Replace with:

```tsx
  const copyLink = async () => {
    const url = `${window.location.origin}/tools/notebook/${notebookId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
```

- [ ] **Step 2: Pass `sharedNotebooks` into `NotebooksPanel` and render a separate section**

In `NotebookClient.tsx`, find where `<NotebooksPanel ... />` is rendered and add the prop:

```tsx
<NotebooksPanel
  /* ...existing props... */
  sharedNotebooks={sharedNotebooks}
  onSwitchShared={(id) => { switchNotebook(id); router.push(`/tools/notebook/${id}`); }}
/>
```

(if `NotebookClient` doesn't already import `useRouter` from `next/navigation`, add `import { useRouter } from "next/navigation";` and `const router = useRouter();` near the top of the component.)

In `NotebooksPanel.tsx`, extend the props interface and add the section. Find the component's props type (search for `interface.*Props` near the top) and add:

```tsx
  sharedNotebooks?: { id: string; name: string; owner_email: string; permission: "view" | "edit" }[];
  onSwitchShared?: (id: string) => void;
```

Find the closing of the "Mis cuadernos" list rendering block (the `.map` over `notebooks`) and add a new section immediately after it, inside the same panel container:

```tsx
{sharedNotebooks && sharedNotebooks.length > 0 && (
  <>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#666", padding: "12px 16px 6px", textTransform: "uppercase" as const }}>
      Compartidos conmigo
    </div>
    {sharedNotebooks.map(nb => (
      <div
        key={nb.id}
        onClick={() => onSwitchShared?.(nb.id)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nb.name}
          </div>
          <div style={{ fontSize: 10, color: "#555" }}>{nb.owner_email}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
          background: nb.permission === "edit" ? "rgba(139,92,246,0.2)" : "rgba(34,197,94,0.15)",
          color: nb.permission === "edit" ? "#a78bfa" : "#86efac",
        }}>
          {nb.permission === "edit" ? "Editar" : "Ver"}
        </span>
      </div>
    ))}
  </>
)}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/semoreno/Projects/pixlit && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

As A: open the notebook, click "Compartir" → "Copiar link del notebook" → paste somewhere, confirm it ends in `/tools/notebook/<real-uuid>` (not the bare `/tools/notebook`).
As B: open the notebooks panel, confirm "Compartidos conmigo" shows A's notebook with the correct permission badge; click it → navigates to `/tools/notebook/<A's-id>` and loads correctly.

- [ ] **Step 4: Commit**

```bash
git add app/tools/notebook/NotebooksPanel.tsx app/tools/notebook/ShareModal.tsx app/tools/notebook/NotebookClient.tsx
git commit -m "feat: shared-notebooks list in UI + fix share link to include notebook id"
```

---

## Self-Review Notes

- **Spec coverage:** link with id → Task 5/8; server-side permission enforcement → Tasks 1/3; view-only UI restrictions → Task 7; pending invites for non-users → no code needed, already true of `notebook_shares` (spec §5, confirmed no task required); "Compartidos conmigo" section → Task 8; plan limit from owner → Task 3 Step 2.
- **Type consistency:** `NotebookRole` defined once in `lib/notebookAccess.ts` (Task 2) and imported everywhere else (Tasks 3, 4, 6, 7) rather than redefined.
- **No test framework exists in this repo today** — introducing one (Vitest/Jest + Supabase test harness) is a separate, larger decision than this plan's scope; manual `curl`/SQL checks are the verification method used throughout, consistent with the codebase as it stands.
