'use client';
import { useState } from 'react';

// Muestra la foto del modelo; si todavía es placeholder sin archivo, dibuja ficha visual.
export function FotoModelo({ url, codigo, className }: { url?: string | null; codigo: string; className?: string }) {
  const [rota, setRota] = useState(false);
  if (!url || rota) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-[#07503f] to-[#053d30] text-white ${className ?? 'h-28 w-full rounded-xl'}`}>
        <div className="text-center">
          <p className="text-2xl font-black">RJ</p>
          <p className="text-[11px] font-bold">{codigo}</p>
        </div>
      </div>
    );
  }
  return <img src={url} alt={codigo} onError={() => setRota(true)} className={className ?? 'h-28 w-full rounded-xl object-cover'} loading="lazy" />;
}
