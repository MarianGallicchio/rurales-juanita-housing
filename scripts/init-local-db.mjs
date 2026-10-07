// node scripts/init-local-db.mjs — crea ./.pglite, corre Fase 0 y seed 5 usuarios
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new PGlite(path.join(root, '.pglite'));
await db.waitReady;

await db.exec(`
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key, email text);
  create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  do $$ begin create role anon; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role; exception when duplicate_object then null; end $$;
`);

let sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', '0001_fase0_base.sql'), 'utf8');
sql = sql.replace(/create extension if not exists "pgcrypto";/i, '-- pgcrypto nativo en PGlite');
try {
  await db.exec(sql);
  console.log('OK migración Fase 0');
} catch (e) {
  console.error('Error migración:', e.message);
  process.exit(1);
}

const ids = {
  admin: '11111111-1111-1111-1111-111111111111',
  ventas: '22222222-2222-2222-2222-222222222222',
  prod: '33333333-3333-3333-3333-333333333333',
  compras: '44444444-4444-4444-4444-444444444444',
  post: '55555555-5555-5555-5555-555555555555',
};
const users = [
  [ids.admin, 'admin@ruralesjuanita.local', 'Admin', 'General', 'Administrador'],
  [ids.ventas, 'ventas@ruralesjuanita.local', 'Vendedor', 'Campo', 'Ventas'],
  [ids.prod, 'produccion@ruralesjuanita.local', 'Jefe', 'Planta', 'Produccion'],
  [ids.compras, 'compras@ruralesjuanita.local', 'Resp', 'Compras', 'Compras'],
  [ids.post, 'postventa@ruralesjuanita.local', 'Resp', 'Postventa', 'Postventa'],
];
for (const [id, email] of users.map((u) => [u[0], u[1]])) {
  await db.query('insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing', [id, email]);
}
for (const [id, email, nom, ape, rol] of users) {
  await db.query(
    `insert into public.perfiles (id, email, nombre, apellido, rol) values ($1,$2,$3,$4,$5::rol_usuario)
     on conflict (id) do update set rol=excluded.rol, activo=true`,
    [id, email, nom, ape, rol]
  );
}
await db.query(
  `insert into public.tipo_cambio (fecha, valor_ars_por_usd, fuente) values ('2026-10-02', 1540.00, 'ejemplo-manual')
   on conflict (fecha) do update set valor_ars_por_usd=excluded.valor_ars_por_usd`
);

const check = await db.query('select rol, count(*)::int as n from public.perfiles group by rol order by rol');
console.log('Perfiles:', check.rows);
console.log('Listo. Entrá con cualquiera, ej. ventas@ruralesjuanita.local (sin password en local, elegí rol arriba a mano).');
await db.close();
