import { queryLocal } from '@/lib/db-local';
import { fmtUSD, fmtARS, fmtFechaAR, fmtFechaHoraAR } from '@/lib/formato-ar';
import { waLink, WA_COTIZACION } from '@/lib/empresa';
import { PadFirma } from '@/components/pad-firma';
import { BotonImprimir } from '@/components/boton-imprimir';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function firmar(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { guardarDataURL } = await import('@/lib/archivos');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const nombre = String(fd.get('nombre') ?? '').trim();
  const firma = String(fd.get('firma') ?? '');
  const cur = (await queryLocal<{ estado: string; numero: string }>(`select estado, numero from public.cotizacion where id=$1`, [id]))[0];
  if (!cur || cur.estado !== 'enviada' || !nombre) return;
  let url = '';
  try { url = guardarDataURL(firma, 'firmas', `${cur.numero}-${nombre}`); }
  catch { return; }
  await queryLocal(`update public.cotizacion set firma_url=$2, firma_fecha=now(), firmante_nombre=$3, estado='aceptada' where id=$1`, [id, url, nombre]);
  // Misma creación de OP que Aceptar→OP (con etapas instanciadas)
  const ya = await queryLocal<{ id: string }>(`select id from public.orden_produccion where cotizacion_id=$1`, [id]);
  if (ya.length === 0) {
    const c = (await queryLocal<{ cliente_id: string }>(`select cliente_id from public.cotizacion where id=$1`, [id]))[0];
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
  }
  redirect(`/cotizador/${id}`);
}

export default async function CotPDF({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = (await queryLocal<any>(`select c.*, cl.razon_social from public.cotizacion c left join public.cliente cl on cl.id=c.cliente_id where c.id=$1`, [id]))[0];
  if (!c) return <main className="p-6">No existe.</main>;
  const items = await queryLocal<any>(`select i.*, m.codigo, m.nombre from public.cotizacion_item i join public.modelo m on m.id=i.modelo_id where i.cotizacion_id=$1`, [id]);
  const opcRows = items.length ? await queryLocal<any>(
    `select io.item_id, o.nombre, io.precio_usd from public.cotizacion_item_opcion io join public.opcion o on o.id=io.opcion_id where io.item_id = any($1)`, [items.map((x: any) => x.id)]) : [];
  const wa = waLink(`${WA_COTIZACION} (${c.numero}: ${fmtUSD(Number(c.total_usd))})`);
  const prev = c.cotizacion_origen_id
    ? (await queryLocal<any>(`select numero, version, total_usd, total_ars, margen_pct from public.cotizacion where id=$1`, [c.cotizacion_origen_id]))[0]
    : null;
  const dif = prev ? Math.round((Number(c.total_usd) - Number(prev.total_usd)) * 100) / 100 : 0;
  const difTxt = prev ? `${dif >= 0 ? '+' : ''}${fmtUSD(dif)}` : '';
  return (
    <main className="mx-auto max-w-2xl bg-white p-6 text-sm">
      <div className="border-b-4 border-[#e8fe85] pb-2">
        <p className="font-black text-[#07503f]">RURALES JUANITA · H.M HOUSING MODULE</p>
        <p className="text-xs">9 de Julio, Bs. As. · ISO 9001 Bureau Veritas · {fmtFechaAR(c.creada_en)}</p>
      </div>
      <h1 className="mt-3 text-xl font-bold">{c.numero}{Number(c.version) > 1 ? ` v${c.version}` : ''} — {c.estado}{c.tipo === 'alquiler' ? ' · ALQUILER' : ''}</h1>
      <p>Cliente: {c.razon_social ?? '—'} · Validez {c.validez_dias} días · Entrega {c.plazo_entrega_dias} días · Pago: {c.condicion_pago}</p>
      {c.share_token && <p className="text-xs print:hidden">Link público: <a className="underline" href={`/s/${c.share_token}`} target="_blank">/s/{c.share_token}</a> (válido en borrador/enviada)</p>}
      {items.map((it: any) => <div key={it.id}><p>· {it.cantidad}x {it.codigo} {it.nombre}{(it.largo_mm || it.ancho_mm) ? ` (${it.largo_mm ?? '—'}x${it.ancho_mm ?? '—'}x${it.alto_mm ?? '—'}mm)` : ''} — mat {fmtUSD(Number(it.costo_materiales_usd))} + MO {fmtUSD(Number(it.costo_mano_obra_usd))}</p>{opcRows.filter((o: any) => o.item_id === it.id).map((o: any, i: number) => <p key={i} className="ml-4 text-xs text-[#3f3f46]">+ {o.nombre} — {fmtUSD(Number(o.precio_usd))}</p>)}</div>)}
      <p className="mt-2">Margen {c.margen_pct}% · Flete {fmtUSD(Number(c.flete_usd))} · IVA {c.iva_pct}% · TC {c.tipo_cambio} ({fmtFechaAR(c.fecha_tipo_cambio)})</p>
      <p className="text-lg font-black">Total {fmtUSD(Number(c.total_usd))} = {fmtARS(Number(c.total_ars))}</p>
      {prev && (
        <div className="mt-2 rounded-xl bg-[#f1efdf] p-3 text-xs">
          <p className="font-black">vs versión anterior {prev.numero} (v{prev.version}): {fmtUSD(Number(prev.total_usd))} → <b>{fmtUSD(Number(c.total_usd))}</b> ({difTxt}) · margen {prev.margen_pct}% → {c.margen_pct}%</p>
        </div>
      )}
      {c.firma_url && (
        <div className="mt-3 rounded-xl border p-3">
          <p className="text-xs font-black uppercase">Aceptada con firma digital</p>
          <img src={c.firma_url} alt="firma" className="mt-1 h-24 rounded border bg-white" />
          <p className="text-xs text-[#3f3f46]">{c.firmante_nombre} · {fmtFechaHoraAR(c.firma_fecha)}</p>
        </div>
      )}
      {c.estado === 'enviada' && !c.firma_url && (
        <div className="mt-3"><PadFirma action={firmar} cotId={id} /></div>
      )}
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <a href={wa} target="_blank" className="rounded bg-[#07503f] px-4 py-2 font-bold text-white">WhatsApp</a>
        <a href={`mailto:?subject=${encodeURIComponent(`Cotización ${c.numero} — Rurales Juanita`)}&body=${encodeURIComponent(`${c.numero}: ${fmtUSD(Number(c.total_usd))} = ${fmtARS(Number(c.total_ars))}. Ver PDF adjunto al imprimir.`)}`} className="rounded bg-[#07503f] px-4 py-2 font-bold text-white">Email</a>
        <BotonImprimir />
        <Link href="/cotizador" className="rounded px-4 py-2 underline">Volver</Link>
      </div>
      <p className="mt-1 text-xs opacity-60 print:hidden">Registrá el envío con ✓ envío en el listado (canal WA/Mail/PDF). Envío automático por SMTP: pendiente de credenciales.</p>
    </main>
  );
}
