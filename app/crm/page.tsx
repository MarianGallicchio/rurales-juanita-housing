import { AppLayout } from '@/components/app-layout';
import { PageHero } from '@/components/ui-brand';
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

export default async function CRM({ searchParams }: { searchParams: Promise<{ dup?: string; imp?: string }> }) {
  const sp = await searchParams;
  const ops = await queryLocal<{ id: string; titulo: string; etapa: string; valor_estimado_usd: number }>(
    `select o.id, o.titulo, o.etapa, o.valor_estimado_usd from public.oportunidad o order by o.creado_en desc limit 50`);
  const tareas = await queryLocal<{ titulo: string; vence_en: string; etapa: string }>(
    `select t.titulo, t.vence_en, o.etapa from public.tarea t left join public.oportunidad o on o.id=t.oportunidad_id where t.completada_en is null order by t.vence_en limit 20`);
  const leads = await queryLocal<{ id: string; nombre: string; empresa: string; telefono: string; convertido: string }>(
    `select id, nombre, empresa, telefono, convertido_en_cliente_id as convertido from public.lead_web order by fecha desc limit 10`);
  const clis = await queryLocal<{ razon_social: string; cuit: string; tipo: string; condicion_iva: string }>(`select razon_social, cuit, tipo, condicion_iva from public.cliente order by razon_social limit 30`);
  const clisId = await queryLocal<{ id: string; razon_social: string }>(`select id, razon_social from public.cliente order by razon_social`);
  const homos = await queryLocal<{ cliente: string; estado: string; vencimiento: string }>(
    `select cl.razon_social as cliente, h.estado, h.vencimiento from public.homologacion h join public.cliente cl on cl.id=h.cliente_id order by h.vencimiento nulls last limit 20`);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Postventa']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
      <PageHero kicker="Fase 3 · Que no se escape nada" titulo="CRM"
        bajada="Kanban, tareas, homologaciones y leads de la web en un solo lugar." />
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
        {ETAPAS.map((e) => (
          <div key={e} className="rounded-xl border bg-white p-2">
            <p className="text-xs font-black uppercase">{e} ({ops.filter((o) => o.etapa === e).length})</p>
            {ops.filter((o) => o.etapa === e).map((o) => (
              <form key={o.id} action={mover} className="mt-1 rounded border p-2">
                <input type="hidden" name="id" value={o.id} />
                <p className="text-xs font-bold">{o.titulo}</p>
                <div className="mt-1 flex gap-1">
                  <select name="etapa" className="rounded border text-xs" defaultValue={o.etapa}>
                    {ETAPAS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <button className="rounded bg-slate-200 px-2 text-xs font-bold">→</button>
                </div>
                <input name="motivo" placeholder="motivo si perdido" className="mt-1 w-full rounded border text-xs" />
              </form>
            ))}
          </div>
        ))}
      </div>
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
          {leads.length === 0 && <p className="text-sm opacity-60">Sin leads todavía. Probá el formulario en /web.</p>}
          {leads.map((l) => (
            <form key={l.id} action={convertirLead} className="mt-1 flex items-center gap-2 rounded border p-2">
              <input type="hidden" name="id" value={l.id} />
              <span className="flex-1 text-sm">· {l.nombre} {l.empresa} {l.telefono}</span>
              {l.convertido ? <span className="text-xs opacity-60">✓ convertido</span> : <button className="rounded bg-[#07503f] px-2 py-1 text-xs font-bold text-white">Convertir</button>}
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
          {clis.map((c, i) => <p key={i} className="text-sm">· {c.razon_social} {c.cuit} [{c.tipo}] · {c.condicion_iva} → <b>Factura {c.condicion_iva === 'Responsable Inscripto' ? 'A' : 'B'}</b></p>)}
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
          <select name="estado" className="rounded border p-2 text-sm"><option value="en_tramite">en trámite</option><option value="aprobada">aprobada</option><option value="vencida">vencida</option></select>
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
