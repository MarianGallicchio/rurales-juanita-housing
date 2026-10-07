import { AppLayout } from '@/components/app-layout';
import { PageHero, Paso } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtUSD, fmtARS } from '@/lib/formato-ar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const tipoDe = (cond: string) => (cond === 'Responsable Inscripto' ? 'A' : 'B');

async function crearComprobante(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const cotId = String(fd.get('cot_id') ?? '');
  const c = (await queryLocal<any>(
    `select c.*, cl.condicion_iva, cl.cuit, cl.razon_social from public.cotizacion c join public.cliente cl on cl.id=c.cliente_id where c.id=$1 and c.estado='aceptada'`, [cotId]))[0];
  if (!c) return;
  const tipo = tipoDe(c.condicion_iva ?? '');
  const n = (await queryLocal<{ n: number }>(`select count(*)::int as n from public.comprobante`))[0].n + 1;
  const numero = `FAC-2026-${String(n).padStart(4, '0')}`;
  const f = (await queryLocal<{ id: string }>(
    `insert into public.comprobante (numero, cotizacion_id, cliente_id, tipo, total_usd, total_ars, tipo_cambio) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [numero, cotId, c.cliente_id, tipo, c.total_usd, c.total_ars, c.tipo_cambio]))[0];
  await auditLocal('comprobante', f.id, 'alta', { numero, tipo, cliente: c.razon_social });
  redirect('/facturacion');
}

async function pedirCAE(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const f = (await queryLocal<any>(
    `select f.*, cl.cuit, cl.condicion_iva from public.comprobante f join public.cliente cl on cl.id=f.cliente_id where f.id=$1`, [id]))[0];
  if (!f || f.cae) { redirect('/facturacion'); }
  const modo = (await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='ARCA_MODO'`))[0]?.valor ?? 'simulado';
  const total = Number(f.total_ars);
  const neto = Math.round((total / 1.21) * 100) / 100;
  const iva = Math.round((total - neto) * 100) / 100;
  if (modo !== 'simulado') {
    try {
      const { solicitarCAEReal } = await import('@/lib/arca');
      const r = await solicitarCAEReal({ tipo: f.tipo as 'A' | 'B', clienteCuit: f.cuit, condicionIva: f.condicion_iva, neto, iva, total });
      const pto = Number((await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='ARCA_PTO_VTA'`))[0]?.valor ?? 1);
      await queryLocal(`update public.comprobante set cae=$2, vto_cae=$3, estado='aprobado', qr_texto=$4, pto_vta=$5, wsfe_resp=$6 where id=$1`,
        [id, r.cae, r.vto, r.qr, pto, JSON.stringify({ nro: r.nro, modo })]);
      await auditLocal('comprobante', id, 'modificacion', { cae: r.cae, modo });
    } catch (e) {
      await queryLocal(`update public.comprobante set estado='rechazado', wsfe_resp=$2 where id=$1`, [id, JSON.stringify({ error: String(e).slice(0, 500), modo })]);
    }
  } else {
    const cae = String(Math.floor(10000000000000 + Math.random() * 89999999999999));
    const vto = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await queryLocal(`update public.comprobante set cae=$2, vto_cae=$3, estado='cae_simulado' where id=$1`, [id, cae, vto]);
    await auditLocal('comprobante', id, 'modificacion', { cae_simulado: true });
  }
  redirect('/facturacion');
}

async function probar(fd: FormData) {
  'use server';
  const { redirect } = await import('next/navigation');
  redirect('/facturacion?test=1');
}

export default async function Facturacion({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const sp = await searchParams;
  const modo = (await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='ARCA_MODO'`))[0]?.valor ?? 'simulado';
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador']);
  const aceptadas = await queryLocal<{ id: string; numero: string; total_usd: number; cond: string; cli: string }>(
    `select c.id, c.numero, c.total_usd, cl.condicion_iva as cond, cl.razon_social as cli from public.cotizacion c
     join public.cliente cl on cl.id=c.cliente_id left join public.comprobante f on f.cotizacion_id=c.id
     where c.estado='aceptada' and f.id is null order by c.numero desc`);
  const comps = await queryLocal<{ id: string; numero: string; tipo: string; total_usd: number; total_ars: number; cae: string | null; estado: string; cli: string }>(
    `select f.id, f.numero, f.tipo, f.total_usd, f.total_ars, f.cae, f.estado, cl.razon_social as cli
     from public.comprobante f join public.cliente cl on cl.id=f.cliente_id order by f.creada_en desc limit 20`);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="ARCA · Factura electrónica" titulo="Facturación"
          bajada={`Modo: ${modo}. RI → Factura A automática, resto → B. El CAE ${modo === 'simulado' ? 'simulado vale para probar' : 'es REAL y válido ante ARCA'}.`} />
        {sp.test && <ProbarBox />}
        <Paso n={1} titulo="Probar conexión ARCA">
          <form action={probar}><button className="rj-btn-primary">Probar WSAA + WSFE (homologación)</button></form>
          <p className="mt-1 text-xs opacity-60">Requiere CUIT + certificado en /config. Si falla, revisá el mensaje de error.</p>
        </Paso>
        <Paso n={2} titulo="Comprobantes desde aceptadas">
          {aceptadas.length === 0 && <p className="text-sm opacity-60">Sin aceptadas pendientes de facturar.</p>}
          {aceptadas.map((c) => (
            <form key={c.id} action={crearComprobante} className="mt-1 flex items-center gap-2 rounded-xl border p-2">
              <input type="hidden" name="cot_id" value={c.id} />
              <span className="flex-1 text-sm">{c.numero} · {c.cli} · {fmtUSD(Number(c.total_usd))} → <b>Factura {tipoDe(c.cond)}</b></span>
              <button className="rj-btn-primary">Crear</button>
            </form>
          ))}
        </Paso>
        <Paso n={3} titulo="Pedir CAE">
          {comps.length === 0 && <p className="text-sm opacity-60">Sin comprobantes.</p>}
          {comps.map((f) => (
            <form key={f.id} action={pedirCAE} className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border p-2">
              <input type="hidden" name="id" value={f.id} />
              <span className="flex-1 text-sm"><b>{f.numero} ({f.tipo})</b> {f.cli} · {fmtUSD(Number(f.total_usd))} · {fmtARS(Number(f.total_ars))} — {f.cae ? `CAE ${f.cae}` : f.estado}</span>
              {!f.cae && f.estado !== 'rechazado' && <button className="rj-btn-accent">Pedir CAE{modo !== 'simulado' ? ' real' : ''}</button>}
              {f.cae && <a href={`/facturacion/${f.id}`} className="rj-btn bg-slate-200">Ver factura</a>}
            </form>
          ))}
        </Paso>
      </div>
    </AppLayout>
  );
}

async function ProbarBox() {
  let msg = 'Error de conexión (revisá CUIT/certificado en /config).';
  try {
    const { probarConexion } = await import('@/lib/arca');
    msg = await probarConexion();
  } catch (e) { msg = String(e).slice(0, 300); }
  return <p className="rounded-xl bg-slate-100 p-3 font-mono2 text-xs">{msg}</p>;
}
