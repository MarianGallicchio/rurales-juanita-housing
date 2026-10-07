import { AppLayout } from '@/components/app-layout';
import { PageHero, Tarjeta } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtUSD } from '@/lib/formato-ar';

export const dynamic = 'force-dynamic';

export default async function Panel({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; cli?: string; mod?: string }> }) {
  const sp = await searchParams;
  const conds: string[] = [];
  const vals: unknown[] = [];
  if (sp.desde) { vals.push(sp.desde); conds.push(`c.creada_en >= $${vals.length}`); }
  if (sp.hasta) { vals.push(sp.hasta); conds.push(`c.creada_en <= $${vals.length}::date + interval '1 day'`); }
  if (sp.cli) { vals.push(sp.cli); conds.push(`c.cliente_id = $${vals.length}`); }
  if (sp.mod) { vals.push(sp.mod); conds.push(`exists (select 1 from public.cotizacion_item i where i.cotizacion_id=c.id and i.modelo_id=$${vals.length})`); }
  const w = conds.length ? `where ${conds.join(' and ')}` : '';
  const cot = (await queryLocal<{ enviadas: number; aceptadas: number; total: number }>(
    `select count(*) filter (where estado='enviada')::int as enviadas, count(*) filter (where estado='aceptada')::int as aceptadas, coalesce(sum(total_usd) filter (where estado='aceptada'),0) as total from public.cotizacion c ${w}`, vals))[0] ?? { enviadas: 0, aceptadas: 0, total: 0 };
  const tasa = cot.enviadas + cot.aceptadas > 0 ? Math.round((cot.aceptadas / (cot.enviadas + cot.aceptadas)) * 100) : 0;
  const porLinea = await queryLocal<{ linea: string; n: number; total: number }>(
    `select cat.nombre as linea, count(distinct c.id)::int as n, coalesce(sum(c.total_usd),0) as total
     from public.cotizacion c join public.cotizacion_item i on i.cotizacion_id=c.id
     join public.modelo m on m.id=i.modelo_id join public.categoria cat on cat.id=m.categoria_id ${w} group by cat.nombre order by total desc`, vals);
  const prod = await queryLocal<{ estado: string; n: number }>(`select estado, count(*)::int as n from public.orden_produccion group by estado`);
  const stock = (await queryLocal<{ n: number }>(
    `select count(*)::int as n from public.material m where (select coalesce(sum(case when tipo='entrada' then cantidad when tipo='salida' then -cantidad else 0 end),0) from public.movimiento_stock s where s.material_id=m.id) < m.stock_minimo`))[0]?.n ?? 0;
  const rec = (await queryLocal<{ n: number }>(`select count(*)::int as n from public.ticket_postventa where estado<>'cerrado'`))[0]?.n ?? 0;
  const nc = (await queryLocal<{ n: number }>(`select count(*)::int as n from public.no_conformidad where estado<>'cerrada'`))[0]?.n ?? 0;
  const clis = await queryLocal<{ id: string; razon_social: string }>(`select id, razon_social from public.cliente order by razon_social`);
  const mods = await queryLocal<{ id: string; codigo: string }>(`select id, codigo from public.modelo order by codigo`);
  const calidad = (await queryLocal<{ r: string; n: number }>(`select resultado as r, count(*)::int as n from public.checklist_resultado group by resultado`));
  const apto = calidad.find((x) => x.r === 'apto')?.n ?? 0;
  const noApto = calidad.find((x) => x.r === 'no_apto')?.n ?? 0;
  const aging = await queryLocal<{ numero: string; dias: number; estado: string }>(
    `select numero, (current_date - coalesce(fecha_inicio, current_date))::int as dias, estado from public.orden_produccion where estado in ('pendiente','en_produccion') order by fecha_inicio nulls last limit 10`);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa']);
  const filtrado = sp.desde || sp.hasta || sp.cli || sp.mod;
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 8 · Dirección" titulo={<>Panel de <em className="rj-gold">control</em></>} bajada="Decisiones con datos: ventas, planta, stock, calidad." vivo />
        <form method="get" action="/panel" className="rj-card grid grid-cols-2 gap-2 md:grid-cols-5">
          <input name="desde" type="date" defaultValue={sp.desde ?? ''} className="rj-input" title="Desde" />
          <input name="hasta" type="date" defaultValue={sp.hasta ?? ''} className="rj-input" title="Hasta" />
          <select name="cli" defaultValue={sp.cli ?? ''} className="rj-input"><option value="">Todos los clientes</option>{clis.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select>
          <select name="mod" defaultValue={sp.mod ?? ''} className="rj-input"><option value="">Todos los modelos</option>{mods.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}</select>
          <button className="rj-btn-primary">Filtrar{filtrado ? ' ✓' : ''}</button>
        </form>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Tarjeta titulo="Tasa cierre" valor={`${tasa}%`} pie={`${cot.aceptadas} ganadas · ${fmtUSD(Number(cot.total))}`} tono={0} />
          <Tarjeta titulo="Stock crítico" valor={String(stock)} alerta={stock > 0} tono={1} />
          <Tarjeta titulo="NC abiertas" valor={String(nc)} alerta={nc > 0} tono={2} />
          <Tarjeta titulo="Tickets abiertos" valor={String(rec)} alerta={rec > 0} tono={3} />
        </div>
        <div className="rj-card">
          <p className="text-sm font-black">Ventas por línea{filtrado ? ' (filtrado)' : ''}</p>
          {porLinea.length === 0 && <p className="text-sm opacity-60">Sin ventas en el filtro.</p>}
          {porLinea.map((l) => {
            const max = Math.max(...porLinea.map((x) => Number(x.total)), 1);
            return (
              <div key={l.linea} className="mt-1">
                <p className="text-sm">· {l.linea}: {l.n} — {fmtUSD(Number(l.total))}</p>
                <div className="h-2 overflow-hidden rounded-full bg-[#f1efdf]"><div className="h-full rounded-full bg-[#07503f]" style={{ width: `${Math.round((Number(l.total) / max) * 100)}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="rj-card"><p className="text-sm font-black">Producción</p>{prod.map((p) => <p key={p.estado} className="text-sm">{p.estado}: {p.n}</p>)}
          {aging.length > 0 && <><p className="mt-1 text-xs font-black uppercase opacity-60">Antigüedad OPs abiertas</p>{aging.map((a) => <p key={a.numero} className="text-sm">· {a.numero}: <b className={a.dias > 30 ? 'text-red-600' : ''}>{a.dias} días</b> ({a.estado})</p>)}</>}
        </div>
        <div className="rj-card"><p className="text-sm font-black">Calidad checklist</p>
          {apto + noApto === 0 && <p className="text-sm opacity-60">Sin controles aún.</p>}
          {apto + noApto > 0 && (
            <>
              <div className="flex h-4 overflow-hidden rounded-full"><div className="bg-[#07503f]" style={{ width: `${Math.round((apto / (apto + noApto)) * 100)}%` }} /><div className="bg-red-500" style={{ width: `${Math.round((noApto / (apto + noApto)) * 100)}%` }} /></div>
              <p className="mt-1 text-sm">✓ {apto} aptos · ⛔ {noApto} no aptos</p>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
