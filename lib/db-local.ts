// Base local sin Docker ni Postgres instalado: PGlite (Postgres WASM en archivo ./.pglite)
// Uso: npm run db:local:init una vez, después npm run dev con USE_LOCAL_DB=1
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

let db: PGlite | null = null;

export function localDataDir() {
  return path.join(process.cwd(), '.pglite');
}

export async function getLocalDb() {
  if (db) return db;
  db = new PGlite(localDataDir());
  await db.waitReady;
  // Mock mínimo de Supabase Auth para que corra el mismo SQL de Fase 0
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
    do $$ begin create role anon; exception when duplicate_object then null; end $$;
    do $$ begin create role service_role; exception when duplicate_object then null; end $$;
  `);
  return db;
}

export async function runLocalMigration() {
  const lodb = await getLocalDb();
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '0001_fase0_base.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');
  // PGlite ya trae gen_random_uuid(); si falla la extensión, la ignoramos
  sql = sql.replace(/create extension if not exists "pgcrypto";/i, '-- pgcrypto nativo en PGlite');
  await lodb.exec(sql);
  return lodb;
}

export async function seedLocal() {
  const lodb = await getLocalDb();
  const ids = {
    admin: '11111111-1111-1111-1111-111111111111',
    ventas: '22222222-2222-2222-2222-222222222222',
    prod: '33333333-3333-3333-3333-333333333333',
    compras: '44444444-4444-4444-4444-444444444444',
    post: '55555555-5555-5555-5555-555555555555',
  };
  // auth.users mock
  for (const [id, email] of [
    [ids.admin, 'admin@ruralesjuanita.local'],
    [ids.ventas, 'ventas@ruralesjuanita.local'],
    [ids.prod, 'produccion@ruralesjuanita.local'],
    [ids.compras, 'compras@ruralesjuanita.local'],
    [ids.post, 'postventa@ruralesjuanita.local'],
  ] as const) {
    await lodb.query(`insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing`, [id, email]);
  }
  const perfiles: [string, string, string, string, string][] = [
    [ids.admin, 'admin@ruralesjuanita.local', 'Admin', 'General', 'Administrador'],
    [ids.ventas, 'ventas@ruralesjuanita.local', 'Vendedor', 'Campo', 'Ventas'],
    [ids.prod, 'produccion@ruralesjuanita.local', 'Jefe', 'Planta', 'Produccion'],
    [ids.compras, 'compras@ruralesjuanita.local', 'Resp', 'Compras', 'Compras'],
    [ids.post, 'postventa@ruralesjuanita.local', 'Resp', 'Postventa', 'Postventa'],
  ];
  for (const [id, email, nom, ape, rol] of perfiles) {
    await lodb.query(
      `insert into public.perfiles (id, email, nombre, apellido, rol) values ($1,$2,$3,$4,$5::rol_usuario)
       on conflict (id) do update set rol=excluded.rol, activo=true`,
      [id, email, nom, ape, rol]
    );
  }
  await lodb.query(
    `insert into public.tipo_cambio (fecha, valor_ars_por_usd, fuente) values ('2026-10-02', 1540.00, 'ejemplo-manual')
     on conflict (fecha) do update set valor_ars_por_usd=excluded.valor_ars_por_usd`
  );
  return ids;
}

export async function queryLocal<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const lodb = await getLocalDb();
  const r = await lodb.query(sql, params as never[]);
  return (r.rows ?? []) as T[];
}

// Auditoría local: registra quién/qué/cuándo en las acciones clave (quien = admin local en dev).
export async function auditLocal(entidad: string, entidadId: string, accion: 'alta' | 'modificacion' | 'baja' | 'login', nuevo?: unknown) {
  try {
    const admin = await queryLocal<{ id: string }>(`select id from public.perfiles where rol='Administrador' limit 1`);
    await queryLocal(
      `insert into public.registro_auditoria (usuario_id, entidad, entidad_id, accion, valor_nuevo) values ($1,$2,$3,$4,$5)`,
      [admin[0]?.id ?? null, entidad, entidadId, accion, nuevo ? JSON.stringify(nuevo) : null]
    );
  } catch { /* auditoría nunca rompe la operación */ }
}
