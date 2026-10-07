-- 0009 Firma digital de cotizaciones. Idempotente.
alter table public.cotizacion add column if not exists firma_url text;
alter table public.cotizacion add column if not exists firma_fecha timestamptz;
alter table public.cotizacion add column if not exists firmante_nombre text;
