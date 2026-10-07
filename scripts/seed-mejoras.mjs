// node scripts/seed-mejoras.mjs — corrige los 9 fallos del validador (idempotente)
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new PGlite(path.join(root, '.pglite'));
await db.waitReady;
const q = (s, p = []) => db.query(s, p);
const one = async (s, p = []) => (await q(s, p)).rows[0];

// 1. Fotos: 1 portada + 1 extra por modelo (placeholder local, reemplazar por fotos reales)
for (const cod of ['TR-SEMI-12', 'BOX-15-A', 'MOD-AGRO-9']) {
  const m = await one(`select id from public.modelo where codigo=$1`, [cod]);
  if (!m) continue;
  await q(`insert into public.modelo_foto (modelo_id, url, leyenda, orden, es_portada)
    values ($1, $2, 'Vista general', 0, true) on conflict do nothing`, [m.id, `/fotos/${cod}-portada.jpg`]);
  await q(`insert into public.modelo_foto (modelo_id, url, leyenda, orden, es_portada)
    values ($1, $2, 'Detalle interior', 1, false) on conflict do nothing`, [m.id, `/fotos/${cod}-02.jpg`]);
}
// 2. Fichas BOX + MOD
const box = await one(`select id from public.modelo where codigo='BOX-15-A'`);
const boxItems = [['Estructura','Bastidor','Patín petrolero / skid'],['Superficie','Planta','15 m²'],['Dormitorio','Cama','1 de 2 plazas o 2 de 1 plaza'],['Sanitario','Baño','Completo con ducha'],['Cocina','Kitchenette','Bacha + anafe']];
for (let i = 0; i < boxItems.length; i++)
  await q(`insert into public.ficha_tecnica_item (modelo_id, grupo, item, especificacion, orden) values ($1,$2,$3,$4,$5) on conflict do nothing`, [box.id, ...boxItems[i], i]);
const agro = await one(`select id from public.modelo where codigo='MOD-AGRO-9'`);
const agroItems = [['Estructura','Bastidor','Perfil perimetral'],['Medidas','Planta','9.000 x 3.000 mm'],['Aislación','Muro','Poliuretano 50mm + termofoil'],['Instalación','Eléctrica','220V + ventilación']];
for (let i = 0; i < agroItems.length; i++)
  await q(`insert into public.ficha_tecnica_item (modelo_id, grupo, item, especificacion, orden) values ($1,$2,$3,$4,$5) on conflict do nothing`, [agro.id, ...agroItems[i], i]);

// 3. Ítem faltante de COT-2026-0001 (mat 18000 + mo 4500 = fórmula exacta)
const cot = await one(`select id from public.cotizacion where numero='COT-2026-0001'`);
const semi = await one(`select id from public.modelo where codigo='TR-SEMI-12'`);
const nItems = (await q(`select count(*)::int n from public.cotizacion_item where cotizacion_id=$1`, [cot.id])).rows[0].n;
if (nItems === 0) {
  await q(`insert into public.cotizacion_item (cotizacion_id, modelo_id, cantidad, costo_materiales_usd, costo_mano_obra_usd, precio_unitario_usd)
    values ($1,$2,1,18000,4500,28125)`, [cot.id, semi.id]);
  console.log('OK ítem COT-2026-0001');
}
// precio historial del modelo (congelar referencia)
await q(`insert into public.precio_historial (entidad, entidad_id, precio_usd) values ('modelo',$1,28500) on conflict do nothing`, [semi.id]);

// 4. Flujo completo demo: aceptar COT → OP + unidad + etapas instanciadas
await q(`update public.cotizacion set estado='aceptada' where numero='COT-2026-0001' and estado<>'aceptada'`);
let op = await one(`select id, numero from public.orden_produccion where cotizacion_id=$1`, [cot.id]);
if (!op) {
  const n = (await q(`select count(*)::int n from public.orden_produccion`)).rows[0].n + 1;
  op = (await q(`insert into public.orden_produccion (numero, cotizacion_id, cliente_id, estado, fecha_inicio) values ($1,$2,(select cliente_id from public.cotizacion where id=$2),'en_produccion',current_date) returning id, numero`, [`OP-2026-${String(n).padStart(4, '0')}`, cot.id])).rows[0];
}
let und = await one(`select id, modelo_id from public.unidad where orden_id=$1`, [op.id]);
if (!und) {
  und = (await q(`insert into public.unidad (orden_id, modelo_id, numero_serie, etapa_actual) values ($1,$2,$3,'Estructura') returning id, modelo_id`, [op.id, semi.id, 'RJ-26-0001-001'])).rows[0];
}
const nEt = (await q(`select count(*)::int n from public.etapa_unidad where unidad_id=$1`, [und.id])).rows[0].n;
if (nEt === 0) {
  const plants = (await q(`select pe.id from public.plantilla_etapa pe join public.modelo m on m.categoria_id=pe.categoria_id where m.id=$1 order by pe.orden`, [und.modelo_id])).rows;
  for (const p of plants) await q(`insert into public.etapa_unidad (unidad_id, plantilla_etapa_id, estado) values ($1,$2,'pendiente')`, [und.id, p.id]);
  console.log(`OK ${plants.length} etapas instanciadas en ${'RJ-26-0001-001'}`);
}
// superficie backfill
await q(`update public.modelo set superficie_m2 = round(largo_mm*ancho_mm/1000000.0,2) where superficie_m2 is null and largo_mm is not null`);
console.log('Seed mejoras OK');
await db.close();
