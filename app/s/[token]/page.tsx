import { queryLocal } from '@/lib/db-local';
import { fmtUSD, fmtARS, fmtFechaAR } from '@/lib/formato-ar';
import { FotoModelo } from '@/components/foto-modelo';
import { EMPRESA, waLink, WA_COTIZACION } from '@/lib/empresa';
import { BotonImprimir } from '@/components/boton-imprimir';

export const dynamic = 'force-dynamic';

// Link público de cotización (patrón CPQ: el cliente explora y comparte sin login).
export default async function Share({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = (await queryLocal<any>(
    `select c.*, cl.razon_social, e.logo_url, e.razon_social as emp, e.telefonos, e.email from public.cotizacion c
     left join public.cliente cl on cl.id=c.cliente_id cross join public.empresa e
     where c.share_token=$1 and c.estado in ('borrador','enviada')`, [decodeURIComponent(token)]))[0];
  if (!c) return <main className="grid min-h-screen place-items-center bg-[#f1efdf] p-6 text-center"><p>Esta cotización ya no está disponible. Pedí una actualizada por WhatsApp.</p></main>;
  const items = await queryLocal<any>(
    `select i.*, m.codigo, m.nombre, (select url from public.modelo_foto f where f.modelo_id=m.id and f.es_portada limit 1) as foto
     from public.cotizacion_item i join public.modelo m on m.id=i.modelo_id where i.cotizacion_id=$1`, [c.id]);
  return (
    <main className="min-h-screen bg-[#f1efdf] text-[#212529]">
      <header className="bg-[#07503f] py-3 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4">
          {c.logo_url ? <img src={c.logo_url} alt="logo" className="h-10 rounded bg-white object-contain" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e8fe85] font-black text-[#053d30]">RJ</span>}
          <div><p className="font-display text-lg font-semibold">{c.emp}</p><p className="font-mono2 text-[10px] uppercase tracking-[.18em] opacity-75">Cotización {c.numero}{c.tipo === 'alquiler' ? ' · Alquiler' : ''}</p></div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-[#3f3f46]">Para {c.razon_social ?? '—'} · Válida {c.validez_dias} días · Entrega {c.plazo_entrega_dias} días</p>
        {items.map((it: any) => (
          <div key={it.id} className="rj-card mt-2">
            <FotoModelo url={it.foto} codigo={it.codigo} />
            <p className="mt-2 font-bold">{it.cantidad}x {it.codigo} — {it.nombre}</p>
            {(it.largo_mm || it.ancho_mm) && <p className="text-xs text-[#3f3f46]">Medidas: {it.largo_mm ?? '—'}x{it.ancho_mm ?? '—'}x{it.alto_mm ?? '—'} mm</p>}
            <p className="text-sm">{fmtUSD(Number(it.precio_unitario_usd))} c/u</p>
          </div>
        ))}
        <p className="mt-3 font-display text-3xl">Total {fmtUSD(Number(c.total_usd))} = {fmtARS(Number(c.total_ars))}</p>
        <p className="text-xs opacity-60">TC ${c.tipo_cambio} del {fmtFechaAR(c.fecha_tipo_cambio)} · Pago: {c.condicion_pago}</p>
        <div className="mt-3 flex flex-wrap gap-2 print:hidden">
          <a href={waLink(`${WA_COTIZACION} Acepto ${c.numero}.`)} target="_blank" className="rj-btn-green">Aceptar por WhatsApp</a>
          <BotonImprimir texto="Imprimir" />
        </div>
        <p className="mt-3 text-xs opacity-60">{c.telefonos} · {c.email} · {EMPRESA.direccion}</p>
      </div>
    </main>
  );
}
