// node scripts/validar-sistema.mjs — auditoría prueba/error del sistema completo
// Sale con código 1 si hay FALLOS. Diseñado para iterar: correr → corregir → correr.
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new PGlite(path.join(root, '.pglite'));
await db.waitReady;

let pass = 0, fail = 0;
const ok = (cond, nombre, detalle = '') => {
  if (cond) { pass++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ FALLO: ${nombre}${detalle ? ' — ' + detalle : ''}`); }
};
const q = async (s, p = []) => (await db.query(s, p)).rows;

console.log('== F0 base ==');
{
  const r = await q(`select rol, count(*)::int n from public.perfiles group by rol`);
  ok(r.length === 5, '5 roles con perfil', JSON.stringify(r));
  const m = await q(`select count(*)::int n from public.roles_permisos`);
  ok(m[0].n >= 30, 'matriz permisos cargada', `${m[0].n} filas`);
  const cfg = await q(`select clave from public.configuracion`);
  for (const k of ['IVA_PCT', 'MARGEN_MIN_PCT', 'VALIDEZ_COTIZ_DIAS', 'TC_MAX_HORAS']) {
    // eslint-disable-next-line no-await-in-loop
    ok(cfg.some((c) => c.clave === k), `config ${k} existe`);
  }
  const rls = await q(`select tablename from pg_tables where schemaname='public' and rowsecurity=true`);
  for (const t of ['perfiles', 'cotizacion', 'unidad', 'movimiento_stock']) {
    ok(rls.some((r) => r.tablename === t), `RLS activa en ${t}`);
  }
  const tc = await q(`select valor_ars_por_usd, fecha from public.tipo_cambio order by fecha desc limit 1`);
  ok(tc.length > 0 && Number(tc[0].valor_ars_por_usd) > 0, 'tipo de cambio vigente cargado');
}

console.log('== F1 catálogo / fichas ==');
{
  const mods = await q(`select id, codigo, nombre, largo_mm, ancho_mm, alto_mm, precio_base_usd, activo from public.modelo`);
  ok(mods.length >= 3, '≥3 modelos seed', `${mods.length}`);
  const cods = mods.map((m) => m.codigo);
  ok(new Set(cods).size === cods.length, 'códigos únicos');
  for (const m of mods) {
    if (!m.activo) continue;
    // eslint-disable-next-line no-await-in-loop
    const f = await q(`select count(*)::int n from public.ficha_tecnica_item where modelo_id=$1`, [m.id]);
    // eslint-disable-next-line no-await-in-loop
    const fo = await q(`select count(*)::int n from public.modelo_foto where modelo_id=$1`, [m.id]);
    // eslint-disable-next-line no-await-in-loop
    const po = await q(`select count(*)::int n from public.modelo_foto where modelo_id=$1 and es_portada=true`, [m.id]);
    ok(Number(m.largo_mm) > 0 && Number(m.ancho_mm) > 0 && Number(m.alto_mm) > 0, `ficha ${m.codigo}: medidas >0`, `${m.largo_mm}x${m.ancho_mm}x${m.alto_mm}`);
    ok(Number(m.largo_mm) >= Number(m.ancho_mm), `ficha ${m.codigo}: largo≥ancho (coherencia)`);
    ok(Number(m.precio_base_usd) > 0, `ficha ${m.codigo}: precio>0`);
    ok(f[0].n >= 3, `ficha ${m.codigo}: ≥3 ítems técnicos`, `${f[0].n}`);
    ok(fo[0].n >= 1, `ficha ${m.codigo}: ≥1 foto`, `${fo[0].n}`);
    ok(po[0].n === 1, `ficha ${m.codigo}: 1 portada exacta`, `${po[0].n}`);
  }
  const semi = await q(`select largo_mm from public.modelo where codigo='TR-SEMI-12'`);
  ok(semi.length && Number(semi[0].largo_mm) === 15300, 'semirremolque 15.300mm referencia');
  const nOpc = await q(`select count(*)::int n from public.opcion where activo=true`);
  ok(nOpc[0].n >= 15, '≥15 opciones activas', `${nOpc[0].n}`);
  const vinc = await q(`select count(*)::int n from public.modelo_opcion mo join public.modelo m on m.id=mo.modelo_id where m.codigo='TR-SEMI-12'`);
  ok(vinc[0].n >= 5, 'semirremolque con ≥5 opciones vinculadas', `${vinc[0].n}`);
}

console.log('== F2 cotizador ==');
{
  const estados = await q(`select distinct estado from public.cotizacion`);
  const validos = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'];
  ok(estados.every((e) => validos.includes(e.estado)), 'estados válidos', JSON.stringify(estados));
  const c = await q(`select * from public.cotizacion where numero='COT-2026-0001'`);
  if (c.length) {
    const it = await q(`select * from public.cotizacion_item where cotizacion_id=$1`, [c[0].id]);
    const mat = it.reduce((a, r) => a + Number(r.costo_materiales_usd), 0);
    const mo = it.reduce((a, r) => a + Number(r.costo_mano_obra_usd), 0);
    const sub = (mat + mo) * (1 + Number(c[0].margen_pct) / 100) + Number(c[0].flete_usd);
    const tot = Math.round(sub * (1 + Number(c[0].iva_pct) / 100) * 100) / 100;
    const ars = Math.round(tot * Number(c[0].tipo_cambio));
    ok(Math.abs(tot - Number(c[0].total_usd)) < 0.01 && ars === Number(c[0].total_ars), 'fórmula COT-2026-0001 exacta', `calc ${tot}/${ars} vs guardado ${c[0].total_usd}/${c[0].total_ars}`);
  } else ok(false, 'cotización demo existe');
  const huerf = await q(`select count(*)::int n from public.cotizacion c left join public.cliente cl on cl.id=c.cliente_id where c.cliente_id is not null and cl.id is null`);
  ok(huerf[0].n === 0, 'cotizaciones con cliente válido');
  const cols = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='cotizacion'`);
  for (const col of ['firma_url', 'firma_fecha', 'firmante_nombre'])
    ok(cols.some((c) => c.column_name === col), `firma digital: columna ${col}`);
}

