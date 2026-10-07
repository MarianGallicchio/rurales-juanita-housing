-- FASE 4 Producción ISO 9001 (depende 0,1,2). Idempotente.
create table if not exists public.orden_produccion (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique, cotizacion_id uuid references public.cotizacion(id),
  cliente_id uuid references public.cliente(id),
  estado text not null default 'pendiente' check (estado in ('pendiente','en_produccion','completa','despachada','cancelada')),
  prioridad text not null default 'media', fecha_inicio date, fecha_prometida date, fecha_cierre date, observaciones text
);
create table if not exists public.unidad (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.orden_produccion(id) on delete cascade,
  modelo_id uuid not null references public.modelo(id),
  numero_serie text not null unique, estado text not null default 'pendiente',
  etapa_actual text, fecha_despacho date, destino text
);
create table if not exists public.plantilla_etapa (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categoria(id),
  orden int not null default 0, nombre text not null,
  duracion_estimada_h numeric(6,2) default 8, requiere_control boolean not null default true
);
create table if not exists public.etapa_unidad (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references public.unidad(id) on delete cascade,
  plantilla_etapa_id uuid not null references public.plantilla_etapa(id),
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','en_control','aprobada','rechazada')),
  responsable_id uuid, inicio_real timestamptz, fin_real timestamptz, horas_reales numeric(6,2)
);
create table if not exists public.checklist_plantilla (
  id uuid primary key default gen_random_uuid(),
  plantilla_etapa_id uuid not null references public.plantilla_etapa(id) on delete cascade,
  orden int not null default 0, item text not null, criterio_aceptacion text, critico boolean not null default false
);
create table if not exists public.checklist_resultado (
  id uuid primary key default gen_random_uuid(),
  etapa_unidad_id uuid not null references public.etapa_unidad(id) on delete cascade,
  item_id uuid not null references public.checklist_plantilla(id),
  resultado text not null check (resultado in ('apto','no_apto','no_aplica')),
  observacion text, inspector_id uuid, fecha_hora timestamptz not null default now()
);
create table if not exists public.adjunto (
  id uuid primary key default gen_random_uuid(),
  entidad text not null, entidad_id uuid not null, url text not null,
  tipo text not null default 'foto', subido_por uuid, fecha_hora timestamptz not null default now()
);
create table if not exists public.no_conformidad (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references public.unidad(id) on delete cascade,
  etapa_unidad_id uuid references public.etapa_unidad(id),
  descripcion text not null, causa_raiz text, accion_inmediata text, accion_correctiva text,
  responsable_id uuid, estado text not null default 'abierta', fecha_cierre date, verificacion_eficacia text
);
create index if not exists idx_unidad_orden on public.unidad (orden_id);
create index if not exists idx_etapa_unidad on public.etapa_unidad (unidad_id);
alter table public.orden_produccion enable row level security;
alter table public.unidad enable row level security;
alter table public.plantilla_etapa enable row level security;
alter table public.etapa_unidad enable row level security;
alter table public.checklist_plantilla enable row level security;
alter table public.checklist_resultado enable row level security;
alter table public.adjunto enable row level security;
alter table public.no_conformidad enable row level security;
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies where schemaname='public' and tablename in ('orden_produccion','unidad','plantilla_etapa','etapa_unidad','checklist_plantilla','checklist_resultado','adjunto','no_conformidad')) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop; end $$;
create policy "f4_all" on public.orden_produccion for all to authenticated using (true) with check (true);
create policy "f4_all" on public.unidad for all to authenticated using (true) with check (true);
create policy "f4_all" on public.plantilla_etapa for all to authenticated using (true) with check (true);
create policy "f4_all" on public.etapa_unidad for all to authenticated using (true) with check (true);
create policy "f4_all" on public.checklist_plantilla for all to authenticated using (true) with check (true);
create policy "f4_all" on public.checklist_resultado for all to authenticated using (true) with check (true);
create policy "f4_all" on public.adjunto for all to authenticated using (true) with check (true);
create policy "f4_all" on public.no_conformidad for all to authenticated using (true) with check (true);
