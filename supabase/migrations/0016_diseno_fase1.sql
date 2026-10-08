-- 0016 Fase 1 rediseño: objetivo mensual Dirección + canal de origen para leads web. Aditivo, sin romper nada.
insert into public.configuracion (clave, valor, descripcion) values
  ('OBJETIVO_VENTAS_MENSUAL_USD','120000','Objetivo mensual de ventas aceptadas en USD. Lo usa el tablero de Dirección.')
on conflict (clave) do nothing;
alter table public.lead_web add column if not exists canal text default 'web';
