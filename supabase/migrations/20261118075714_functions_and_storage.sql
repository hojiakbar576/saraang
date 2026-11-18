-- =============================================================================
-- Server-side business logic: order placement, status flow, product saving,
-- and image storage rules.
-- Errors are raised with machine-readable messages the frontend maps to text.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- place_order — the ONLY way customers create orders.
-- Validates input, re-prices every line from the catalog (client prices are
-- never trusted), snapshots items, and is idempotent per checkout attempt.
-- ---------------------------------------------------------------------------
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
-- Order status flow (mirrors src/features/orders/statusFlow.ts)
-- ---------------------------------------------------------------------------
create or replace function public.allowed_order_transitions(p_from public.order_status)
returns public.order_status[]
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'new' then array['contacted', 'confirmed', 'cancelled']::public.order_status[]
    when 'contacted' then array['new', 'confirmed', 'cancelled']::public.order_status[]
    when 'confirmed' then array['contacted', 'ordered_from_china', 'cancelled']::public.order_status[]
    when 'ordered_from_china' then array['confirmed', 'in_transit', 'cancelled']::public.order_status[]
    when 'in_transit' then array['ordered_from_china', 'delivered', 'cancelled']::public.order_status[]
    when 'delivered' then array['in_transit']::public.order_status[]
    when 'cancelled' then array['new']::public.order_status[]
  end;
$$;

create or replace function public.admin_change_order_status(
  p_order_id uuid, p_to public.order_status, p_amount bigint default null, p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'not_found'; end if;
  if not (p_to = any (public.allowed_order_transitions(v_order.status))) then raise exception 'not_allowed'; end if;
  if char_length(v_note) > 1000 then raise exception 'note_too_long'; end if;

  if p_to = 'delivered' then
    if p_amount is null then raise exception 'amount_required'; end if;
    if p_amount < 0 then raise exception 'invalid_amount'; end if;
    update public.orders set status = p_to, amount_received = p_amount, delivered_at = now() where id = p_order_id;
  elsif v_order.status = 'delivered' then
    -- Correction away from delivered: no longer revenue.
    update public.orders set status = p_to, amount_received = null, delivered_at = null where id = p_order_id;
  else
    update public.orders set status = p_to where id = p_order_id;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, v_order.status, p_to, v_note, auth.uid());
end;
$$;
revoke all on function public.admin_change_order_status(uuid, public.order_status, bigint, text) from public, anon;
grant execute on function public.admin_change_order_status(uuid, public.order_status, bigint, text) to authenticated;

create or replace function public.admin_correct_amount_received(p_order_id uuid, p_amount bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_order.status <> 'delivered' then raise exception 'not_allowed'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'invalid_amount'; end if;
  update public.orders set amount_received = p_amount where id = p_order_id;
  insert into public.order_notes (order_id, text, created_by)
  values (p_order_id, format('Olingan summa oʻzgartirildi: %s → %s soʻm', coalesce(v_order.amount_received::text, '—'), p_amount), auth.uid());
end;
$$;
revoke all on function public.admin_correct_amount_received(uuid, bigint) from public, anon;
grant execute on function public.admin_correct_amount_received(uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_save_product — creates or updates a product with its variants and
-- images in one transaction. Variants are upserted (stable ids for order
-- references); removed images/variants are deleted.
-- Payload keys match the frontend ProductInput.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_product(p_id uuid, p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_sizes text[] := array(select jsonb_array_elements_text(p->'sizes'));
  v_colors text[] := array(select jsonb_array_elements_text(p->'colorIds'));
  v_unavailable text[] := array(select jsonb_array_elements_text(coalesce(p->'unavailable', '[]'::jsonb)));
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_id is null then
    insert into public.products (
      id, slug, name, description, price, category_id, gender, sizes, color_ids,
      delivery_min_days, delivery_max_days, featured, new_arrival, status
    ) values (
      v_id, p->>'slug', btrim(p->>'name'), btrim(coalesce(p->>'description', '')), (p->>'price')::bigint,
      p->>'categoryId', (p->>'gender')::public.product_gender, v_sizes, v_colors,
      (p->'deliveryEstimate'->>'minDays')::int, (p->'deliveryEstimate'->>'maxDays')::int,
      coalesce((p->>'featured')::boolean, false), coalesce((p->>'newArrival')::boolean, true),
      (p->>'status')::public.product_status
    );
  else
    update public.products set
      slug = p->>'slug',
      name = btrim(p->>'name'),
      description = btrim(coalesce(p->>'description', '')),
      price = (p->>'price')::bigint,
      category_id = p->>'categoryId',
      gender = (p->>'gender')::public.product_gender,
      sizes = v_sizes,
      color_ids = v_colors,
      delivery_min_days = (p->'deliveryEstimate'->>'minDays')::int,
      delivery_max_days = (p->'deliveryEstimate'->>'maxDays')::int,
      featured = coalesce((p->>'featured')::boolean, false),
      new_arrival = coalesce((p->>'newArrival')::boolean, true),
      status = (p->>'status')::public.product_status
    where id = p_id;
    if not found then raise exception 'not_found'; end if;
  end if;

  -- Variants: every size × colour, availability from the "size::colorId" list.
  insert into public.product_variants (product_id, size, color_id, available)
  select v_id, s, c, not ((s || '::' || c) = any (v_unavailable))
  from unnest(v_sizes) as s, unnest(v_colors) as c
  on conflict (product_id, size, color_id) do update set available = excluded.available;
  delete from public.product_variants
  where product_id = v_id and not (size = any (v_sizes) and color_id = any (v_colors));

  -- Images: replace with the submitted ordered list.
  delete from public.product_images
  where product_id = v_id
    and id not in (select (img->>'id')::uuid from jsonb_array_elements(coalesce(p->'images', '[]'::jsonb)) img
                   where (img->>'id') ~ '^[0-9a-f-]{36}$');
  insert into public.product_images (id, product_id, url, storage_path, alt, position)
  select
    case when (img->>'id') ~ '^[0-9a-f-]{36}$' then (img->>'id')::uuid else gen_random_uuid() end,
    v_id, img->>'url', nullif(img->>'storagePath', ''), coalesce(img->>'alt', ''), (ord - 1)::int
  from jsonb_array_elements(coalesce(p->'images', '[]'::jsonb)) with ordinality as t(img, ord)
  on conflict (id) do update set url = excluded.url, storage_path = excluded.storage_path,
    alt = excluded.alt, position = excluded.position;

  if (p->>'status') = 'active' and not exists (select 1 from public.product_images where product_id = v_id) then
    raise exception 'validation:images';
  end if;

  return v_id;
end;
$$;
revoke all on function public.admin_save_product(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_product(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Image storage: public read, admin-only write. Max 5 MB, images only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- admin_import_products — CSV import: all rows are saved in ONE transaction,
-- so a failure part-way leaves nothing behind.
-- ---------------------------------------------------------------------------
create or replace function public.admin_import_products(p jsonb)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  ids uuid[] := '{}';
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 500 then raise exception 'validation:rows'; end if;
  for r in select * from jsonb_array_elements(p) loop
    ids := ids || public.admin_save_product(null, r);
  end loop;
  return ids;
end;
$$;
revoke all on function public.admin_import_products(jsonb) from public, anon;
grant execute on function public.admin_import_products(jsonb) to authenticated;
