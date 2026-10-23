-- Aeromédico Brasil — Loja: ajustes de segurança dos pedidos (revisão antes do lançamento)
--
-- PRÉ-REQUISITO: 20261022120000_store_orders.sql já aplicada. Esta migration só
-- altera o que a anterior criou; não mexe em produtos, cupons, leads nem conteúdo.
--
-- COMO APLICAR: rode inteira no SQL Editor do Supabase do Aeromédico Brasil. Nenhum
-- agente aplica este arquivo. Pode rodar uma vez só (a coluna nova não aceita repetir).
--
-- O QUE MUDA
-- 1. `store_orders.environment` ('sandbox' ou 'production'): o site grava em qual
--    ambiente do Asaas o pedido foi criado. Teste local e produção dividem o mesmo
--    banco; sem isto, um pedido pago com dinheiro de mentira apareceria como "Pago"
--    e o dono poderia enviar o produto. O painel marca esses pedidos como teste.
-- 2. `apply_store_order_event`:
--    a) pagamento que chega DEPOIS de o pedido ter sido cancelado vira `paid_review`
--       (antes era ignorado e o dinheiro entrava sem aparecer em lugar nenhum);
--    b) as variações do pedido são travadas (em ordem) antes de conferir o estoque:
--       dois pagamentos simultâneos do último item não derrubam mais o webhook com
--       erro 500 nem entram em deadlock.
-- Os GRANT/REVOKE das funções são reafirmados no fim.

-- ---------------------------------------------------------------------
-- 1. Ambiente do pedido
-- ---------------------------------------------------------------------

alter table public.store_orders
  add column environment text not null default 'production'
  check (environment in ('sandbox', 'production'));

-- ---------------------------------------------------------------------
-- create_store_order: grava o ambiente (qualquer valor diferente de 'sandbox' = produção)
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
    subtotal_cents, discount_cents, coupon_code, shipping_cents, fee_cents,
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

-- ---------------------------------------------------------------------
-- apply_store_order_event: pago depois de cancelado + trava das variações
-- ---------------------------------------------------------------------

create or replace function public.apply_store_order_event(
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
    -- Pago depois de cancelado: o dinheiro entrou, então o pedido vai para
    -- conferência do dono (nada é baixado do estoque nem contado no cupom).
    if v_order.status = 'canceled' then
      update public.store_orders set status = 'paid_review', paid_at = now() where id = v_order.id;
      return 'paid_review';
    end if;

    if v_order.status not in ('awaiting_payment', 'expired') then
      return 'ignored';
    end if;

    -- Trava as variações do pedido, sempre na mesma ordem (evita deadlock entre
    -- pagamentos simultâneos) e antes de conferir o estoque.
    perform 1
      from public.store_variants v
     where v.id in (
       select i.variant_id
         from public.store_order_items i
        where i.order_id = v_order.id and i.variant_id is not null
     )
     order by v.id
       for update;

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

-- `create or replace` mantém as permissões; reafirmadas por segurança.
revoke all on function public.create_store_order(text, jsonb) from public;
revoke all on function public.apply_store_order_event(text, text, text, text, jsonb) from public;
grant execute on function public.create_store_order(text, jsonb) to anon, authenticated;
grant execute on function public.apply_store_order_event(text, text, text, text, jsonb) to anon, authenticated;
