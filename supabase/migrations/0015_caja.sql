-- 0015 Caja / Tesorería estilo DUX adaptado: apertura, movimientos, cierre con arqueo. Idempotente.
create table if not exists public.caja (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  estado text not null default 'abierta' check (estado in ('abierta','cerrada')),
  saldo_inicial_ars numeric not null default 0,
  saldo_final_contado_ars numeric,
  responsable text default '',
  abierta_en timestamptz default now(),
  cerrada_en timestamptz
);
create table if not exists public.caja_movimiento (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references public.caja(id) on delete cascade,
  tipo text not null check (tipo in ('ingreso','egreso')),
  concepto text not null,
  medio text not null default 'efectivo' check (medio in ('efectivo','transferencia','tarjeta','cheque','billetera','cuenta_corriente')),
  monto_ars numeric not null default 0 check (monto_ars >= 0),
  referencia text default '',
  creado_en timestamptz default now()
);
create index if not exists idx_caja_mov_caja on public.caja_movimiento(caja_id);
