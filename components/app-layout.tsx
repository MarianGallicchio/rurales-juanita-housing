import Link from 'next/link';
import { GRUPOS, modulosParaRol, type Rol } from '@/lib/roles';

// Shell único: sidebar agrupado en desktop, carrusel en móvil + HUD legible.
export async function AppLayout({ rol, email, children }: { rol: Rol; email?: string | null; children: React.ReactNode }) {
  const mods = modulosParaRol(rol);
  let hud = { tc: '—', tareas: 0, nc: 0, stock: 0 };
  try {
    const { queryLocal } = await import('@/lib/db-local');
    hud.tc = String((await queryLocal<{ v: number }>(`select valor_ars_por_usd as v from public.tipo_cambio order by fecha desc limit 1`))[0]?.v ?? '—');
    hud.tareas = (await queryLocal<{ n: number }>(`select count(*)::int n from public.tarea where completada_en is null and vence_en <= current_date + 1`))[0]?.n ?? 0;
    hud.nc = (await queryLocal<{ n: number }>(`select count(*)::int n from public.no_conformidad where estado<>'cerrada'`))[0]?.n ?? 0;
    hud.stock = (await queryLocal<{ n: number }>(
      `select count(*)::int n from public.material m where (select coalesce(sum(case when tipo in ('entrada','ajuste') then cantidad when tipo in ('salida','reserva') then -cantidad else 0 end),0) from public.movimiento_stock s where s.material_id=m.id) < m.stock_minimo`))[0]?.n ?? 0;
  } catch { /* sin base: HUD vacío */ }
  return (
    <div className="min-h-screen bg-[#f1efdf] text-[#212529]">
      <header className="sticky top-0 z-20 border-b border-[#053d30] bg-gradient-to-r from-[#053d30] via-[#07503f] to-[#053d30] px-4 py-2 text-white">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded bg-[#e8fe85] font-black text-[#053d30]">RJ</span>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold text-white">Rurales Juanita</p>
              <p className="font-mono2 text-[10px] uppercase tracking-[.18em] text-[#e8fe85]">{rol}{email ? ` · ${email}` : ''}</p>
            </div>
          </Link>
          <span className="rounded-full border border-dashed border-[#e8fe85] px-2 py-1 font-mono2 text-[10px] uppercase tracking-[.14em] text-[#e8fe85]">ISO 9001</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono2 text-[11px] uppercase tracking-wider text-white">
          <span>USD ${hud.tc}</span>
          <Link href="/crm" className={hud.tareas > 0 ? 'font-bold text-[#e8fe85]' : ''}>◷ {hud.tareas} tareas</Link>
          <Link href="/produccion" className={hud.nc > 0 ? 'font-bold text-[#e8fe85]' : ''}>⛔ {hud.nc} NC</Link>
          <Link href="/stock" className={hud.stock > 0 ? 'font-bold text-[#e8fe85]' : ''}>📦 {hud.stock} críticos</Link>
          <Link href="/cotizador" className="ml-auto font-bold text-[#e8fe85] underline">+ Cotizar</Link>
        </div>
        {/* Móvil: todos los módulos en carrusel (antes solo 4) */}
        <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 md:hidden" aria-label="Módulos">
          <Link href="/" className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-[12px] font-bold text-white">Inicio</Link>
          {mods.map((m) => (
            <Link key={m.key} href={m.href} className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-[12px] font-bold text-white">
              {m.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-4 px-4 pb-24 pt-4 md:pb-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 flex flex-col gap-3 rounded-xl border bg-white p-3" aria-label="Módulos">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-bold text-[#07503f] hover:bg-slate-100">★ Inicio / Centro de comando</Link>
            {GRUPOS.map((g) => {
              const items = mods.filter((m) => m.grupo === g);
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <p className="px-3 font-mono2 text-[10px] uppercase tracking-[.18em] text-[#07503f]">{g}</p>
                  {items.map((m) => (
                    <Link key={m.key} href={m.href} className="block rounded-lg px-3 py-2 text-sm text-[#212529] hover:bg-slate-100">
                      {m.label}
                    </Link>
                  ))}
                </div>
              );
            })}
            <Link href="/web" className="rounded-lg px-3 py-2 text-sm text-[#3f3f46] hover:bg-slate-100">🌐 Web pública</Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white md:hidden" aria-label="Accesos rápidos">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          <Link href="/" className="rounded-lg px-1 py-2 text-center text-[11px] font-bold text-[#07503f]">Inicio</Link>
          <Link href="/cotizador" className="rounded-lg bg-[#07503f] px-1 py-2 text-center text-[11px] font-bold text-white">+ Cotizar</Link>
          <Link href="/computo" className="rounded-lg px-1 py-2 text-center text-[11px] font-bold text-[#07503f]">Cómputo</Link>
          <Link href="/produccion" className="rounded-lg px-1 py-2 text-center text-[11px] font-bold text-[#07503f]">Planta</Link>
          <Link href="/stock" className="rounded-lg px-1 py-2 text-center text-[11px] font-bold text-[#07503f]">Stock</Link>
        </div>
      </nav>
    </div>
  );
}
