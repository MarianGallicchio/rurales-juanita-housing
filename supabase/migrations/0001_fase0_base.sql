-- FASE 0 — Base del sistema
-- Rurales Juanita & H.M Housing Module | 9 de Julio, Buenos Aires
-- Stack: PostgreSQL 15+ (Supabase), zona horaria America/Argentina/Buenos_Aires
-- Ejecutar en Supabase SQL Editor. Idempotente: se puede correr 2 veces.

-- 0. Extensiones
create extension if not exists "pgcrypto";

-- 1. Tipos
do $$ begin
  create type rol_usuario as enum ('Administrador','Ventas','Produccion','Compras','Postventa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type accion_auditoria as enum ('alta','modificacion','baja','login');
exception when duplicate_object then null; end $$;

-- 2. Tablas base
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nombre text not null,
  apellido text not null,
  rol rol_usuario not null,
  activo boolean not null default true,
  telefono text,
  ultimo_acceso timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists public.roles_permisos (
  rol rol_usuario not null,
  modulo text not null, -- catalogo, cotizador, crm, produccion, stock, web, postventa, panel, usuarios, config
  puede_ver boolean not null default false,
  puede_crear boolean not null default false,
  puede_editar boolean not null default false,
  puede_borrar boolean not null default false,
  primary key (rol, modulo)
);

create table if not exists public.registro_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles(id),
  entidad text not null,
  entidad_id text not null,
  accion accion_auditoria not null,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  fecha_hora timestamptz not null default now(),
  ip text
);

create table if not exists public.configuracion (
  clave text primary key,
  valor text not null,
  descripcion text,
  actualizado_por uuid references public.perfiles(id),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.empresa (
  id smallint primary key default 1 check (id = 1),
  razon_social text not null default 'Rurales Juanita & H.M Housing Module',
  cuit text,
  domicilio text default '9 de Julio, Provincia de Buenos Aires, Argentina',
  telefonos text default '2317-472390 / 457298',
  email text,
  logo_url text,
  pie_pdf text default 'Rurales Juanita & H.M Housing Module — 9 de Julio, Bs. As. | ISO 9001 (Bureau Veritas)',
  actualizado_en timestamptz not null default now()
);

create table if not exists public.tipo_cambio (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  valor_ars_por_usd numeric(12,2) not null check (valor_ars_por_usd > 0),
  fuente text not null default 'manual',
  cargado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now(),
  unique (fecha)
);

-- Índices (RLS rápido)
create index if not exists idx_perfiles_rol on public.perfiles (rol);
create index if not exists idx_perfiles_email on public.perfiles (email);
create index if not exists idx_auditoria_entidad on public.registro_auditoria (entidad, entidad_id);
create index if not exists idx_auditoria_fecha on public.registro_auditoria (fecha_hora desc);
create index if not exists idx_tipocambio_fecha on public.tipo_cambio (fecha desc);

-- 3. Funciones helper (security definer para RLS sin recursión)
create or replace function public.mi_rol()
returns rol_usuario
language sql stable security definer set search_path = public
as $$ select rol from public.perfiles where id = auth.uid() $$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'Administrador') $$;

-- Función de auditoría reutilizable (llamar desde trigger o desde app en misma transacción)
create or replace function public.registrar_auditoria(
  p_entidad text, p_entidad_id text, p_accion accion_auditoria,
  p_anterior jsonb, p_nuevo jsonb, p_ip text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.registro_auditoria (usuario_id, entidad, entidad_id, accion, valor_anterior, valor_nuevo, ip)
  values (auth.uid(), p_entidad, p_entidad_id, p_accion, p_anterior, p_nuevo, p_ip);
end $$;

-- 4. RLS
alter table public.perfiles enable row level security;
alter table public.roles_permisos enable row level security;
alter table public.registro_auditoria enable row level security;
alter table public.configuracion enable row level security;
alter table public.empresa enable row level security;
alter table public.tipo_cambio enable row level security;

-- Limpieza idempotente de policies
do $$ declare r record; begin
  for r in (select policyname from pg_policies where schemaname='public' and tablename in ('perfiles','roles_permisos','registro_auditoria','configuracion','empresa','tipo_cambio')) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, (select tablename from pg_policies where policyname=r.policyname limit 1));
  end loop; end $$;

