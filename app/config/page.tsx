import { AppLayout } from '@/components/app-layout';
import { PageHero, Paso, Tarjeta } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtFechaAR, tcVencido } from '@/lib/formato-ar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function guardarTC(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const valor = Number(fd.get('valor') ?? 0);
  const fecha = String(fd.get('fecha') ?? '');
  if (valor <= 0 || !fecha) return;
  await queryLocal(`insert into public.tipo_cambio (fecha, valor_ars_por_usd, fuente) values ($1,$2,'manual')
    on conflict (fecha) do update set valor_ars_por_usd=excluded.valor_ars_por_usd`, [fecha, valor]);
  redirect('/config');
}

async function guardarParam(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  for (const k of ['IVA_PCT', 'MARGEN_MIN_PCT', 'VALIDEZ_COTIZ_DIAS']) {
    const v = String(fd.get(k) ?? '').trim();
    if (v) await queryLocal(`update public.configuracion set valor=$2, actualizado_en=now() where clave=$1`, [k, v]);
  }
  await queryLocal(`update public.empresa set razon_social=$1, telefonos=$2, email=$3 where id=1`,
    [String(fd.get('razon') ?? ''), String(fd.get('tels') ?? ''), String(fd.get('email') ?? '')]);
  redirect('/config');
}

async function subirLogo(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { guardarArchivo } = await import('@/lib/archivos');
  const { redirect } = await import('next/navigation');
  const file = fd.get('logo') as File | null;
  if (!file || file.size === 0) return;
  try {
    const url = await guardarArchivo(file, 'fotos', 'logo-empresa');
    await queryLocal(`update public.empresa set logo_url=$1 where id=1`, [url]);
  } catch { return; }
  redirect('/config');
}

async function guardarARCA(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  for (const k of ['ARCA_CUIT', 'ARCA_PTO_VTA', 'ARCA_MODO', 'CUIT_EMPRESA']) {
    const v = String(fd.get(k) ?? '').trim();
    if (v) await queryLocal(`update public.configuracion set valor=$2, actualizado_en=now() where clave=$1`, [k, v]);
  }
  const fs = await import('node:fs');
  const path = await import('node:path');
  for (const [campo, nombre] of [['crt', 'certificado.crt'], ['key', 'clave.key']] as const) {
    const file = fd.get(campo) as File | null;
    if (file && file.size > 0 && file.size < 1024 * 1024) {
      const dir = path.join(process.cwd(), 'certs');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, nombre as string), Buffer.from(await (file as File).arrayBuffer()));
      await queryLocal(`update public.configuracion set valor=$2 where clave=$1`, [campo === 'crt' ? 'ARCA_CERT' : 'ARCA_KEY', `certs/${nombre}`]);
    }
  }
  redirect('/config?arca=1');
}

