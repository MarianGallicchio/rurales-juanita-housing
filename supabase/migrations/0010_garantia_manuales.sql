-- 0010 Garantía por unidad + manuales por modelo. Idempotente.
alter table public.unidad add column if not exists fecha_entrega date;
alter table public.unidad add column if not exists garantia_hasta date;
alter table public.modelo add column if not exists manual_url text;
insert into public.configuracion (clave, valor, descripcion) values
 ('MESES_GARANTIA','12','Meses de garantía por unidad desde entrega.')
on conflict (clave) do nothing;
-- al despachar/registrar entrega se calcula garantía en app: entrega + meses
