import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/app-layout";
import { Estado } from "@/components/estado";
import { fmtARS, fmtUSD, fmtFechaAR } from "@/lib/formato-ar";
import { ROLES, type Rol } from "@/lib/roles";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

async function setRol(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const rol = String(fd.get('rol') ?? 'Ventas');
  const p = (await queryLocal<{ id: string }>(`select id from public.perfiles where rol=$1::rol_usuario limit 1`, [rol]))[0];
  if (p) (await cookies()).set('sesion_local', p.id, { path: '/', maxAge: 60 * 60 * 12, httpOnly: true, sameSite: 'lax' });
  redirect('/');
}

async function completarTarea(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  await queryLocal(`update public.tarea set completada_en=now() where id=$1`, [String(fd.get('id') ?? '')]);
  redirect('/#bandeja');
}

async function getPerfil() {
  const useLocal = process.env.USE_LOCAL_DB === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http");
  if (useLocal) {
    const { sesionLocal } = await import('@/lib/sesion');
    return sesionLocal();
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("perfiles").select("rol,email").eq("id", user.id).single();
    return (data as { rol: Rol; email: string; id: string; nombre?: string } | null) ?? null;
  } catch {
    return null;
  }
}

// Tarjeta indicadora: número tabular clickeable, contexto y color solo por estado.
function Kpi({ titulo, valor, contexto, href, tono, accionVacia }: {
  titulo: string; valor: string; contexto?: string; href: string;
  tono?: 'ok' | 'alerta' | 'peligro'; accionVacia?: string;
}) {
  const esCero = valor === '0' || valor === '$ 0' || valor === 'USD 0.00';
  return (
    <Link
      href={href}
      className={`rj-card rj-tilt block border-l-4 ${tono === 'peligro' ? '!border-l-red-500' : tono === 'alerta' ? '!border-l-amber-400' : tono === 'ok' ? '!border-l-emerald-500' : '!border-l-[#07503f]'}`}
    >
      <p className="lbl">{titulo}</p>
      <p className="tnum mt-1 text-3xl font-bold text-[#212529] dark:text-neutral-100">{valor}</p>
      {esCero && accionVacia
        ? <p className="mt-1 text-[13px] font-bold text-[#07503f]">{accionVacia} →</p>
        : contexto && <p className="mt-1 text-[13px] text-[#3f3f46] dark:text-neutral-400">{contexto}</p>}
    </Link>
  );
}

function MiniBarras({ datos, max }: { datos: number[]; max: number }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {datos.map((v, i) => (
        <div key={i} className="min-w-2 flex-1 rounded-sm bg-[#07503f]/80" style={{ height: `${max > 0 ? Math.max(8, Math.round((v / max) * 100)) : 8}%` }} />
      ))}
    </div>
  );
}

