-- ═══════════════════════════════════════════════════════════════════
-- Pixlit — Initial schema
-- Run in Supabase SQL editor (or via supabase db push)
-- ═══════════════════════════════════════════════════════════════════

-- ── Enable UUID extension ─────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── plans enum ───────────────────────────────────────────────────
create type plan_id as enum ('free', 'starter', 'pro', 'business');
create type sub_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete');
create type payment_provider as enum ('stripe', 'mercadopago', 'paypal', 'khipu');

-- ── profiles ─────────────────────────────────────────────────────
-- One row per auth.users entry
create table profiles (
  id                   uuid primary key references auth.users on delete cascade,
  email                text not null,
  display_name         text,
  avatar_url           text,
  plan                 plan_id not null default 'free',
  sub_status           sub_status,
  sub_provider         payment_provider,
  sub_provider_cust_id text,          -- e.g. Stripe customer ID
  sub_provider_sub_id  text,          -- e.g. Stripe subscription ID
  sub_current_period_end timestamptz,
  voice_seconds_used   integer not null default 0,
  -- notebook theme preferences
  notebook_theme       jsonb not null default '{
    "background": "ruled",
    "bgColor": "#1e1e2e",
    "lineColor": "rgba(255,255,255,0.035)",
    "marginColor": "rgba(139,92,246,0.08)"
  }'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- ── notebooks ─────────────────────────────────────────────────────
create table notebooks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null default 'Mi Cuaderno',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notebooks_updated_at
  before update on notebooks
  for each row execute procedure set_updated_at();

-- Each user gets one default notebook automatically
create or replace function handle_new_notebook()
returns trigger language plpgsql security definer as $$
begin
  insert into notebooks (user_id, name)
  values (new.id, 'Mi Cuaderno');
  return new;
end;
$$;

create trigger on_profile_created_notebook
  after insert on profiles
  for each row execute procedure handle_new_notebook();

-- ── notebook_pages ───────────────────────────────────────────────
create table notebook_pages (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  page_number integer not null,
  strokes     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (notebook_id, page_number)
);

create index notebook_pages_notebook_id_idx on notebook_pages (notebook_id);
create index notebook_pages_user_id_idx     on notebook_pages (user_id);

create trigger notebook_pages_updated_at
  before update on notebook_pages
  for each row execute procedure set_updated_at();

-- ── voice_notes ──────────────────────────────────────────────────
create table voice_notes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  page_id          uuid references notebook_pages on delete set null,
  storage_path     text not null,   -- path in Supabase Storage bucket
  duration_seconds integer not null default 0,
  file_size_bytes  integer not null default 0,
  label            text,
  created_at       timestamptz not null default now()
);

create index voice_notes_user_id_idx on voice_notes (user_id);
create index voice_notes_page_id_idx on voice_notes (page_id);

-- ── subscriptions ────────────────────────────────────────────────
-- Full subscription history (one active row per user at most)
create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users on delete cascade,
  provider               payment_provider not null,
  provider_sub_id        text not null,
  provider_customer_id   text,
  plan                   plan_id not null,
  status                 sub_status not null default 'active',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  canceled_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (provider, provider_sub_id)
);

create index subscriptions_user_id_idx on subscriptions (user_id);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure set_updated_at();

-- ── payment_events ───────────────────────────────────────────────
-- Raw webhook event log (idempotency + audit)
create table payment_events (
  id           uuid primary key default gen_random_uuid(),
  provider     payment_provider not null,
  event_id     text,                    -- provider's event ID for dedup
  event_type   text not null,
  payload      jsonb not null,
  processed    boolean not null default false,
  error        text,
  created_at   timestamptz not null default now(),
  unique (provider, event_id)
);

create index payment_events_provider_idx   on payment_events (provider);
create index payment_events_processed_idx  on payment_events (processed);

-- ═══════════════════════════════════════════════════════════════════
-- Row-Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════

alter table profiles        enable row level security;
alter table notebooks       enable row level security;
alter table notebook_pages  enable row level security;
alter table voice_notes     enable row level security;
alter table subscriptions   enable row level security;
alter table payment_events  enable row level security;

-- profiles: users can read/update their own
create policy "profiles: own read"   on profiles for select using (auth.uid() = id);
create policy "profiles: own update" on profiles for update using (auth.uid() = id);

-- notebooks: users can CRUD their own
create policy "notebooks: own all" on notebooks
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- notebook_pages: users can CRUD their own
create policy "pages: own all" on notebook_pages
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- voice_notes: users can CRUD their own
create policy "voice_notes: own all" on voice_notes
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- subscriptions: users can read their own
create policy "subscriptions: own read" on subscriptions
  for select using (auth.uid() = user_id);

-- payment_events: service role only (no user policy needed)

-- ═══════════════════════════════════════════════════════════════════
-- Storage bucket for voice notes
-- Run AFTER creating the bucket in Supabase dashboard (or use CLI)
-- ═══════════════════════════════════════════════════════════════════

-- Create bucket: name = 'voice-notes', private = true
-- CLI: supabase storage create-bucket voice-notes --private

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

-- Users can manage their own files: stored as {user_id}/{filename}
create policy "voice-notes: own upload" on storage.objects
  for insert with check (
    bucket_id = 'voice-notes' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "voice-notes: own read" on storage.objects
  for select using (
    bucket_id = 'voice-notes' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "voice-notes: own delete" on storage.objects
  for delete using (
    bucket_id = 'voice-notes' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
