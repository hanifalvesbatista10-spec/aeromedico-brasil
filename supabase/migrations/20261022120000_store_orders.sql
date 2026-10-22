-- Aeromédico Brasil — Loja: pedidos, taxas do Asaas e funções protegidas por segredo
--
-- Cria as tabelas de pedido (pedido, itens, eventos do Asaas), as taxas do
-- meio de pagamento (editáveis no painel) e as funções que o SERVIDOR do site
-- usa para gravar pedido e confirmar pagamento sem a chave-mestra do Supabase.
-- Dinheiro sempre em centavos (inteiros).
--
-- PRÉ-REQUISITO: as migrations do CMS, a da loja (20261018120000) e a de
-- cupons (20261020120000) já aplicadas — esta usa `public.set_updated_at()`,
-- `public.is_admin()`, `public.store_variants` e `public.store_coupons`.
--
-- COMO APLICAR: rode no SQL Editor do Supabase do Aeromédico Brasil. Nenhum
-- agente aplica este arquivo. Depois, UMA vez, grave o hash do segredo do
-- servidor (troque <SEGREDO> por um texto longo e aleatório, o MESMO valor da
-- variável ORDERS_RPC_SECRET na Vercel; não coloque o segredo no chat nem no Git):
--
--   insert into private.app_secrets (name, secret_hash)
--   values ('orders', sha256(convert_to('<SEGREDO>', 'utf8')))
--   on conflict (name) do update set secret_hash = excluded.secret_hash;
--
-- Sem o segredo gravado, TODAS as funções de escrita recusam (padrão seguro).
--
-- SEGURANÇA: o visitante NUNCA lê nem escreve nas tabelas de pedido. Quem grava
-- é o servidor, por funções `security definer` que conferem o segredo antes de
-- qualquer coisa. A página do pedido lê por `get_store_order_public`, que exige
-- a chave aleatória do pedido e não devolve dado pessoal.

-- ---------------------------------------------------------------------
-- Segredo do servidor (schema private: não exposto pela API)
-- ---------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  secret_hash bytea not null
);
revoke all on private.app_secrets from public, anon, authenticated;

create or replace function private.check_secret(p_name text, p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.app_secrets s
    where s.name = p_name
      and s.secret_hash = sha256(convert_to(coalesce(p_secret, ''), 'utf8'))
  );
$$;

revoke all on function private.check_secret(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Taxas do meio de pagamento (registro único, editável pelo administrador)
-- ---------------------------------------------------------------------

create table public.store_payment_settings (
  id boolean primary key default true,
  pix_fixed_cents integer not null default 199 check (pix_fixed_cents >= 0),
  pix_percent_bp integer not null default 0 check (pix_percent_bp >= 0 and pix_percent_bp < 10000),
  card_single_fixed_cents integer not null default 49 check (card_single_fixed_cents >= 0),
  card_single_percent_bp integer not null default 299
    check (card_single_percent_bp >= 0 and card_single_percent_bp < 10000),
  card_installments_fixed_cents integer not null default 49 check (card_installments_fixed_cents >= 0),
  card_installments_percent_bp integer not null default 349
    check (card_installments_percent_bp >= 0 and card_installments_percent_bp < 10000),
  max_installments integer not null default 6 check (max_installments between 1 and 21),
  updated_at timestamptz not null default now(),
  constraint store_payment_settings_singleton check (id)
);

comment on table public.store_payment_settings is
  'Registro único. percent_bp em pontos-base: 349 = 3,49%. Valores iniciais = tabela padrão do Asaas.';

insert into public.store_payment_settings (id) values (true);

create trigger set_store_payment_settings_updated_at
  before update on public.store_payment_settings
  for each row execute function public.set_updated_at();

alter table public.store_payment_settings enable row level security;

revoke insert, update, delete, truncate on public.store_payment_settings from anon;
revoke truncate on public.store_payment_settings from authenticated;

-- As taxas não são segredo (o cliente vê o total de cada forma antes de pagar).
create policy "store_payment_settings_public_select" on public.store_payment_settings
  for select using (true);
create policy "store_payment_settings_admin_update" on public.store_payment_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  -- Chave aleatória que dá acesso à página do pedido (sem login).
  access_token text not null,
  status text not null default 'awaiting_payment' check (
    status in (
      'awaiting_payment', 'paid', 'paid_review', 'preparing',
      'shipped', 'delivered', 'canceled', 'expired'
    )
  ),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  ship_cep text not null,
  ship_street text not null,
  ship_number text not null,
  ship_complement text,
  ship_district text not null,
  ship_city text not null,
  ship_state text not null,
  ship_option_id text not null,
  ship_label text not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  coupon_code text,
  shipping_cents integer not null check (shipping_cents >= 0),
  fee_cents integer not null default 0 check (fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  payment_method text not null check (payment_method in ('pix', 'card_single', 'card_installments')),
  asaas_checkout_id text,
  asaas_checkout_url text,
  tracking_code text,
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint store_orders_total_check
    check (total_cents = subtotal_cents - discount_cents + shipping_cents + fee_cents)
);

create unique index store_orders_checkout_idx
  on public.store_orders (asaas_checkout_id) where asaas_checkout_id is not null;
create index store_orders_status_idx on public.store_orders (status, created_at desc);

create trigger set_store_orders_updated_at
  before update on public.store_orders
  for each row execute function public.set_updated_at();

create table public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders (id) on delete cascade,
  product_id uuid references public.store_products (id) on delete set null,
  variant_id uuid references public.store_variants (id) on delete set null,
  -- Retrato do item no momento da compra.
  name text not null,
  size text,
  color_name text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  weight_grams integer not null check (weight_grams > 0)
);

