'use client';

import { useState } from 'react';
import { Estado } from '@/components/estado';
import { fmtUSD } from '@/lib/formato-ar';

export type Oport = {
  id: string; titulo: string; etapa: string; valor: number; dias: number;
  cliente: string; tipo: string; origen: string; tel: string | null;
};

// Kanban con arrastrar y soltar (HTML5 nativo, sin dependencias).
// Al soltar en "perdido" pide el motivo, que el servidor exige.
export function KanbanCrm({ grupos, mover }: {
  grupos: { etapa: string; items: Oport[] }[];
  mover: (fd: FormData) => Promise<void>;
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const soltar = (etapa: string, id: string) => {
    setSobre(null);
    setArrastrando(null);
    let motivo = '';
    if (etapa === 'perdido') {
      motivo = window.prompt('Motivo de la pérdida (obligatorio):') ?? '';
      if (!motivo.trim()) return;
    }
    const fd = new FormData();
    fd.set('id', id);
    fd.set('etapa', etapa);
    fd.set('motivo', motivo);
    void mover(fd);
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {grupos.map((g) => (
        <div
          key={g.etapa}
          onDragOver={(e) => { e.preventDefault(); setSobre(g.etapa); }}
          onDragLeave={() => setSobre((s) => (s === g.etapa ? null : s))}
          onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/oport'); if (id) soltar(g.etapa, id); }}
          className={`rounded-xl border bg-white p-2 transition-colors ${sobre === g.etapa ? 'border-[#07503f] bg-[#e8fe85]/30' : ''}`}
        >
          <p className="lbl">{g.etapa} ({g.items.length})</p>
          {g.items.map((o) => (
            <article
              key={o.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/oport', o.id); setArrastrando(o.id); }}
              onDragEnd={() => { setArrastrando(null); setSobre(null); }}
              className={`mt-1 cursor-grab rounded border bg-white p-2 active:cursor-grabbing ${arrastrando === o.id ? 'opacity-50' : ''}`}
            >
              <p className="text-[13px] font-bold">{o.titulo}</p>
              <p className="tnum text-[13px] text-[#07503f]">{fmtUSD(Number(o.valor))}</p>
              <p className="mt-0.5 text-[12px] text-[#3f3f46]">{o.cliente} · {o.dias}d en etapa</p>
              <p className="mt-1 flex items-center justify-between gap-1">
                <Estado valor={o.etapa} />
                {o.tel && (
                  <a
                    href={`https://wa.me/${o.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te escribo de Rurales Juanita por: ${o.titulo}`)}`}
                    target="_blank" rel="noreferrer"
                    className="rounded-full bg-[#07503f] px-2 py-1 text-[11px] font-bold text-white"
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                  >
                    WhatsApp
                  </a>
                )}
              </p>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}
