-- FASE 1 Catálogo (depende 0). Idempotente.
create table if not exists public.categoria (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique, slug text not null unique,
  descripcion text, orden int not null default 0, visible_web boolean not null default true
);
create table if not exists public.modelo (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categoria(id),
  codigo text not null unique, nombre text not null, descripcion text,
  largo_mm int, ancho_mm int, alto_mm int, peso_kg numeric(10,2),
  sistema_constructivo text, precio_base_usd numeric(12,2) not null default 0,
  activo boolean not null default true, creado_en timestamptz not null default now()
);
create table if not exists public.modelo_foto (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.modelo(id) on delete cascade,
  url text not null, leyenda text, orden int not null default 0, es_portada boolean not null default false
);
create table if not exists public.ficha_tecnica_item (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.modelo(id) on delete cascade,
  grupo text not null, item text not null, especificacion text not null, orden int not null default 0
);
create table if not exists public.opcion (
  id uuid primary key default gen_random_uuid(),
  grupo text not null, nombre text not null, descripcion text,
  tipo_precio text not null default 'fijo' check (tipo_precio in ('fijo','por_m2','por_unidad','por_metro')),
  precio_usd numeric(12,2) not null default 0, activo boolean not null default true
);
create table if not exists public.modelo_opcion (
  modelo_id uuid not null references public.modelo(id) on delete cascade,
  opcion_id uuid not null references public.opcion(id) on delete cascade,
  obligatoria boolean not null default false, incluida_por_defecto boolean not null default false,
  cantidad_maxima int, primary key (modelo_id, opcion_id)
);
create table if not exists public.precio_historial (
  id uuid primary key default gen_random_uuid(),
  entidad text not null, entidad_id uuid not null, precio_usd numeric(12,2) not null,
  vigente_desde timestamptz not null default now(), cargado_por uuid
);
create index if not exists idx_modelo_cat on public.modelo (categoria_id);
create index if not exists idx_modelo_codigo on public.modelo (codigo);
alter table public.categoria enable row level security;
alter table public.modelo enable row level security;
alter table public.modelo_foto enable row level security;
alter table public.ficha_tecnica_item enable row level security;
alter table public.opcion enable row level security;
alter table public.modelo_opcion enable row level security;
alter table public.precio_historial enable row level security;
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies where schemaname='public' and tablename in ('categoria','modelo','modelo_foto','ficha_tecnica_item','opcion','modelo_opcion','precio_historial')) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop; end $$;
-- Local dev: lectura amplia (anon+authenticated), escritura authenticated. En nube se endurece por rol.
create policy "f1_read" on public.categoria for select to anon, authenticated using (true);
create policy "f1_write" on public.categoria for all to authenticated using (true) with check (true);
create policy "f1_read" on public.modelo for select to anon, authenticated using (true);
create policy "f1_write" on public.modelo for all to authenticated using (true) with check (true);
create policy "f1_read" on public.modelo_foto for select to anon, authenticated using (true);
create policy "f1_write" on public.modelo_foto for all to authenticated using (true) with check (true);
create policy "f1_read" on public.ficha_tecnica_item for select to anon, authenticated using (true);
create policy "f1_write" on public.ficha_tecnica_item for all to authenticated using (true) with check (true);
create policy "f1_read" on public.opcion for select to anon, authenticated using (true);
create policy "f1_write" on public.opcion for all to authenticated using (true) with check (true);
create policy "f1_read" on public.modelo_opcion for select to anon, authenticated using (true);
create policy "f1_write" on public.modelo_opcion for all to authenticated using (true) with check (true);
create policy "f1_read" on public.precio_historial for select to authenticated using (true);
create policy "f1_write" on public.precio_historial for all to authenticated using (true) with check (true);