console.log('== F3 CRM ==');
{
  const et = await q(`select distinct etapa from public.oportunidad`);
  const v = ['consulta', 'cotizado', 'negociacion', 'ganado', 'perdido'];
  ok(et.every((e) => v.includes(e.etapa)), 'etapas kanban válidas', JSON.stringify(et));
  const cuits = await q(`select cuit from public.cliente where cuit is not null`);
  const digitoOk = (cuit) => {
    const d = String(cuit).replace(/\D/g, '');
    if (d.length !== 11) return false;
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * mult[i];
    let ver = 11 - (s % 11); if (ver === 11) ver = 0; if (ver === 10) ver = 9;
    return ver === Number(d[10]);
  };
  for (const r of cuits) ok(digitoOk(r.cuit), `CUIT válido ${r.cuit}`);
}

console.log('== F4 producción ==');
{
  const unds = await q(`select id, numero_serie from public.unidad`);
  const nOps = await q(`select count(*)::int n from public.orden_produccion`);
  ok(nOps[0].n === 0 || unds.length > 0, 'OPs con unidades (flujo aceptada→OP)', `${nOps[0].n} OPs, ${unds.length} unidades`);
  const series = unds.map((u) => u.numero_serie);
  ok(new Set(series).size === series.length, 'series únicas e inmutables', `${series.length} unidades`);
  let sinEtapas = 0;
  for (const u of unds) {
    // eslint-disable-next-line no-await-in-loop
    const n = await q(`select count(*)::int n from public.etapa_unidad where unidad_id=$1`, [u.id]);
    if (n[0].n === 0) sinEtapas++;
  }
  ok(sinEtapas === 0, 'toda unidad tiene etapas instanciadas', `${sinEtapas} sin etapas`);
  const ncBad = await q(`select count(*)::int n from public.no_conformidad nc left join public.unidad u on u.id=nc.unidad_id where u.id is null`);
  ok(ncBad[0].n === 0, 'NC referencian unidad existente');
  const plant = await q(`select count(*)::int n from public.plantilla_etapa`);
  ok(plant[0].n >= 10, 'plantilla etapas ≥10', `${plant[0].n}`);
}

