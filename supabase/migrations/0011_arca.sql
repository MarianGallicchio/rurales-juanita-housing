-- 0011 Facturación ARCA (estructura lista; CAE real requiere certificado + homologación). Idempotente.
create table if not exists public.comprobante (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique, -- interno: FAC-AAAA-0001
  cotizacion_id uuid references public.cotizacion(id),
  cliente_id uuid references public.cliente(id),
  tipo text not null default 'B', -- A/B/C/E
  total_usd numeric(12,2) not null default 0, total_ars numeric(14,0) not null default 0,
  tipo_cambio numeric(12,2), cae text, vto_cae date,
  estado text not null default 'borrador' check (estado in ('borrador','cae_simulado','aprobado','rechazado')),
  qr_texto text, creada_en timestamptz not null default now()
);
alter table public.comprobante enable row level security;
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename='comprobante') loop
    execute format('drop policy if exists %I on public.comprobante', r.policyname);
  end loop; end $$;
create policy "f11_all" on public.comprobante for all to authenticated using (true) with check (true);
insert into public.configuracion (clave, valor, descripcion) values
 ('CUIT_EMPRESA','','CUIT para ARCA. Obligatorio antes de homologar.'),
 ('ARCA_MODO','simulado','simulado = CAE de prueba local. homologacion/produccion requieren certificado.'),
 ('ARCA_PTO_VTA','1','Punto de venta ARCA.')
on conflict (clave) do nothing;
