-- FASE 2 Cotizador (depende 0,1). Idempotente.
create table if not exists public.cotizacion (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique, cliente_id uuid, version int not null default 1,
  cotizacion_origen_id uuid references public.cotizacion(id),
  estado text not null default 'borrador' check (estado in ('borrador','enviada','aceptada','rechazada','vencida')),
  tipo_cambio numeric(12,2) not null, fecha_tipo_cambio date not null default current_date,
  margen_pct numeric(5,2) not null default 25, iva_pct numeric(5,2) not null default 21,
  flete_usd numeric(12,2) not null default 0, validez_dias int not null default 15,
  plazo_entrega_dias int not null default 30, condicion_pago text default 'A convenir',
  observaciones text, subtotal_usd numeric(12,2) not null default 0,
  total_usd numeric(12,2) not null default 0, total_ars numeric(14,0) not null default 0,
  creada_por uuid, enviada_en timestamptz, creada_en timestamptz not null default now()
);
create table if not exists public.cotizacion_item (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizacion(id) on delete cascade,
  modelo_id uuid not null references public.modelo(id),
  cantidad int not null default 1 check (cantidad > 0),
  largo_mm int, ancho_mm int, alto_mm int,
  costo_materiales_usd numeric(12,2) not null default 0,
  costo_mano_obra_usd numeric(12,2) not null default 0,
  precio_unitario_usd numeric(12,2) not null default 0
);
create table if not exists public.cotizacion_item_opcion (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.cotizacion_item(id) on delete cascade,
  opcion_id uuid not null references public.opcion(id),
  cantidad numeric(10,2) not null default 1, precio_usd numeric(12,2) not null default 0
);
create table if not exists public.cotizacion_envio (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizacion(id) on delete cascade,
  canal text not null, destinatario text, fecha_hora timestamptz not null default now(), enviado_por uuid
);
create table if not exists public.cotizacion_aprobacion (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizacion(id) on delete cascade,
  motivo text, margen_solicitado numeric(5,2), aprobado_por uuid, estado text not null default 'pendiente'
);
create index if not exists idx_cot_estado on public.cotizacion (estado);
create index if not exists idx_cot_numero on public.cotizacion (numero);
create index if not exists idx_cotitem_cot on public.cotizacion_item (cotizacion_id);
alter table public.cotizacion enable row level security;
alter table public.cotizacion_item enable row level security;
alter table public.cotizacion_item_opcion enable row level security;
alter table public.cotizacion_envio enable row level security;
alter table public.cotizacion_aprobacion enable row level security;
do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies where schemaname='public' and tablename like 'cotizacion%') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop; end $$;
create policy "f2_all" on public.cotizacion for all to authenticated using (true) with check (true);
create policy "f2_all" on public.cotizacion_item for all to authenticated using (true) with check (true);
create policy "f2_all" on public.cotizacion_item_opcion for all to authenticated using (true) with check (true);
create policy "f2_all" on public.cotizacion_envio for all to authenticated using (true) with check (true);
create policy "f2_all" on public.cotizacion_aprobacion for all to authenticated using (true) with check (true);
