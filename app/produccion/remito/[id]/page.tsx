import { queryLocal } from '@/lib/db-local';
import { fmtFechaAR } from '@/lib/formato-ar';
import { BotonImprimir } from '@/components/boton-imprimir';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Remito({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const op = (await queryLocal<any>(
    `select o.*, cl.razon_social, cl.cuit from public.orden_produccion o left join public.cliente cl on cl.id=o.cliente_id where o.id=$1`, [id]))[0];
  if (!op) return <main className="p-6">No existe.</main>;
  const unds = await queryLocal<any>(
    `select u.numero_serie, u.fecha_despacho, u.destino, m.codigo, m.nombre from public.unidad u join public.modelo m on m.id=u.modelo_id where u.orden_id=$1 order by u.numero_serie`, [id]);
  const emp = (await queryLocal<any>(`select * from public.empresa where id=1`))[0];
  return (
    <main className="mx-auto max-w-2xl bg-white p-6 text-sm">
      <div className="flex items-center gap-3 border-b-4 border-[#07503f] pb-3">
        {emp?.logo_url && <img src={emp.logo_url} alt="logo" className="h-14 object-contain" />}
        <div>
          <p className="font-display text-xl font-semibold">{emp?.razon_social}</p>
          <p className="text-xs opacity-70">{emp?.domicilio} · {emp?.telefonos}</p>
        </div>
        <div className="ml-auto rounded-2xl border-2 border-[#07503f] px-4 py-2 text-center">
          <p className="font-display text-2xl">R</p>
          <p className="font-mono2 text-[10px] uppercase">Remito {op.numero}</p>
        </div>
      </div>
      <p className="mt-3">Cliente: <b>{op.razon_social ?? '—'}</b> {op.cuit ?? ''} · Fecha: {fmtFechaAR(new Date())} · Destino: {unds[0]?.destino ?? '—'}</p>
      <table className="mt-3 w-full text-xs">
        <thead><tr className="border-b text-left font-mono2 text-[10px] uppercase"><td className="py-1">Serie</td><td>Modelo</td><td>Despacho</td></tr></thead>
        <tbody>
          {unds.map((u: any, i: number) => (
            <tr key={i} className="border-b"><td className="py-1 font-bold">{u.numero_serie}</td><td>{u.codigo} — {u.nombre}</td><td>{u.fecha_despacho ? fmtFechaAR(u.fecha_despacho) : 'pendiente'}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
        <p className="border-t pt-1">Entregó · Rurales Juanita</p>
        <p className="border-t pt-1">Recibió (firma, aclaración, DNI)</p>
      </div>
      <div className="mt-4 flex gap-2 print:hidden">
        <BotonImprimir texto="Imprimir remito" />
        <Link href="/produccion" className="underline px-4 py-2">Volver</Link>
      </div>
    </main>
  );
}
