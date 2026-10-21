-- Aeromédico Brasil — Loja: cupons de desconto
--
-- Cria a tabela de cupons (percentual ou valor fixo, validade, pedido mínimo e
-- limite de usos) e a função que o carrinho usa para validar um código.
-- Dinheiro sempre em centavos (inteiros).
--
-- PRÉ-REQUISITO: as migrations do CMS e a da loja (20261018120000) já
-- aplicadas — esta usa `public.set_updated_at()` e `public.is_admin()`.
--
-- COMO APLICAR: rode no SQL Editor do Supabase do Aeromédico Brasil. Nenhum
-- agente aplica este arquivo. Sem ela, o carrinho continua funcionando e o
-- campo de cupom responde "Não foi possível verificar o cupom agora."; o painel
-- /admin/cupons só funciona depois de aplicada.
--
-- SEGURANÇA: o visitante NUNCA lê a tabela (não há política para ele, então
-- ele não consegue listar cupons). A validação passa por `find_store_coupon`,
-- que devolve no máximo UM cupom ativo, pelo código exato.

create table public.store_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code = upper(btrim(code)) and char_length(code) between 3 and 32),
  kind text not null check (kind in ('percent', 'fixed')),
  -- percent: 1 a 100 · fixed: centavos
  value integer not null check (value > 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  -- null = sem limite de usos
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_coupons_percent_range check (kind <> 'percent' or value <= 100),
  constraint store_coupons_period check (
    starts_at is null or expires_at is null or starts_at < expires_at
  )
);

-- Um código por cupom, sem diferenciar maiúsculas.
create unique index store_coupons_code_key on public.store_coupons (upper(code));

create trigger set_store_coupons_updated_at
  before update on public.store_coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: só o administrador lê e escreve.
-- ---------------------------------------------------------------------

alter table public.store_coupons enable row level security;

revoke all on public.store_coupons from anon;
revoke truncate on public.store_coupons from authenticated;

create policy "store_coupons_admin_select" on public.store_coupons
  for select using (public.is_admin());
create policy "store_coupons_admin_insert" on public.store_coupons
  for insert with check (public.is_admin());
create policy "store_coupons_admin_update" on public.store_coupons
  for update using (public.is_admin()) with check (public.is_admin());
create policy "store_coupons_admin_delete" on public.store_coupons
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- Validação pública de um código (no máximo um cupom ativo por chamada)
-- ---------------------------------------------------------------------

create function public.find_store_coupon(p_code text)
returns table (
  id uuid,
  code text,
  kind text,
  value integer,
  min_order_cents integer,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.code, c.kind, c.value, c.min_order_cents, c.starts_at,
         c.expires_at, c.max_uses, c.uses_count, c.active, c.created_at,
         c.updated_at
  from public.store_coupons c
  where c.active = true
    and char_length(p_code) <= 64
    and upper(c.code) = upper(btrim(p_code))
  limit 1;
$$;

revoke all on function public.find_store_coupon(text) from public;
grant execute on function public.find_store_coupon(text) to anon, authenticated;
