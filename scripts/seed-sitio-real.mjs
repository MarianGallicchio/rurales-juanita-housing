// node scripts/seed-sitio-real.mjs — alinea la base con ruralesjuanita.com.ar (idempotente)
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new PGlite(path.join(root, '.pglite'));
await db.waitReady;
const q = (s, p = []) => db.query(s, p);
const one = async (s, p = []) => (await q(s, p)).rows[0];

// CUITs demostrativos con dígito válido (reemplazar por reales de AFIP al homologar)
function cuit(base10) {
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let s = 0; for (let i = 0; i < 10; i++) s += Number(base10[i]) * mult[i];
  let v = 11 - (s % 11); if (v === 11) v = 0; if (v === 10) v = 9;
  const d = base10 + v;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

// 1. Empresa real
await q(`update public.empresa set razon_social='Rurales Juanita & H.M Housing Module',
  domicilio='Ruta 65 km 177,9 — 9 de Julio, Buenos Aires, Argentina',
  telefonos='2317-472390 / 457298', email='Ventas@ruralesjuanita.com.ar',
  pie_pdf='Rurales Juanita & H.M Housing Module — Ruta 65 km 177,9, 9 de Julio, Bs.As. | ISO 9001 (Bureau Veritas) | Lun–Vie 8–17h'
  where id=1`);

// 2. Categorías = las 6 líneas + petroleros (renombra conservando modelos)
const cats = [
  ['trailers', 'Petroleros', 'petroleros', 'Campamentos y obradores: dormitorios, oficinas, company man homologados', 1],
  ['contenedor-tecnico', 'Contenedores Técnicos', 'contenedores-tecnicos', 'Laboratorios, usinas de autogeneración, offshore y talleres', 2],
  ['shelters', 'Shelters', 'shelters', 'Tridimensionales, mini, rodantes y antivandálicos para radar y telecom', 3],
  ['box-modular', 'Módulos Habitacionales', 'modulos-habitacionales', 'Box de descanso, oficinas y viviendas de 15 m² con baño y kitchenette', 4],
  ['modulo-habitacional', 'Casa de Campo', 'casa-de-campo', 'Viviendas de campo listas para habitar', 5],
  ['casillas-rurales', 'Casillas Rurales RS · MB · PREMIUM', 'casillas-rurales', 'Gama alta de campo, terminaciones superiores', 6],
  ['oficinas', 'Oficinas Modulares', 'oficinas-modulares', 'Ambientes climatizados para administración y control', 7],
];
for (const [oldSlug, nombre, slug, desc, orden] of cats) {
  const ex = await one(`select id from public.categoria where slug=$1 or nombre=$2`, [oldSlug, nombre]);
  if (ex) await q(`update public.categoria set nombre=$2, slug=$3, descripcion=$4, orden=$5 where id=$1`, [ex.id, nombre, slug, desc, orden]);
  else await q(`insert into public.categoria (nombre, slug, descripcion, orden) values ($1,$2,$3,$4)`, [nombre, slug, desc, orden]);
}

// 3. Modelos nuevos (oficina, casa, casilla premium)
const catId = async (slug) => (await one(`select id from public.categoria where slug=$1`, [slug])).id;
await q(`insert into public.modelo (categoria_id, codigo, nombre, descripcion, largo_mm, ancho_mm, alto_mm, superficie_m2, sistema_constructivo, precio_base_usd)
  values ($1,'OFI-6','Oficina modular 6m','Administración y control climatizada, lista en el día',6000,2500,2800,15,'Autoportante poliuretano',14800)
  on conflict (codigo) do nothing`, [await catId('oficinas-modulares')]);
await q(`insert into public.modelo (categoria_id, codigo, nombre, descripcion, largo_mm, ancho_mm, alto_mm, superficie_m2, sistema_constructivo, precio_base_usd)
  values ($1,'CASA-9','Casa de campo 9m','Cocina, baño e instalaciones terminadas, lista para habitar',9000,3000,2800,27,'Panel antigolpes',24000)
  on conflict (codigo) do nothing`, [await catId('casa-de-campo')]);
await q(`insert into public.modelo (categoria_id, codigo, nombre, descripcion, largo_mm, ancho_mm, alto_mm, superficie_m2, sistema_constructivo, precio_base_usd)
  values ($1,'CAS-RS','Casilla rural RS','Gama alta: terminaciones y equipamiento superiores',7500,2800,2700,21,'Panel antigolpes',19900)
  on conflict (codigo) do nothing`, [await catId('casillas-rurales')]);

// 4. Ficha técnica real (RJ-SR-300, RJ-MH-01, 220V + Aqua-System) en modelos clave
const fichaReal = [
  ['Estructura', 'Chasis RJ-SR-300', 'Doble T de 300 mm, alma 7 mm, eje tubular 12 t con ABS y perno normalizado'],
  ['Aislación', 'Módulo RJ-MH-01', 'Polietileno expandido en paredes y techo + termofoil, barrera anti-condensación'],
  ['Instalaciones', 'Eléctrica y agua 220 V', 'Disyuntor y térmica con LED por sector; agua por termofusión de 1/2″ tipo Aqua-System'],
];
for (const cod of ['BOX-15-A', 'OFI-6', 'CASA-9', 'CAS-RS']) {
  const m = await one(`select id from public.modelo where codigo=$1`, [cod]);
  if (!m) continue;
  for (let i = 0; i < fichaReal.length; i++)
    await q(`insert into public.ficha_tecnica_item (modelo_id, grupo, item, especificacion, orden) values ($1,$2,$3,$4,10+$5) on conflict do nothing`, [m.id, ...fichaReal[i], i]);
  await q(`insert into public.modelo_foto (modelo_id, url, leyenda, orden, es_portada) values ($1,$2,'Vista general',0,true) on conflict do nothing`, [m.id, `/fotos/${cod}-portada.jpg`]);
}

// 5. Clientes reales + homologaciones
const clientes = [
  ['YPF S.A.', 'ypf-base-01', 'operadora', 'Normativas homologadas', 'aprobada', 'Responsable Inscripto'],
  ['Servicios Dipp', 'dipp-base-02', 'operadora', 'Homologación directa', 'aprobada', 'Responsable Inscripto'],
  ['Procesos Patagónicos', 'pp-base-003', 'operadora', 'Homologación directa Oil & Gas', 'aprobada', 'Responsable Inscripto'],
  ['Isamar S.R.L.', 'isamar-base4', 'otro', 'Servicios petroleros · alianza Neuquén', 'aprobada', 'Responsable Inscripto'],
];
let i = 1;
for (const [razon, base, tipo, obs, hest, cond] of clientes) {
  const c = cuit(`30${String(10000000 + i * 1111111).slice(0, 8)}`);
  await q(`insert into public.cliente (razon_social, cuit, tipo, provincia, condicion_iva) values ($1,$2,$3,'Buenos Aires',$4) on conflict (cuit) do update set razon_social=excluded.razon_social, condicion_iva=excluded.condicion_iva`, [razon, c, tipo, cond]);
  const cli = await one(`select id from public.cliente where cuit=$1`, [c]);
  const h = await one(`select id from public.homologacion where cliente_id=$1`, [cli.id]);
  if (!h) await q(`insert into public.homologacion (cliente_id, estado, observaciones) values ($1,$2,$3)`, [cli.id, hest, obs]);
  i++;
}
// 4b. Corrige orden grupo/item si una corrida anterior los invirtió
await q(`update public.ficha_tecnica_item set grupo=item, item=grupo
  where grupo in ('Chasis RJ-SR-300','Módulo RJ-MH-01','Instalaciones')`);
// 4c. BOM demo del semirremolque con etapa de consumo (cierra el loop reserva→salida)
{
  const semi = await one(`select id from public.modelo where codigo='TR-SEMI-12'`);
  let bom = await one(`select id from public.bom_modelo where modelo_id=$1 order by version desc limit 1`, [semi.id]);
  if (!bom) bom = (await q(`insert into public.bom_modelo (modelo_id, version) values ($1,1) returning id`, [semi.id])).rows[0];
  const bl = [
    ['CANO-40', 120, 3, 'Estructura'], ['CHAPA-09', 40, 5, 'Revestimiento'], ['PE-10', 30, 5, 'Aislación'],
  ];
  for (const [cod, cant, merma, etapa] of bl) {
    const mat = await one(`select id from public.material where codigo=$1`, [cod]);
    if (mat) await q(`insert into public.bom_linea (bom_id, material_id, cantidad, merma_pct, etapa_consumo) values ($1,$2,$3,$4,$5) on conflict do nothing`, [bom.id, mat.id, cant, merma, etapa]);
  }
}
// 6. PIN inicial 1234 para los 5 perfiles (solo base local; nube usa Supabase Auth)
import { createHash } from 'node:crypto';
const pin = createHash('sha256').update('rj-local-9dejulio:1234').digest('hex');
await q(`update public.perfiles set pin_hash=$1 where pin_hash is null`, [pin]);
// 7. Corrección oficial: WSFE homologación es wswhomo (manual AFIP v2.22)
await q(`update public.configuracion set valor='https://wswhomo.afip.gov.ar/wsfev1/service.asmx' where clave='ARCA_WSFE_URL' and valor like '%wshomo%'`);
console.log('Sitio real OK: empresa, 7 líneas, 6 modelos, ficha RJ, 4 clientes + homologaciones');
await db.close();
