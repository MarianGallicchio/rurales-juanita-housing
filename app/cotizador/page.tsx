import { AppLayout } from '@/components/app-layout';
import { BuscadorCliente } from '@/components/buscador-cliente';
import { PageHero, Paso, Tarjeta } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtUSD, fmtARS, calcularTotales } from '@/lib/formato-ar';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function crearCotizacion(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { calcularTotales } = await import('@/lib/formato-ar');
  const cliente_id = String(fd.get('cliente_id') ?? '');
  const modelo_id = String(fd.get('modelo_id') ?? '');
  const cantidad = Number(fd.get('cantidad') ?? 1);
  const mat = Number(fd.get('mat') ?? 18000), mo = Number(fd.get('mo') ?? 4500);
  const margen = Number(fd.get('margen') ?? 25), iva = Number(fd.get('iva') ?? 21);
  const flete = Number(fd.get('flete') ?? 1800), tc = Number(fd.get('tc') ?? 1540);
  const tipo = String(fd.get('tipo') ?? 'venta') === 'alquiler' ? 'alquiler' : 'venta';
  const largo = Number(fd.get('largo') ?? 0) || null, ancho = Number(fd.get('ancho') ?? 0) || null, alto = Number(fd.get('alto') ?? 0) || null;
  if (!modelo_id) return;
  // Equipamiento: precio según tipo (fijo | por_m2 × superficie | por_unidad/por_metro × cantidad)
  const opIds = (fd.getAll('op') as string[]).filter(Boolean);
  const sup = Number((await queryLocal<{ s: number }>(`select superficie_m2 as s from public.modelo where id=$1`, [modelo_id]))[0]?.s ?? 0);
  let extra = 0;
  const opCalc: { id: string; precio: number }[] = [];
  for (const oid of [...new Set(opIds)]) {
    const o = (await queryLocal<{ tipo: string; precio: number }>(`select tipo_precio as tipo, precio_usd as precio from public.opcion where id=$1`, [oid]))[0];
    if (!o) continue;
    const p = o.tipo === 'por_m2' ? Number(o.precio) * sup : Number(o.precio) * cantidad;
    extra += p;
    opCalc.push({ id: oid, precio: Math.round(p * 100) / 100 });
  }
  const t = calcularTotales({ materiales: mat * cantidad + extra, manoObra: mo * cantidad, margenPct: margen, fleteUsd: flete, ivaPct: iva, tipoCambio: tc });
  const n = (await queryLocal<{ n: number }>(`select count(*)::int as n from public.cotizacion`))[0].n + 1;
  const numero = `COT-2026-${String(n).padStart(4, '0')}`;
  const cot = (await queryLocal<{ id: string }>(
    `insert into public.cotizacion (numero, cliente_id, estado, tipo_cambio, margen_pct, iva_pct, flete_usd, subtotal_usd, total_usd, total_ars, tipo, share_token)
     values ($1,$2,'borrador',$3,$4,$5,$6,$7,$8,$9,$10,substr(md5(random()::text),1,12)) returning id`,
    [numero, cliente_id || null, tc, margen, iva, flete, t.subtotal, t.totalUsd, t.totalArs, tipo]
  ))[0];
  const pu = Math.round((t.totalUsd / cantidad) * 100) / 100;
  const itemId = (await queryLocal<{ id: string }>(
    `insert into public.cotizacion_item (cotizacion_id, modelo_id, cantidad, largo_mm, ancho_mm, alto_mm, costo_materiales_usd, costo_mano_obra_usd, precio_unitario_usd)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [cot.id, modelo_id, cantidad, largo, ancho, alto, mat * cantidad + extra, mo * cantidad, pu]
  ))[0].id;
  for (const o of opCalc) await queryLocal(`insert into public.cotizacion_item_opcion (item_id, opcion_id, cantidad, precio_usd) values ($1,$2,$3,$4)`, [itemId, o.id, cantidad, o.precio]);
  await auditLocal('cotizacion', cot.id, 'alta', { numero, total_usd: t.totalUsd });
  redirect(`/cotizador/${cot.id}`);
}

const TRANSICIONES: Record<string, string[]> = {
  borrador: ['enviada'],
  enviada: ['aceptada', 'rechazada', 'vencida'],
  aceptada: [], rechazada: [], vencida: [],
};

async function cambiarEstado(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const estado = String(fd.get('estado') ?? 'enviada');
  const cur = (await queryLocal<{ estado: string; margen_pct: number }>(`select estado, margen_pct from public.cotizacion where id=$1`, [id]))[0];
  if (!cur || !TRANSICIONES[cur.estado]?.includes(estado)) return; // transición inválida: se ignora
  if (estado === 'enviada') {
    // Margen bajo el mínimo exige aprobación del Administrador
    const min = Number((await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='MARGEN_MIN_PCT'`))[0]?.valor ?? 15);
    if (Number(cur.margen_pct) < min) {
      const ap = await queryLocal<{ estado: string }>(`select estado from public.cotizacion_aprobacion where cotizacion_id=$1 order by creada_en desc limit 1`, [id]);
      if (!ap[0] || ap[0].estado !== 'aprobada') {
        if (!ap[0] || ap[0].estado !== 'pendiente')
          await queryLocal(`insert into public.cotizacion_aprobacion (cotizacion_id, motivo, margen_solicitado, estado) values ($1,'Margen bajo el mínimo',$2,'pendiente')`, [id, cur.margen_pct]);
        redirect('/cotizador?aprob=1');
      }
    }
  }
  await queryLocal(`update public.cotizacion set estado=$2, enviada_en=case when $2='enviada' then now() else enviada_en end where id=$1`, [id, estado]);
  // Aceptada dispara OP automáticamente (Fase 4) con etapas instanciadas
  if (estado === 'aceptada') {
    const ya = await queryLocal<{ id: string }>(`select id from public.orden_produccion where cotizacion_id=$1`, [id]);
    if (ya.length > 0) { const { redirect } = await import('next/navigation'); redirect('/cotizador'); }
    const c = (await queryLocal<{ numero: string; cliente_id: string }>(`select numero, cliente_id from public.cotizacion where id=$1`, [id]))[0];
    const n = (await queryLocal<{ n: number }>(`select count(*)::int as n from public.orden_produccion`))[0].n + 1;
    const opNum = `OP-2026-${String(n).padStart(4, '0')}`;
    const op = (await queryLocal<{ id: string }>(`insert into public.orden_produccion (numero, cotizacion_id, cliente_id, estado, fecha_inicio) values ($1,$2,$3,'en_produccion',current_date) returning id`, [opNum, id, c.cliente_id]))[0];
    const items = await queryLocal<{ modelo_id: string; cantidad: number }>(`select modelo_id, cantidad from public.cotizacion_item where cotizacion_id=$1`, [id]);
    let k = 1;
    for (const it of items) for (let i = 0; i < it.cantidad; i++) {
      const serie = `RJ-26-${opNum.slice(-4)}-${String(k++).padStart(3, '0')}`;
      const u = (await queryLocal<{ id: string }>(`insert into public.unidad (orden_id, modelo_id, numero_serie, etapa_actual) values ($1,$2,$3,'Estructura') on conflict (numero_serie) do update set orden_id=excluded.orden_id returning id`, [op.id, it.modelo_id, serie]))[0];
      const plants = await queryLocal<{ id: string }>(`select pe.id from public.plantilla_etapa pe join public.modelo m on m.categoria_id=pe.categoria_id where m.id=$1 order by pe.orden`, [it.modelo_id]);
      for (const p of plants) await queryLocal(`insert into public.etapa_unidad (unidad_id, plantilla_etapa_id, estado) values ($1,$2,'pendiente') on conflict do nothing`, [u.id, p.id]);
    }
    // Reserva de materiales según BOM vigente (se descuenta real al aprobar cada etapa)
    for (const it of items) {
      const bom = (await queryLocal<{ id: string }>(`select id from public.bom_modelo where modelo_id=$1 order by version desc limit 1`, [it.modelo_id]))[0];
      if (!bom) continue;
      const lineas = await queryLocal<{ material_id: string; cantidad: number; merma_pct: number }>(`select material_id, cantidad, merma_pct from public.bom_linea where bom_id=$1`, [bom.id]);
      for (const l of lineas) {
        const need = Math.round(Number(l.cantidad) * (1 + Number(l.merma_pct) / 100) * it.cantidad * 1000) / 1000;
        await queryLocal(`insert into public.movimiento_stock (material_id, tipo, cantidad, referencia_tipo, referencia_id) values ($1,'reserva',$2,'orden_produccion',$3)`, [l.material_id, need, op.id]);
      }
    }
  }
  await auditLocal('cotizacion', id, 'modificacion', { estado });
  redirect('/cotizador');
}

