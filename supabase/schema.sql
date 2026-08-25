create extension if not exists "pgcrypto";

create type public.content_status as enum ('draft', 'published', 'archived');

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  title text not null,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  status public.content_status not null default 'draft',
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  file_url text,
  cover_url text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  duration text,
  format text,
  cover_url text,
  checkout_url text,
  stripe_price_id text,
  featured boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  material_id text not null,
  source text not null default 'landing-page',
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.materials enable row level security;
alter table public.courses enable row level security;
alter table public.leads enable row level security;
alter table public.analytics_events enable row level security;

create policy "public reads published content" on public.site_content for select using (status = 'published');
create policy "public reads published materials" on public.materials for select using (status = 'published');
create policy "public reads published courses" on public.courses for select using (status = 'published');
create policy "public submits leads" on public.leads for insert with check (length(name) >= 2 and position('@' in email) > 1);
create policy "admins manage content" on public.site_content for all using (exists (select 1 from public.admin_profiles p where p.id = auth.uid())) with check (exists (select 1 from public.admin_profiles p where p.id = auth.uid()));
create policy "admins manage materials" on public.materials for all using (exists (select 1 from public.admin_profiles p where p.id = auth.uid())) with check (exists (select 1 from public.admin_profiles p where p.id = auth.uid()));
create policy "admins manage courses" on public.courses for all using (exists (select 1 from public.admin_profiles p where p.id = auth.uid())) with check (exists (select 1 from public.admin_profiles p where p.id = auth.uid()));
create policy "admins read leads" on public.leads for select using (exists (select 1 from public.admin_profiles p where p.id = auth.uid()));
create policy "admins read analytics" on public.analytics_events for select using (exists (select 1 from public.admin_profiles p where p.id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "admins upload materials" on storage.objects for insert to authenticated
with check (bucket_id = 'materials' and exists (select 1 from public.admin_profiles p where p.id = auth.uid()));
create policy "admins manage material files" on storage.objects for all to authenticated
using (bucket_id = 'materials' and exists (select 1 from public.admin_profiles p where p.id = auth.uid()))
with check (bucket_id = 'materials' and exists (select 1 from public.admin_profiles p where p.id = auth.uid()));
