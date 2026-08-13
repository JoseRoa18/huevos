-- ============================================================
-- HUEVOS · Esquema inicial
-- Regla de oro: TODO el inventario se guarda en la unidad
-- mínima (el huevo). Los empaques son presentaciones de venta.
-- Ejecutar en: Supabase Dashboard -> SQL Editor (o supabase db push)
-- ============================================================

-- ---------- Perfiles y roles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'vendedor' check (role in ('admin', 'vendedor', 'cliente')),
  created_at timestamptz not null default now()
);

-- ---------- Almacenes y vehículos ----------
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'almacen' check (tipo in ('almacen', 'vehiculo')),
  vendedor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Inventario central (en huevos) ----------
create table public.stock (
  warehouse_id uuid primary key references public.warehouses (id) on delete cascade,
  huevos integer not null default 0 check (huevos >= 0),
  updated_at timestamptz not null default now()
);

-- ---------- Transferencias almacén -> vehículo ----------
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  from_warehouse uuid not null references public.warehouses (id),
  to_warehouse uuid not null references public.warehouses (id),
  huevos integer not null check (huevos > 0),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Clientes (CRM básico) ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id),
  nombre text not null,
  telefono text,
  categoria text not null default 'DETAL' check (categoria in ('DETAL', 'MAYORISTA', 'VIP')),
  limite_credito numeric(12,2) not null default 0,
  saldo_credito numeric(12,2) not null default 0,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- ---------- Precios por categoría (precio por huevo) ----------
create table public.price_tiers (
  categoria text primary key check (categoria in ('DETAL', 'MAYORISTA', 'VIP')),
  precio_por_huevo numeric(10,4) not null
);

insert into public.price_tiers (categoria, precio_por_huevo) values
  ('DETAL', 0.25),
  ('MAYORISTA', 0.21),
  ('VIP', 0.19);

-- ---------- Ventas ----------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid references public.profiles (id) default auth.uid(),
  customer_id uuid references public.customers (id),
  warehouse_id uuid references public.warehouses (id),
  categoria_cliente text not null default 'DETAL',
  total_huevos integer not null check (total_huevos > 0),
  total_monto numeric(12,2) not null,
  metodo_pago text not null default 'contado' check (metodo_pago in ('contado', 'credito')),
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  empaque text not null check (empaque in ('UNIDAD', 'MEDIO_CARTON', 'CARTON', 'CAJA', 'PALETA')),
  cantidad integer not null check (cantidad > 0),
  huevos integer not null check (huevos > 0)
);

