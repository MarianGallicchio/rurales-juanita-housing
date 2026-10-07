// node scripts/migrate-local.mjs — corre 0001..0007 en ./.pglite
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
const files = ['0001_fase0_base.sql','0002_fase1_catalogo.sql','0003_fase2_cotizador.sql','0004_fase3_crm.sql','0005_fase4_produccion.sql','0006_fase5_stock.sql','0007_fase7_postventa.sql','0008_mejoras_auditoria.sql','0009_firma_digital.sql','0010_garantia_manuales.sql','0011_arca.sql','0012_iva_pin_arca.sql','0013_share_alquiler.sql','0014_obra_computo.sql'];
for (const f of files) {
  let sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', f), 'utf8');
  sql = sql.replace(/create extension if not exists "pgcrypto";/i, '-- pgcrypto nativo');
  try { await db.exec(sql); console.log('OK', f); }
  catch (e) { console.error('FAIL', f, e.message); process.exit(1); }
}
await db.close();
console.log('Migración completa.');
