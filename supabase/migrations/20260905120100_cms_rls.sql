-- Aeromédico Brasil — Row Level Security
-- Ativa RLS em todas as tabelas do CMS e define as políticas mínimas.
-- Nenhuma política usa `true` indiscriminado para operações administrativas.

-- ---------------------------------------------------------------------
-- is_admin() — usada por todas as políticas administrativas
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

comment on function public.is_admin() is
  'security definer para poder ler admin_users mesmo sob RLS; não expõe dados, só um boolean.';

-- ---------------------------------------------------------------------
-- Ativar RLS em todas as tabelas
-- ---------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.programs enable row level security;
alter table public.content_posts enable row level security;
alter table public.testimonials enable row level security;
alter table public.speaking_topics enable row level security;
alter table public.faq_items enable row level security;
alter table public.leads enable row level security;
alter table public.materials enable row level security;
alter table public.cta_events enable row level security;

-- ---------------------------------------------------------------------
-- admin_users — cada admin só lê a própria linha; inserir/editar/excluir
-- só é feito manualmente pelo SQL Editor (ver supabase/admin-bootstrap.sql)
-- ---------------------------------------------------------------------

create policy "admin reads own row"
  on public.admin_users for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- profiles (singleton) — leitura pública, escrita só admin
-- ---------------------------------------------------------------------

create policy "public reads profile"
  on public.profiles for select
  using (true);

create policy "admin updates profile"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- site_settings (singleton) — leitura pública, escrita só admin
-- ---------------------------------------------------------------------

create policy "public reads settings"
  on public.site_settings for select
  using (true);

create policy "admin updates settings"
  on public.site_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------

create policy "public reads published programs"
  on public.programs for select
  using (published = true or public.is_admin());

create policy "admin inserts programs"
  on public.programs for insert
  with check (public.is_admin());

create policy "admin updates programs"
  on public.programs for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes programs"
  on public.programs for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- content_posts
-- ---------------------------------------------------------------------

create policy "public reads published content"
  on public.content_posts for select
  using (published = true or public.is_admin());

create policy "admin inserts content"
  on public.content_posts for insert
  with check (public.is_admin());

create policy "admin updates content"
  on public.content_posts for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes content"
  on public.content_posts for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- testimonials — público só vê publicado E autorizado
-- ---------------------------------------------------------------------

create policy "public reads authorized published testimonials"
  on public.testimonials for select
  using ((published = true and authorized_for_display = true) or public.is_admin());

create policy "admin inserts testimonials"
  on public.testimonials for insert
  with check (public.is_admin());

create policy "admin updates testimonials"
  on public.testimonials for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes testimonials"
  on public.testimonials for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- speaking_topics
-- ---------------------------------------------------------------------

create policy "public reads published speaking topics"
  on public.speaking_topics for select
  using (published = true or public.is_admin());

create policy "admin inserts speaking topics"
  on public.speaking_topics for insert
  with check (public.is_admin());

create policy "admin updates speaking topics"
  on public.speaking_topics for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes speaking topics"
  on public.speaking_topics for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- faq_items
-- ---------------------------------------------------------------------

create policy "public reads published faq"
  on public.faq_items for select
  using (published = true or public.is_admin());

create policy "admin inserts faq"
  on public.faq_items for insert
  with check (public.is_admin());

create policy "admin updates faq"
  on public.faq_items for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes faq"
  on public.faq_items for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- leads — público só INSERT (restrito); só admin lê/edita/exclui
-- ---------------------------------------------------------------------

create policy "public submits valid leads"
  on public.leads for insert
  with check (
    consent_given = true
    and status = 'novo'
    and notes is null
    and char_length(name) > 0
    and char_length(email) > 0
    and char_length(phone) > 0
  );

create policy "admin reads leads"
  on public.leads for select
  using (public.is_admin());

create policy "admin updates leads"
  on public.leads for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes leads"
  on public.leads for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- materials — público só vê publicado E público; privados só admin
-- ---------------------------------------------------------------------

create policy "public reads public materials"
  on public.materials for select
  using ((published = true and is_public = true) or public.is_admin());

create policy "admin inserts materials"
  on public.materials for insert
  with check (public.is_admin());

create policy "admin updates materials"
  on public.materials for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes materials"
  on public.materials for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- cta_events — público só INSERT (campos limitados, sem dado pessoal);
-- só admin lê/exclui
-- ---------------------------------------------------------------------

create policy "public registers cta events"
  on public.cta_events for insert
  with check (
    char_length(cta_id) > 0 and char_length(cta_id) < 100
    and char_length(page_path) > 0 and char_length(page_path) < 300
  );

create policy "admin reads cta events"
  on public.cta_events for select
  using (public.is_admin());

create policy "admin deletes cta events"
  on public.cta_events for delete
  using (public.is_admin());
