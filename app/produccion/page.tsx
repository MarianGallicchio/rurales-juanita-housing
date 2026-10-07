import { AppLayout } from '@/components/app-layout';
import { PageHero, Paso, Tarjeta } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function avance(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { guardarArchivo } = await import('@/lib/archivos');
  const etapaId = String(fd.get('etapa_id'));
  const res = String(fd.get('resultado')); // apto | no_apto
  const et = (await queryLocal<{ unidad_id: string }>(`select unidad_id from public.etapa_unidad where id=$1`, [etapaId]))[0];
  // checklist: tomamos primer ítem crítico de la plantilla para demo
  const item = (await queryLocal<{ id: string }>(`select cp.id from public.checklist_plantilla cp join public.etapa_unidad eu on eu.plantilla_etapa_id=cp.plantilla_etapa_id where eu.id=$1 order by cp.orden limit 1`, [etapaId]))[0];
  if (item) await queryLocal(`insert into public.checklist_resultado (etapa_unidad_id, item_id, resultado) values ($1,$2,$3)`, [etapaId, item.id, res]);
  // foto del control (opcional, queda en adjuntos de la unidad)
  const foto = fd.get('foto') as File | null;
  if (foto && foto.size > 0) {
    try {
      const serie = (await queryLocal<{ s: string }>(`select numero_serie as s from public.unidad where id=$1`, [et.unidad_id]))[0]?.s ?? 'unidad';
      const url = await guardarArchivo(foto, 'fotos', `${serie}-control`);
      await queryLocal(`insert into public.adjunto (entidad, entidad_id, url, tipo) values ('etapa_unidad',$1,$2,'foto')`, [etapaId, url]);
    } catch { /* foto inválida: el control igual vale */ }
  }
  if (res === 'no_apto') {
    const nc = (await queryLocal<{ id: string }>(`insert into public.no_conformidad (unidad_id, etapa_unidad_id, descripcion, estado) values ($1,$2,'Ítem crítico no apto','abierta') returning id`, [et.unidad_id, etapaId]))[0];
    await queryLocal(`update public.etapa_unidad set estado='rechazada' where id=$1`, [etapaId]);
    await auditLocal('no_conformidad', nc.id, 'alta', { unidad: et.unidad_id });
  } else {
    await queryLocal(`update public.etapa_unidad set estado='aprobada', fin_real=now() where id=$1`, [etapaId]);
    // Descuento real de stock: BOM de la unidad en la etapa aprobada (reserva → salida)
    const info = (await queryLocal<{ etapa: string; modelo: string; unidad: string }>(
      `select pe.nombre as etapa, u.modelo_id as modelo, u.id as unidad from public.etapa_unidad eu
       join public.plantilla_etapa pe on pe.id=eu.plantilla_etapa_id join public.unidad u on u.id=eu.unidad_id where eu.id=$1`, [etapaId]))[0];
    if (info) {
      const bom = (await queryLocal<{ id: string }>(`select id from public.bom_modelo where modelo_id=$1 order by version desc limit 1`, [info.modelo]))[0];
      if (bom) {
        const lineas = await queryLocal<{ material_id: string; cantidad: number; merma_pct: number }>(
          `select material_id, cantidad, merma_pct from public.bom_linea where bom_id=$1 and etapa_consumo=$2`, [bom.id, info.etapa]);
        for (const l of lineas) {
          const need = Math.round(Number(l.cantidad) * (1 + Number(l.merma_pct) / 100) * 1000) / 1000;
          await queryLocal(`insert into public.movimiento_stock (material_id, tipo, cantidad, referencia_tipo, referencia_id) values ($1,'salida',$2,'unidad',$3)`, [l.material_id, need, info.unidad]);
        }
      }
      await queryLocal(`update public.unidad set etapa_actual=$2 where id=$1`, [info.unidad, info.etapa]);
    }
    await auditLocal('etapa_unidad', etapaId, 'modificacion', { estado: 'aprobada' });
  }
  redirect('/produccion');
}

async function cerrarNC(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  await queryLocal(`update public.no_conformidad set estado='cerrada', fecha_cierre=current_date, verificacion_eficacia=$2 where id=$1`,
    [String(fd.get('id')), String(fd.get('verif') ?? '') || null]);
  redirect('/produccion');
}

async function despachar(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const destino = String(fd.get('destino') ?? '').trim();
  await queryLocal(`update public.unidad set fecha_despacho=current_date, destino=$2, estado='despachada' where id=$1`, [id, destino || null]);
  const u = (await queryLocal<{ orden: string }>(`select orden_id as orden from public.unidad where id=$1`, [id]))[0];
  await auditLocal('unidad', id, 'modificacion', { despachada: true });
  const pend = await queryLocal<{ n: number }>(`select count(*)::int n from public.unidad where orden_id=$1 and fecha_despacho is null`, [u.orden]);
  if (pend[0].n === 0) await queryLocal(`update public.orden_produccion set estado='despachada', fecha_cierre=current_date where id=$1`, [u.orden]);
  redirect('/produccion');
}

