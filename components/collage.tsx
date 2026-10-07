import Image from 'next/image';
import type { ReactNode } from 'react';

// Collage art + vector art: recorte foto con cinta, trama de puntos, etiqueta rotada.
export function FotoCollage({
  src, alt, caption, rotate = true,
}: { src: string; alt: string; caption?: string; rotate?: boolean }) {
  return (
    <figure className={`collage-frame ${rotate ? '' : '!rotate-0'}`}>
      <div className="collage-tape" />
      <div className="relative h-56 w-full overflow-hidden bg-[#f1efdf] md:h-64">
        <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      {caption && <figcaption className="collage-caption mt-3">{caption}</figcaption>}
    </figure>
  );
}

export function CollageHero({
  kicker, titulo, bajada, accion, fotos,
}: { kicker: string; titulo: ReactNode; bajada?: string; accion?: ReactNode; fotos: { src: string; alt: string }[] }) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-[#07503f] text-white">
      <div className="vector-dots-ondark pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#e8fe85]/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#c9a86a]/25 blur-2xl" />
      <div className="relative grid gap-5 p-5 md:grid-cols-[1.1fr_.9fr] md:p-7">
        <div>
          <p className="rj-eyebrow rj-eyebrow-ondark">{kicker}</p>
          <h1 className="hero-legible mt-3 text-3xl font-medium leading-tight md:text-4xl">{titulo}</h1>
          {bajada && <p className="hero-pill hero-legible mt-3 max-w-[62ch] rounded-xl p-3 text-sm text-white">{bajada}</p>}
          {accion && <div className="mt-4 flex flex-wrap gap-2">{accion}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fotos.slice(0, 4).map((f, i) => (
            <div key={f.src} className={`collage-sticker overflow-hidden rounded-xl bg-white ${i % 2 ? 'collage-sticker-r' : ''}`}>
              <div className="relative h-28 md:h-32">
                <Image src={f.src} alt={f.alt} fill className="object-cover" sizes="25vw" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
