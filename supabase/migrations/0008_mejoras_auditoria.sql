-- 0008 Mejoras auditoría: superficie calculada, 1 portada exacta, precios no negativos. Idempotente.
alter table public.modelo add column if not exists superficie_m2 numeric(8,2);
-- backfill superficie = largo*ancho/1e6
update public.modelo set superficie_m2 = round(largo_mm * ancho_mm / 1000000.0, 2)
  where largo_mm is not null and ancho_mm is not null;
-- una sola portada por modelo
drop index if exists uq_portada_por_modelo;
create unique index uq_portada_por_modelo on public.modelo_foto (modelo_id) where es_portada = true;
-- precios y cantidades no negativos
do $$ begin
  alter table public.modelo add constraint ck_modelo_precio check (precio_base_usd >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.opcion add constraint ck_opcion_precio check (precio_usd >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.material add constraint ck_material_costos check (costo_ultimo_usd >= 0 and costo_promedio_usd >= 0);
exception when duplicate_object then null; end $$;
