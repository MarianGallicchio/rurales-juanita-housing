-- 0014: Obra Metrics / Cómputo — listo para configurar después.
-- No se aplica solo: cuando definas NEXT_PUBLIC_SUPABASE_URL/KEY, corre migrate.
-- Guarda proyectos de cómputo (15 rubros) + índices + auditoría mínima.

create table if not exists public.obra_proyecto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cliente text default 'Particular',
  ubicacion text default '',
  region text default 'buenos_aires',
  tipo_obra text default 'Vivienda Unifamiliar',
  sup_cubierta numeric default 0,
  sup_semi numeric default 0,
  periodo_base text default '2026-01',
  periodo_actual text default '2026-08',
  gastos_grales_pct numeric default 8,
  beneficio_pct numeric default 12,
  impuestos_pct numeric default 21,
  estado text default 'Borrador',
  datos jsonb not null default '{}'::jsonb, -- rubros+items completos (offline-first)
  creado_en timestamptz default now()
);

create table if not exists public.obra_indice (
  periodo text primary key, -- YYYY-MM
  etiqueta text not null,
  indec_gral numeric not null,
  indec_mat numeric not null,
  indec_mo numeric not null,
  indec_gg numeric not null,
  camarco numeric not null,
  uocra numeric not null,
  m2_ref_ars numeric not null
);

-- Seed mínimo (idempotente)
insert into public.obra_indice (periodo, etiqueta, indec_gral, indec_mat, indec_mo, indec_gg, camarco, uocra, m2_ref_ars)
values
 ('2026-01','Enero 2026',246.8,229.4,271.8,243.5,249.0,269.8,950000),
 ('2026-08','Agosto 2026 (Actual)',282.5,260.5,314.0,279.0,285.2,312.0,1087000)
on conflict (periodo) do nothing;
