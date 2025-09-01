-- Enable needed extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key default auth.uid(),
  store_name text,
  created_at timestamp with time zone default now()
);
alter table public.profiles enable row level security;
create policy "Self profile" on public.profiles for all using (id = auth.uid());

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamp with time zone default now()
);
alter table public.categories enable row level security;
create policy "Owner can CRUD categories" on public.categories
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  sku text unique,
  price numeric(10,2) not null default 0,
  cost numeric(10,2) not null default 0,
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);
alter table public.products enable row level security;
create policy "Owner can CRUD products" on public.products
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  user_id uuid not null,
  total numeric(10,2) not null default 0,
  payment numeric(10,2) not null default 0,
  change numeric(10,2) not null default 0,
  created_at timestamp with time zone default now()
);
alter table public.sales enable row level security;
create policy "Owner can read their sales" on public.sales
  for select using (owner_id = auth.uid());
create policy "Owner can insert sales" on public.sales
  for insert with check (owner_id = auth.uid() and user_id = auth.uid());

-- Sale items
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null,
  cost numeric(10,2) not null
);
alter table public.sale_items enable row level security;
create policy "Owner can read their sale_items" on public.sale_items
  for select using (owner_id = auth.uid());
create policy "Owner can insert sale_items" on public.sale_items
  for insert with check (owner_id = auth.uid());

-- Stock movements (positive = ingreso, negativo = salida)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  change integer not null,
  reason text,
  ref_sale_id uuid references public.sales(id),
  created_at timestamp with time zone default now()
);
alter table public.stock_movements enable row level security;
create policy "Owner can CRUD movements" on public.stock_movements
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- View: sale items with product names and created_at via sale
create or replace view public.sale_items_with_products as
select si.*, p.name as product_name, s.created_at
from sale_items si
join products p on p.id = si.product_id
join sales s on s.id = si.sale_id
where si.owner_id = s.owner_id and si.owner_id = p.owner_id;
alter view public.sale_items_with_products owner to postgres;
grant select on public.sale_items_with_products to anon, authenticated;

-- Recalc stock function (sum all movements for product)
create or replace function public.recalc_stock(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products p
    set stock = coalesce((select sum(change)::int from stock_movements m where m.product_id = p_id and m.owner_id = p.owner_id), 0)
  where p.id = p_id;
end;
$$;

-- Perform sale (atomic): items_json = [{product_id, quantity}], payment
create or replace function public.perform_sale(items_json jsonb, payment numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_user uuid := auth.uid();
  v_total numeric(10,2) := 0;
  v_change numeric(10,2) := 0;
  v_sale_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product record;
  v_qty int;
begin
  if v_owner is null then
    raise exception 'Auth required';
  end if;

  -- compute total
  for v_item in select * from jsonb_array_elements(items_json) loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid and owner_id = v_owner;
    if not found then
      raise exception 'Producto no encontrado';
    end if;
    v_qty := (v_item->>'quantity')::int;
    if v_qty <= 0 then
      raise exception 'Cantidad inválida';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Stock insuficiente para %', v_product.name;
    end if;
    v_total := v_total + (v_product.price * v_qty);
  end loop;

  v_change := greatest(payment - v_total, 0);

  -- insert sale
  insert into sales(id, owner_id, user_id, total, payment, change)
  values (v_sale_id, v_owner, v_user, v_total, coalesce(payment,0), v_change);

  -- items + stock movements
  for v_item in select * from jsonb_array_elements(items_json) loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid and owner_id = v_owner;
    v_qty := (v_item->>'quantity')::int;

    insert into sale_items(owner_id, sale_id, product_id, quantity, price, cost)
    values (v_owner, v_sale_id, v_product.id, v_qty, v_product.price, v_product.cost);

    insert into stock_movements(owner_id, product_id, change, reason, ref_sale_id)
    values (v_owner, v_product.id, -v_qty, 'sale', v_sale_id);

    -- update stock cached
    update products set stock = stock - v_qty where id = v_product.id and owner_id = v_owner;
  end loop;

  return v_sale_id;
end;
$$;

-- Defaults for first run (optional)
-- insert into categories(name) values ('Abarrotes'),('Bebidas'),('Dulces');
