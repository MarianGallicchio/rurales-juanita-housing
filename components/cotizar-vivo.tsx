'use client';

import { useMemo, useState } from 'react';
import { calcularTotales } from '@/lib/formato-ar';
import { fmtARS, fmtUSD } from '@/lib/formato-ar';

export type OpcionViva = { id: string; nombre: string; grupo: string; tipo: string; precio: number; obligatoria: boolean; defecto: boolean };

// Panel en vivo del asistente: totaliza con la misma fórmula del servidor a medida que se tipea.
export function CotizarVivo({ opcs, sup, tcVig, margenMin, matInicial, moInicial }: {
  opcs: OpcionViva[]; sup: number; tcVig: number; margenMin: number; matInicial: number; moInicial: number;
}) {
  const [cantidad, setCantidad] = useState(1);
  const [mat, setMat] = useState(String(matInicial));
  const [mo, setMo] = useState(String(moInicial));
  const [margen, setMargen] = useState('25');
  const [flete, setFlete] = useState('1800');
  const [tc, setTc] = useState(String(tcVig));
  const [elegidas, setElegidas] = useState<string[]>(() => opcs.filter((o) => o.defecto || o.obligatoria).map((o) => o.id));
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>('USD');

  const extra = useMemo(() => {
    let e = 0;
    for (const o of opcs) {
      if (!elegidas.includes(o.id)) continue;
      e += o.tipo === 'por_m2' ? Number(o.precio) * (sup || 0) : Number(o.precio) * cantidad;
    }
    return e;
  }, [opcs, elegidas, sup, cantidad]);

  const t = useMemo(() => calcularTotales({
    materiales: (Number(mat) || 0) * cantidad + extra,
    manoObra: (Number(mo) || 0) * cantidad,
    margenPct: Number(margen) || 0,
    fleteUsd: Number(flete) || 0,
    ivaPct: 21,
    tipoCambio: Number(tc) || tcVig,
  }), [mat, mo, margen, flete, tc, cantidad, extra, tcVig]);

  const margenBajo = (Number(margen) || 0) < margenMin;
  const total = moneda === 'USD' ? fmtUSD(t.totalUsd) : fmtARS(t.totalArs);

  const num = (v: string, set: (s: string) => void, ph: string, label: string, name: string) => (
    <label className="text-xs">{label}<input name={name} type="number" value={v} onChange={(e) => set(e.target.value)} placeholder={ph} className="rj-input" /></label>
  );

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3">
        {opcs.length > 0 && (
          <section className="rj-card">
            <p className="font-display text-xl font-medium">Equipamiento ({elegidas.length}/{opcs.length})</p>
            <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
              {opcs.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded-xl border p-2 text-sm">
                  <input
                    type="checkbox" name="op" value={o.id}
                    checked={elegidas.includes(o.id)} disabled={o.obligatoria}
                    onChange={(e) => setElegidas((prev) => e.target.checked ? [...prev, o.id] : prev.filter((x) => x !== o.id))}
                    className="h-5 w-5"
                  />
                  {o.obligatoria && <input type="hidden" name="op" value={o.id} />}
                  <span className="flex-1">{o.nombre} <span className="text-[#3f3f46]">[{o.grupo} · {o.tipo === 'por_m2' ? `$${o.precio}/m²` : `$${o.precio}`}]{o.obligatoria ? ' · obligatoria' : ''}</span></span>
                </label>
              ))}
            </div>
          </section>
        )}
        <section className="rj-card">
          <p className="font-display text-xl font-medium">Costos y margen</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs">Cantidad<input name="cantidad" type="number" value={cantidad} min={1} onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))} className="rj-input" /></label>
            <label className="text-xs">Modalidad<select name="tipo" className="rj-input"><option value="venta">Venta</option><option value="alquiler">Alquiler (obra temporal)</option></select></label>
            <label className="text-xs">Largo mm<input name="largo" type="number" placeholder="a medida" className="rj-input" /></label>
            <label className="text-xs">Ancho mm<input name="ancho" type="number" placeholder="a medida" className="rj-input" /></label>
            <label className="text-xs">Alto mm<input name="alto" type="number" placeholder="a medida" className="rj-input" /></label>
            <label className="text-xs">Dólar del día<input name="tc" type="number" value={tc} onChange={(e) => setTc(e.target.value)} className="rj-input" /></label>
            {num(mat, setMat, '18000', 'Materiales USD', 'mat')}
            {num(mo, setMo, '4500', 'Mano de obra USD', 'mo')}
            {num(margen, setMargen, '25', `Margen % (mín ${margenMin}%)`, 'margen')}
            {num(flete, setFlete, '1800', 'Flete USD', 'flete')}
          </div>
          {margenBajo && <p className="mt-2 rounded-xl bg-amber-100 p-2 text-[13px] font-bold">⚠ Margen bajo el mínimo ({margenMin}%): al enviar pedirá aprobación de Dirección.</p>}
        </section>
      </div>
      <aside className="lg:sticky lg:top-[68px] lg:self-start">
        <div className="rj-card">
          <div className="flex items-center justify-between">
            <p className="lbl">Total en vivo</p>
            <div className="flex rounded-full border text-[12px] font-bold" role="group" aria-label="Moneda">
              {(['USD', 'ARS'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMoneda(m)}
                  aria-pressed={moneda === m}
                  className={`rounded-full px-2 py-1 ${moneda === m ? 'bg-[#07503f] text-white' : 'text-[#07503f]'}`}>{m}</button>
              ))}
            </div>
          </div>
          <p className="tnum mt-1 text-3xl font-bold">{total}</p>
          <p className="tnum mt-1 text-[13px] text-[#3f3f46]">Subtotal {fmtUSD(t.subtotal)} · IVA incluido</p>
          <p className={`mt-1 text-[13px] font-bold ${margenBajo ? 'text-amber-700' : 'text-emerald-700'}`}>
            Margen {margen || '0'}% {margenBajo ? '(requiere aprobación)' : '(ok)'}
          </p>
          <p className="mt-1 text-[12px] text-[#3f3f46]">+{fmtUSD(extra)} equipamiento · TC ${tc || tcVig}</p>
        </div>
      </aside>
    </div>
  );
}
