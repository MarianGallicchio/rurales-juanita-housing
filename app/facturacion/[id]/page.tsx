import { queryLocal } from '@/lib/db-local';
import { fmtUSD, fmtARS, fmtFechaAR } from '@/lib/formato-ar';
import { BotonImprimir } from '@/components/boton-imprimir';
import { Migas } from '@/components/migas';
import { EMPRESA } from '@/lib/empresa';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Factura({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = (await queryLocal<any>(
    `select f.*, cl.razon_social, cl.cuit, cl.condicion_iva, cl.domicilio as cli_dom from public.comprobante f
     join public.cliente cl on cl.id=f.cliente_id where f.id=$1`, [id]))[0];
  if (!f) return <main className="p-6">No existe.</main>;
  const emp = (await queryLocal<any>(`select * from public.empresa where id=1`))[0];
  const items = f.cotizacion_id
    ? await queryLocal<any>(`select i.cantidad, m.codigo, m.nombre, i.precio_unitario_usd from public.cotizacion_item i join public.modelo m on m.id=i.modelo_id where i.cotizacion_id=$1`, [f.cotizacion_id])
    : [];
  const cuitEmp = (await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='CUIT_EMPRESA'`))[0]?.valor || (await queryLocal<{ valor: string }>(`select valor from public.configuracion where clave='ARCA_CUIT'`))[0]?.valor || '—';
  const neto = Math.round((Number(f.total_ars) / 1.21) * 100) / 100;
  const iva = Math.round((Number(f.total_ars) - neto) * 100) / 100;
  return (
    <main className="mx-auto max-w-2xl bg-white p-6 text-sm print:max-w-none">
      <div className="print:hidden"><Migas trail={[{ label: 'Facturación', href: '/facturacion' }, { label: f.numero }]} /></div>
      <div className="flex items-start justify-between gap-4 border-b-4 border-[#07503f] pb-3">
        <div className="flex items-center gap-3">
          {emp?.logo_url
            ? <img src={emp.logo_url} alt="logo" className="h-16 object-contain" />
            : <span className="grid h-14 w-14 place-items-center rounded-lg bg-[#e8fe85] font-black text-[#053d30]">RJ</span>}
          <div>
            <p className="font-display text-xl font-semibold">{emp?.razon_social ?? EMPRESA.nombre}</p>
            <p className="text-xs text-[#3f3f46]">{emp?.domicilio} · {emp?.telefonos} · {emp?.email}</p>
            <p className="text-xs text-[#3f3f46]">CUIT {cuitEmp} · IVA Responsable Inscripto</p>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-[#07503f] px-4 py-2 text-center">
          <p className="font-display text-3xl font-semibold">{f.tipo}</p>
          <p className="font-mono2 text-[10px] uppercase">Factura {f.tipo === 'A' ? 'A · RI' : 'B · Consumidor'}<br />{f.numero}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-[#f1efdf] p-3">
        <p><b>Cliente:</b> {f.razon_social}<br /><span className="text-xs">CUIT {f.cuit ?? '—'} · {f.condicion_iva}</span></p>
        <p className="text-right"><b>Fecha:</b> {fmtFechaAR(f.creada_en)}<br /><span className="text-xs">TC ${f.tipo_cambio} · Pto.Vta {f.pto_vta ?? '—'}</span></p>
      </div>
      <table className="mt-3 w-full text-xs">
        <thead><tr className="border-b text-left font-mono2 text-[10px] uppercase"><td className="py-1">Cant.</td><td>Detalle</td><td className="text-right">Unit. USD</td></tr></thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} className="border-b"><td className="py-1">{it.cantidad}</td><td>{it.codigo} — {it.nombre}</td><td className="text-right">{fmtUSD(Number(it.precio_unitario_usd))}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-right">
        <p>Neto {fmtARS(neto)} + IVA 21% {fmtARS(iva)}</p>
        <p className="font-display text-2xl font-semibold">Total {fmtARS(Number(f.total_ars))} ({fmtUSD(Number(f.total_usd))})</p>
      </div>
      {f.cae ? (
        <div className="mt-3 rounded-2xl border p-3">
          <p className="font-mono2 text-xs uppercase">CAE {f.cae} · Vto {f.vto_cae} {f.estado === 'cae_simulado' ? '(SIMULADO — sin validez fiscal)' : '(ARCA válido)'}</p>
          {f.qr_texto && <a href={f.qr_texto} target="_blank" className="text-xs underline">Ver QR AFIP →</a>}
        </div>
      ) : <p className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm font-bold">Pendiente de CAE — pedilo en /facturacion.</p>}
      <div className="mt-4 flex gap-2 print:hidden">
        <BotonImprimir texto="Imprimir factura" />
        <Link href="/facturacion" className="underline px-4 py-2">Volver</Link>
      </div>
    </main>
  );
}
