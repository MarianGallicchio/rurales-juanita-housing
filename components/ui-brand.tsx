// Componentes visuales compartidos — identidad real Rurales Juanita:
// forest #07503f · lima #e8fe85 · hueso #f1efdf · serif Cormorant + mono JetBrains.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FondoCampo } from './hero-3d';

export function PageHero({ kicker, titulo, bajada, accion, vivo }: { kicker: string; titulo: ReactNode; bajada?: string; accion?: ReactNode; vivo?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#07503f] via-[#07503f] to-[#053d30] text-white">
      <div className="vector-dots-ondark pointer-events-none absolute inset-0 opacity-50" />
      {vivo
        ? <div className="absolute inset-0 opacity-30"><FondoCampo className="h-full w-full !rounded-none" /></div>
        : <div className="pointer-events-none absolute inset-0 opacity-[.07]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '44px 44px' }} />}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#e8fe85]/15 blur-3xl" />
      <div className="relative p-5 md:p-7">
        <p className="rj-eyebrow rj-eyebrow-ondark">{kicker}</p>
        <h1 className="hero-legible mt-2 text-3xl font-medium leading-tight">{titulo}</h1>
        {bajada && <p className="hero-pill hero-legible mt-2 max-w-[62ch] rounded-xl p-2 text-sm text-white">{bajada}</p>}
        {accion && <div className="mt-3 flex flex-wrap gap-2">{accion}</div>}
      </div>
    </div>
  );
}

const TONOS = ['', 'rj-pastel-0', 'rj-pastel-1', 'rj-pastel-2'];

export function Tarjeta({ titulo, valor, pie, alerta, tono = 0 }: { titulo: string; valor: string; pie?: string; alerta?: boolean; tono?: number }) {
  return (
    <div className={`rj-card ${TONOS[tono % TONOS.length]} ${alerta ? '!border-red-400' : ''}`}>
      <p className="font-mono2 text-[11px] uppercase tracking-[.14em] text-[#07503f]">{titulo}</p>
      <p className="mt-1 font-display text-3xl font-medium text-[#212529]">{valor}</p>
      {pie && <p className="mt-1 text-xs text-[#3f3f46]">{pie}</p>}
    </div>
  );
}

export function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section className="rj-card">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-[#07503f] bg-white font-mono2 text-sm font-medium text-[#07503f]">{String(n).padStart(2, '0')}</span>
        <p className="font-display text-xl font-medium">{titulo}</p>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Vacio({ texto, href, cta }: { texto: string; href?: string; cta?: string }) {
  return (
    <div className="rj-card border-dashed text-center">
      <p className="text-sm opacity-70">{texto}</p>
      {href && <Link href={href} className="rj-btn-primary mt-2 inline-block">{cta ?? 'Ir'}</Link>}
    </div>
  );
}

export function Marca() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8fe85] font-black text-[#053d30]">RJ</span>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold">Rurales Juanita</p>
        <p className="font-mono2 text-[10px] uppercase tracking-[.18em] opacity-70">Modulares & transportables</p>
      </div>
    </div>
  );
}
