'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Command } from 'cmdk';
import { FilePlus2, KanbanSquare, Factory, Wallet, Search } from 'lucide-react';
import type { NavMod } from '@/components/sidebar-nav';
import type { Recientes } from '@/components/shell';

export function CommandPalette({ abierto, alCerrar, mods, recents }: {
  abierto: boolean;
  alCerrar: () => void;
  mods: NavMod[];
  recents: Recientes;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  const ir = (href: string) => { alCerrar(); setQ(''); setAviso(null); router.push(href); };

  const buscarCodigo = async () => {
    const v = q.trim();
    if (!v) return;
    try {
      const r = await fetch(`/api/ir?q=${encodeURIComponent(v)}`);
      const d = await r.json();
      if (d?.url) { ir(d.url); return; }
    } catch { /* sin red: aviso honesto */ }
    setAviso(`Sin resultados para "${v}". Probá con COT-0001, OP-0001, n° de serie o CUIT.`);
  };

  const esCodigo = /[A-Za-z]{2,}-?\d|^\d{6,}$/.test(q.trim());

  return (
    <Command.Dialog open={abierto} onOpenChange={(v) => { if (!v) { alCerrar(); setAviso(null); } }} label="Paleta de comandos">
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="h-4 w-4 shrink-0 opacity-60" />
        <Command.Input
          value={q}
          onValueChange={(v) => { setQ(v); setAviso(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && esCodigo) buscarCodigo(); }}
          placeholder="Ir a un módulo, crear algo o pegar un código…"
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-neutral-400"
        />
        <kbd className="tnum rounded border px-1.5 font-mono2 text-[11px]">esc</kbd>
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty>
          {aviso ?? 'Sin coincidencias. Enter busca códigos (COT, OP, serie, CUIT).'}
        </Command.Empty>
        {esCodigo && (
          <Command.Group heading="Código">
            <Command.Item onSelect={buscarCodigo} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm aria-selected:bg-slate-100">
              <Search className="h-4 w-4" /> Abrir “{q.trim()}”…
            </Command.Item>
          </Command.Group>
        )}
        <Command.Group heading="Ir a">
          {mods.map((m) => (
            <Command.Item key={m.key} value={`${m.label} ${m.grupo} ir modulo`} onSelect={() => ir(m.href)}
              className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-slate-100">
              {m.label} <span className="text-xs text-neutral-500">· {m.grupo}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Crear">
          <Command.Item value="nueva cotizacion vender" onSelect={() => ir('/cotizador')} className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-slate-100">
            <span className="flex items-center gap-2"><FilePlus2 className="h-4 w-4" /> Nueva cotización</span>
          </Command.Item>
          <Command.Item value="nuevo lead cliente crm" onSelect={() => ir('/crm')} className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-slate-100">
            <span className="flex items-center gap-2"><KanbanSquare className="h-4 w-4" /> Nuevo lead / cliente</span>
          </Command.Item>
          <Command.Item value="nueva orden produccion planta" onSelect={() => ir('/produccion')} className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-slate-100">
            <span className="flex items-center gap-2"><Factory className="h-4 w-4" /> Nueva orden de producción</span>
          </Command.Item>
          <Command.Item value="nuevo cobro caja" onSelect={() => ir('/caja')} className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-slate-100">
            <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Nuevo cobro</span>
          </Command.Item>
        </Command.Group>
        {(recents.cotizaciones.length > 0 || recents.clientes.length > 0) && (
          <Command.Group heading="Recientes">
            {recents.cotizaciones.map((c) => (
              <Command.Item key={c.numero} value={`cotizacion ${c.numero}`} onSelect={() => ir('/cotizador')}
                className="cursor-pointer rounded-lg px-2 py-2 font-mono2 text-sm aria-selected:bg-slate-100">
                {c.numero} <span className="font-sans text-xs text-neutral-500">· cotización</span>
              </Command.Item>
            ))}
            {recents.clientes.map((c) => (
              <Command.Item key={c.razon} value={`cliente ${c.razon}`} onSelect={() => ir('/crm')}
                className="cursor-pointer rounded-lg px-2 py-2 text-sm aria-selected:bg-slate-100">
                {c.razon} <span className="text-xs text-neutral-500">· cliente</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t px-3 py-2 text-[12px] text-neutral-500">
        <span><b>Ctrl K</b> abrir/cerrar</span><span><b>Alt V</b> vender</span><span><b>Alt B</b> cobrar</span><span><b>↑↓ + Enter</b> elegir</span>
      </div>
    </Command.Dialog>
  );
}
