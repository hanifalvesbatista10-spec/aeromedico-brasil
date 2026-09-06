-- Aeromédico Brasil — Storage buckets e políticas
--
-- site-media: bucket PÚBLICO — imagens usadas na landing/admin (foto de
--   perfil, logomarca, capas de programas/conteúdos). Qualquer visitante
--   pode ler; só admin envia/atualiza/remove.
-- materials: bucket PRIVADO por padrão — PDFs e imagens da biblioteca de
--   materiais. Um objeto só fica acessível ao público quando a linha
--   correspondente em public.materials estiver published=true e
--   is_public=true; do contrário só admin acessa. Sem uso de service_role
--   em nenhum momento — a leitura pública de um material liberado passa
--   pela política de storage.objects abaixo, avaliada com a chave
--   publicável (anon/authenticated), nunca com chave secreta.
--
-- Limites (ajustáveis depois via dashboard, sem precisar de nova migration):
--   site-media: 5 MB, image/webp|png|jpeg
--   materials:  20 MB, application/pdf, image/webp|png|jpeg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-media', 'site-media', true, 5242880,
   array['image/webp', 'image/png', 'image/jpeg']),
  ('materials', 'materials', false, 20971520,
   array['application/pdf', 'image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- site-media — leitura pública, escrita só admin
-- ---------------------------------------------------------------------

create policy "public reads site-media"
  on storage.objects for select
  using (bucket_id = 'site-media');

create policy "admin uploads site-media"
  on storage.objects for insert
  with check (bucket_id = 'site-media' and public.is_admin());

create policy "admin updates site-media"
  on storage.objects for update
  using (bucket_id = 'site-media' and public.is_admin())
  with check (bucket_id = 'site-media' and public.is_admin());

create policy "admin deletes site-media"
  on storage.objects for delete
  using (bucket_id = 'site-media' and public.is_admin());

-- ---------------------------------------------------------------------
-- materials — admin gerencia tudo; público só lê o objeto cuja linha em
-- public.materials está published+is_public
-- ---------------------------------------------------------------------

create policy "admin manages materials bucket"
  on storage.objects for all
  using (bucket_id = 'materials' and public.is_admin())
  with check (bucket_id = 'materials' and public.is_admin());

create policy "public reads public materials files"
  on storage.objects for select
  using (
    bucket_id = 'materials'
    and exists (
      select 1 from public.materials m
      where m.file_path = storage.objects.name
        and m.published = true
        and m.is_public = true
    )
  );