-- perfiles: cada uno lee el suyo, admin todo
create policy "perfiles_self_read" on public.perfiles for select to authenticated using ((select auth.uid()) = id or (select public.es_admin()));
create policy "perfiles_admin_write" on public.perfiles for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- roles_permisos: lectura autenticada, escritura solo admin
create policy "roles_read" on public.roles_permisos for select to authenticated using (true);
create policy "roles_admin_write" on public.roles_permisos for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- auditoría: solo inserción + lectura admin (nadie edita ni borra)
create policy "auditoria_insert" on public.registro_auditoria for insert to authenticated with check (true);
create policy "auditoria_admin_read" on public.registro_auditoria for select to authenticated using ((select public.es_admin()));

-- configuracion/empresa/tipo_cambio: lectura autenticada, escritura admin (tipo_cambio también Ventas puede leer; escribe admin)
create policy "config_read" on public.configuracion for select to authenticated using (true);
create policy "config_admin_write" on public.configuracion for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "empresa_read" on public.empresa for select to authenticated using (true);
create policy "empresa_admin_write" on public.empresa for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "tc_read" on public.tipo_cambio for select to authenticated using (true);
create policy "tc_admin_write" on public.tipo_cambio for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- 5. Matriz de permisos seed (editable solo por Admin desde UI)
insert into public.roles_permisos (rol, modulo, puede_ver, puede_crear, puede_editar, puede_borrar) values
 ('Administrador','catalogo',true,true,true,true),('Administrador','cotizador',true,true,true,true),
 ('Administrador','crm',true,true,true,true),('Administrador','produccion',true,true,true,true),
 ('Administrador','stock',true,true,true,true),('Administrador','web',true,true,true,true),
 ('Administrador','postventa',true,true,true,true),('Administrador','panel',true,true,true,true),
 ('Administrador','usuarios',true,true,true,true),('Administrador','config',true,true,true,true),
 ('Ventas','catalogo',true,false,false,false),('Ventas','cotizador',true,true,true,false),
 ('Ventas','crm',true,true,true,false),('Ventas','produccion',true,false,false,false),
 ('Ventas','stock',true,false,false,false),('Ventas','web',true,false,false,false),
 ('Ventas','postventa',true,false,false,false),('Ventas','panel',true,false,false,false),
 ('Produccion','catalogo',true,false,false,false),('Produccion','cotizador',true,false,false,false),
 ('Produccion','crm',false,false,false,false),('Produccion','produccion',true,true,true,false),
 ('Produccion','stock',true,true,false,false),('Produccion','postventa',true,false,false,false),
 ('Produccion','panel',true,false,false,false),
 ('Compras','catalogo',true,false,false,false),('Compras','stock',true,true,true,false),
 ('Compras','produccion',true,false,false,false),('Compras','panel',true,false,false,false),
 ('Postventa','postventa',true,true,true,false),('Postventa','produccion',true,false,false,false),
 ('Postventa','crm',true,false,false,false),('Postventa','panel',true,false,false,false)
on conflict (rol, modulo) do update set puede_ver=excluded.puede_ver, puede_crear=excluded.puede_crear,
  puede_editar=excluded.puede_editar, puede_borrar=excluded.puede_borrar;

-- 6. Config + empresa por defecto
insert into public.configuracion (clave, valor, descripcion) values
 ('IVA_PCT','21','Alícuota IVA por defecto. Confirmar con contador.'),
 ('MARGEN_MIN_PCT','15','Margen mínimo. Debajo requiere aprobación Admin.'),
 ('VALIDEZ_COTIZ_DIAS','15','Validez por defecto de cotizaciones.'),
 ('MONEDA_CATALOGO','USD','Moneda de catálogo. No cambiar sin migración.'),
 ('TC_MAX_HORAS','24','Alerta si tipo de cambio más viejo que X horas.')
on conflict (clave) do nothing;

insert into public.empresa (id) values (1) on conflict (id) do nothing;
insert into public.tipo_cambio (fecha, valor_ars_por_usd, fuente) values (current_date, 1540.00, 'ejemplo-manual-02/10/2026')
on conflict (fecha) do nothing;
