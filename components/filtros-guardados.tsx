'use client';

import { useEffect, useState } from 'react';

// Filtros guardados en este navegador (por usuario de la PC, sin backend).
export function FiltrosGuardados() {
  const [guardados, setGuardados] = useState<{ nombre: string; qs: string }[]>([]);
  const [nombre, setNombre] = useState('');
  useEffect(() => {
    try { setGuardados(JSON.parse(localStorage.getItem('rj-crm-filtros') ?? '[]')); } catch { /* vacío */ }
  }, []);
  const guardar = () => {
    const qs = window.location.search;
    const n = nombre.trim() || `Filtro ${guardados.length + 1}`;
    const sig = [...guardados.filter((g) => g.nombre !== n), { nombre: n, qs }];
    setGuardados(sig);
    try { localStorage.setItem('rj-crm-filtros', JSON.stringify(sig)); } catch { /* noop */ }
    setNombre('');
  };
  const borrar = (nomb: string) => {
    const sig = guardados.filter((g) => g.nombre !== nomb);
    setGuardados(sig);
    try { localStorage.setItem('rj-crm-filtros', JSON.stringify(sig)); } catch { /* noop */ }
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {guardados.map((g) => (
        <span key={g.nombre} className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[12px] font-bold text-[#07503f]">
          <a href={`/crm${g.qs}`} className="hover:underline">{g.nombre}</a>
          <button onClick={() => borrar(g.nombre)} aria-label={`Borrar ${g.nombre}`} className="text-neutral-400 hover:text-red-600">×</button>
        </span>
      ))}
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Guardar filtro actual…" className="w-40 rounded-full border px-2 py-1 text-[12px]" aria-label="Nombre del filtro" />
      <button onClick={guardar} className="rounded-full bg-white px-2 py-1 text-[12px] font-bold text-[#07503f]">Guardar</button>
    </div>
  );
}
