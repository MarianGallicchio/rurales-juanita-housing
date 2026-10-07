import Link from 'next/link';

export default function Offline() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center bg-[#f1efdf] p-4">
      <div className="rj-card text-center">
        <p className="font-display text-2xl">Sin conexión</p>
        <p className="mt-1 text-sm opacity-70">El taller quedó sin internet. Los checklists ya abiertos siguen visibles; los nuevos controles se cargan al volver la señal.</p>
        <Link href="/" className="rj-btn-primary mt-3 inline-block">Reintentar</Link>
      </div>
    </main>
  );
}