create index store_order_items_order_idx on public.store_order_items (order_id);

-- Um evento do Asaas só é processado uma vez (event_id é a chave).
create table public.store_order_events (
  event_id text primary key,
  type text not null,
  order_id uuid references public.store_orders (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_order_events enable row level security;

revoke all on public.store_orders, public.store_order_items, public.store_order_events from anon;
revoke truncate on
  public.store_orders, public.store_order_items, public.store_order_events
from authenticated;

create policy "store_orders_admin_select" on public.store_orders
  for select using (public.is_admin());
create policy "store_orders_admin_update" on public.store_orders
  for update using (public.is_admin()) with check (public.is_admin());
create policy "store_order_items_admin_select" on public.store_order_items
  for select using (public.is_admin());
create policy "store_order_events_admin_select" on public.store_order_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- Funções do servidor (todas conferem o segredo ANTES de qualquer coisa)
-- ---------------------------------------------------------------------

-- Chaves do JSON (montado pelo servidor): customer{name,email,phone},
-- address{cep,street,number,complement,district,city,state},
-- shipping{optionId,label,cents}, items[{productId,variantId,name,size,
-- colorName,unitPriceCents,quantity,weightGrams}], subtotalCents,
-- discountCents, couponCode, feeCents, totalCents, paymentMethod.
create function public.create_store_order(p_secret text, p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_number bigint;
  v_token text;
  v_items_sum bigint;
begin
  if not private.check_secret('orders', p_secret) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;

  select coalesce(sum((i ->> 'unitPriceCents')::integer * (i ->> 'quantity')::integer), 0)
    into v_items_sum
    from jsonb_array_elements(p_order -> 'items') i;
  if v_items_sum <> (p_order ->> 'subtotalCents')::bigint then
    raise exception 'subtotal não confere com os itens';
  end if;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.store_orders (
    access_token, customer_name, customer_email, customer_phone,
    ship_cep, ship_street, ship_number, ship_complement, ship_district,
    ship_city, ship_state, ship_option_id, ship_label,
    subtotal_cents, discount_cents, coupon_code, shipping_cents, fee_cents,
    total_cents, payment_method
  ) values (
    v_token,
    p_order #>> '{customer,name}', p_order #>> '{customer,email}', p_order #>> '{customer,phone}',
    p_order #>> '{address,cep}', p_order #>> '{address,street}', p_order #>> '{address,number}',
    nullif(p_order #>> '{address,complement}', ''), p_order #>> '{address,district}',
    p_order #>> '{address,city}', p_order #>> '{address,state}',
    p_order #>> '{shipping,optionId}', p_order #>> '{shipping,label}',
    (p_order ->> 'subtotalCents')::integer, (p_order ->> 'discountCents')::integer,
    nullif(p_order ->> 'couponCode', ''), (p_order #>> '{shipping,cents}')::integer,
    (p_order ->> 'feeCents')::integer, (p_order ->> 'totalCents')::integer,
    p_order ->> 'paymentMethod'
  ) returning id, number into v_id, v_number;

  insert into public.store_order_items (
    order_id, product_id, variant_id, name, size, color_name,
    unit_price_cents, quantity, weight_grams
  )
  select
    v_id,
    nullif(i ->> 'productId', '')::uuid,
    nullif(i ->> 'variantId', '')::uuid,
    i ->> 'name', nullif(i ->> 'size', ''), nullif(i ->> 'colorName', ''),
    (i ->> 'unitPriceCents')::integer, (i ->> 'quantity')::integer,
    (i ->> 'weightGrams')::integer
  from jsonb_array_elements(p_order -> 'items') i;

  return jsonb_build_object('id', v_id, 'number', v_number, 'access_token', v_token);
end;
$$;

create function public.attach_store_order_checkout(
  p_secret text, p_order_id uuid, p_checkout_id text, p_checkout_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.check_secret('orders', p_secret) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;

  update public.store_orders
     set asaas_checkout_id = p_checkout_id, asaas_checkout_url = p_checkout_url
   where id = p_order_id and status = 'awaiting_payment' and asaas_checkout_id is null;

  if not found then
    raise exception 'pedido não encontrado ou já vinculado';
  end if;
end;
$$;

-- Usada quando o Asaas falha ao criar o checkout: o pedido ainda não tem
-- checkout e não pode ficar pendurado.
create function public.cancel_store_order_pending(p_secret text, p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.check_secret('orders', p_secret) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;

  update public.store_orders
     set status = 'canceled'
   where id = p_order_id and status = 'awaiting_payment' and asaas_checkout_id is null;
end;
$$;

-- Aplica um evento do Asaas. Idempotente (event_id é a chave); a confirmação
-- do pagamento baixa estoque e conta o cupom NA MESMA operação. Devolve
-- 'paid', 'paid_review', 'canceled', 'expired', 'duplicate' ou 'ignored'.
create function public.apply_store_order_event(
  p_secret text, p_event_id text, p_type text, p_checkout_id text, p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.store_orders%rowtype;
  v_inserted integer;
  v_enough boolean;
begin
  if not private.check_secret('orders', p_secret) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;

  -- Trava o pedido: dois webhooks simultâneos do mesmo checkout se enfileiram.
  select * into v_order from public.store_orders where asaas_checkout_id = p_checkout_id for update;

  insert into public.store_order_events (event_id, type, order_id, payload)
  values (p_event_id, p_type, v_order.id, coalesce(p_payload, '{}'::jsonb))
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return 'duplicate';
  end if;
  if v_order.id is null then
    return 'ignored';
  end if;

  if p_type = 'CHECKOUT_PAID' then
    if v_order.status not in ('awaiting_payment', 'expired') then
      return 'ignored';
    end if;

    -- Estoque: tudo ou nada. Variação com estoque nulo é ilimitada.
    select coalesce(bool_and(v.stock is null or v.stock >= t.q), true)
      into v_enough
      from (
        select variant_id, sum(quantity) as q
          from public.store_order_items
         where order_id = v_order.id and variant_id is not null
         group by variant_id
      ) t
      join public.store_variants v on v.id = t.variant_id;

    if not v_enough then
      update public.store_orders set status = 'paid_review', paid_at = now() where id = v_order.id;
      return 'paid_review';
    end if;

    update public.store_variants v
       set stock = v.stock - t.q
      from (
        select variant_id, sum(quantity) as q
          from public.store_order_items
         where order_id = v_order.id and variant_id is not null
         group by variant_id
      ) t
     where v.id = t.variant_id and v.stock is not null;

    if v_order.coupon_code is not null then
      update public.store_coupons
         set uses_count = uses_count + 1
       where upper(code) = upper(v_order.coupon_code);
    end if;

    update public.store_orders set status = 'paid', paid_at = now() where id = v_order.id;
    return 'paid';
  elsif p_type = 'CHECKOUT_CANCELED' then
    if v_order.status = 'awaiting_payment' then
      update public.store_orders set status = 'canceled' where id = v_order.id;
      return 'canceled';
    end if;
    return 'ignored';
  elsif p_type = 'CHECKOUT_EXPIRED' then
    if v_order.status = 'awaiting_payment' then
      update public.store_orders set status = 'expired' where id = v_order.id;
      return 'expired';
    end if;
    return 'ignored';
  end if;

  return 'ignored';
end;
$$;

-- Página do pedido: exige a chave aleatória; chave errada = null (igual a
-- pedido inexistente). NÃO devolve e-mail, telefone nem endereço.
create function public.get_store_order_public(p_order_id uuid, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'number', o.number,
    'status', o.status,
    'subtotalCents', o.subtotal_cents,
    'discountCents', o.discount_cents,
    'shippingCents', o.shipping_cents,
    'feeCents', o.fee_cents,
    'totalCents', o.total_cents,
    'paymentMethod', o.payment_method,
    'trackingCode', o.tracking_code,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', i.name, 'size', i.size, 'colorName', i.color_name,
          'quantity', i.quantity, 'unitPriceCents', i.unit_price_cents
        ) order by i.name
      )
      from public.store_order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.store_orders o
  where o.id = p_order_id and o.access_token = p_token;
$$;

revoke all on function public.create_store_order(text, jsonb) from public;
revoke all on function public.attach_store_order_checkout(text, uuid, text, text) from public;
revoke all on function public.cancel_store_order_pending(text, uuid) from public;
revoke all on function public.apply_store_order_event(text, text, text, text, jsonb) from public;
revoke all on function public.get_store_order_public(uuid, text) from public;

grant execute on function public.create_store_order(text, jsonb) to anon, authenticated;
grant execute on function public.attach_store_order_checkout(text, uuid, text, text) to anon, authenticated;
grant execute on function public.cancel_store_order_pending(text, uuid) to anon, authenticated;
grant execute on function public.apply_store_order_event(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.get_store_order_public(uuid, text) to anon, authenticated;
