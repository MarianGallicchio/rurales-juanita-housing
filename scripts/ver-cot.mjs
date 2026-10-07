import { PGlite } from '@electric-sql/pglite';
const db = new PGlite('./.pglite');
await db.waitReady;
const r = await db.query("select id, estado from public.cotizacion where numero='COT-2026-0001'");
console.log('COT:', r.rows[0].id, r.rows[0].estado);
await db.close();
