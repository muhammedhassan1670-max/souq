create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  icon text,
  image_url text,
  active boolean default true,
  coming_soon boolean default false,
  sort_order integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table public.categories
add column if not exists coming_soon boolean default false;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text,
  phone text,
  whatsapp text,
  category text,
  address text,
  image_url text,
  rating numeric default 5,
  is_open boolean default true,
  active boolean default true,
  delivery_available boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references public.categories(id),
  shop_id uuid references public.shops(id),
  price numeric not null,
  old_price numeric,
  unit text,
  image_url text,
  available boolean default true,
  active boolean default true,
  stock_quantity integer default 0,
  is_offer boolean default false,
  is_local_product boolean default false,
  is_featured boolean default false,
  keywords text[],
  tags text[],
  sort_order integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  customer_name text not null,
  customer_phone text not null,
  address text,
  street text,
  notes text,
  subtotal numeric,
  delivery_fee numeric,
  discount numeric,
  total numeric,
  payment_method text default 'الدفع عند الاستلام',
  status text default 'جديد',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text,
  quantity integer,
  unit_price numeric,
  total_price numeric
);

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  old_price numeric,
  new_price numeric,
  old_old_price numeric,
  new_old_price numeric,
  change_source text,
  changed_at timestamp default now(),
  changed_by uuid
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  value jsonb,
  updated_at timestamp default now()
);

create table if not exists public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  phone text,
  request_text text,
  address text,
  status text default 'جديد',
  created_at timestamp default now()
);

create table if not exists public.seller_requests (
  id uuid primary key default gen_random_uuid(),
  shop_name text,
  owner_name text,
  phone text,
  category text,
  address text,
  notes text,
  status text default 'جديد',
  created_at timestamp default now()
);

create or replace function public.next_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from now())::integer;
  next_number integer;
begin
  select count(*) + 1
    into next_number
  from public.orders
  where created_at >= make_timestamp(current_year, 1, 1, 0, 0, 0)
    and created_at < make_timestamp(current_year + 1, 1, 1, 0, 0, 0);

  return 'SB-' || current_year || '-' || lpad(next_number::text, 4, '0');
end;
$$;

grant execute on function public.next_order_number() to anon, authenticated;

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_shops_updated_at on public.shops;
create trigger set_shops_updated_at before update on public.shops
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at before update on public.settings
for each row execute function public.set_updated_at();

create index if not exists idx_categories_active_sort on public.categories(active, sort_order);
create index if not exists idx_categories_coming_soon on public.categories(coming_soon);
create index if not exists idx_shops_active on public.shops(active);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_shop on public.products(shop_id);
create index if not exists idx_products_flags on public.products(active, available, is_offer, is_local_product, is_featured);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_orders_phone on public.orders(customer_phone);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_product_price_history_product on public.product_price_history(product_id, changed_at desc);

alter table public.categories enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.product_price_history enable row level security;
alter table public.settings enable row level security;
alter table public.custom_requests enable row level security;
alter table public.seller_requests enable row level security;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories" on public.categories
for select using (active = true or auth.role() = 'authenticated');

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can read active shops" on public.shops;
create policy "Public can read active shops" on public.shops
for select using (active = true or auth.role() = 'authenticated');

drop policy if exists "Admins manage shops" on public.shops;
create policy "Admins manage shops" on public.shops
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can read products" on public.products;
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products
for select using (
  auth.role() = 'authenticated'
  or (
    active = true
    and not exists (
      select 1
      from public.categories
      where categories.id = products.category_id
        and coalesce(categories.coming_soon, false) = true
    )
  )
);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders" on public.orders
for insert with check (true);

drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders
for select using (auth.role() = 'authenticated');

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders
for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can create order items" on public.order_items;
create policy "Public can create order items" on public.order_items
for insert with check (true);

drop policy if exists "Admins read order items" on public.order_items;
create policy "Admins read order items" on public.order_items
for select using (auth.role() = 'authenticated');

drop policy if exists "Admins manage product price history" on public.product_price_history;
create policy "Admins manage product price history" on public.product_price_history
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can read settings" on public.settings;
create policy "Public can read settings" on public.settings
for select using (true);

drop policy if exists "Admins manage settings" on public.settings;
create policy "Admins manage settings" on public.settings
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can create custom requests" on public.custom_requests;
create policy "Public can create custom requests" on public.custom_requests
for insert with check (true);

drop policy if exists "Admins manage custom requests" on public.custom_requests;
create policy "Admins manage custom requests" on public.custom_requests
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Public can create seller requests" on public.seller_requests;
create policy "Public can create seller requests" on public.seller_requests
for insert with check (true);

drop policy if exists "Admins manage seller requests" on public.seller_requests;
create policy "Admins manage seller requests" on public.seller_requests
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('market-images', 'market-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read market images" on storage.objects;
create policy "Public can read market images" on storage.objects
for select using (bucket_id = 'market-images');

drop policy if exists "Authenticated can upload market images" on storage.objects;
create policy "Authenticated can upload market images" on storage.objects
for insert with check (bucket_id = 'market-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can update market images" on storage.objects;
create policy "Authenticated can update market images" on storage.objects
for update using (bucket_id = 'market-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete market images" on storage.objects;
create policy "Authenticated can delete market images" on storage.objects
for delete using (bucket_id = 'market-images' and auth.role() = 'authenticated');
