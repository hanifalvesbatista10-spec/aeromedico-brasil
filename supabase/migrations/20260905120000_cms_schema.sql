-- Aeromédico Brasil — CMS schema
-- Cria enums, tabelas e gatilhos de updated_at para o CMS administrativo.
-- Não contém RLS (ver 20260905120100_cms_rls.sql) nem storage
-- (ver 20260905120200_cms_storage.sql).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type public.program_type as enum ('curso', 'mentoria', 'treinamento', 'produto');
create type public.program_format as enum ('presencial', 'online', 'hibrido');
create type public.program_status as enum ('disponivel', 'proximas-turmas', 'em-breve');
create type public.content_kind as enum ('artigo', 'video', 'link-externo');
create type public.speaking_kind as enum ('palestra', 'treinamento', 'evento', 'aula', 'mentoria');
create type public.lead_origin as enum ('contato', 'formacao', 'palestra');
create type public.lead_status as enum ('novo', 'em-contato', 'convertido', 'descartado');
create type public.material_type as enum ('pdf', 'imagem', 'link');

-- ---------------------------------------------------------------------
-- admin_users — quem pode administrar (relacionado a auth.users)
-- ---------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Autorização administrativa. Nenhuma senha é armazenada aqui — a senha vive em auth.users, gerida pelo Supabase Auth.';

-- ---------------------------------------------------------------------
-- profiles — registro único de Lucio Macêdo
-- ---------------------------------------------------------------------

create table public.profiles (
  id boolean primary key default true,
  name text not null default '',
  role text not null default '',
  credentials text[] not null default '{}',
  short_bio text not null default '',
  long_bio text not null default '',
  resume_summary text,
  photo_url text,
  instagram_handle text not null default '',
  updated_at timestamptz not null default now(),
  constraint profiles_singleton check (id)
);

comment on table public.profiles is 'Registro único (singleton) — perfil profissional público.';

-- ---------------------------------------------------------------------
-- site_settings — registro único de configurações do site
-- ---------------------------------------------------------------------

create table public.site_settings (
  id boolean primary key default true,
  site_name text not null default 'Aeromédico Brasil',
  site_description text not null default '',
  stats jsonb not null default '[]'::jsonb,
  whatsapp_url text not null default '',
  email text not null default '',
  instagram_url text not null default '',
  primary_cta_label text not null default '',
  primary_cta_href text not null default '',
  secondary_cta_label text not null default '',
  secondary_cta_href text not null default '',
  footer_note text not null default '',
  logo_url text,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id)
);

comment on table public.site_settings is 'Registro único (singleton) — configurações públicas do site.';
comment on column public.site_settings.stats is
  'Array de {id,label,value} — números de autoridade exibidos na landing.';

-- ---------------------------------------------------------------------
-- programs — formações, cursos, mentorias, treinamentos e produtos
-- ---------------------------------------------------------------------

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type public.program_type not null,
  category text not null default '',
  title text not null,
  short_description text not null default '',
  full_description text,
  image_url text,
  duration_hours integer check (duration_hours is null or duration_hours > 0),
  format public.program_format not null default 'online',
  status public.program_status not null default 'em-breve',
  enroll_url text,
  cta_label text not null default 'Inscrever-se',
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  is_demo_content boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programs_published_order_idx on public.programs (published, sort_order);

-- ---------------------------------------------------------------------
-- content_posts — artigos, vídeos, protocolos, links externos
-- ---------------------------------------------------------------------

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind public.content_kind not null default 'artigo',
  category text not null default '',
  title text not null,
  summary text not null default '',
  body text,
  cover_url text,
  author text not null default '',
  published_at date not null default current_date,
  external_url text,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  is_demo_content boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_posts_published_order_idx on public.content_posts (published, sort_order);

-- ---------------------------------------------------------------------
-- testimonials — nunca publicado sem autorização (ver CHECK abaixo)
-- ---------------------------------------------------------------------

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  profession text not null default '',
  photo_url text,
  program_or_event text not null default '',
  quote text not null,
  authorized_for_display boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonials_requires_authorization
    check (not published or authorized_for_display)
);

create index testimonials_published_order_idx on public.testimonials (published, sort_order);

comment on constraint testimonials_requires_authorization on public.testimonials is
  'Garantia no banco (não só na aplicação): impossível marcar published=true sem authorized_for_display=true.';

-- ---------------------------------------------------------------------
-- speaking_topics — formatos de palestra/treinamento/mentoria
-- ---------------------------------------------------------------------

create table public.speaking_topics (
  id uuid primary key default gen_random_uuid(),
  kind public.speaking_kind not null,
  title text not null,
  description text not null default '',
  themes text[] not null default '{}',
  hire_url text,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index speaking_topics_published_order_idx on public.speaking_topics (published, sort_order);

-- ---------------------------------------------------------------------
-- faq_items
-- ---------------------------------------------------------------------

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faq_items_published_order_idx on public.faq_items (published, sort_order);

-- ---------------------------------------------------------------------
-- leads — captados pelos formulários públicos
-- ---------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  profession text not null default '',
  interest text not null default '',
  message text not null default '',
  origin public.lead_origin not null,
  consent_given boolean not null,
  status public.lead_status not null default 'novo',
  notes text,
  created_at timestamptz not null default now(),
  constraint leads_consent_required check (consent_given)
);

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_status_idx on public.leads (status);

-- ---------------------------------------------------------------------
-- materials — biblioteca de materiais (PDF, imagem ou link externo)
-- ---------------------------------------------------------------------

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  type public.material_type not null default 'pdf',
  file_path text,
  external_url text,
  cover_url text,
  category text not null default '',
  is_public boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_has_source check (file_path is not null or external_url is not null)
);

create index materials_published_order_idx on public.materials (published, sort_order);

comment on column public.materials.file_path is
  'Caminho do objeto dentro do bucket de storage "materials" (não é a URL pública).';

-- ---------------------------------------------------------------------
-- cta_events — registro respeitoso de cliques em CTA (sem dados pessoais)
-- ---------------------------------------------------------------------

create table public.cta_events (
  id uuid primary key default gen_random_uuid(),
  cta_id text not null,
  page_path text not null,
  source text,
  created_at timestamptz not null default now()
);

create index cta_events_created_at_idx on public.cta_events (created_at desc);
create index cta_events_cta_id_idx on public.cta_events (cta_id);

-- ---------------------------------------------------------------------
-- Gatilho genérico de updated_at
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger set_programs_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

create trigger set_content_posts_updated_at
  before update on public.content_posts
  for each row execute function public.set_updated_at();

create trigger set_testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

create trigger set_speaking_topics_updated_at
  before update on public.speaking_topics
  for each row execute function public.set_updated_at();

create trigger set_faq_items_updated_at
  before update on public.faq_items
  for each row execute function public.set_updated_at();

create trigger set_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();