-- ---------- Mermas (huevos rotos: restan inventario, no suman ganancia) ----------
create table public.mermas (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid references public.warehouses (id),
  vendedor_id uuid references public.profiles (id) default auth.uid(),
  huevos integer not null check (huevos > 0),
  motivo text not null,
  foto_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Lógica de inventario
-- ============================================================

-- Transferencias: mueven huevos entre almacenes de forma atómica
create or replace function public.aplicar_transferencia()
returns trigger language plpgsql security definer as $$
begin
  update public.stock set huevos = huevos - new.huevos, updated_at = now()
    where warehouse_id = new.from_warehouse;
  if not found then
    raise exception 'El almacén de origen no tiene inventario inicializado';
  end if;
  insert into public.stock (warehouse_id, huevos) values (new.to_warehouse, new.huevos)
    on conflict (warehouse_id) do update
    set huevos = public.stock.huevos + excluded.huevos, updated_at = now();
  return new;
end $$;

create trigger trg_transfer after insert on public.transfers
  for each row execute function public.aplicar_transferencia();

-- Mermas: descuentan inventario del almacén indicado
create or replace function public.aplicar_merma()
returns trigger language plpgsql security definer as $$
begin
  if new.warehouse_id is not null then
    update public.stock set huevos = huevos - new.huevos, updated_at = now()
      where warehouse_id = new.warehouse_id;
  end if;
  return new;
end $$;

create trigger trg_merma after insert on public.mermas
  for each row execute function public.aplicar_merma();

-- RPC principal: registrar venta con sus líneas y descontar stock, todo atómico.
-- La app llama: supabase.rpc('registrar_venta', { venta: {...} })
create or replace function public.registrar_venta(venta jsonb)
returns uuid language plpgsql security definer as $$
declare
  v_sale_id uuid;
  v_warehouse uuid;
  v_linea jsonb;
begin
  -- Almacén del vendedor (su vehículo) o el indicado en el payload
  v_warehouse := coalesce(
    (venta->>'warehouse_id')::uuid,
    (select id from public.warehouses where vendedor_id = auth.uid() limit 1)
  );

  insert into public.sales (customer_id, warehouse_id, categoria_cliente,
                            total_huevos, total_monto, metodo_pago, lat, lng)
  values (
    (venta->>'customer_id')::uuid,
    v_warehouse,
    coalesce(venta->>'categoria_cliente', 'DETAL'),
    (venta->>'total_huevos')::int,
    (venta->>'total_monto')::numeric,
    coalesce(venta->>'metodo_pago', 'contado'),
    (venta->>'lat')::double precision,
    (venta->>'lng')::double precision
  )
  returning id into v_sale_id;

  for v_linea in select * from jsonb_array_elements(venta->'lineas') loop
    insert into public.sale_items (sale_id, empaque, cantidad, huevos)
    values (
      v_sale_id,
      v_linea->>'empaque',
      (v_linea->>'cantidad')::int,
      (v_linea->>'huevos')::int
    );
  end loop;

  -- Regla de negocio: "2 Cajas y 1 Cartón" descuenta 750 huevos al instante
  if v_warehouse is not null then
    update public.stock
      set huevos = huevos - (venta->>'total_huevos')::int, updated_at = now()
      where warehouse_id = v_warehouse;
  end if;

  return v_sale_id;
end $$;

-- ============================================================
-- Vistas para el dashboard
-- ============================================================

create or replace view public.stock_por_almacen as
select w.nombre,
       case w.tipo when 'vehiculo' then 'vehículo' else 'almacén' end as tipo,
       coalesce(s.huevos, 0) as huevos
from public.warehouses w
left join public.stock s on s.warehouse_id = w.id
order by w.tipo, w.nombre;

create or replace view public.ventas_recientes as
select to_char(v.created_at at time zone 'utc', 'HH24:MI') as hora,
       coalesce(p.full_name, 'Vendedor') as vendedor,
       v.total_huevos as huevos,
       v.total_monto as monto
from public.sales v
left join public.profiles p on p.id = v.vendedor_id
order by v.created_at desc;

-- ============================================================
-- Seguridad (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.warehouses enable row level security;
alter table public.stock enable row level security;
alter table public.transfers enable row level security;
alter table public.customers enable row level security;
alter table public.price_tiers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.mermas enable row level security;

create or replace function public.es_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Perfiles: cada quien ve el suyo; admin ve todos
create policy "perfil propio" on public.profiles
  for select using (id = auth.uid() or public.es_admin());

-- Lectura general para usuarios autenticados (vendedores necesitan ver su stock y precios)
create policy "leer almacenes" on public.warehouses for select to authenticated using (true);
create policy "leer stock" on public.stock for select to authenticated using (true);
create policy "leer precios" on public.price_tiers for select to authenticated using (true);
create policy "leer clientes" on public.customers for select to authenticated using (true);
create policy "leer ventas" on public.sales for select to authenticated
  using (vendedor_id = auth.uid() or public.es_admin());
create policy "leer items" on public.sale_items for select to authenticated using (true);
create policy "leer mermas" on public.mermas for select to authenticated
  using (vendedor_id = auth.uid() or public.es_admin());

-- Escritura: ventas y mermas por vendedores autenticados; el resto solo admin
create policy "vender" on public.sales for insert to authenticated
  with check (vendedor_id = auth.uid());
create policy "items de venta" on public.sale_items for insert to authenticated with check (true);
create policy "reportar merma" on public.mermas for insert to authenticated
  with check (vendedor_id = auth.uid());
create policy "registrar clientes" on public.customers for insert to authenticated with check (true);

create policy "admin almacenes" on public.warehouses for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin transfiere" on public.transfers for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin precios" on public.price_tiers for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ============================================================
-- Tiempo real: el dashboard escucha cambios en ventas y stock
-- ============================================================
alter publication supabase_realtime add table public.sales;
alter publication supabase_realtime add table public.stock;

-- ============================================================
-- Datos semilla de ejemplo
-- ============================================================
insert into public.warehouses (id, nombre, tipo) values
  ('00000000-0000-0000-0000-000000000001', 'Almacén Central', 'almacen');

insert into public.stock (warehouse_id, huevos) values
  ('00000000-0000-0000-0000-000000000001', 51840); -- 12 paletas
