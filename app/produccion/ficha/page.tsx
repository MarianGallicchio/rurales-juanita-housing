import { queryLocal } from '@/lib/db-local';
import { fmtFechaAR } from '@/lib/formato-ar';
import { BotonImprimir } from '@/components/boton-imprimir';
import { Migas } from '@/components/migas';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Ficha() {
  const u = (await queryLocal<any>(`select u.numero_serie, m.codigo, op.numero as op from public.unidad u join public.modelo m on m.id=u.modelo_id join public.orden_produccion op on op.id=u.orden_id order by u.numero_serie desc limit 1`))[0];
  if (!u) return <main className="p-6">Sin unidades. <Link href="/produccion" className="underline">Volver</Link></main>;
  const nc = await queryLocal<any>(`select descripcion, estado from public.no_conformidad where unidad_id=(select id from public.unidad where numero_serie=$1)`, [u.numero_serie]);
  return (
    <main className="mx-auto max-w-2xl bg-white p-6 text-sm">
      <div className="print:hidden"><Migas trail={[{ label: 'Producción', href: '/produccion' }, { label: `Ficha ${u.numero_serie}` }]} /></div>
      <p className="font-black">FICHA TRAZABILIDAD — {u.numero_serie}</p>
      <p>Modelo {u.codigo} · OP {u.op} · {fmtFechaAR(new Date())}</p>
      <p className="mt-2 font-bold">Controles y NC: {nc.length === 0 ? 'sin desvíos' : ''}</p>
      {nc.map((n: any, i: number) => <p key={i}>· {n.descripcion} ({n.estado})</p>)}
      <p className="mt-2">Firma liberación: _______________ Auditoría interna por estación (ISO 9001 §8.5.2 / 8.7 / 10.2).</p>
      <div className="mt-4 flex gap-2">
        <BotonImprimir />
        <Link href="/produccion" className="underline px-4 py-2">Volver</Link>
      </div>
    </main>
  );
}
