-- =============================================================================
-- Clothing store — initial schema (Phase 2)
-- Money: bigint so'm (integer, no fractional units, no floating point).
-- Every table has Row Level Security. Customers never touch tables directly:
-- they read active products and place orders through public.place_order().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.product_gender as enum ('men', 'women', 'unisex');
create type public.product_status as enum ('active', 'inactive', 'archived');
create type public.order_status as enum (
  'new', 'contacted', 'confirmed', 'ordered_from_china', 'in_transit', 'delivered', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrators (accounts are created in the Supabase dashboard, never by
-- public sign-up; a user is an admin only if listed here).
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins can see admin list"
  on public.admin_users for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Store settings (single row)
-- ---------------------------------------------------------------------------
create table public.store_settings (
  id boolean primary key default true check (id),
  order_number_prefix text not null default 'YB-' check (order_number_prefix ~ '^[A-Z0-9-]{0,10}$'),
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (true);
alter table public.store_settings enable row level security;
create policy "admins manage settings" on public.store_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

create sequence public.order_number_seq start with 1001;

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------
create table public.categories (
  id text primary key check (id ~ '^[a-z_]+$'),
  name text not null,
  genders public.product_gender[] not null,
  sort_order int not null default 0
);
create table public.colors (
  id text primary key check (id ~ '^[a-z_]+$'),
  name text not null,
  hex text not null check (hex ~ '^#[0-9a-f]{6}$'),
  sort_order int not null default 0
);
alter table public.categories enable row level security;
alter table public.colors enable row level security;
create policy "anyone can read categories" on public.categories for select to anon, authenticated using (true);
create policy "admins manage categories" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "anyone can read colors" on public.colors for select to anon, authenticated using (true);
create policy "admins manage colors" on public.colors for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.categories (id, name, genders, sort_order) values
  ('tshirts', 'Futbolkalar', '{men,women,unisex}', 1),
  ('shirts', 'Koʻylaklar', '{men,unisex}', 2),
  ('knitwear', 'Trikotaj', '{men,women,unisex}', 3),
  ('outerwear', 'Ustki kiyim', '{men,women,unisex}', 4),
  ('trousers', 'Shimlar', '{men,women,unisex}', 5),
  ('dresses', 'Ayollar koʻylaklari', '{women}', 6),
  ('skirts', 'Yubkalar', '{women}', 7),
  ('accessories', 'Aksessuarlar', '{men,women,unisex}', 8);

insert into public.colors (id, name, hex, sort_order) values
  ('black', 'Qora', '#1f1e1c', 1),
  ('white', 'Oq', '#f7f6f2', 2),
  ('cream', 'Krem', '#ebe2d0', 3),
  ('beige', 'Bej', '#cdb994', 4),
  ('grey', 'Kulrang', '#9b9994', 5),
  ('charcoal', 'Toʻq kulrang', '#46454a', 6),
  ('navy', 'Toʻq koʻk', '#29324a', 7),
  ('sky', 'Havorang', '#b8c7d6', 8),
  ('olive', 'Zaytun', '#69694a', 9),
  ('brown', 'Jigarrang', '#74533c', 10);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  price bigint not null check (price between 1000 and 1000000000),
  category_id text not null references public.categories (id),
  gender public.product_gender not null,
  sizes text[] not null check (cardinality(sizes) between 1 and 30),
  color_ids text[] not null check (cardinality(color_ids) between 1 and 20),
  delivery_min_days int not null default 14 check (delivery_min_days between 1 and 120),
  delivery_max_days int not null default 21 check (delivery_max_days between 1 and 120),
  featured boolean not null default false,
  new_arrival boolean not null default true,
  status public.product_status not null default 'inactive',
  -- Reserved for future profit tracking (not used in V1).
  purchase_cost bigint check (purchase_cost >= 0),
  shipping_cost bigint check (shipping_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_range check (delivery_max_days >= delivery_min_days)
);
create index products_status_idx on public.products (status);
create index products_category_idx on public.products (category_id);
create index products_gender_idx on public.products (gender);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null check (char_length(size) between 1 and 20),
  color_id text not null references public.colors (id),
  available boolean not null default true,
  unique (product_id, size, color_id)
);
create index product_variants_color_idx on public.product_variants (color_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null check (url ~ '^https://'),
  storage_path text,
  alt text not null default '',
  position int not null check (position >= 0),
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

create policy "public reads active products" on public.products for select to anon, authenticated
  using (status = 'active' or (select public.is_admin()));
create policy "admins manage products" on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public reads variants of active products" on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or (select public.is_admin()))));
create policy "admins manage variants" on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public reads images of active products" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or (select public.is_admin()))));
create policy "admins manage images" on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^\+998[0-9]{9}$'),
  city text check (char_length(city) <= 60),
  address text check (char_length(address) <= 300),
  customer_comment text check (char_length(customer_comment) <= 500),
  total bigint not null check (total >= 0),
  status public.order_status not null default 'new',
  amount_received bigint check (amount_received >= 0),
  delivered_at timestamptz,
  privacy_consent_at timestamptz not null,
  idempotency_key uuid not null unique,
  -- Reserved for future profit tracking (not used in V1).
  shipping_cost bigint check (shipping_cost >= 0),
  other_costs bigint check (other_costs >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Revenue invariant: only delivered orders carry a received amount and date.
  constraint delivered_fields check (
    (status = 'delivered' and amount_received is not null and delivered_at is not null)
    or (status <> 'delivered' and amount_received is null and delivered_at is null)
  )
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_phone_idx on public.orders (customer_phone, created_at desc);
create index orders_delivered_idx on public.orders (delivered_at) where status = 'delivered';
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- RESTRICT: a product that appears in an order cannot be deleted (archive it instead).
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid references public.product_variants (id) on delete set null,
  -- Snapshot at order time:
  product_name text not null,
  product_slug text not null,
  category_id text,
  size text not null,
  color_id text not null,
  color_name text not null,
  unit_price bigint not null check (unit_price >= 0),
  quantity int not null check (quantity between 1 and 10),
  line_total bigint not null,
  image_url text,
  unit_cost bigint check (unit_cost >= 0), -- future profit tracking
  constraint line_total_matches check (line_total = unit_price * quantity)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text check (char_length(note) <= 1000),
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users (id) on delete set null
);
create index order_status_history_order_idx on public.order_status_history (order_id, changed_at);
create index order_status_history_changed_by_idx on public.order_status_history (changed_by);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 1000),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid()
);
create index order_notes_order_idx on public.order_notes (order_id, created_at);
create index order_notes_created_by_idx on public.order_notes (created_by);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_notes enable row level security;

-- Orders are admin-only. Customers create them exclusively via place_order().
create policy "admins read orders" on public.orders for select to authenticated using ((select public.is_admin()));
create policy "admins update orders" on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins read order items" on public.order_items for select to authenticated using ((select public.is_admin()));
create policy "admins read status history" on public.order_status_history for select to authenticated using ((select public.is_admin()));
create policy "admins insert status history" on public.order_status_history for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins read notes" on public.order_notes for select to authenticated using ((select public.is_admin()));
create policy "admins add notes" on public.order_notes for insert to authenticated with check ((select public.is_admin()));
