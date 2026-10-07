'use client';
import { useState } from 'react';

type Hit = { id: string; razon_social: string; cuit: string | null; condicion_iva: string; tipo_sugerido: string };

// Buscador por nombre o CUIT/CUIL. Muestra condición IVA y sugiere Factura A (RI) o B (resto).
export function BuscadorCliente({ name = 'cliente_id' }: { name?: string }) {
  const [texto, setTexto] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState<Hit | null>(null);

  const buscar = async (v: string) => {
    setTexto(v);
    setSel(null);
    if (v.trim().length < 2) { setHits([]); return; }
    try {
      const r = await fetch(`/api/clientes?q=${encodeURIComponent(v)}`);
      setHits(await r.json());
    } catch { setHits([]); }
  };

  return (
    <div>
      <input type="hidden" name={name} value={sel?.id ?? ''} required />
      <input value={sel ? `${sel.razon_social} — ${sel.cuit ?? 's/CUIT'} [${sel.condicion_iva} → Factura ${sel.tipo_sugerido}]` : texto}
        onChange={(e) => buscar(e.target.value)} placeholder="Buscar por nombre o CUIT…" className="rj-input" readOnly={!!sel} />
      {!sel && hits.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-2xl border bg-white">
          {hits.map((h) => (
            <button type="button" key={h.id} onClick={() => { setSel(h); setHits([]); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f1efdf]">
              <b>{h.razon_social}</b> <span className="opacity-60">{h.cuit ?? 's/CUIT'}</span><br />
              <span className="font-mono2 text-[11px] uppercase">{h.condicion_iva} → Factura {h.tipo_sugerido}</span>
            </button>
          ))}
        </div>
      )}
      {sel && <button type="button" onClick={() => { setSel(null); setTexto(''); }} className="mt-1 text-xs underline">Cambiar cliente</button>}
    </div>
  );
}
