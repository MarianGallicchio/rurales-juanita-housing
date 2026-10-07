-- 0013 Link público de cotización + modo alquiler. Idempotente.
alter table public.cotizacion add column if not exists share_token text unique;
alter table public.cotizacion add column if not exists tipo text not null default 'venta' check (tipo in ('venta','alquiler'));
update public.cotizacion set share_token = substr(md5(id::text || numero), 1, 12) where share_token is null;
