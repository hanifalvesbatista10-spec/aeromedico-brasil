-- Aeromédico Brasil — autorizar o primeiro administrador
--
-- NÃO é uma migration (não rode isto pelo `supabase/migrations`). Rode
-- manualmente no SQL Editor, uma única vez, depois de:
--
--   1. Aplicar as 4 migrations em supabase/migrations, NESTA ORDEM:
--        20260905120000_cms_schema.sql
--        20260905120100_cms_rls.sql
--        20260905120200_cms_storage.sql
--        20260905120300_cms_seed.sql
--   2. Criar o usuário administrador em Authentication → Users → Add user
--      (e-mail + senha), no painel do Supabase. Cadastro público está
--      desativado no app — este é o único jeito de criar o primeiro admin.
--
-- Este script NÃO inventa nenhum UUID: ele localiza o usuário pelo e-mail
-- que você acabou de cadastrar em auth.users e autoriza esse usuário.
--
-- Troque o e-mail abaixo pelo e-mail real do administrador antes de rodar.

insert into public.admin_users (user_id, display_name)
select id, 'Lucio Macêdo'
from auth.users
where email = 'SUBSTITUA_PELO_EMAIL_DO_ADMIN@exemplo.com'
on conflict (user_id) do nothing;

-- Confira o resultado (deve retornar exatamente 1 linha):
select u.email, a.display_name, a.created_at
from public.admin_users a
join auth.users u on u.id = a.user_id;
