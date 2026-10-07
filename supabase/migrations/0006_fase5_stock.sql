-- FASE 5 BOM y stock (depende 0,1,4). Idempotente.
create table if not exists public.material (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, nombre text not null, categoria text,
  unidad_medida text not null default 'u', stock_minimo numeric(12,2) not null default 0,
  costo_ultimo_usd numeric(12,2) default 0, costo_promedio_usd numeric(12,2) default 0,
  activo boolean not null default true
);
create table if not exists public.bom_modelo (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.modelo(id) on delete cascade,
  version int not null default 1, vigente_desde timestamptz not null default now(), aprobada_por uuid,
  unique (modelo_id, version)
);
create table if not exists public.bom_linea (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid not null references public.bom_modelo(id) on delete cascade,
  material_id uuid not null references public.material(id),
  cantidad numeric(12,3) not null, merma_pct numeric(5,2) not null default 0, etapa_consumo text
);
create table if not exists public.proveedor (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null, cuit text, contacto text, plazo_entrega_dias int default 7,
  condiciones text, calificacion int default 3
);
create table if not exists public.proveedor_material (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedor(id) on delete cascade,
  material_id uuid not null references public.material(id) on delete cascade,
  precio numeric(12,2) not null, moneda text not null default 'USD', fecha date not null default current_date,
  codigo_proveedor text
);
create table if not exists public.movimiento_stock (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.material(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','salida','ajuste','reserva','liberacion')),
  cantidad numeric(12,3) not null, referencia_tipo text, referencia_id uuid,
  costo_unitario numeric(12,2), usuario_id uuid, fecha_hora timestamptz not null default now()
);
create table if not exists public.lista_compra (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'borrador', generada_en timestamptz not null default now(), generada_por uuid
);
create table if not exists public.lista_compra_linea (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.lista_compra(id) on delete cascade,
  material_id uuid not null references public.material(id),
  cantidad_sugerida numeric(12,3) not null, cantidad_aprobada numeric(12,3), proveedor_sugerido_id uuid references public.proveedor(id)
);
create index if not exists idx_mov_mat on public.movimiento_stock (material_id);
alter table public.material enable row level security;
alter table public.bom_modelo enable row level security;
alter table public.bom_linea enable row level security;
alter table public.proveedor enable row level security;
alter table public.proveedor_material enable row level security;
alter table public.movimiento_stock enable row level security;
alter table public.lista_compra enable row level security;
alter table public.lista_compra_linea enable row level security;
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies where schemaname='public' and tablename in ('material','bom_modelo','bom_linea','proveedor','proveedor_material','movimiento_stock','lista_compra','lista_compra_linea')) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop; end $$;
create policy "f5_all" on public.material for all to authenticated using (true) with check (true);
create policy "f5_all" on public.bom_modelo for all to authenticated using (true) with check (true);
create policy "f5_all" on public.bom_linea for all to authenticated using (true) with check (true);
create policy "f5_all" on public.proveedor for all to authenticated using (true) with check (true);
create policy "f5_all" on public.proveedor_material for all to authenticated using (true) with check (true);
create policy "f5_all" on public.movimiento_stock for all to authenticated using (true) with check (true);
create policy "f5_all" on public.lista_compra for all to authenticated using (true) with check (true);
create policy "f5_all" on public.lista_compra_linea for all to authenticated using (true) with check (true);