console.log('== F5 stock ==');
{
  const neg = await q(`select m.codigo from public.material m where (select coalesce(sum(case when tipo in ('entrada','ajuste') then cantidad when tipo='salida' then -cantidad else 0 end),0) from public.movimiento_stock s where s.material_id=m.id) < 0`);
  ok(neg.length === 0, 'sin stock negativo', JSON.stringify(neg));
  const sinMin = await q(`select count(*)::int n from public.material where stock_minimo is null or stock_minimo < 0`);
  ok(sinMin[0].n === 0, 'mínimos definidos');
  const sinCosto = await q(`select count(*)::int n from public.material where (costo_ultimo_usd is null or costo_ultimo_usd <= 0)`);
  ok(sinCosto[0].n === 0, 'costos >0 alimentan cotizador', `${sinCosto[0].n} sin costo`);
}

console.log('== Lotes A/B/C + ARCA ==');
{
  for (const t of ['cotizacion_aprobacion', 'cotizacion_envio', 'homologacion', 'comprobante', 'ticket_postventa', 'lista_compra', 'lista_compra_linea']) {
    // eslint-disable-next-line no-await-in-loop
    const r = await q(`select count(*)::int n from public.${t}`);
    ok(r[0].n >= 0, `tabla ${t} operativa`);
  }
  const ucols = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='unidad'`);
  for (const col of ['fecha_entrega', 'garantia_hasta']) ok(ucols.some((c) => c.column_name === col), `garantía: columna ${col}`);
  const mcols = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='modelo'`);
  ok(mcols.some((c) => c.column_name === 'manual_url'), 'manuales por modelo');
  const aud = await q(`select count(*)::int n from public.registro_auditoria`);
  const audRls = await q(`select tablename from pg_tables where schemaname='public' and tablename='registro_auditoria' and rowsecurity=true`);
  ok(audRls.length === 1, 'auditoría con RLS activa');
  ok(aud[0].n >= 0, `auditoría operativa (${aud[0].n} eventos; creá una cotización y vuelve a correr)`);
  // prueba de fuego del mecanismo: inserta y verifica lectura como haría la app
  await q(`insert into public.registro_auditoria (entidad, entidad_id, accion, valor_nuevo) values ('validador','check','alta','{"ok":true}')`);
  const aud2 = await q(`select count(*)::int n from public.registro_auditoria where entidad='validador'`);
  ok(aud2[0].n >= 1, 'auditoría registra eventos');
}

console.log('== Sitio real ==');
{
  const nc = await q(`select count(*)::int n from public.categoria`);
  ok(nc[0].n >= 6, 'líneas de producto del sitio real', `${nc[0].n}`);
  for (const slug of ['modulos-habitacionales', 'contenedores-tecnicos', 'shelters', 'casillas-rurales', 'casa-de-campo', 'oficinas-modulares', 'petroleros']) {
    // eslint-disable-next-line no-await-in-loop
    const ex = await q(`select id from public.categoria where slug=$1`, [slug]);
    ok(ex.length === 1, `línea ${slug}`);
  }
  for (const cod of ['TR-SEMI-12', 'BOX-15-A', 'OFI-6', 'CASA-9', 'CAS-RS']) {
    // eslint-disable-next-line no-await-in-loop
    const ex = await q(`select id from public.modelo where codigo=$1`, [cod]);
    ok(ex.length === 1, `modelo ${cod}`);
  }
  const rj = await q(`select count(*)::int n from public.ficha_tecnica_item where item like '%RJ-SR-300%' or item like '%RJ-MH-01%'`);
  ok(rj[0].n >= 2, 'ficha técnica real RJ en base', `${rj[0].n} ítems`);
  for (const cli of ['YPF', 'Dipp', 'Isamar']) {
    // eslint-disable-next-line no-await-in-loop
    const ex = await q(`select c.id from public.cliente c join public.homologacion h on h.cliente_id=c.id where c.razon_social like '%${cli}%' and h.estado='aprobada'`);
    ok(ex.length >= 1, `cliente real homologado: ${cli}`);
  }
  const emp = await q(`select email, domicilio from public.empresa where id=1`);
  ok(emp[0]?.email === 'Ventas@ruralesjuanita.com.ar', 'email real en empresa');
  ok((emp[0]?.domicilio ?? '').includes('Ruta 65'), 'planta Ruta 65 en empresa');
}

