-- =============================================================================
-- Multilingual catalogue (uz / ru / en) — 2026-11-18
--
-- * Uzbek stays in products.name / products.description (required source text),
--   so slugs, place_order() re-pricing and order_items snapshots are unchanged.
-- * Russian and English live in product_translations, one row per language.
--   Prices, images, sizes, colours etc. are never duplicated.
-- * categories / colors (small fixed lookup tables) get name_ru / name_en.
-- * admin_save_product() also writes translations, in the same transaction.
-- * The automatic amount-correction note becomes language-neutral
--   ("amount_corrected:OLD:NEW"); the admin UI shows it translated.
-- Additive only: no existing column, row, id or policy is removed.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Product translations
-- ---------------------------------------------------------------------------
create table public.product_translations (
  product_id uuid not null references public.products (id) on delete cascade,
  locale text not null check (locale in ('ru', 'en')),
  -- Empty = not translated yet (the shop falls back to Uzbek for that field).
  name text not null default '' check (name = '' or char_length(btrim(name)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (product_id, locale),
  constraint translation_not_empty check (name <> '' or description <> '')
);
create trigger product_translations_updated_at before update on public.product_translations
  for each row execute function public.set_updated_at();

alter table public.product_translations enable row level security;

create policy "public reads translations of active products" on public.product_translations for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or (select public.is_admin()))));
create policy "admins insert translations" on public.product_translations for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins update translations" on public.product_translations for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete translations" on public.product_translations for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Category and colour names
-- ---------------------------------------------------------------------------
alter table public.categories add column name_ru text, add column name_en text;
alter table public.colors add column name_ru text, add column name_en text;

update public.categories c set name_ru = v.ru, name_en = v.en
from (values
  ('tshirts', 'Футболки', 'T-shirts'),
  ('shirts', 'Рубашки', 'Shirts'),
  ('knitwear', 'Трикотаж', 'Knitwear'),
  ('outerwear', 'Верхняя одежда', 'Outerwear'),
  ('trousers', 'Брюки', 'Trousers'),
  ('dresses', 'Платья', 'Dresses'),
  ('skirts', 'Юбки', 'Skirts'),
  ('accessories', 'Аксессуары', 'Accessories')
) as v(id, ru, en)
where c.id = v.id;

update public.colors c set name_ru = v.ru, name_en = v.en
from (values
  ('black', 'Чёрный', 'Black'),
  ('white', 'Белый', 'White'),
  ('cream', 'Кремовый', 'Cream'),
  ('beige', 'Бежевый', 'Beige'),
  ('grey', 'Серый', 'Grey'),
  ('charcoal', 'Тёмно-серый', 'Charcoal'),
  ('navy', 'Тёмно-синий', 'Navy'),
  ('sky', 'Голубой', 'Sky blue'),
  ('olive', 'Оливковый', 'Olive'),
  ('brown', 'Коричневый', 'Brown')
) as v(id, ru, en)
where c.id = v.id;

-- ---------------------------------------------------------------------------
-- admin_save_product — now also saves p.translations:
--   { "ru": { "name": "...", "description": "..." }, "en": { ... } }
-- A language with neither name nor description is removed (falls back to Uzbek).
-- Everything else is identical to the previous version.
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
  v_tr jsonb := case when jsonb_typeof(p->'translations') = 'object' then p->'translations' else '{}'::jsonb end;
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

  insert into public.product_variants (product_id, size, color_id, available)
  select v_id, s, c, not ((s || '::' || c) = any (v_unavailable))
  from unnest(v_sizes) as s, unnest(v_colors) as c
  on conflict (product_id, size, color_id) do update set available = excluded.available;
  delete from public.product_variants
  where product_id = v_id and not (size = any (v_sizes) and color_id = any (v_colors));

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

  -- Translations (ru / en).
  with tr as (
    select l.locale,
           btrim(coalesce(v_tr->l.locale->>'name', '')) as name,
           btrim(coalesce(v_tr->l.locale->>'description', '')) as description
    from (values ('ru'), ('en')) as l(locale)
  )
  delete from public.product_translations pt
  using tr
  where pt.product_id = v_id and pt.locale = tr.locale and tr.name = '' and tr.description = '';

  insert into public.product_translations (product_id, locale, name, description)
  select v_id, l.locale,
         btrim(coalesce(v_tr->l.locale->>'name', '')),
         btrim(coalesce(v_tr->l.locale->>'description', ''))
  from (values ('ru'), ('en')) as l(locale)
  where btrim(coalesce(v_tr->l.locale->>'name', '')) <> '' or btrim(coalesce(v_tr->l.locale->>'description', '')) <> ''
  on conflict (product_id, locale) do update set name = excluded.name, description = excluded.description;

  if (p->>'status') = 'active' and not exists (select 1 from public.product_images where product_id = v_id) then
    raise exception 'validation:images';
  end if;

  return v_id;
end;
$$;
revoke all on function public.admin_save_product(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_product(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Amount correction note: language-neutral, rendered by the admin UI.
-- ---------------------------------------------------------------------------
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
  values (p_order_id, format('amount_corrected:%s:%s', coalesce(v_order.amount_received::text, ''), p_amount), auth.uid());
end;
$$;
revoke all on function public.admin_correct_amount_received(uuid, bigint) from public, anon;
grant execute on function public.admin_correct_amount_received(uuid, bigint) to authenticated;
