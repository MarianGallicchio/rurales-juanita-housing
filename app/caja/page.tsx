import { AppLayout } from '@/components/app-layout';
import { PageHero, Tarjeta } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtARS } from '@/lib/formato-ar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function abrir(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const saldo = Number(fd.get('saldo') ?? 0) || 0;
  const resp = String(fd.get('resp') ?? '').trim();
  await queryLocal(`insert into public.caja (saldo_inicial_ars, responsable) values ($1,$2)`, [saldo, resp]);
  redirect('/caja');
}

async function movimiento(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const caja = String(fd.get('caja') ?? '');
  const tipo = String(fd.get('tipo') ?? 'ingreso');
  const concepto = String(fd.get('concepto') ?? '').trim();
  const medio = String(fd.get('medio') ?? 'efectivo');
  const monto = Number(fd.get('monto') ?? 0) || 0;
  if (!caja || !concepto || monto <= 0) return;
  if (tipo !== 'ingreso' && tipo !== 'egreso') return;
  await queryLocal(
    `insert into public.caja_movimiento (caja_id, tipo, concepto, medio, monto_ars, referencia) values ($1,$2,$3,$4,$5,$6)`,
    [caja, tipo, concepto, medio, monto, String(fd.get('ref') ?? '')]);
  redirect('/caja');
}

async function cerrar(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const caja = String(fd.get('caja') ?? '');
  const contado = Number(fd.get('contado') ?? 0) || 0;
  if (!caja) return;
  await queryLocal(`update public.caja set estado='cerrada', saldo_final_contado_ars=$2, cerrada_en=now() where id=$1`, [caja, contado]);
  redirect('/caja');
}

export default async function Caja() {
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Compras']);
  const abierta = (await queryLocal<{ id: string; saldo_inicial_ars: number; responsable: string; fecha: string }>(
    `select id, saldo_inicial_ars, responsable, fecha::text as fecha from public.caja where estado='abierta' order by abierta_en desc limit 1`))[0] ?? null;
  const movs = abierta ? await queryLocal<{ tipo: string; concepto: string; medio: string; monto_ars: number; creado: string }>(
    `select tipo, concepto, medio, monto_ars, to_char(creado_en,'HH24:MI') as creado from public.caja_movimiento where caja_id=$1 order by creado_en desc limit 30`, [abierta.id]) : [];
  const ing = movs.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto_ars), 0);
  const egr = movs.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto_ars), 0);
  const saldo = (Number(abierta?.saldo_inicial_ars ?? 0)) + ing - egr;
  const ayer = await queryLocal<{ fecha: string; ing: number; egr: number }>(
    `select c.fecha::text as fecha, coalesce(sum(case when m.tipo='ingreso' then m.monto_ars end),0) as ing, coalesce(sum(case when m.tipo='egreso' then m.monto_ars end),0) as egr
     from public.caja c left join public.caja_movimiento m on m.caja_id=c.id
     where c.estado='cerrada' group by c.fecha order by c.fecha desc limit 7`).catch(() => []);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Tesorería · como DUX" titulo={<>Caja del día: <span className="text-[#e8fe85]">apertura, cobros y arqueo.</span></>}
          bajada="Registrá ingresos y egresos por medio de pago. Al cerrar, compará el sistema con lo contado."
          accion={<a href="/facturacion" className="rj-btn bg-white font-bold text-[#212529]">Ir a facturar →</a>} vivo />
        {!abierta ? (
          <form action={abrir} className="rj-card grid grid-cols-1 gap-2 md:grid-cols-3">
            <p className="font-bold md:col-span-3">Abrir caja de hoy</p>
            <input name="saldo" type="number" min={0} step="any" placeholder="Saldo inicial ARS" className="rj-input" required />
            <input name="resp" placeholder="Responsable (vendedor)" className="rj-input" />
            <button className="rj-btn-green">Abrir caja</button>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Tarjeta titulo="Saldo sistema" valor={fmtARS(saldo)} pie={`Inicial ${fmtARS(Number(abierta.saldo_inicial_ars))}`} tono={1} />
              <Tarjeta titulo="Ingresos" valor={fmtARS(ing)} tono={2} />
              <Tarjeta titulo="Egresos" valor={fmtARS(egr)} tono={3} />
              <Tarjeta titulo="Movimientos" valor={String(movs.length)} pie={String(abierta.fecha)} tono={0} />
            </div>
            <form action={movimiento} className="rj-card grid grid-cols-2 gap-2 md:grid-cols-6">
              <input type="hidden" name="caja" value={abierta.id} />
              <p className="col-span-2 font-bold md:col-span-6">Registrar movimiento</p>
              <select name="tipo" className="rj-input"><option value="ingreso">Ingreso / cobro</option><option value="egreso">Egreso / pago</option></select>
              <input name="concepto" placeholder="Concepto * ej. Seña BOX-15-A" className="rj-input col-span-2 md:col-span-2" required />
              <select name="medio" className="rj-input">
                <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option><option value="billetera">Billetera</option>
                <option value="cheque">Cheque</option><option value="cuenta_corriente">Cuenta corriente</option>
              </select>
              <input name="monto" type="number" min={1} step="any" placeholder="Monto ARS *" className="rj-input" required />
              <input name="ref" placeholder="Ref. (n° recibo)" className="rj-input" />
              <button className="rj-btn-primary col-span-2 md:col-span-1">Guardar</button>
            </form>
            <div className="rj-card">
              <p className="font-bold">Movimientos de hoy ({movs.length})</p>
              {movs.length === 0 && <p className="mt-1 text-sm text-[#3f3f46]">Todavía no hay movimientos.</p>}
              {movs.map((m, i) => (
                <p key={i} className="flex justify-between gap-2 border-b border-dashed border-[#07503f]/20 py-1 text-sm">
                  <span>{m.creado} · {m.concepto} <span className="font-mono2 text-[10px] uppercase text-[#07503f]">[{m.medio}]</span></span>
                  <b className={m.tipo === 'ingreso' ? 'text-[#07503f]' : 'text-red-700'}>{m.tipo === 'ingreso' ? '+' : '−'}{fmtARS(Number(m.monto_ars))}</b>
                </p>
              ))}
            </div>
            <form action={cerrar} className="rj-card flex flex-wrap items-center gap-2">
              <input type="hidden" name="caja" value={abierta.id} />
              <span className="flex-1 text-sm text-[#3f3f46]">Cerrar caja: sistema dice <b>{fmtARS(saldo)}</b>. Contá el efectivo y declará:</span>
              <input name="contado" type="number" min={0} step="any" placeholder="Contado ARS" className="rj-input !w-44" required />
              <button className="rj-btn-green">Cerrar + arquear</button>
            </form>
          </>
        )}
        {ayer.length > 0 && (
          <div className="rj-card">
            <p className="font-bold">Últimos cierres</p>
            {ayer.map((a) => (
              <p key={a.fecha} className="flex justify-between border-b border-dashed border-[#07503f]/20 py-1 text-sm">
                <span>{a.fecha}</span><span>+{fmtARS(Number(a.ing))} / −{fmtARS(Number(a.egr))}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
