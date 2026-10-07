-- FASE 7 Postventa (depende 4). Fase 6 web no crea tablas (usa lead_web). Idempotente.
create table if not exists public.ticket_postventa (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references public.unidad(id) on delete cascade,
  tipo text not null default 'reclamo' check (tipo in ('garantia','reclamo','mantenimiento')),
  descripcion text not null, estado text not null default 'abierto',
  creado_por uuid, creado_en timestamptz not null default now(), cerrado_en timestamptz
);
create index if not exists idx_ticket_unidad on public.ticket_postventa (unidad_id);
alter table public.ticket_postventa enable row level security;
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies where schemaname='public' and tablename='ticket_postventa') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop; end $$;
create policy "f7_all" on public.ticket_postventa for all to authenticated using (true) with check (true);
create policy "f7_insert_public" on public.ticket_postventa for insert to anon with check (true);
