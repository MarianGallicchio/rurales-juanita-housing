// node scripts/seed-fases.mjs — datos ejemplo Fases 1-8 (idempotente por codigo/numero)
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new PGlite(path.join(root, '.pglite'));
await db.waitReady;
const q = (s, p = []) => db.query(s, p);
const one = async (s, p = []) => (await q(s, p)).rows[0];

// --- F1 categorías
const cats = [
  ['Trailers', 'trailers', 'Semirremolque, petrolero, tipo contenedor', 1],
  ['Contenedor técnico', 'contenedor-tecnico', 'Laboratorios, usinas, offshore, talleres', 2],
  ['Shelters', 'shelters', 'Tridimensionales, mini, TKR antivandálicos', 3],
  ['Box modular', 'box-modular', 'Box 15 m2 descanso para estaciones de servicio', 4],
  ['Módulo habitacional', 'modulo-habitacional', 'Módulos y casillas rurales agro', 5],
];
for (const [n, slug, d, o] of cats) {
  await q(`insert into public.categoria (nombre, slug, descripcion, orden) values ($1,$2,$3,$4)
    on conflict (slug) do update set nombre=excluded.nombre`, [n, slug, d, o]);
}
const trailers = one(`select id from public.categoria where slug='trailers'`);
const box = one(`select id from public.categoria where slug='box-modular'`);
const catT = await trailers, catB = await box;

// --- F1 modelos
await q(`insert into public.modelo (categoria_id, codigo, nombre, descripcion, largo_mm, ancho_mm, alto_mm, peso_kg, sistema_constructivo, precio_base_usd)
  values ($1,'TR-SEMI-12','Semirremolque 12m','Caja 12.000mm, chasis 2 vigas doble T 300mm, eje 12t, ABS',15300,2600,3000,8500,'Panel antigolpes',28500)
  on conflict (codigo) do update set precio_base_usd=excluded.precio_base_usd`, [catT.id]);
await q(`insert into public.modelo (categoria_id, codigo, nombre, descripcion, largo_mm, ancho_mm, alto_mm, peso_kg, sistema_constructivo, precio_base_usd)
  values ($1,'BOX-15-A','Box modular 15m2 A','1 cama 2 plazas, baño completo, kitchenette',6000,2500,2800,3200,'Autoportante poliuretano',18500)
  on conflict (codigo) do update set precio_base_usd=excluded.precio_base_usd`, [catB.id]);
await q(`insert into public.modelo (categoria_id, codigo, nombre, descripcion, largo_mm, ancho_mm, alto_mm, precio_base_usd)
  values ($1,'MOD-AGRO-9','Módulo habitacional 9m','Casilla rural dormitorio+baño',9000,3000,2800,22000)
  on conflict (codigo) do update set precio_base_usd=excluded.precio_base_usd`, [(await one(`select id from public.categoria where slug='modulo-habitacional'`)).id]);

// --- F1 opciones (16)
const ops = [
  ['transporte','Patín petrolero / skid','Apoyo petrolero',1200,'fijo'],
  ['transporte','Tren rodante con lanza','Traslado rural',1800,'fijo'],
  ['transporte','Carretón deprimido (flete)','Flete larga distancia',1800,'fijo'],
  ['izaje','Cárcamos de izaje','4 puntos certificados',450,'fijo'],
  ['constructivo','Panel antigolpes','Refuerzo perimetral',950,'por_m2'],
  ['climatizacion','Aire acondicionado 3500W','Frío/calor',890,'por_unidad'],
  ['climatizacion','Calefacción tiro balanceado','',620,'por_unidad'],
  ['electrica','Instalación 220V completa','Tablero + llaves',700,'fijo'],
  ['electrica','Grupo electrógeno 7kVA','Autonomía',3200,'fijo'],
  ['seguridad','Detector de humo','',120,'por_unidad'],
  ['seguridad','Barra antipánico','Puerta salida',210,'por_unidad'],
  ['amoblamiento','Cama 2 plazas','Con colchón',550,'por_unidad'],
  ['amoblamiento','Kitchenette','Bacha + anafe',680,'fijo'],
  ['amoblamiento','Baño completo','Inodoro + ducha',1400,'fijo'],
  ['aislacion','Poliuretano alta densidad 50mm','Térmico/acústico',38,'por_m2'],
  ['aberturas','Abertura DVH','Ventana 100x100',340,'por_unidad'],
];
for (const [g, n, d, p, t] of ops) {
  await q(`insert into public.opcion (grupo, nombre, descripcion, precio_usd, tipo_precio)
    values ($1,$2,$3,$4,$5) on conflict do nothing`, [g, n, d, p, t]);
}
// vincular algunas al semirremolque
const modSemi = await one(`select id from public.modelo where codigo='TR-SEMI-12'`);
const opIds = (await q(`select id from public.opcion limit 10`)).rows;
for (const o of opIds) {
  await q(`insert into public.modelo_opcion (modelo_id, opcion_id) values ($1,$2) on conflict do nothing`, [modSemi.id, o.id]);
}
// ficha técnica semirremolque
const ficha = [['Estructura','Chasis','2 vigas doble T 300mm'],['Ejes','Eje tubular','12t con ballestas'],['Frenos','ABS','2 patas mecánicas'],['Caja','Largo','12.000mm']];
for (let i = 0; i < ficha.length; i++) {
  await q(`insert into public.ficha_tecnica_item (modelo_id, grupo, item, especificacion, orden) values ($1,$2,$3,$4,$5) on conflict do nothing`,
    [modSemi.id, ficha[i][0], ficha[i][1], ficha[i][2], i]);
}

