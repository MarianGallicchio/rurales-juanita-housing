import { queryLocal } from '@/lib/db-local';
import { fmtUSD } from '@/lib/formato-ar';
import { FotoModelo } from '@/components/foto-modelo';
import { BotonImprimir } from '@/components/boton-imprimir';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Plano blueprint con cotas reales del modelo (planta).
function Plano({ largo = 6000, ancho = 2500 }: { largo?: number; ancho?: number }) {
  const W = 560, H = 300, mx = 50, my = 40;
  const k = Math.min((W - mx - 20) / largo, (H - my - 30) / ancho);
  const w = largo * k, h = ancho * k;
  return (
    <div className="mt-3 rounded-2xl bg-[#1c1c1c] p-4 text-white">
      <p className="font-mono2 text-[10px] uppercase tracking-[.16em] text-[#7089ba]">Planta · cotas en mm</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
        <rect x={mx} y={my} width={w} height={h} fill="none" stroke="#7089ba" strokeWidth={1.6} />
        <line x1={mx} y1={my + h / 2} x2={mx + w} y2={my + h / 2} stroke="#7089ba" strokeDasharray="5 5" opacity={0.6} />
        <line x1={mx} y1={my - 12} x2={mx + w} y2={my - 12} stroke="#e8fe85" strokeWidth={1} />
        <text x={mx + w / 2} y={my - 16} fill="#e8fe85" fontSize={13} textAnchor="middle" fontFamily="monospace">{largo}</text>
        <line x1={mx - 12} y1={my} x2={mx - 12} y2={my + h} stroke="#e8fe85" strokeWidth={1} />
        <text x={mx - 16} y={my + h / 2} fill="#e8fe85" fontSize={13} textAnchor="end" fontFamily="monospace">{ancho}</text>
        <text x={mx + 8} y={my + 20} fill="#7089ba" fontSize={11} fontFamily="monospace">RJ · chasis perimetral</text>
      </svg>
    </div>
  );
}

export default async function FichaWeb({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const m = (await queryLocal<any>(
    `select m.*, c.nombre as cat from public.modelo m join public.categoria c on c.id=m.categoria_id where m.codigo=$1`, [decodeURIComponent(codigo)]))[0];
  if (!m) return <main className="p-6">Modelo inexistente. <Link href="/web" className="underline">Volver</Link></main>;
  const items = await queryLocal<any>(`select grupo, item, especificacion from public.ficha_tecnica_item where modelo_id=$1 order by orden`, [m.id]);
  const fotos = await queryLocal<any>(`select url, leyenda from public.modelo_foto where modelo_id=$1 order by orden`, [m.id]);
  return (
    <main className="mx-auto max-w-2xl bg-white p-6 text-sm">
      <p className="font-black text-[#07503f]">RURALES JUANITA · H.M HOUSING MODULE — FICHA TÉCNICA</p>
      <h1 className="mt-2 text-xl font-black">{m.codigo} — {m.nombre}</h1>
      <p className="text-[#3f3f46]">{m.cat} · {m.largo_mm}x{m.ancho_mm}x{m.alto_mm} mm · {m.superficie_m2 ?? '—'} m² · {m.peso_kg ?? '—'} kg</p>
      <p className="mt-1">{m.descripcion}</p>
      <p className="mt-1 font-black">Base {fmtUSD(Number(m.precio_base_usd))} <span className="font-normal opacity-60">(más opciones y flete; ver cotizador)</span></p>
      <div className="mt-3 grid grid-cols-2 gap-2 print:grid-cols-2">
        {fotos.map((f: any, i: number) => <FotoModelo key={i} url={f.url} codigo={f.leyenda ?? m.codigo} />)}
      </div>
      <table className="mt-3 w-full border text-xs">
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} className="border-b"><td className="p-1 font-bold">{it.grupo} · {it.item}</td><td className="p-1">{it.especificacion}</td></tr>
          ))}
        </tbody>
      </table>
      <Plano largo={Number(m.largo_mm) || 6000} ancho={Number(m.ancho_mm) || 2500} />
      <div className="mt-4 flex gap-2 print:hidden">
        <BotonImprimir texto="Descargar / PDF" />
        <Link href="/web" className="underline px-4 py-2">Volver</Link>
      </div>
    </main>
  );
}
