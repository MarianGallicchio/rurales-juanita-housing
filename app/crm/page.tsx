import { AppLayout } from '@/components/app-layout';
import { PageHero } from '@/components/ui-brand';
import { Estado } from '@/components/estado';
import { KanbanCrm } from '@/components/kanban-crm';
import { FiltrosGuardados } from '@/components/filtros-guardados';
import { fmtUSD } from '@/lib/formato-ar';
import { queryLocal } from '@/lib/db-local';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function mover(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const id = String(fd.get('id'));
  const etapa = String(fd.get('etapa'));
  if (etapa === 'perdido' && !String(fd.get('motivo') ?? '').trim()) return;
  await queryLocal(`update public.oportunidad set etapa=$2, motivo_perdida=$3 where id=$1`, [id, etapa, String(fd.get('motivo') ?? '') || null]);
  redirect('/crm');
}
async function tarea(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  await queryLocal(`insert into public.tarea (oportunidad_id, titulo, vence_en) values ($1,$2,$3)`,
    [String(fd.get('op')), String(fd.get('titulo')), String(fd.get('vence')) || null]);
  redirect('/crm');
}

function cuitValido(cuit: string): boolean {
  const d = cuit.replace(/\D/g, '');
  if (d.length !== 11) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * mult[i];
  let ver = 11 - (s % 11); if (ver === 11) ver = 0; if (ver === 10) ver = 9;
  return ver === Number(d[10]);
}

async function crearCliente(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const razon = String(fd.get('razon') ?? '').trim();
  const cuit = String(fd.get('cuit') ?? '').trim();
  const tipo = String(fd.get('tipo') ?? 'otro');
  const cond = String(fd.get('cond') ?? 'Consumidor Final');
  if (!razon) return;
  if (cuit && !cuitValido(cuit)) return; // CUIT inválido: se rechaza
  // alerta duplicado: si existe CUIT o razón similar, no duplicar
  if (cuit) {
    const dup = await queryLocal<{ id: string }>(`select id from public.cliente where cuit=$1`, [cuit]);
    if (dup.length > 0) { redirect('/crm?dup=1'); }
  }
  await queryLocal(`insert into public.cliente (razon_social, cuit, tipo, condicion_iva) values ($1,$2,$3,$4)`, [razon, cuit || null, tipo, cond]);
  redirect('/crm');
}

async function convertirLead(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id'));
  const lead = (await queryLocal<{ nombre: string; empresa: string; email: string; telefono: string }>(`select nombre, empresa, email, telefono from public.lead_web where id=$1`, [id]))[0];
  if (!lead) return;
  const cli = (await queryLocal<{ id: string }>(
    `insert into public.cliente (razon_social, tipo) values ($1,'otro') returning id`, [lead.empresa || lead.nombre]))[0];
  await queryLocal(`insert into public.contacto (cliente_id, nombre, email, telefono, principal) values ($1,$2,$3,$4,true)`, [cli.id, lead.nombre, lead.email, lead.telefono]);
  await queryLocal(`insert into public.oportunidad (cliente_id, titulo, etapa, origen) values ($1,$2,'consulta','web')`, [cli.id, `Web: ${lead.nombre}`]);
  await queryLocal(`update public.lead_web set convertido_en_cliente_id=$2 where id=$1`, [id, cli.id]);
  redirect('/crm');
}

async function homologar(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const cliente_id = String(fd.get('cliente_id') ?? '');
  if (!cliente_id) return;
  const h = (await queryLocal<{ id: string }>(
    `insert into public.homologacion (cliente_id, estado, fecha_aprobacion, vencimiento, documento_url, observaciones) values ($1,$2,$3,$4,$5,$6) returning id`,
    [cliente_id, String(fd.get('estado') ?? 'en_tramite'), String(fd.get('fap') ?? '') || null, String(fd.get('ven') ?? '') || null, String(fd.get('doc') ?? '') || null, String(fd.get('obs') ?? '') || null]
  ))[0];
  await auditLocal('homologacion', h.id, 'alta', { cliente_id });
  redirect('/crm');
}

