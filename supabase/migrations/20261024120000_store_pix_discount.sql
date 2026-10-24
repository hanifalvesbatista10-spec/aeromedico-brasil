-- Aeromédico Brasil — Loja: desconto no Pix no lugar da taxa repassada ao comprador
--
-- PRÉ-REQUISITO: 20261022120000_store_orders.sql e 20261023120000_store_orders_hardening.sql
-- já aplicadas. Esta migration só altera o que elas criaram; não mexe em produtos,
-- cupons, leads nem conteúdo.
--
-- COMO APLICAR: rode inteira, uma vez, no SQL Editor do Supabase do Aeromédico Brasil.
-- Nenhum agente aplica este arquivo. Aplique ANTES de ligar o pagamento pelo site.
--
-- O QUE MUDA
-- 1. `store_payment_settings.pix_discount_bp`: desconto do Pix em pontos-base sobre o valor
--    dos produtos (500 = 5%). Editável no painel (/admin/pedidos).
-- 2. `store_orders.pix_discount_cents`: quanto o comprador economizou ao pagar no Pix. O total
--    do pedido passa a ser: produtos − cupom − desconto do Pix + frete (+ taxa, sempre zero).
--    As colunas de taxa repassada (`fee_cents` e as `*_fixed_cents`/`*_percent_bp` das
--    configurações) ficam no banco, sem uso: não há mais taxa repassada.
-- 3. `create_store_order` grava o desconto do Pix e `get_store_order_public` o devolve.

-- ---------------------------------------------------------------------
-- 1. Desconto do Pix nas configurações
-- ---------------------------------------------------------------------

alter table public.store_payment_settings
  add column pix_discount_bp integer not null default 500
  check (pix_discount_bp between 0 and 5000);

comment on column public.store_payment_settings.pix_discount_bp is
  'Desconto do Pix sobre o valor dos produtos, em pontos-base: 500 = 5%. Máximo 50%.';

-- ---------------------------------------------------------------------
-- 2. Desconto do Pix no pedido
-- ---------------------------------------------------------------------

alter table public.store_orders
  add column pix_discount_cents integer not null default 0
  check (pix_discount_cents >= 0);

alter table public.store_orders drop constraint store_orders_total_check;
alter table public.store_orders add constraint store_orders_total_check
  check (
    total_cents = subtotal_cents - discount_cents - pix_discount_cents + shipping_cents + fee_cents
  );

-- ---------------------------------------------------------------------
-- 3. create_store_order: grava o desconto do Pix
-- ---------------------------------------------------------------------

create or replace function public.create_store_order(p_secret text, p_order jsonb)
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
    access_token, environment, customer_name, customer_email, customer_phone,
    ship_cep, ship_street, ship_number, ship_complement, ship_district,
    ship_city, ship_state, ship_option_id, ship_label,
    subtotal_cents, discount_cents, pix_discount_cents, coupon_code, shipping_cents, fee_cents,
    total_cents, payment_method
  ) values (
    v_token,
    case when p_order ->> 'environment' = 'sandbox' then 'sandbox' else 'production' end,
    p_order #>> '{customer,name}', p_order #>> '{customer,email}', p_order #>> '{customer,phone}',
    p_order #>> '{address,cep}', p_order #>> '{address,street}', p_order #>> '{address,number}',
    nullif(p_order #>> '{address,complement}', ''), p_order #>> '{address,district}',
    p_order #>> '{address,city}', p_order #>> '{address,state}',
    p_order #>> '{shipping,optionId}', p_order #>> '{shipping,label}',
    (p_order ->> 'subtotalCents')::integer, (p_order ->> 'discountCents')::integer,
    coalesce((p_order ->> 'pixDiscountCents')::integer, 0),
    nullif(p_order ->> 'couponCode', ''), (p_order #>> '{shipping,cents}')::integer,
    coalesce((p_order ->> 'feeCents')::integer, 0), (p_order ->> 'totalCents')::integer,
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

-- ---------------------------------------------------------------------
-- get_store_order_public: devolve o desconto do Pix (e não mais a taxa)
-- ---------------------------------------------------------------------

create or replace function public.get_store_order_public(p_order_id uuid, p_token text)
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
    'pixDiscountCents', o.pix_discount_cents,
    'shippingCents', o.shipping_cents,
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

-- `create or replace` mantém as permissões; reafirmadas por segurança.
revoke all on function public.create_store_order(text, jsonb) from public;
revoke all on function public.get_store_order_public(uuid, text) from public;
grant execute on function public.create_store_order(text, jsonb) to anon, authenticated;
grant execute on function public.get_store_order_public(uuid, text) to anon, authenticated;
