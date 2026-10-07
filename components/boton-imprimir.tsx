'use client';

export function BotonImprimir({ texto = 'Imprimir / PDF' }: { texto?: string }) {
  return (
    <button onClick={() => window.print()} className="rounded bg-slate-200 px-4 py-2 font-bold">
      {texto}
    </button>
  );
}