async function importarCSV(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  // Formato por línea: razon_social;cuit;tipo;condicion_iva
  const texto = String(fd.get('csv') ?? '');
  let ok = 0;
  const digito = (cuit: string) => {
    const d = cuit.replace(/\D/g, '');
    if (d.length !== 11) return false;
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * mult[i];
    let v = 11 - (s % 11); if (v === 11) v = 0; if (v === 10) v = 9;
    return v === Number(d[10]);
  };
  for (const linea of texto.split('\n')) {
    const [razon, cuit = '', tipo = 'otro', cond = 'Consumidor Final'] = linea.split(';').map((x) => x.trim());
    if (!razon) continue;
    if (cuit && !digito(cuit)) continue; // línea con CUIT inválido: se saltea
    try {
      await queryLocal(`insert into public.cliente (razon_social, cuit, tipo, condicion_iva) values ($1,$2,$3,$4) on conflict (cuit) do nothing`,
        [razon, cuit || null, tipo, ['Responsable Inscripto', 'Monotributo', 'Exento'].includes(cond) ? cond : 'Consumidor Final']);
      ok++;
    } catch { /* duplicado exacto: sigue */ }
  }
  redirect(`/crm?imp=${ok}`);
}

async function crearContacto(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const cliente_id = String(fd.get('cliente_id') ?? '');
  const nombre = String(fd.get('nombre') ?? '').trim();
  if (!cliente_id || !nombre) return;
  await queryLocal(`insert into public.contacto (cliente_id, nombre, cargo, email, telefono, whatsapp, principal)
    values ($1,$2,$3,$4,$5,$6,coalesce((select count(*)=0 from public.contacto where cliente_id=$1),false))`,
    [cliente_id, nombre, String(fd.get('cargo') ?? '') || null, String(fd.get('email') ?? '') || null, String(fd.get('tel') ?? '') || null, String(fd.get('wa') ?? '') || null]);
  redirect('/crm');
}

async function crearOportunidad(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const cliente_id = String(fd.get('cliente_id') ?? '');
  const titulo = String(fd.get('titulo') ?? '').trim();
  if (!cliente_id || !titulo) return;
  await queryLocal(`insert into public.oportunidad (cliente_id, titulo, etapa, valor_estimado_usd, probabilidad_pct, origen) values ($1,$2,'consulta',$3,$4,$5)`,
    [cliente_id, titulo, Number(fd.get('valor') ?? 0) || 0, Number(fd.get('prob') ?? 20) || 20, String(fd.get('origen') ?? 'visita')]);
  redirect('/crm');
}

const ETAPAS = ['consulta', 'cotizado', 'negociacion', 'ganado', 'perdido'] as const;