async function aprobarMargen(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? ''); // id de aprobación
  await queryLocal(`update public.cotizacion_aprobacion set estado='aprobada' where id=$1`, [id]);
  const ap = (await queryLocal<{ cotizacion_id: string }>(`select cotizacion_id from public.cotizacion_aprobacion where id=$1`, [id]))[0];
  if (ap) await auditLocal('cotizacion', ap.cotizacion_id, 'modificacion', { margen_aprobado: true });
  redirect('/cotizador');
}

async function nuevaVersion(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const c = (await queryLocal<any>(`select * from public.cotizacion where id=$1`, [id]))[0];
  if (!c || !['enviada', 'rechazada', 'vencida'].includes(c.estado)) return;
  const n = (await queryLocal<{ n: number }>(`select count(*)::int as n from public.cotizacion`))[0].n + 1;
  const numero = `COT-2026-${String(n).padStart(4, '0')}`;
  const nc = (await queryLocal<{ id: string }>(
    `insert into public.cotizacion (numero, cliente_id, version, cotizacion_origen_id, estado, tipo_cambio, fecha_tipo_cambio, margen_pct, iva_pct, flete_usd, validez_dias, plazo_entrega_dias, condicion_pago, observaciones, subtotal_usd, total_usd, total_ars, creada_por, tipo, share_token)
     values ($1,$2,$3,$4,'borrador',$5,current_date,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,substr(md5(random()::text),1,12)) returning id`,
    [numero, c.cliente_id, Number(c.version) + 1, c.id, c.tipo_cambio, c.margen_pct, c.iva_pct, c.flete_usd, c.validez_dias, c.plazo_entrega_dias, c.condicion_pago, c.observaciones, c.subtotal_usd, c.total_usd, c.total_ars, c.creada_por, c.tipo ?? 'venta']
  ))[0];
  const items = await queryLocal<any>(`select * from public.cotizacion_item where cotizacion_id=$1`, [id]);
  for (const it of items) {
    const ni = (await queryLocal<{ id: string }>(`insert into public.cotizacion_item (cotizacion_id, modelo_id, cantidad, largo_mm, ancho_mm, alto_mm, costo_materiales_usd, costo_mano_obra_usd, precio_unitario_usd) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [nc.id, it.modelo_id, it.cantidad, it.largo_mm, it.ancho_mm, it.alto_mm, it.costo_materiales_usd, it.costo_mano_obra_usd, it.precio_unitario_usd]))[0];
    const ops = await queryLocal<any>(`select opcion_id, cantidad, precio_usd from public.cotizacion_item_opcion where item_id=$1`, [it.id]);
    for (const o of ops) await queryLocal(`insert into public.cotizacion_item_opcion (item_id, opcion_id, cantidad, precio_usd) values ($1,$2,$3,$4)`, [ni.id, o.opcion_id, o.cantidad, o.precio_usd]);
  }
  await auditLocal('cotizacion', nc.id, 'alta', { numero, version_de: c.numero });
  redirect(`/cotizador/${nc.id}`);
}

async function registrarEnvio(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  await queryLocal(`insert into public.cotizacion_envio (cotizacion_id, canal, destinatario) values ($1,$2,$3)`,
    [id, String(fd.get('canal') ?? 'whatsapp'), String(fd.get('dest') ?? '') || null]);
  redirect('/cotizador');
}

export default async function Cotizador({ searchParams }: { searchParams: Promise<{ aprob?: string; mod?: string }> }) {
  const sp = await searchParams;
  // Vencimiento automático diario (tarea programada simulada en cada visita)
  await queryLocal(`update public.cotizacion set estado='vencida' where estado='enviada' and creada_en + (validez_dias || ' days')::interval < now()`);
  const cots = await queryLocal<{ id: string; numero: string; estado: string; total_usd: number; total_ars: number; version: number; tipo: string; share: string | null }>(
    `select id, numero, estado, total_usd, total_ars, version, tipo, share_token as share from public.cotizacion order by creada_en desc limit 30`);
  const aprobPend = await queryLocal<{ id: string; numero: string; margen: number }>(
    `select a.id, c.numero, a.margen_solicitado as margen from public.cotizacion_aprobacion a join public.cotizacion c on c.id=a.cotizacion_id where a.estado='pendiente' order by a.id`);
  const mods = await queryLocal<{ id: string; codigo: string; nombre: string; precio: number; sup: number }>(
    `select id, codigo, nombre, precio_base_usd as precio, superficie_m2 as sup from public.modelo where activo order by codigo`);
  const modSel = mods.find((m) => m.id === sp.mod) ?? null;
  const opcs = modSel ? await queryLocal<{ id: string; nombre: string; grupo: string; tipo: string; precio: number; obligatoria: boolean; defecto: boolean }>(
    `select o.id, o.nombre, o.grupo, o.tipo_precio as tipo, o.precio_usd as precio, mo.obligatoria, mo.incluida_por_defecto as defecto
     from public.modelo_opcion mo join public.opcion o on o.id=mo.opcion_id where mo.modelo_id=$1 and o.activo order by o.grupo, o.nombre`, [modSel.id]) : [];
  const bomTotal = modSel ? (await queryLocal<{ t: number }>(
    `select coalesce(sum(l.cantidad*(1+l.merma_pct/100)*m.costo_promedio_usd),0) as t from public.bom_linea l
     join public.bom_modelo b on b.id=l.bom_id join public.material m on m.id=l.material_id
     where b.modelo_id=$1 and b.version=(select max(version) from public.bom_modelo where modelo_id=$1)`, [modSel.id, modSel.id]))[0]?.t ?? 0 : 0;
  const tcVig = (await queryLocal<{ v: number }>(`select valor_ars_por_usd as v from public.tipo_cambio order by fecha desc limit 1`))[0]?.v ?? 1540;
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas']);
  const abiertas = cots.filter((c) => ['borrador', 'enviada'].includes(c.estado)).length;
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 2 · Ventas" titulo="Cotizador"
          bajada="Asistente en 4 pasos. Al enviar se congela precio y dólar; aceptar crea la orden de producción sola." />
        <div className="grid grid-cols-2 gap-2">
          <Tarjeta titulo="Abiertas" valor={String(abiertas)} pie={`${cots.length} en historial`} />
          <Tarjeta titulo="Dólar aplicado" valor={`$ ${tcVig}`} pie="Editable en Configuración" />
        </div>
        {sp.aprob && <p className="rounded-xl bg-amber-100 p-3 text-sm font-bold">⚠ Margen bajo el mínimo: quedó pendiente de aprobación del Administrador.</p>}
        {aprobPend.length > 0 && (
          <div className="rj-card border-amber-400">
            <p className="text-sm font-black">Aprobaciones de margen (Administrador)</p>
            {aprobPend.map((a) => (
              <form key={a.id} action={aprobarMargen} className="mt-1 flex items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <span className="flex-1 text-sm">{a.numero} · margen {a.margen}%</span>
                <button className="rj-btn-green">Aprobar</button>
              </form>
            ))}
          </div>
        )}
        {cots.map((c) => (
          <div key={c.id} className="rj-card flex items-center justify-between gap-2">
            <div>
              <p className="font-bold">{c.numero}{Number(c.version) > 1 ? ` v${c.version}` : ''} · <span className="rj-chip bg-slate-200">{c.estado}</span> {c.tipo === 'alquiler' && <span className="rj-chip bg-[#e8fe85]">alquiler</span>}</p>
              <p className="text-sm text-[#3f3f46]">{fmtUSD(Number(c.total_usd))} · {fmtARS(Number(c.total_ars))}</p>
              {c.share && <a href={`/s/${c.share}`} target="_blank" className="font-mono2 text-[10px] underline">link público →</a>}
            </div>
            <div className="flex flex-wrap gap-1">
              <Link href={`/cotizador/${c.id}`} className="rj-btn bg-slate-200">PDF</Link>
              <form action={cambiarEstado}>
                <input type="hidden" name="id" value={c.id} />
                {c.estado === 'borrador' && <button name="estado" value="enviada" className="rj-btn-green">Enviar</button>}
                {c.estado === 'enviada' && <button name="estado" value="aceptada" className="rj-btn-primary">Aceptar→OP</button>}
              </form>
              {['enviada', 'rechazada', 'vencida'].includes(c.estado) && (
                <form action={nuevaVersion}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rj-btn bg-slate-100">Nueva versión</button>
                </form>
              )}
              <form action={registrarEnvio} className="flex gap-1">
                <input type="hidden" name="id" value={c.id} />
                <select name="canal" className="rounded-xl border px-2 text-xs"><option value="whatsapp">WA</option><option value="email">Mail</option><option value="descarga">PDF</option></select>
                <button className="rj-btn bg-slate-100 text-xs">✓ envío</button>
              </form>
            </div>
          </div>
        ))}
        <form method="get" action="/cotizador" className="rj-card">
          <p className="text-sm font-black">Modelo: {modSel ? `${modSel.codigo} (${modSel.sup ?? '—'} m²)` : 'elegí para ver opciones y costo BOM'}</p>
          <div className="mt-1 flex gap-2">
            <select name="mod" defaultValue={modSel?.id ?? ''} className="rj-input">{mods.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>)}</select>
            <button className="rj-btn-primary">Cargar</button>
          </div>
          {modSel && <p className="mt-1 text-xs text-[#3f3f46]">Costo materiales según BOM vigente: <b>{fmtUSD(Number(bomTotal))}</b> · Superficie {modSel.sup ?? '—'} m² (para opciones por m²)</p>}
        </form>
        <form action={crearCotizacion}>
          <div className="flex flex-col gap-3">
            <input type="hidden" name="modelo_id" value={modSel?.id ?? ''} />
            <Paso n={1} titulo="Cliente">
              <BuscadorCliente />
              {!modSel && <p className="mt-1 text-xs opacity-60">Primero cargá el modelo arriba para ver su equipamiento.</p>}
            </Paso>
            {modSel && opcs.length > 0 && (
              <Paso n={2} titulo={`Equipamiento (${opcs.length} opciones)`}>
                <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                  {opcs.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 rounded-xl border p-2 text-sm">
                      <input type="checkbox" name="op" value={o.id} defaultChecked={o.defecto || o.obligatoria} disabled={o.obligatoria} className="h-5 w-5" />
                      {o.obligatoria && <input type="hidden" name="op" value={o.id} />}
                      <span className="flex-1">{o.nombre} <span className="opacity-60">[{o.grupo} · {o.tipo === 'por_m2' ? `$${o.precio}/m²` : `$${o.precio}`}]{o.obligatoria ? ' · obligatoria' : ''}</span></span>
                    </label>
                  ))}
                </div>
              </Paso>
            )}
            <Paso n={3} titulo="Costos y margen">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">Cantidad<input name="cantidad" type="number" defaultValue={1} min={1} className="rj-input" /></label>
                <label className="text-xs">Modalidad<select name="tipo" className="rj-input"><option value="venta">Venta</option><option value="alquiler">Alquiler (obra temporal)</option></select></label>
                <label className="text-xs">Largo mm<input name="largo" type="number" placeholder="a medida" className="rj-input" /></label>
                <label className="text-xs">Ancho mm<input name="ancho" type="number" placeholder="a medida" className="rj-input" /></label>
                <label className="text-xs">Alto mm<input name="alto" type="number" placeholder="a medida" className="rj-input" /></label>
                <label className="text-xs">Dólar del día<input name="tc" type="number" defaultValue={tcVig} className="rj-input" /></label>
                <label className="text-xs">Materiales USD{Number(bomTotal) > 0 && ` (BOM: ${Math.round(Number(bomTotal))})`}<input name="mat" type="number" defaultValue={Number(bomTotal) > 0 ? Math.round(Number(bomTotal)) : 18000} className="rj-input" /></label>
                <label className="text-xs">Mano de obra USD<input name="mo" type="number" defaultValue={4500} className="rj-input" /></label>
                <label className="text-xs">Margen %<input name="margen" type="number" defaultValue={25} className="rj-input" /></label>
                <label className="text-xs">Flete USD<input name="flete" type="number" defaultValue={1800} className="rj-input" /></label>
              </div>
              <p className="mt-1 text-xs opacity-60">Si el margen queda bajo el mínimo de Configuración, la cotización pide aprobación del Administrador.</p>
            </Paso>
            <Paso n={4} titulo="Revisión y creación">
              <button className="rj-btn-accent w-full">Crear en borrador → revisar PDF → enviar</button>
            </Paso>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
