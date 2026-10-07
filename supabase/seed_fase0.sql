-- SEED Fase 0 — correr DESPUÉS de crear los 5 usuarios en Auth (email+password) y copiar sus UUIDs.
-- Usuarios sugeridos (contraseñas temporales, cambiar al primer login):
-- admin@ruralesjuanita.local / ventas@ / produccion@ / compras@ / postventa@

-- Ejemplo: reemplazá los UUID por los reales de auth.users
-- insert into public.perfiles (id, email, nombre, apellido, rol) values
--  ('UUID-ADMIN','admin@ruralesjuanita.local','Admin','General','Administrador'),
--  ('UUID-VENTAS','ventas@ruralesjuanita.local','Vendedor','Campo','Ventas'),
--  ('UUID-PROD','produccion@ruralesjuanita.local','Jefe','Planta','Produccion'),
--  ('UUID-COMP','compras@ruralesjuanita.local','Resp','Compras','Compras'),
--  ('UUID-POST','postventa@ruralesjuanita.local','Resp','Postventa','Postventa')
-- on conflict (id) do update set rol=excluded.rol, activo=true;

-- Config verificable para Cotizador (ejemplo del doc: 1540 del 02/10/2026)
insert into public.tipo_cambio (fecha, valor_ars_por_usd, fuente) values ('2026-10-02', 1540.00, 'ejemplo-manual')
on conflict (fecha) do update set valor_ars_por_usd=excluded.valor_ars_por_usd;

-- Test RLS: Ventas NO debe leer movimientos de stock (cuando exista Fase 5).
-- Verificación manual: logueado como Ventas, correr: select * from public.registro_auditoria limit 1; -> 0 filas (solo admin).
-- Logueado como Admin: select * from public.registro_auditoria; -> ok.