export default async function Home() {
  const perfil = await getPerfil();
  if (!perfil) redirect('/ingresar');
  const { queryLocal } = await import('@/lib/db-local');
  const nombre = (perfil as { nombre?: string }).nombre ?? perfil.email;

  // Bandeja compartida: vencidas / hoy / semana, con contexto.
  const tareas = await queryLocal<{ id: string; titulo: string; vence: string | null; contexto: string | null; prioridad: string }>(
    `select t.id, t.titulo, t.vence_en::text as vence, t.prioridad,
      coalesce(o.titulo, cl.razon_social, 'general') as contexto
     from public.tarea t left join public.oportunidad o on o.id=t.oportunidad_id
     left join public.cliente cl on cl.id=t.cliente_id
     where t.completada_en is null order by t.vence_en nulls last limit 20`).catch(() => []);
  const hoy = new Date().toISOString().slice(0, 10);
  const en7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const vencidas = tareas.filter((t) => t.vence && t.vence < hoy);
  const deHoy = tareas.filter((t) => t.vence === hoy);
  const semana = tareas.filter((t) => t.vence && t.vence > hoy && t.vence <= en7);
  const sinFecha = tareas.filter((t) => !t.vence);

  const rol = perfil.rol;
  return (
    <AppLayout rol={rol} email={perfil.email} nombre={nombre}>
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-[#3f3f46] dark:text-neutral-300">
          Hola, <b className="text-[#212529] dark:text-white">{nombre}</b> — esto necesita tu atención hoy.
        </p>
        {rol === 'Ventas' && <TableroVentas q={queryLocal} />}
        {rol === 'Produccion' && <TableroPlanta q={queryLocal} />}
        {rol === 'Compras' && <TableroAdmin q={queryLocal} />}
        {rol === 'Administrador' && <TableroDireccion q={queryLocal} />}
        {rol === 'Postventa' && <TableroPostventa q={queryLocal} />}

        <section id="bandeja" className="rj-card scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-xl font-medium">Bandeja de tareas</p>
            <Link href="/crm" className="text-[13px] font-bold text-[#07503f] hover:underline">Crear en CRM →</Link>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <BandejaCol titulo={`Vencidas (${vencidas.length})`} items={vencidas} tono="peligro" vacio="Sin vencidas. Bien." />
            <BandejaCol titulo={`Hoy (${deHoy.length})`} items={deHoy} tono="alerta" vacio="Hoy libre. Anticipá mañana." accion="Crear tarea" />
            <BandejaCol titulo={`Esta semana (${semana.length})`} items={semana} vacio="Semana despejada." />
          </div>
          {sinFecha.length > 0 && (
            <p className="mt-2 text-[13px] text-[#3f3f46]">Sin fecha ({sinFecha.length}): {sinFecha.slice(0, 3).map((t) => t.titulo).join(' · ')}{sinFecha.length > 3 ? '…' : ''}</p>
          )}
        </section>

        <form action={setRol} className="rj-card flex items-center gap-2">
          <span className="flex-1 text-sm text-[#3f3f46]">Probar otro rol (dev local):</span>
          <select name="rol" defaultValue={rol} className="rounded-full border px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="rj-btn-primary">Ver</button>
        </form>
      </div>
    </AppLayout>
  );
}

function BandejaCol({ titulo, items, tono, vacio, accion }: {
  titulo: string;
  items: { id: string; titulo: string; vence: string | null; contexto: string | null; prioridad: string }[];
  tono?: 'peligro' | 'alerta'; vacio: string; accion?: string;
}) {
  return (
    <div>
      <p className={`lbl ${tono === 'peligro' ? '!text-red-700' : tono === 'alerta' ? '!text-amber-700' : ''}`}>{titulo}</p>
      {items.length === 0 && (
        <p className="mt-1 rounded-lg bg-[#f1efdf] p-2 text-[13px] text-[#3f3f46]">
          {vacio}{accion && <> <Link href="/crm" className="font-bold text-[#07503f] hover:underline">{accion} →</Link></>}
        </p>
      )}
      <ul className="mt-1 space-y-1">
        {items.map((t) => (
          <li key={t.id} className="flex items-center gap-2 rounded-lg border border-[#07503f]/10 bg-white p-2">
            <form action={completarTarea}>
              <input type="hidden" name="id" value={t.id} />
              <button aria-label={`Marcar lista: ${t.titulo}`} title="Marcar lista" className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#07503f]/40 hover:border-[#07503f] hover:bg-[#e8fe85]" />
            </form>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.titulo}</p>
              <p className="text-[12px] text-[#3f3f46]">{t.contexto}{t.vence ? ` · vence ${t.vence.split('-').reverse().join('/')}` : ''}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function TableroVentas({ q }: { q: <T>(s: string, p?: unknown[]) => Promise<T[]> }) {
  const embudo = await q<{ etapa: string; n: number; total: number }>(
    `select etapa, count(*)::int n, coalesce(sum(valor_estimado_usd),0) as total from public.oportunidad where etapa not in ('ganado','perdido') group by etapa`).catch(() => []);
  const orden = ['consulta', 'cotizado', 'negociacion'];
  const porVencer = await q<{ numero: string; dias: number }>(
    `select numero, ((creada_en + (validez_dias || ' days')::interval)::date - current_date)::int as dias from public.cotizacion
     where estado='enviada' and (creada_en + (validez_dias || ' days')::interval)::date <= current_date + 7 order by dias`).catch(() => []);
  const sinResp = await q<{ numero: string; total: number }>(
    `select numero, total_usd as total from public.cotizacion where estado='enviada' and coalesce(enviada_en, creada_en) < now() - interval '5 days' order by creada_en limit 5`).catch(() => []);
  const leadsHoy = await q<{ nombre: string; empresa: string | null }>(
    `select nombre, empresa from public.lead_web where fecha::date = current_date and convertido_en_cliente_id is null order by fecha desc limit 5`).catch(() => []);
  const ultimas = await q<{ numero: string; estado: string; total: number; cli: string | null }>(
    `select c.numero, c.estado, c.total_usd as total, cl.razon_social as cli from public.cotizacion c left join public.cliente cl on cl.id=c.cliente_id order by c.creada_en desc limit 5`).catch(() => []);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Embudo activo" valor={fmtUSD(embudo.reduce((a, e) => a + Number(e.total), 0))} contexto={`${embudo.reduce((a, e) => a + e.n, 0)} oportunidades`} href="/crm" />
        <Kpi titulo="Por vencer ≤7 días" valor={String(porVencer.length)} href="/cotizador" tono={porVencer.length ? 'peligro' : undefined} accionVacia="Sin vencimientos" />
        <Kpi titulo="Sin respuesta +5 días" valor={String(sinResp.length)} href="/cotizador" tono={sinResp.length ? 'alerta' : undefined} accionVacia="Todo respondido" />
        <Kpi titulo="Leads hoy" valor={String(leadsHoy.length)} href="/crm" accionVacia="Sin leads hoy" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rj-card">
          <p className="font-display text-xl font-medium">Embudo por etapa</p>
          {embudo.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Sin oportunidades abiertas. <Link href="/crm" className="font-bold text-[#07503f] hover:underline">Crear una →</Link></p>}
          {orden.map((e) => {
            const r = embudo.find((x) => x.etapa === e);
            return (
              <p key={e} className="flex justify-between border-b border-dashed border-[#07503f]/20 py-1 text-sm">
                <span className="capitalize">{e}</span>
                <span className="tnum">{r?.n ?? 0} · {fmtUSD(Number(r?.total ?? 0))}</span>
              </p>
            );
          })}
        </div>
        <div className="rj-card">
          <p className="font-display text-xl font-medium">Vencen pronto</p>
          {porVencer.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Nada por vencer esta semana.</p>}
          {porVencer.map((c) => (
            <p key={c.numero} className="flex justify-between border-b border-dashed border-[#07503f]/20 py-1 text-sm">
              <Link href="/cotizador" className="font-mono2 hover:underline">{c.numero}</Link>
              <b className={c.dias < 0 ? 'text-red-700' : ''}>{c.dias < 0 ? `vencida hace ${-c.dias}d` : `vence en ${c.dias}d`}</b>
            </p>
          ))}
          {sinResp.length > 0 && <><p className="lbl mt-2">Sin respuesta</p>
            {sinResp.map((c) => <p key={c.numero} className="flex justify-between py-0.5 text-sm"><span className="font-mono2">{c.numero}</span><span className="tnum">{fmtUSD(Number(c.total))}</span></p>)}</>}
        </div>
        <div className="rj-card">
          <p className="font-display text-xl font-medium">Últimas cotizaciones</p>
          {ultimas.map((c) => (
            <p key={c.numero} className="flex items-center justify-between gap-2 border-b border-dashed border-[#07503f]/20 py-1 text-sm">
              <span className="min-w-0"><span className="font-mono2">{c.numero}</span> <span className="truncate text-[#3f3f46]">· {c.cli ?? '—'}</span></span>
              <Estado valor={c.estado} />
            </p>
          ))}
          {ultimas.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Todavía no hay cotizaciones.</p>}
        </div>
      </div>
    </>
  );
}

async function TableroPlanta({ q }: { q: <T>(s: string, p?: unknown[]) => Promise<T[]> }) {
  const ops = await q<{ id: string; numero: string; estado: string; prom: string | null; tot: number; ok: number }>(
    `select o.id, o.numero, o.estado, o.fecha_prometida::text as prom,
      count(e.id)::int as tot, count(*) filter (where e.estado='aprobada')::int as ok
     from public.orden_produccion o left join public.unidad u on u.orden_id=o.id
     left join public.etapa_unidad e on e.unidad_id=u.id
     where o.estado in ('pendiente','en_produccion') group by o.id order by o.fecha_prometida nulls last limit 8`).catch(() => []);
  const entregas = ops.filter((o) => o.prom && o.prom <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  const crit = await q<{ codigo: string; nombre: string }>(
    `select m.codigo, m.nombre from public.material m where (select coalesce(sum(case when tipo in ('entrada','ajuste') then cantidad else -cantidad end),0) from public.movimiento_stock s where s.material_id=m.id) < m.stock_minimo limit 5`).catch(() => []);
  const controles = await q<{ serie: string; n: number }>(
    `select u.numero_serie as serie, count(*)::int as n from public.etapa_unidad e join public.unidad u on u.id=e.unidad_id where e.estado='en_control' group by u.numero_serie limit 5`).catch(() => []);
  const ncs = await q<{ descripcion: string; serie: string | null }>(
    `select n.descripcion, u.numero_serie as serie from public.no_conformidad n left join public.unidad u on u.id=n.unidad_id where n.estado<>'cerrada' order by n.id limit 5`).catch(() => []);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Órdenes en curso" valor={String(ops.length)} href="/produccion" accionVacia="Planta libre" />
        <Kpi titulo="Entregas 7 días" valor={String(entregas.length)} href="/produccion" tono={entregas.length ? 'alerta' : undefined} accionVacia="Sin entregas" />
        <Kpi titulo="En control calidad" valor={String(controles.reduce((a, c) => a + c.n, 0))} href="/produccion" tono={controles.length ? 'alerta' : undefined} accionVacia="Sin controles" />
        <Kpi titulo="NC abiertas" valor={String(ncs.length)} href="/produccion" tono={ncs.length ? 'peligro' : undefined} accionVacia="Sin NC" />
      </div>
      <div className="rj-card">
        <p className="font-display text-xl font-medium">Órdenes en curso</p>
        {ops.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Sin órdenes activas.</p>}
        {ops.map((o) => {
          const pct = o.tot > 0 ? Math.round((o.ok / o.tot) * 100) : 0;
          return (
            <div key={o.id} className="border-b border-dashed border-[#07503f]/20 py-2">
              <p className="flex justify-between text-sm"><span><b className="font-mono2">{o.numero}</b> · {o.prom ? `entrega ${o.prom.split('-').reverse().join('/')}` : 'sin fecha'} </span><Estado valor={o.estado} /></p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f1efdf]"><div className="h-full rounded-full bg-[#07503f]" style={{ width: `${pct}%` }} /></div>
              <p className="tnum mt-0.5 text-[12px] text-[#07503f]">{pct}% · {o.ok}/{o.tot} etapas</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rj-card">
          <p className="font-display text-xl font-medium">Stock crítico</p>
          {crit.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Stock bajo control.</p>}
          {crit.map((m) => <p key={m.codigo} className="border-b border-dashed border-[#07503f]/20 py-1 text-sm"><b className="font-mono2">{m.codigo}</b> · {m.nombre} <Link href="/stock" className="font-bold text-[#07503f] hover:underline">reponer →</Link></p>)}
        </div>
        <div className="rj-card">
          <p className="font-display text-xl font-medium">No conformidades</p>
          {ncs.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Sin NC abiertas.</p>}
          {ncs.map((n, i) => <p key={i} className="border-b border-dashed border-[#07503f]/20 py-1 text-sm">· {n.descripcion} {n.serie && <span className="font-mono2 text-[#07503f]">[{n.serie}]</span>}</p>)}
        </div>
      </div>
    </>
  );
}

async function TableroAdmin({ q }: { q: <T>(s: string, p?: unknown[]) => Promise<T[]> }) {
  const caja = (await q<{ abierta: boolean; saldo: number; movs: number }>(
    `select exists(select 1 from public.caja where estado='abierta') as abierta,
      coalesce((select saldo_inicial_ars from public.caja where estado='abierta' order by abierta_en desc limit 1),0)
      + coalesce((select sum(case when m.tipo='ingreso' then m.monto_ars else -m.monto_ars end) from public.caja_movimiento m join public.caja c on c.id=m.caja_id where c.estado='abierta'),0) as saldo,
      coalesce((select count(*)::int from public.caja_movimiento m join public.caja c on c.id=m.caja_id where c.estado='abierta'),0) as movs`).catch(() => []))[0];
  const pendientes = await q<{ numero: string; total: number; creada: string }>(
    `select numero, total_ars as total, creada_en::date::text as creada from public.comprobante where estado<>'aprobado' order by creada_en limit 8`).catch(() => []);
  const sinFacturar = await q<{ numero: string; total: number }>(
    `select c.numero, c.total_ars as total from public.cotizacion c where c.estado='aceptada' and not exists (select 1 from public.comprobante f where f.cotizacion_id=c.id) limit 8`).catch(() => []);
  const antig = await q<{ tramo: string; n: number; total: number }>(
    `select case when current_date - creada_en::date <= 30 then '0–30 días' when current_date - creada_en::date <= 60 then '31–60 días' else '+60 días' end as tramo,
      count(*)::int as n, coalesce(sum(total_ars),0) as total from public.comprobante where estado<>'aprobado' group by 1 order by 1`).catch(() => []);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Caja (sistema)" valor={fmtARS(Number(caja?.saldo ?? 0))} contexto={caja?.abierta ? `${caja.movs} movs · abierta` : 'cerrada'} href="/caja" tono={caja?.abierta ? undefined : 'alerta'} accionVacia="Abrir caja" />
        <Kpi titulo="Comprobantes pendientes" valor={String(pendientes.length)} href="/facturacion" tono={pendientes.length ? 'alerta' : undefined} accionVacia="Todo aprobado" />
        <Kpi titulo="Aceptadas sin facturar" valor={String(sinFacturar.length)} href="/facturacion" tono={sinFacturar.length ? 'alerta' : undefined} accionVacia="Todo facturado" />
        <Kpi titulo="Deuda +60 días" valor={fmtARS(Number(antig.find((a) => a.tramo === '+60 días')?.total ?? 0))} href="/facturacion" tono={Number(antig.find((a) => a.tramo === '+60 días')?.total ?? 0) > 0 ? 'peligro' : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rj-card">
          <p className="font-display text-xl font-medium">Antigüedad de deuda</p>
          {antig.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Sin comprobantes pendientes.</p>}
          {antig.map((a) => <p key={a.tramo} className="flex justify-between border-b border-dashed border-[#07503f]/20 py-1 text-sm"><span>{a.tramo} · {a.n}</span><b className="tnum">{fmtARS(Number(a.total))}</b></p>)}
        </div>
        <div className="rj-card">
          <p className="font-display text-xl font-medium">Por facturar</p>
          {sinFacturar.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Todo lo aceptado ya tiene comprobante.</p>}
          {sinFacturar.map((c) => <p key={c.numero} className="flex justify-between py-1 text-sm"><span className="font-mono2">{c.numero}</span><b className="tnum">{fmtARS(Number(c.total))}</b></p>)}
          <Link href="/facturacion" className="mt-1 inline-block text-[13px] font-bold text-[#07503f] hover:underline">Ir a facturación →</Link>
        </div>
      </div>
    </>
  );
}

async function TableroDireccion({ q }: { q: <T>(s: string, p?: unknown[]) => Promise<T[]> }) {
  const mes = await q<{ ventas: number; n: number; margen: number }>(
    `select coalesce(sum(total_usd),0) as ventas, count(*)::int as n, coalesce(avg(margen_pct),0) as margen from public.cotizacion
     where estado='aceptada' and date_trunc('month', creada_en) = date_trunc('month', current_date)`).catch(() => [{ ventas: 0, n: 0, margen: 0 }]);
  const prev = await q<{ ventas: number }>(
    `select coalesce(sum(total_usd),0) as ventas from public.cotizacion where estado='aceptada' and date_trunc('month', creada_en) = date_trunc('month', current_date - interval '1 month')`).catch(() => [{ ventas: 0 }]);
  const spark = await q<{ m: string; v: number }>(
    `select to_char(date_trunc('month', creada_en),'MM') as m, coalesce(sum(total_usd),0) as v from public.cotizacion
     where estado='aceptada' and creada_en >= date_trunc('month', current_date) - interval '5 months' group by 1 order by 1`).catch(() => []);
  const obj = Number((await q<{ v: string }>(`select valor as v from public.configuracion where clave='OBJETIVO_VENTAS_MENSUAL_USD'`).catch((): { v: string }[] => [{ v: '120000' }]))[0]?.v ?? 120000);
  const cot = await q<{ env: number; acep: number }>(
    `select count(*) filter (where estado='enviada')::int as env, count(*) filter (where estado='aceptada')::int as acep from public.cotizacion
     where date_trunc('month', creada_en) = date_trunc('month', current_date)`).catch(() => [{ env: 0, acep: 0 }]);
  const tasa = cot[0].env + cot[0].acep > 0 ? Math.round((cot[0].acep / (cot[0].env + cot[0].acep)) * 100) : 0;
  const prod = await q<{ n: number }>(`select count(*)::int n from public.orden_produccion where estado in ('pendiente','en_produccion')`).catch(() => [{ n: 0 }]);
  const alertas = await q<{ t: string }>(
    `select (select count(*)::int from public.tarea where completada_en is null and vence_en < current_date)::text as t`).catch(() => []);
  const v = Number(mes[0].ventas), pv = Number(prev[0]?.ventas ?? 0);
  const delta = pv > 0 ? Math.round(((v - pv) / pv) * 100) : (v > 0 ? 100 : 0);
  const avance = obj > 0 ? Math.min(100, Math.round((v / obj) * 100)) : 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Ventas del mes" valor={fmtUSD(v)} contexto={`${delta >= 0 ? '+' : ''}${delta}% vs mes anterior · obj ${fmtUSD(obj)}`} href="/panel" tono={avance >= 80 ? 'ok' : avance >= 40 ? undefined : 'alerta'} />
        <Kpi titulo="Tasa de cierre" valor={`${tasa}%`} contexto={`${cot[0].acep} ganadas · margen ${Number(mes[0].margen).toFixed(1)}%`} href="/panel" />
        <Kpi titulo="Producción en curso" valor={String(prod[0].n)} href="/produccion" accionVacia="Planta libre" />
        <Kpi titulo="Tareas vencidas" valor={alertas[0]?.t ?? '0'} href="/#bandeja" tono={Number(alertas[0]?.t ?? 0) > 0 ? 'peligro' : undefined} accionVacia="Sin vencidas" />
      </div>
      <div className="rj-card">
        <p className="font-display text-xl font-medium">Ventas aceptadas · avance {avance}% del objetivo</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#f1efdf]"><div className="h-full rounded-full bg-[#07503f]" style={{ width: `${avance}%` }} /></div>
        <div className="mt-2"><MiniBarras datos={spark.map((s) => Number(s.v))} max={Math.max(...spark.map((s) => Number(s.v)), 1)} /></div>
        <p className="tnum mt-1 text-[13px] text-[#07503f]">{mes[0].n} operaciones · cotizado vs cerrado del mes en <Link href="/panel" className="font-bold hover:underline">Panel →</Link></p>
      </div>
    </>
  );
}

async function TableroPostventa({ q }: { q: <T>(s: string, p?: unknown[]) => Promise<T[]> }) {
  const tickets = await q<{ tipo: string; n: number }>(
    `select tipo, count(*)::int n from public.ticket_postventa where estado<>'cerrado' group by tipo`).catch(() => []);
  const seg7 = await q<{ serie: string }>(
    `select numero_serie as serie from public.unidad where fecha_despacho = current_date - 7 limit 10`).catch(() => []);
  const seg30 = await q<{ serie: string }>(
    `select numero_serie as serie from public.unidad where fecha_despacho = current_date - 30 limit 10`).catch(() => []);
  const tot = tickets.reduce((a, t) => a + t.n, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Tickets abiertos" valor={String(tot)} href="/postventa" tono={tot ? 'alerta' : undefined} accionVacia="Sin tickets" />
        <Kpi titulo="Seguimiento 7 días" valor={String(seg7.length)} contexto="Entregadas hace 7 días" href="/postventa" accionVacia="Nada hoy" />
        <Kpi titulo="Seguimiento 30 días" valor={String(seg30.length)} contexto="Reseña Google" href="/postventa" accionVacia="Nada hoy" />
        <Kpi titulo="Garantías" valor={String(tickets.find((t) => t.tipo === 'garantia')?.n ?? 0)} href="/postventa" accionVacia="Sin garantías" />
      </div>
      {(seg7.length > 0 || seg30.length > 0) && (
        <div className="rj-card">
          <p className="font-display text-xl font-medium">Toca hacer seguimiento</p>
          {seg7.map((s) => <p key={s.serie} className="py-0.5 text-sm">· <span className="font-mono2">{s.serie}</span> — llamado 7 días <Link href="/postventa" className="font-bold text-[#07503f] hover:underline">abrir ticket →</Link></p>)}
          {seg30.map((s) => <p key={s.serie} className="py-0.5 text-sm">· <span className="font-mono2">{s.serie}</span> — pedir reseña Google <Link href="/postventa" className="font-bold text-[#07503f] hover:underline">abrir ticket →</Link></p>)}
        </div>
      )}
    </>
  );
}
