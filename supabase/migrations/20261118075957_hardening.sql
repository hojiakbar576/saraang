-- =============================================================================
-- Hardening after first deploy (2026-11-18)
-- 1. place_order: drop the per-call temp table first, so two calls in one
--    transaction (or a pooled session that kept it) cannot fail with
--    "relation _lines already exists".
-- 2. Admin write policies split per action (insert/update/delete) so SELECT
--    has a single permissive policy per role (Supabase performance advisor).
-- 3. Reset the order number counter (consumed by a rolled-back smoke test;
--    sequences are not transactional). Only safe while no orders exist.
-- =============================================================================

create or replace function public.place_order(p_customer jsonb, p_lines jsonb, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_customer->>'fullName', '')), '\s+', ' ', 'g');
  v_digits text := regexp_replace(coalesce(p_customer->>'phone', ''), '[^0-9]', '', 'g');
  v_phone text;
  v_city text := nullif(btrim(coalesce(p_customer->>'city', '')), '');
  v_address text := nullif(btrim(coalesce(p_customer->>'address', '')), '');
  v_comment text := nullif(btrim(coalesce(p_customer->>'comment', '')), '');
  v_existing public.orders;
  v_order_id uuid;
  v_number text;
  v_total bigint;
  v_lines_count int;
  v_matched int;
  v_items int;
begin
  if p_idempotency_key is null then
    raise exception 'validation:idempotencyKey';
  end if;

  -- Repeated submit of the same checkout → return the existing order.
  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'orderNumber', v_existing.order_number,
      'total', v_existing.total,
      'phone', v_existing.customer_phone,
      'itemCount', (select coalesce(sum(quantity), 0) from public.order_items where order_id = v_existing.id)
    );
  end if;

  -- Customer validation (mirrors src/validation/checkout.ts).
  if char_length(v_name) not between 2 and 80
     or char_length(regexp_replace(v_name, '[^[:alpha:]]', '', 'g')) < 2 then
    raise exception 'validation:fullName';
  end if;
  if char_length(v_digits) = 9 then v_digits := '998' || v_digits; end if;
  if char_length(v_digits) <> 12 or left(v_digits, 3) <> '998' then
    raise exception 'validation:phone';
  end if;
  v_phone := '+' || v_digits;
  if char_length(v_city) > 60 then raise exception 'validation:city'; end if;
  if char_length(v_address) > 300 then raise exception 'validation:address'; end if;
  if char_length(v_comment) > 500 then raise exception 'validation:comment'; end if;
  if coalesce((p_customer->>'privacyConsent')::boolean, false) is not true then
    raise exception 'validation:privacyConsent';
  end if;

  -- Basic abuse protection: at most 5 orders per phone in 10 minutes.
  if (select count(*) from public.orders
      where customer_phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limited';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'empty';
  end if;
  if jsonb_array_length(p_lines) > 50 then raise exception 'validation:lines'; end if;

  -- Merge duplicate lines and validate quantities.
  drop table if exists pg_temp._lines;
  create temporary table _lines on commit drop as
    select l."productId" as product_id, l.size, l."colorId" as color_id, sum(l.quantity)::int as quantity
    from jsonb_to_recordset(p_lines) as l("productId" uuid, size text, "colorId" text, quantity int)
    group by 1, 2, 3;

  if exists (select 1 from _lines where quantity is null or quantity < 1 or quantity > 10) then
    raise exception 'validation:quantity';
  end if;

  select count(*) into v_lines_count from _lines;
  select count(*) into v_matched
  from _lines l
  join public.products p on p.id = l.product_id and p.status = 'active'
  join public.product_variants v on v.product_id = p.id and v.size = l.size and v.color_id = l.color_id and v.available
  join public.colors c on c.id = l.color_id;
  if v_matched <> v_lines_count then
    raise exception 'unavailable';
  end if;

  select coalesce(order_number_prefix, '') || nextval('public.order_number_seq')::text
    into v_number from public.store_settings where id;

  select sum(p.price * l.quantity) into v_total
  from _lines l join public.products p on p.id = l.product_id;

  insert into public.orders (
    order_number, customer_name, customer_phone, city, address, customer_comment,
    total, privacy_consent_at, idempotency_key
  ) values (
    v_number, v_name, v_phone, v_city, v_address, v_comment, v_total, now(), p_idempotency_key
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, product_slug, category_id,
    size, color_id, color_name, unit_price, quantity, line_total, image_url
  )
  select
    v_order_id, p.id, v.id, p.name, p.slug, p.category_id,
    v.size, c.id, c.name, p.price, l.quantity, p.price * l.quantity,
    (select i.url from public.product_images i where i.product_id = p.id order by i.position limit 1)
  from _lines l
  join public.products p on p.id = l.product_id
  join public.product_variants v on v.product_id = p.id and v.size = l.size and v.color_id = l.color_id
  join public.colors c on c.id = l.color_id;

  insert into public.order_status_history (order_id, from_status, to_status) values (v_order_id, null, 'new');

  select sum(quantity) into v_items from _lines;
  return jsonb_build_object('orderNumber', v_number, 'total', v_total, 'phone', v_phone, 'itemCount', v_items);
end;
$$;
revoke all on function public.place_order(jsonb, jsonb, uuid) from public;
grant execute on function public.place_order(jsonb, jsonb, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Split "for all" admin policies into per-action write policies.
-- ---------------------------------------------------------------------------
drop policy "admins manage categories" on public.categories;
drop policy "admins manage colors" on public.colors;
drop policy "admins manage products" on public.products;
drop policy "admins manage variants" on public.product_variants;
drop policy "admins manage images" on public.product_images;

create policy "admins insert categories" on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy "admins update categories" on public.categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete categories" on public.categories for delete to authenticated using ((select public.is_admin()));

create policy "admins insert colors" on public.colors for insert to authenticated with check ((select public.is_admin()));
create policy "admins update colors" on public.colors for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete colors" on public.colors for delete to authenticated using ((select public.is_admin()));

create policy "admins insert products" on public.products for insert to authenticated with check ((select public.is_admin()));
create policy "admins update products" on public.products for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete products" on public.products for delete to authenticated using ((select public.is_admin()));

create policy "admins insert variants" on public.product_variants for insert to authenticated with check ((select public.is_admin()));
create policy "admins update variants" on public.product_variants for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete variants" on public.product_variants for delete to authenticated using ((select public.is_admin()));

create policy "admins insert images" on public.product_images for insert to authenticated with check ((select public.is_admin()));
create policy "admins update images" on public.product_images for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete images" on public.product_images for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Order numbers start at 1001 again (no orders exist yet).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.orders) then
    perform setval('public.order_number_seq', 1001, false);
  end if;
end $$;
