'use client';
import dynamic from 'next/dynamic';

// ThreeUI solo en cliente y por ruta profunda: el barril principal arrastra
// componentes viejos incompatibles con three moderno. Así solo entra lo usado.
const Paisaje = dynamic(
  () => import('@designcodeio/threeui/components/LandscapeScene').then((m) => m.LandscapeScene),
  { ssr: false }
);
const Esmeralda = dynamic(
  () => import('@designcodeio/threeui/components/EmeraldHorizonBackground').then((m) => m.EmeraldHorizonBackground),
  { ssr: false }
);

// Campo bonaerense al atardecer — hero de la web pública.
export function HeroCampo({ variant = 'sunset' }: { variant?: 'sunrise' | 'noon' | 'sunset' | 'night' }) {
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-[#07503f] md:h-96">
      <Paisaje variant={variant} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07503f] via-transparent to-transparent" />
    </div>
  );
}

// Horizonte verde — fondos de sección (catálogo, panel).
export function FondoCampo(props: { className?: string }) {
  return <Esmeralda speed={0.6} waveScale={1} className={props.className ?? 'h-40 w-full rounded-2xl'} />;
}