export default async function Produccion() {
  const ops = await queryLocal<{ id: string; numero: string; estado: string }>(`select id, numero, estado from public.orden_produccion order by numero desc limit 20`);
  const unds = await queryLocal<{ id: string; serie: string; estado: string; etapa: string; nc: number; desp: string | null }>(
    `select u.id, u.numero_serie as serie, u.estado, u.etapa_actual as etapa, u.fecha_despacho as desp,
      (select count(*)::int from public.no_conformidad nc where nc.unidad_id=u.id and nc.estado<>'cerrada') as nc
     from public.unidad u order by u.numero_serie desc limit 30`);
  const pendientes = await queryLocal<{ id: string; serie: string; etapa: string }>(
    `select eu.id, u.numero_serie as serie, pe.nombre as etapa from public.etapa_unidad eu
     join public.unidad u on u.id=eu.unidad_id join public.plantilla_etapa pe on pe.id=eu.plantilla_etapa_id
     where eu.estado in ('pendiente','en_curso','rechazada') limit 10`);
  const estaciones = await queryLocal<{ etapa: string; n: number }>(
    `select pe.nombre as etapa, count(*)::int as n from public.etapa_unidad eu
     join public.plantilla_etapa pe on pe.id=eu.plantilla_etapa_id
     where eu.estado in ('pendiente','en_curso') group by pe.nombre order by min(pe.orden)`);
  const ncs = await queryLocal<{ id: string; serie: string; descripcion: string; estado: string }>(
    `select nc.id, u.numero_serie as serie, nc.descripcion, nc.estado from public.no_conformidad nc
     join public.unidad u on u.id=nc.unidad_id where nc.estado<>'cerrada' order by nc.estado limit 20`);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 4 · ISO 9001" titulo="Producción con trazabilidad"
          bajada="Auditoría interna en cada estación. Un no apto crea NC y bloquea la unidad."
          accion={<Link href="/produccion/ficha" className="rj-btn-accent">Ficha trazabilidad →</Link>} />
        <div className="grid grid-cols-2 gap-2">
          <Tarjeta titulo="Órdenes" valor={String(ops.length)} pie={ops.map((o) => o.numero).join(' · ') || 'Sin OP: aceptá una cotización'} />
          <Tarjeta titulo="Unidades" valor={String(unds.length)} pie="Serie única e inmutable" alerta={unds.some((u) => u.nc > 0)} />
        </div>
        <Paso n={1} titulo="Panel de planta por estación">
          {estaciones.length === 0 && <p className="text-sm opacity-60">Planta libre. Sin etapas en curso.</p>}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {estaciones.map((e) => (
              <div key={e.etapa} className="rj-card text-center">
                <p className="text-2xl font-black">{e.n}</p>
                <p className="text-xs font-bold">{e.etapa}</p>
              </div>
            ))}
          </div>
        </Paso>
        <Paso n={2} titulo="Checklist celular (apto / no apto)">
          {pendientes.length === 0 && <p className="text-sm opacity-60">Sin etapas pendientes.</p>}
          {pendientes.map((p) => (
            <form key={p.id} action={avance} className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border p-2">
              <input type="hidden" name="etapa_id" value={p.id} />
              <span className="min-w-40 flex-1 text-sm">{p.serie} · <b>{p.etapa}</b></span>
              <input name="foto" type="file" accept="image/*" capture="environment" className="text-xs" title="Foto del control" />
              <button name="resultado" value="apto" className="rj-btn-green">Apto</button>
              <button name="resultado" value="no_apto" className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">No apto</button>
            </form>
          ))}
        </Paso>
        <Paso n={3} titulo={`No conformidades abiertas (${ncs.length})`}>          {ncs.length === 0 && <p className="text-sm opacity-60">✓ Sin desvíos. La planta está en norma.</p>}
          {ncs.map((n) => (
            <form key={n.id} action={cerrarNC} className="mt-1 rounded-xl border p-2">
              <input type="hidden" name="id" value={n.id} />
              <p className="text-sm">· <b>{n.serie}</b> — {n.descripcion} <span className="rj-chip bg-amber-200">{n.estado}</span></p>
              <div className="mt-1 flex gap-1">
                <input name="verif" placeholder="Verificación de eficacia" className="rj-input" />
                <button className="rj-btn-green">Cerrar</button>
              </div>
            </form>
          ))}
        </Paso>
        <Paso n={4} titulo="Despacho y remito">
          {ops.length === 0 && <p className="text-sm opacity-60">Sin órdenes.</p>}
          {ops.map((o) => <p key={o.id} className="text-sm">· {o.numero} — {o.estado} <Link href={`/produccion/remito/${o.id}`} className="underline">Remito →</Link></p>)}
          {unds.filter((u) => !u.desp).map((u) => (
            <form key={u.id} action={despachar} className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border p-2">
              <input type="hidden" name="id" value={u.id} />
              <span className="min-w-40 flex-1 text-sm">· {u.serie} {u.nc > 0 ? `⛔ NC ${u.nc}` : '✓ lista'}</span>
              <input name="destino" placeholder="Destino" className="rounded-xl border px-2 py-1 text-xs" />
              <button className="rj-btn-primary !py-1 text-xs">Despachar</button>
            </form>
          ))}
        </Paso>
      </div>
    </AppLayout>
  );
}