export default async function CRM({ searchParams }: { searchParams: Promise<{ dup?: string; imp?: string; q?: string; tipo?: string; origen?: string; vista?: string; cliente?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const fTipo = sp.tipo ?? '';
  const fOrigen = sp.origen ?? '';
  const vista = sp.vista === 'lista' ? 'lista' : 'kanban';
  const conds: string[] = [];
  const vals: unknown[] = [];
  if (q) { vals.push(`%${q}%`); conds.push(`(o.titulo ilike $${vals.length} or cl.razon_social ilike $${vals.length})`); }
  if (fTipo) { vals.push(fTipo); conds.push(`cl.tipo = $${vals.length}`); }
  if (fOrigen) { vals.push(fOrigen); conds.push(`o.origen = $${vals.length}`); }
  const w = conds.length ? `where ${conds.join(' and ')}` : '';
  const ops = await queryLocal<{ id: string; titulo: string; etapa: string; valor_estimado_usd: number; dias: number; cliente: string; tipo: string; origen: string; tel: string | null }>(
    `select o.id, o.titulo, o.etapa, o.valor_estimado_usd, (current_date - o.creado_en::date)::int as dias,
      cl.razon_social as cliente, cl.tipo, o.origen,
      (select coalesce(c.whatsapp, c.telefono) from public.contacto c where c.cliente_id=cl.id order by c.principal desc limit 1) as tel
     from public.oportunidad o join public.cliente cl on cl.id=o.cliente_id ${w} order by o.creado_en desc limit 80`, vals);
  const tareas = await queryLocal<{ titulo: string; vence_en: string; etapa: string }>(
    `select t.titulo, t.vence_en, o.etapa from public.tarea t left join public.oportunidad o on o.id=t.oportunidad_id where t.completada_en is null order by t.vence_en limit 20`);
  const leads = await queryLocal<{ id: string; nombre: string; empresa: string; telefono: string; convertido: string; canal: string }>(
    `select id, nombre, empresa, telefono, convertido_en_cliente_id as convertido, coalesce(canal,'web') as canal from public.lead_web order by fecha desc limit 10`);
  const clis = await queryLocal<{ id: string; razon_social: string; cuit: string; tipo: string; condicion_iva: string; tel: string | null; ops: number; cots: number }>(
    `select cl.id, cl.razon_social, cl.cuit, cl.tipo, cl.condicion_iva,
      (select coalesce(c.whatsapp, c.telefono) from public.contacto c where c.cliente_id=cl.id order by c.principal desc limit 1) as tel,
      (select count(*)::int from public.oportunidad o where o.cliente_id=cl.id and o.etapa not in ('ganado','perdido')) as ops,
      (select count(*)::int from public.cotizacion co where co.cliente_id=cl.id) as cots
     from public.cliente cl order by cl.razon_social limit 30`);
  const clisId = await queryLocal<{ id: string; razon_social: string }>(`select id, razon_social from public.cliente order by razon_social`);
  const homos = await queryLocal<{ cliente: string; estado: string; vencimiento: string }>(
    `select cl.razon_social as cliente, h.estado, h.vencimiento from public.homologacion h join public.cliente cl on cl.id=h.cliente_id order by h.vencimiento nulls last limit 20`);
  const fichaCli = sp.cliente ? (await queryLocal<{ razon: string; tipo: string; tel: string | null }>(
    `select cl.razon_social as razon, cl.tipo,
      (select coalesce(c.whatsapp, c.telefono) from public.contacto c where c.cliente_id=cl.id order by c.principal desc limit 1) as tel
     from public.cliente cl where cl.id=$1`, [sp.cliente]))[0] ?? null : null;
  const fichaOps = sp.cliente ? await queryLocal<{ titulo: string; etapa: string; valor: number }>(
    `select titulo, etapa, valor_estimado_usd as valor from public.oportunidad where cliente_id=$1 order by creado_en desc limit 10`, [sp.cliente]) : [];
  const fichaCots = sp.cliente ? await queryLocal<{ numero: string; estado: string; total: number }>(
    `select numero, estado, total_usd as total from public.cotizacion where cliente_id=$1 order by creada_en desc limit 10`, [sp.cliente]) : [];
  const retomar = await queryLocal<{ id: string; titulo: string; cliente: string; dias: number }>(
    `select o.id, o.titulo, cl.razon_social as cliente, (current_date - o.creado_en::date)::int as dias
     from public.oportunidad o join public.cliente cl on cl.id=o.cliente_id
     where o.etapa in ('consulta','cotizado','negociacion') and o.creado_en < now() - interval '5 days'
       and not exists (select 1 from public.tarea t where t.oportunidad_id=o.id and t.completada_en is null)
     order by o.creado_en limit 8`).catch(() => []);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Postventa']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
      <PageHero kicker="Fase 3 · Que no se escape nada" titulo="CRM"
        bajada="Kanban, tareas, homologaciones y leads de la web en un solo lugar." />
      <form method="get" action="/crm" className="rj-card flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar oportunidad o cliente…" className="rj-input !w-56" aria-label="Buscar" />
        <select name="tipo" defaultValue={fTipo} className="rj-input !w-48" aria-label="Segmento">
          <option value="">Todos los segmentos</option>
          <option value="operadora">Petróleo · operadoras</option><option value="minera">Minería</option>
          <option value="concesionario agro">Agro · concesionarios</option><option value="estación de servicio">Estaciones de servicio</option>
          <option value="otro">Otro</option>
        </select>
        <select name="origen" defaultValue={fOrigen} className="rj-input !w-44" aria-label="Origen">
          <option value="">Todos los orígenes</option>
          {['visita', 'web', 'google', 'instagram', 'facebook', 'linkedin', 'feria', 'referido', 'concesionario'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button className="rj-btn-primary">Filtrar</button>
        {(q || fTipo || fOrigen) && <a href="/crm" className="rj-btn">Limpiar</a>}
        <span className="ml-auto flex gap-1 text-[13px] font-bold" role="group" aria-label="Vista">
          <a href={`/crm?vista=kanban`} aria-pressed={vista === 'kanban'} className={`rounded-full px-3 py-1.5 ${vista === 'kanban' ? 'bg-[#07503f] text-white' : 'bg-slate-100'}`}>Kanban</a>
          <a href={`/crm?vista=lista`} aria-pressed={vista === 'lista'} className={`rounded-full px-3 py-1.5 ${vista === 'lista' ? 'bg-[#07503f] text-white' : 'bg-slate-100'}`}>Lista</a>
        </span>
      </form>
      <FiltrosGuardados />
      {ops.length === 0 && (
        <p className="rj-card text-sm text-[#3f3f46]">Sin oportunidades con este filtro. <a href="/crm" className="font-bold text-[#07503f] hover:underline">Ver todas →</a></p>
      )}
      {vista === 'kanban' ? (
        <KanbanCrm grupos={ETAPAS.map((e) => ({ etapa: e, items: ops.filter((o) => o.etapa === e).map((o) => ({ id: o.id, titulo: o.titulo, etapa: o.etapa, valor: Number(o.valor_estimado_usd), dias: o.dias, cliente: o.cliente, tipo: o.tipo, origen: o.origen, tel: o.tel })) }))} mover={mover} />
      ) : (
        <div className="rj-card overflow-x-auto">
          <table className="rj-table tnum">
            <thead><tr><th>Oportunidad</th><th>Cliente</th><th>Etapa</th><th>Monto</th><th>Días</th><th>Origen</th></tr></thead>
            <tbody>
              {ops.map((o) => (
                <tr key={o.id}>
                  <td className="font-bold">{o.titulo}</td><td>{o.cliente}</td>
                  <td><Estado valor={o.etapa} /></td><td>{fmtUSD(Number(o.valor_estimado_usd))}</td>
                  <td>{o.dias}d</td><td>{o.origen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {retomar.length > 0 && (
        <div className="rj-card border-amber-400">
          <p className="text-sm font-black">⏰ Retomar seguimiento (sin tarea hace +5 días)</p>
          {retomar.map((r) => (
            <form key={r.id} action={tarea} className="mt-1 flex items-center gap-2 text-sm">
              <input type="hidden" name="op" value={r.id} />
              <input type="hidden" name="titulo" value={`Seguimiento: ${r.titulo}`} />
              <span className="flex-1">· {r.titulo} — {r.cliente} ({r.dias}d)</span>
              <input name="vence" type="date" className="rounded border p-1 text-xs" aria-label="Vencimiento" />
              <button className="rounded bg-[#07503f] px-2 py-1 text-xs font-bold text-white">Agendar</button>
            </form>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-3">
          <p className="font-bold text-sm">Tareas vencidas / próximas</p>
          {tareas.map((t, i) => <p key={i} className="text-sm">· {t.titulo} — {t.vence_en ?? 's/f'} ({t.etapa})</p>)}
          <form action={tarea} className="mt-2 flex gap-1">
            <input type="hidden" name="op" value={ops[0]?.id ?? ''} />
            <input name="titulo" placeholder="Nueva tarea" className="flex-1 rounded border p-2 text-sm" required />
            <input name="vence" type="date" className="rounded border p-2 text-sm" />
            <button className="rounded bg-[#07503f] px-3 text-white font-bold">+</button>
          </form>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="font-bold text-sm">Leads web → convertir a cliente</p>
          {leads.length === 0 && <p className="text-sm text-[#3f3f46]">Sin leads todavía. Probá el formulario en /web.</p>}
          {leads.map((l) => (
            <form key={l.id} action={convertirLead} className="mt-1 flex items-center gap-2 rounded border p-2">
              <input type="hidden" name="id" value={l.id} />
              <span className="flex-1 text-sm">· {l.nombre} {l.empresa} {l.telefono} <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-bold">[{l.canal}]</span></span>
              {l.convertido ? <span className="text-xs text-[#3f3f46]">✓ convertido</span> : <button className="rounded bg-[#07503f] px-2 py-1 text-xs font-bold text-white">Convertir</button>}
            </form>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <form action={crearContacto} className="rounded-xl border bg-white p-3">
          <p className="font-bold text-sm">Nuevo contacto</p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <select name="cliente_id" className="col-span-2 rounded border p-2 text-sm">{clisId.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select>
            <input name="nombre" placeholder="Nombre *" className="rounded border p-2 text-sm" required />
            <input name="cargo" placeholder="Cargo" className="rounded border p-2 text-sm" />
            <input name="email" placeholder="Email" className="rounded border p-2 text-sm" />
            <input name="tel" placeholder="Tel / WA" className="rounded border p-2 text-sm" />
            <button className="col-span-2 rounded bg-[#07503f] px-3 py-2 text-sm font-bold text-white">Guardar (primero = principal)</button>
          </div>
        </form>
        <form action={crearOportunidad} className="rounded-xl border bg-white p-3">
          <p className="font-bold text-sm">Nueva oportunidad</p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <select name="cliente_id" className="col-span-2 rounded border p-2 text-sm">{clisId.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select>
            <input name="titulo" placeholder="Título * ej. Campamento 4 módulos" className="col-span-2 rounded border p-2 text-sm" required />
            <input name="valor" type="number" placeholder="Valor USD" className="rounded border p-2 text-sm" />
            <input name="prob" type="number" min={5} max={95} defaultValue={20} className="rounded border p-2 text-sm" title="Probabilidad %" />
            <select name="origen" className="col-span-2 rounded border p-2 text-sm" title="Origen del lead" defaultValue="visita">
              <option value="visita">Visita / directo</option><option value="web">Web</option><option value="google">Google</option>
              <option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option>
              <option value="feria">Feria / expo</option><option value="referido">Referido</option><option value="concesionario">Concesionario</option>
            </select>
            <button className="col-span-2 rounded bg-[#07503f] px-3 py-2 text-sm font-bold text-white">Crear en consulta</button>
          </div>
        </form>
      </div>
        <form action={crearCliente} className="rounded-xl border bg-white p-3">
          <p className="font-bold text-sm">Nuevo cliente (CUIT validado, anti-duplicado)</p>
          {sp.dup && <p className="mt-1 rounded bg-amber-100 p-2 text-xs font-bold">⚠ Ya existe ese CUIT. No se duplicó.</p>}
          <div className="mt-1 flex flex-col gap-1">
            <input name="razon" placeholder="Razón social *" className="rounded border p-2 text-sm" required />
            <div className="flex gap-1">
              <input name="cuit" placeholder="CUIT 30-... (11 dígitos)" className="flex-1 rounded border p-2 text-sm" />
              <select name="cond" className="rounded border p-2 text-sm" title="Condición IVA → Factura A o B">
                <option value="Consumidor Final">Cons. Final → B</option><option value="Responsable Inscripto">Resp. Inscripto → A</option>
                <option value="Monotributo">Monotributo → B</option><option value="Exento">Exento → B</option>
              </select>
            </div>
            <div className="flex gap-1">
              <select name="tipo" className="flex-1 rounded border p-2 text-sm">
                <option value="operadora">operadora</option><option value="minera">minera</option>
                <option value="concesionario agro">concesionario agro</option><option value="estación de servicio">estación de servicio</option>
                <option value="otro">otro</option>
              </select>
            </div>
            <button className="rounded bg-[#07503f] px-3 py-2 text-sm font-bold text-white">Guardar (valida dígito verificador)</button>
          </div>
        </form>
        <div className="rounded-xl border bg-white p-3">
          <p className="font-bold text-sm">Clientes ({clis.length})</p>
          {sp.imp && <p className="rounded bg-green-100 p-1 text-xs font-bold">✓ {sp.imp} importados (inválidos salteados).</p>}
          {clis.map((c) => (
            <p key={c.id} className="flex flex-wrap items-center gap-x-2 border-b border-dashed border-[#07503f]/15 py-1 text-sm">
              <a href={`/crm?cliente=${c.id}`} className="font-bold hover:underline">{c.razon_social}</a>
              <span className="text-[12px] text-[#3f3f46]">[{c.tipo}] · {c.cots} cotiz · {c.ops} oport.</span>
              <b className="text-[12px]">Factura {c.condicion_iva === 'Responsable Inscripto' ? 'A' : 'B'}</b>
              {c.tel && <a href={`https://wa.me/${c.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te escribo de Rurales Juanita`)}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#07503f] px-2 py-0.5 text-[11px] font-bold text-white">WhatsApp</a>}
            </p>
          ))}
          {fichaCli && (
            <div className="mt-2 rounded-xl bg-[#f1efdf] p-2 text-sm">
              <p className="font-black">Ficha: {fichaCli.razon} [{fichaCli.tipo}]
                {fichaCli.tel && <a href={`https://wa.me/${fichaCli.tel.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="ml-2 rounded-full bg-[#07503f] px-2 py-0.5 text-[11px] font-bold text-white">WhatsApp</a>}
                <a href="/crm" className="ml-2 text-[12px] font-bold text-[#07503f] underline">cerrar</a>
              </p>
              <p className="lbl mt-1">Oportunidades</p>
              {fichaOps.length === 0 && <p className="text-[13px] text-[#3f3f46]">Sin oportunidades.</p>}
              {fichaOps.map((o, i) => <p key={i} className="flex justify-between py-0.5"><span>{o.titulo} · {fmtUSD(Number(o.valor))}</span><Estado valor={o.etapa} /></p>)}
              <p className="lbl mt-1">Cotizaciones</p>
              {fichaCots.length === 0 && <p className="text-[13px] text-[#3f3f46]">Sin cotizaciones.</p>}
              {fichaCots.map((o, i) => <p key={i} className="flex justify-between py-0.5"><span className="font-mono2">{o.numero} · {fmtUSD(Number(o.total))}</span><Estado valor={o.estado} /></p>)}
            </div>
          )}
          <form action={importarCSV} className="mt-2">
            <textarea name="csv" rows={2} placeholder="Importar CSV: razon;cuit;tipo;condicion (uno por línea)" className="w-full rounded border p-2 text-xs" />
            <div className="mt-1 flex gap-2">
              <button className="rounded bg-slate-200 px-3 py-1 text-xs font-bold">Importar (valida CUIT)</button>
              <a href="/api/clientes/export" className="rounded bg-slate-200 px-3 py-1 text-xs font-bold">Exportar CSV ↓</a>
            </div>
          </form>
        </div>
      {/* homologaciones */}
      <div className="mt-2 rounded-xl border bg-white p-3">
        <p className="font-bold text-sm">Homologaciones ante operadoras ({homos.length})</p>
        {homos.map((h, i) => {
          const vence = h.vencimiento ? Math.ceil((new Date(h.vencimiento).getTime() - Date.now()) / 86400000) : null;
          return <p key={i} className="text-sm">· {h.cliente} — {h.estado}{h.vencimiento ? ` (vence ${h.vencimiento}${vence !== null && vence < 60 ? ` ⚠ ${vence} días` : ''})` : ''}</p>;
        })}
        <form action={homologar} className="mt-2 grid grid-cols-2 gap-1 md:grid-cols-3">
          <select name="cliente_id" className="rounded border p-2 text-sm">{clisId.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select>
          <select name="estado" className="rounded border p-2 text-sm">
            <option value="documentacion_pendiente">documentación pendiente</option>
            <option value="en_tramite">en trámite</option><option value="enviada">enviada</option>
            <option value="con_observaciones">con observaciones</option><option value="aprobada">aprobada</option>
            <option value="vencida">vencida</option>
          </select>
          <input name="fap" type="date" className="rounded border p-2 text-sm" title="Aprobación" />
          <input name="ven" type="date" className="rounded border p-2 text-sm" title="Vencimiento" />
          <input name="doc" placeholder="URL documento" className="rounded border p-2 text-sm" />
          <input name="obs" placeholder="Observaciones" className="rounded border p-2 text-sm" />
          <button className="rounded bg-[#07503f] px-3 py-2 text-sm font-bold text-white md:col-span-3">Guardar homologación</button>
        </form>
      </div>
      </div>
    </AppLayout>
  );
}