export default async function Config({ searchParams }: { searchParams: Promise<{ arca?: string }> }) {
  const sp = await searchParams;
  const tcs = await queryLocal<{ fecha: string; valor: number; fuente: string }>(
    `select fecha, valor_ars_por_usd as valor, fuente from public.tipo_cambio order by fecha desc limit 10`);
  const params = Object.fromEntries(
    (await queryLocal<{ clave: string; valor: string }>(`select clave, valor from public.configuracion`)).map((r) => [r.clave, r.valor])
  );
  const emp = (await queryLocal<{ razon_social: string; telefonos: string; email: string; logo_url: string | null }>(`select razon_social, telefonos, email, logo_url from public.empresa where id=1`))[0];
  const ultimo = tcs[0];
  const viejo = tcVencido(ultimo?.fecha, Number(params.TC_MAX_HORAS ?? 24));
  const hoy = new Date().toISOString().slice(0, 10);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 0 · Parámetros" titulo="Configuración general"
          bajada="Dólar con fecha, impuestos y datos de la empresa. Todo es parámetro, nada está fijo en código." />
        <div className="grid grid-cols-2 gap-2">
          <Tarjeta titulo="Dólar vigente" valor={ultimo ? `$ ${ultimo.valor} · ${fmtFechaAR(ultimo.fecha)}` : '—'} pie={ultimo?.fuente} alerta={viejo} />
          <Tarjeta titulo="IVA / Margen mín." valor={`${params.IVA_PCT ?? '—'}% / ${params.MARGEN_MIN_PCT ?? '—'}%`} pie={`Validez ${params.VALIDEZ_COTIZ_DIAS ?? '—'} días`} />
        </div>
        {viejo && <p className="rounded-xl bg-amber-100 p-3 text-sm font-bold">⚠ El tipo de cambio tiene más de {params.TC_MAX_HORAS ?? 24} h. Cargá el de hoy antes de cotizar.</p>}
        <Paso n={1} titulo="Tipo de cambio (USD → ARS, manual con fecha)">
          <div className="mb-2 flex flex-col gap-1">
            {tcs.map((t) => <p key={t.fecha} className="text-sm">· {fmtFechaAR(t.fecha)} — <b>$ {t.valor}</b> <span className="opacity-60">({t.fuente})</span></p>)}
          </div>
          <form action={guardarTC} className="flex gap-2">
            <input name="fecha" type="date" defaultValue={hoy} className="rj-input" required />
            <input name="valor" type="number" step="0.01" min={0.01} placeholder="1540.00" className="rj-input" required />
            <button className="rj-btn-primary">Guardar</button>
          </form>
        </Paso>
        <Paso n={2} titulo="Impuestos, margen y empresa">
          <form action={guardarParam} className="grid grid-cols-3 gap-2">
            <label className="text-xs">IVA %<input name="IVA_PCT" defaultValue={params.IVA_PCT} className="rj-input" /></label>
            <label className="text-xs">Margen mín. %<input name="MARGEN_MIN_PCT" defaultValue={params.MARGEN_MIN_PCT} className="rj-input" /></label>
            <label className="text-xs">Validez días<input name="VALIDEZ_COTIZ_DIAS" defaultValue={params.VALIDEZ_COTIZ_DIAS} className="rj-input" /></label>
            <label className="col-span-3 text-xs">Razón social<input name="razon" defaultValue={emp?.razon_social} className="rj-input" /></label>
            <label className="text-xs">Teléfonos<input name="tels" defaultValue={emp?.telefonos} className="rj-input" /></label>
            <label className="col-span-2 text-xs">Email<input name="email" defaultValue={emp?.email ?? ''} className="rj-input" /></label>
            <button className="rj-btn-accent col-span-3">Guardar parámetros</button>
          </form>
          <p className="mt-1 text-xs opacity-60">Confirmá alícuotas con tu contador. El margen mínimo exige aprobación del Administrador.</p>
        </Paso>
        <Paso n={3} titulo="Logo de la empresa (sale en cotizaciones, fichas y facturas)">          {emp?.logo_url && <img src={emp.logo_url} alt="logo" className="mb-2 h-16 rounded-xl border bg-white object-contain" />}
          <form action={subirLogo} className="flex gap-2">
            <input name="logo" type="file" accept="image/png,image/jpeg" className="rj-input" required />
            <button className="rj-btn-primary">Subir logo</button>
          </form>
        </Paso>
        <Paso n={4} titulo="ARCA real (certificado fiscal + homologación)">
          {sp.arca && <p className="mb-2 rounded-xl bg-green-100 p-2 text-sm font-bold">✓ Parámetros ARCA guardados. Probá la conexión en /facturacion.</p>}
          <form action={guardarARCA} className="grid grid-cols-2 gap-2">
            <label className="text-xs">CUIT emisor (solo números)<input name="ARCA_CUIT" defaultValue={params.ARCA_CUIT ?? params.CUIT_EMPRESA ?? ''} placeholder="30123456789" className="rj-input" /></label>
            <label className="text-xs">Punto de venta<input name="ARCA_PTO_VTA" defaultValue={params.ARCA_PTO_VTA ?? '1'} className="rj-input" /></label>
            <label className="text-xs">Modo<select name="ARCA_MODO" defaultValue={params.ARCA_MODO ?? 'simulado'} className="rj-input"><option value="simulado">simulado (pruebas internas)</option><option value="homologacion">homologación (AFIP test)</option><option value="produccion">producción (CAE válido)</option></select></label>
            <label className="text-xs">CUIT empresa (facturas)<input name="CUIT_EMPRESA" defaultValue={params.CUIT_EMPRESA ?? ''} className="rj-input" /></label>
            <label className="text-xs">Certificado .crt<input name="crt" type="file" accept=".crt,.pem" className="rj-input" /></label>
            <label className="text-xs">Clave .key<input name="key" type="file" accept=".key,.pem" className="rj-input" /></label>
            <button className="rj-btn-accent col-span-2">Guardar ARCA {params.ARCA_CERT ? `(cert: ${params.ARCA_CERT} ✓)` : '(sin certificado)'}</button>
          </form>
          <p className="mt-1 text-xs opacity-60">El .crt se pide en AFIP con tu CUIT (Administración de Certificados). Sin certificado solo funciona el modo simulado.</p>
        </Paso>
      </div>
    </AppLayout>
  );
}
