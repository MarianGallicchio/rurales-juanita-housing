-- FASE 3 CRM (depende 0,2). Idempotente.
create table if not exists public.cliente (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null, cuit text unique, tipo text not null default 'otro',
  rubro text, domicilio text, provincia text default 'Buenos Aires', web text,
  estado text not null default 'activo', responsable_id uuid, creado_en timestamptz not null default now()
);
create table if not exists public.contacto (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.cliente(id) on delete cascade,
  nombre text not null, cargo text, email text, telefono text, whatsapp text,
  principal boolean not null default false, notas text
);
create table if not exists public.oportunidad (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.cliente(id) on delete cascade,
  titulo text not null, etapa text not null default 'consulta'
    check (etapa in ('consulta','cotizado','negociacion','ganado','perdido')),
  valor_estimado_usd numeric(12,2) default 0, probabilidad_pct int default 20,
  fecha_cierre_estimada date, responsable_id uuid, origen text default 'visita',
  motivo_perdida text, creado_en timestamptz not null default now()
);
create table if not exists public.tarea (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references public.oportunidad(id) on delete cascade,
  cliente_id uuid references public.cliente(id) on delete cascade,
  titulo text not null, vence_en date, asignada_a uuid, completada_en timestamptz, prioridad text default 'media'
);
create table if not exists public.nota (
  id uuid primary key default gen_random_uuid(),
  entidad text not null, entidad_id uuid not null, texto text not null,
  autor_id uuid, creada_en timestamptz not null default now()
);
create table if not exists public.homologacion (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.cliente(id) on delete cascade,
  estado text not null default 'en_tramite', fecha_aprobacion date, vencimiento date,
  documento_url text, observaciones text
);
create table if not exists public.lead_web (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, empresa text, email text, telefono text, mensaje text,
  origen_url text, fecha timestamptz not null default now(), convertido_en_cliente_id uuid references public.cliente(id)
);
create index if not exists idx_oport_etapa on public.oportunidad (etapa);
create index if not exists idx_tarea_vence on public.tarea (vence_en);
alter table public.cliente enable row level security;
alter table public.contacto enable row level security;
alter table public.oportunidad enable row level security;
alter table public.tarea enable row level security;
alter table public.nota enable row level security;
alter table public.homologacion enable row level security;
alter table public.lead_web enable row level security;
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies where schemaname='public' and tablename in ('cliente','contacto','oportunidad','tarea','nota','homologacion','lead_web')) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop; end $$;
create policy "f3_all" on public.cliente for all to authenticated using (true) with check (true);
create policy "f3_all" on public.contacto for all to authenticated using (true) with check (true);
create policy "f3_all" on public.oportunidad for all to authenticated using (true) with check (true);
create policy "f3_all" on public.tarea for all to authenticated using (true) with check (true);
create policy "f3_all" on public.nota for all to authenticated using (true) with check (true);
create policy "f3_all" on public.homologacion for all to authenticated using (true) with check (true);
create policy "f3_insert" on public.lead_web for insert to anon, authenticated with check (true);
create policy "f3_read" on public.lead_web for select to authenticated using (true);
create policy "f3_update" on public.lead_web for update to authenticated using (true) with check (true);