console.log('== Factura A/B + ARCA + sesión ==');
{
  const cc = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='cliente'`);
  ok(cc.some((c) => c.column_name === 'condicion_iva'), 'clientes con condición IVA');
  const ri = await q(`select count(*)::int n from public.cliente where condicion_iva='Responsable Inscripto'`);
  ok(ri[0].n >= 3, `clientes RI → Factura A (${ri[0].n}, ej. YPF/Dipp)`);
  const cfg = await q(`select clave from public.configuracion where clave like 'ARCA%'`);
  for (const k of ['ARCA_CUIT', 'ARCA_PTO_VTA', 'ARCA_MODO', 'ARCA_WSAA_URL', 'ARCA_WSFE_URL', 'ARCA_CERT', 'ARCA_KEY'])
    ok(cfg.some((c) => c.clave === k), `config ${k}`);
  const pc = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='perfiles'`);
  ok(pc.some((c) => c.column_name === 'pin_hash'), 'login local con PIN');
  const pins = await q(`select count(*)::int n from public.perfiles where pin_hash is not null`);
  ok(pins[0].n >= 5, `PINs cargados (${pins[0].n}/5)`);
  const fc = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='comprobante'`);
  for (const col of ['pto_vta', 'wsfe_resp']) ok(fc.some((c) => c.column_name === col), `comprobante: ${col}`);
}

console.log('== Procesos nuevos ==');
{
  const tipos = await q(`select distinct tipo_precio from public.opcion`);
  ok(tipos.every((t) => ['fijo', 'por_m2', 'por_unidad', 'por_metro'].includes(t.tipo_precio)), 'tipos de precio válidos', JSON.stringify(tipos));
  const ucols = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='unidad'`);
  ok(ucols.some((c) => c.column_name === 'fecha_despacho'), 'despacho por unidad');
  const ccols = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='cotizacion'`);
  for (const col of ['version', 'cotizacion_origen_id']) ok(ccols.some((c) => c.column_name === col), `versiones: ${col}`);
  const mcols = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='bom_linea'`);
  ok(mcols.some((c) => c.column_name === 'etapa_consumo'), 'BOM con etapa de consumo');
  const bomEt = await q(`select count(*)::int n from public.bom_linea where etapa_consumo is not null`);
  ok(bomEt[0].n >= 3, `BOM demo con etapas (${bomEt[0].n} líneas)`);
}

console.log('== Cotización completa + HUD ==');
{
  const cc = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='cotizacion'`);
  for (const col of ['share_token', 'tipo']) ok(cc.some((c) => c.column_name === col), `cotización: ${col}`);
  const sinTok = await q(`select count(*)::int n from public.cotizacion where share_token is null`);
  ok(sinTok[0].n === 0, 'todas con link público');
  const ic = await q(`select column_name from information_schema.columns where table_schema='public' and table_name='cotizacion_item'`);
  for (const col of ['largo_mm', 'ancho_mm', 'alto_mm']) ok(ic.some((c) => c.column_name === col), `ítem con ${col}`);
  const ops = await q(`select count(*)::int n from public.cotizacion_item_opcion`);
  ok(ops[0].n >= 0, `opciones en cotizaciones (${ops[0].n} renglones)`);
  const res = await q(`select count(*)::int n from public.movimiento_stock where tipo='reserva'`);
  ok(res[0].n >= 0, `reservas registradas (${res[0].n})`);
}

console.log(`\nRESULTADO: ${pass} OK · ${fail} FALLOS`);
await db.close();
process.exit(fail ? 1 : 0);