// --- F4 plantilla etapas + checklists
const catIds = (await q(`select id from public.categoria`)).rows;
const etapas = ['Estructura','Base de piso','Aislación','Instalación eléctrica y agua','Revestimiento','Aberturas','Amoblamiento','Terminación','Control final','Despacho'];
for (const c of catIds) {
  const n = (await q(`select count(*)::int as n from public.plantilla_etapa where categoria_id=$1`, [c.id])).rows[0].n;
  if (n === 0) for (let i = 0; i < etapas.length; i++)
    await q(`insert into public.plantilla_etapa (categoria_id, orden, nombre) values ($1,$2,$3)`, [c.id, i + 1, etapas[i]]);
}
const et = (await q(`select id from public.plantilla_etapa limit 1`)).rows[0];
if (et) {
  const items = [['Soldadura continua','Sin poros','true'],['Escuadra chasis','±3mm','true'],['Pintura anticorrosiva','2 manos','false']];
  for (let i = 0; i < items.length; i++)
    await q(`insert into public.checklist_plantilla (plantilla_etapa_id, orden, item, criterio_aceptacion, critico) values ($1,$2,$3,$4,$5) on conflict do nothing`,
      [et.id, i, items[i][0], items[i][1], items[i][2] === 'true']);
}

// --- F5 materiales + proveedor
const mats = [['CANO-40','Caño estructural 40x40','acero','m',50,180],['CHAPA-09','Chapa conformada','acero','m2',30,95],['OSB-18','OSB 18mm','madera','m2',40,22],['PE-10','Polietileno expandido','aislacion','m2',100,6],['VIN-20','Piso vinílico','terminacion','m2',60,14],['AB-DVH','Abertura DVH 100x100','aberturas','u',8,340],['AA-35','Aire 3500W','clima','u',4,890]];
for (const [cod, nom, cat, um, min, costo] of mats) {
  await q(`insert into public.material (codigo, nombre, categoria, unidad_medida, stock_minimo, costo_ultimo_usd, costo_promedio_usd)
    values ($1,$2,$3,$4,$5,$6,$6) on conflict (codigo) do update set costo_ultimo_usd=excluded.costo_ultimo_usd`, [cod, nom, cat, um, min, costo]);
}
await q(`insert into public.proveedor (razon_social, contacto, plazo_entrega_dias) values ('Acersur SRL','compras@acersur.local',7) on conflict do nothing`);
await q(`insert into public.movimiento_stock (material_id, tipo, cantidad, referencia_tipo, costo_unitario)
  select id, 'entrada', 100, 'seed', costo_ultimo_usd from public.material on conflict do nothing`);

// --- F3 cliente demo + oportunidad
await q(`insert into public.cliente (razon_social, cuit, tipo, provincia) values ('Pluspetrol Demo','30-12345678-1','operadora','Neuquén')
  on conflict (cuit) do update set razon_social=excluded.razon_social`);
const cli = await one(`select id from public.cliente where cuit='30-12345678-1'`);
await q(`insert into public.contacto (cliente_id, nombre, cargo, email, principal) values ($1,'Contacto Obra','Jefe de base','obra@pluspetrol-demo.local',true) on conflict do nothing`, [cli.id]);
await q(`insert into public.oportunidad (cliente_id, titulo, etapa, valor_estimado_usd, probabilidad_pct, origen) values ($1,'Campamento 4 módulos','consulta',90000,20,'visita') on conflict do nothing`, [cli.id]);

// --- F2 cotización demo COT-2026-0001 (verifica fórmula del doc)
const tc = 1540, margen = 25, iva = 21, flete = 1800, mat = 18000, mo = 4500;
const sub = (mat + mo) * 1.25 + flete, tot = Math.round(sub * 1.21 * 100) / 100, ars = Math.round(tot * tc);
await q(`insert into public.cotizacion (numero, cliente_id, estado, tipo_cambio, fecha_tipo_cambio, margen_pct, iva_pct, flete_usd, subtotal_usd, total_usd, total_ars, condicion_pago)
  values ('COT-2026-0001',$1,'enviada',$2,'2026-10-02',$3,$4,$5,$6,$7,$8,'30/70') on conflict (numero) do nothing`,
  [cli.id, tc, margen, iva, flete, sub, tot, ars]);
console.log('Seed OK. COT demo total USD', tot, 'ARS', ars);
await db.close();
