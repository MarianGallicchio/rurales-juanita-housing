import { AppLayout } from '@/components/app-layout';
import { PageHero, Paso } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function ticket(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const unidad_id = String(fd.get('unidad_id'));
  const tipo = String(fd.get('tipo'));
  const descripcion = String(fd.get('descripcion') ?? '');
  if (!unidad_id || !descripcion.trim()) return;
  const t = (await queryLocal<{ id: string }>(`insert into public.ticket_postventa (unidad_id, tipo, descripcion) values ($1,$2,$3) returning id`, [unidad_id, tipo, descripcion]))[0];
  await auditLocal('ticket_postventa', t.id, 'alta', { tipo });
  redirect('/postventa');
}
async function cerrar(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  await queryLocal(`update public.ticket_postventa set estado='cerrado', cerrado_en=now() where id=$1`, [String(fd.get('id'))]);
  redirect('/postventa');
}
async function entregar(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const fecha = String(fd.get('fecha') ?? '');
  if (!id || !fecha) return;
  const meses = Number((await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='MESES_GARANTIA'`))[0]?.valor ?? 12);
  await queryLocal(`update public.unidad set fecha_entrega=$2, garantia_hasta=($2::date + ($3 || ' months')::interval)::date where id=$1`, [id, fecha, meses]);
  redirect('/postventa');
}

export default async function Postventa() {
  const unds = await queryLocal<{ id: string; numero_serie: string; entrega: string | null; garantia: string | null; manual: string | null }>(
    `select u.id, u.numero_serie, u.fecha_entrega as entrega, u.garantia_hasta as garantia, m.manual_url as manual
     from public.unidad u join public.modelo m on m.id=u.modelo_id order by u.numero_serie desc limit 30`);
  const tiks = await queryLocal<{ id: string; serie: string; tipo: string; descripcion: string; estado: string }>(
    `select t.id, u.numero_serie as serie, t.tipo, t.descripcion, t.estado from public.ticket_postventa t join public.unidad u on u.id=t.unidad_id order by t.creado_en desc limit 30`);
  const abiertos = tiks.filter((t) => t.estado !== 'cerrado').length;
  const hoy = new Date().toISOString().slice(0, 10);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Produccion', 'Postventa']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 7 · Canal único" titulo={`Postventa — ${abiertos} abiertos`}
          bajada="Garantía con vigencia, manual de uso y reclamos con foto por unidad." />
        <Paso n={1} titulo="Unidades y garantía">
          {unds.length === 0 && <p className="text-sm opacity-60">Sin unidades todavía.</p>}
          {unds.map((u) => {
            const vig = u.garantia ? u.garantia >= hoy : null;
            return (
              <form key={u.id} action={entregar} className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border p-2">
                <input type="hidden" name="id" value={u.id} />
                <span className="min-w-44 flex-1 text-sm"><b>{u.numero_serie}</b> · {u.garantia ? (vig ? `🟢 garantía hasta ${u.garantia}` : `🔴 vencida ${u.garantia}`) : 'sin entrega registrada'}</span>
                {u.manual && <a href={u.manual} target="_blank" className="text-xs underline">Manual ↓</a>}
                <input name="fecha" type="date" defaultValue={u.entrega ?? hoy} className="rounded-xl border px-2 py-1 text-xs" title="Fecha de entrega" />
                <button className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-bold">Fijar entrega</button>
              </form>
            );
          })}
        </Paso>
        <Paso n={2} titulo="Reclamos">
          {tiks.length === 0 && <p className="text-sm opacity-60">Sin tickets.</p>}
          {tiks.map((t) => (
            <form key={t.id} action={cerrar} className="mt-1 flex items-center gap-2 rounded-xl border p-2">
              <input type="hidden" name="id" value={t.id} />
              <span className="flex-1 text-sm">· {t.serie} [{t.tipo}] {t.descripcion} — {t.estado}</span>
              {t.estado !== 'cerrado' && <button className="rj-btn-green">Cerrar</button>}
            </form>
          ))}
          <form action={ticket} className="mt-2 grid grid-cols-2 gap-2">
            <select name="unidad_id" className="rj-input">{unds.map((u) => <option key={u.id} value={u.id}>{u.numero_serie}</option>)}</select>
            <select name="tipo" className="rj-input"><option value="reclamo">reclamo</option><option value="garantia">garantía</option><option value="mantenimiento">mantenimiento</option></select>
            <input name="descripcion" placeholder="Descripción del reclamo" className="rj-input col-span-2" required />
            <button className="rj-btn-primary col-span-2">Abrir ticket</button>
          </form>
        </Paso>
      </div>
    </AppLayout>
  );
}
