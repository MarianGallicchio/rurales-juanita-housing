'use client';
import { useRef, useState } from 'react';

// Pad de firma táctil: dibujar con dedo o mouse, guardar como PNG.
export function PadFirma({ action, cotId }: { action: (fd: FormData) => void; cotId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacia, setVacia] = useState(true);
  const [nombre, setNombre] = useState('');

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const empezar = (e: React.PointerEvent) => {
    dibujando.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const c = ref.current!.getContext('2d')!;
    const p = pos(e);
    c.beginPath(); c.moveTo(p.x, p.y);
  };
  const mover = (e: React.PointerEvent) => {
    if (!dibujando.current) return;
    const c = ref.current!.getContext('2d')!;
    const p = pos(e);
    c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#07503f';
    c.lineTo(p.x, p.y); c.stroke();
    setVacia(false);
  };
  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (vacia || !nombre.trim()) return;
    const fd = new FormData(e.currentTarget);
    fd.set('firma', ref.current!.toDataURL('image/png'));
    fd.set('nombre', nombre.trim());
    await action(fd);
  };

  return (
    <form onSubmit={enviar} className="rounded-2xl border-2 border-dashed border-[#07503f] bg-white p-3">
      <input type="hidden" name="id" value={cotId} />
      <p className="text-sm font-black">✍️ Firma del cliente (vale como aceptación)</p>
      <canvas ref={ref} width={600} height={220} className="mt-2 w-full touch-none rounded-xl border bg-slate-50"
        onPointerDown={empezar} onPointerMove={mover}
        onPointerUp={() => (dibujando.current = false)} onPointerLeave={() => (dibujando.current = false)} />
      <div className="mt-2 flex gap-2">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido *" className="rj-input flex-1" required />
        <button type="button" onClick={() => { ref.current!.getContext('2d')!.clearRect(0, 0, 600, 220); setVacia(true); }} className="rj-btn bg-slate-200">Borrar</button>
      </div>
      <button disabled={vacia || !nombre.trim()} className="rj-btn-green mt-2 w-full disabled:opacity-40">Firmar y aceptar → crea OP</button>
    </form>
  );
}
