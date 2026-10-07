import { queryLocal } from '@/lib/db-local';
import { fmtUSD } from '@/lib/formato-ar';
import { FotoModelo } from '@/components/foto-modelo';
import { EMPRESA, waLink, WA_COTIZACION } from '@/lib/empresa';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Linea({ params }: { params: Promise<{ linea: string }> }) {
  const { linea } = await params;
  const cat = (await queryLocal<{ nombre: string; descripcion: string }>(`select nombre, descripcion from public.categoria where slug=$1`, [decodeURIComponent(linea)]))[0];
  if (!cat) return <main className="p-6">Línea inexistente. <Link href="/web" className="underline">Volver</Link></main>;
  const mods = await queryLocal<{ codigo: string; nombre: string; precio_base_usd: number; largo_mm: number; ancho_mm: number; foto: string | null }>(
    `select m.codigo, m.nombre, m.precio_base_usd, m.largo_mm, m.ancho_mm,
      (select url from public.modelo_foto f where f.modelo_id=m.id and f.es_portada limit 1) as foto
     from public.modelo m join public.categoria c on c.id=m.categoria_id where c.slug=$1 and m.activo order by m.codigo`, [decodeURIComponent(linea)]);
  return (
    <div className="min-h-screen bg-[#f1efdf] text-[#212529]">
      <header className="bg-[#07503f] text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/web" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8fe85] font-black text-[#053d30]">RJ</span>
            <span className="font-display text-lg font-semibold">Rurales Juanita</span>
          </Link>
          <a href="#contacto-linea" className="rj-btn bg-white text-[#212529]">Cotizar</a>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4">
        <p className="rj-eyebrow">Línea de producto</p>
        <h1 className="mt-2 font-display text-4xl font-medium">{cat.nombre}</h1>
        <p className="mt-1 text-[#6d6d6d]">{cat.descripcion}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {mods.length === 0 && <p className="text-sm opacity-60">Modelos en preparación. Pedilos por WhatsApp.</p>}
          {mods.map((m) => (
            <div key={m.codigo} className="rj-card">
              <FotoModelo url={m.foto} codigo={m.codigo} />
              <p className="mt-2 font-bold">{m.codigo} — {m.nombre}</p>
              <p className="text-sm opacity-70">{m.largo_mm}x{m.ancho_mm} mm · Base {fmtUSD(Number(m.precio_base_usd))}</p>
              <div className="mt-1 flex gap-2">
                <Link href={`/web/ficha/${m.codigo}`} className="rounded-full bg-slate-200 px-3 py-1 font-mono2 text-[10px] uppercase">Ficha ↓</Link>
                <a href={waLink(`${WA_COTIZACION} Me interesa ${m.codigo}.`)} target="_blank" className="rounded-full bg-[#07503f] px-3 py-1 font-mono2 text-[10px] uppercase text-white">Consultar</a>
              </div>
            </div>
          ))}
        </div>
        <div id="contacto-linea" className="rj-card mt-4 bg-[#07503f] text-white">
          <p className="font-display text-2xl">¿Te sirve un {cat.nombre.toLowerCase()} a medida?</p>
          <p className="text-sm text-white/80">{EMPRESA.whatsapp} · {EMPRESA.email} · {EMPRESA.horario}</p>
          <div className="mt-2 flex gap-2">
            <a href="/web#contacto" className="rj-btn bg-white text-[#212529]">Pedir cotización</a>
            <Link href="/web" className="rj-btn border border-[#e8fe85] text-[#e8fe85]">← Todas las líneas</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
