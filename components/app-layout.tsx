import Link from 'next/link';
import { modulosParaRol, type Rol } from '@/lib/roles';

// Layout mobile-first: sidebar en desktop, barra inferior en celular + HUD vivo.
// Paleta real: forest #07503f · lima #e8fe85 · hueso #f1efdf.
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
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded bg-[#e8fe85] font-black text-[#053d30]">RJ</span>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">Rurales Juanita</p>
              <p className="font-mono2 text-[10px] uppercase tracking-[.18em] opacity-80">{rol}{email ? ` · ${email}` : ''}</p>
            </div>
          </div>
          <span className="rounded-full border border-dashed border-[#e8fe85] px-2 py-1 font-mono2 text-[10px] uppercase tracking-[.14em] text-[#e8fe85]">ISO 9001</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono2 text-[10px] uppercase tracking-wider text-white/85">
          <span>USD ${hud.tc}</span>
          <Link href="/crm" className={hud.tareas > 0 ? 'text-[#e8fe85]' : ''}>◷ {hud.tareas} tareas</Link>
          <Link href="/produccion" className={hud.nc > 0 ? 'text-[#e8fe85]' : ''}>⛔ {hud.nc} NC</Link>
          <Link href="/stock" className={hud.stock > 0 ? 'text-[#e8fe85]' : ''}>📦 {hud.stock} críticos</Link>
          <Link href="/cotizador" className="ml-auto underline">+ Cotizar</Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-4 px-4 pb-24 pt-4 md:pb-10">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-24 flex flex-col gap-1 rounded-xl border bg-white p-2">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100">Inicio</Link>
            {mods.map((m) => (
              <Link key={m.key} href={m.href} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                {m.label}
              </Link>
            ))}
            <Link href="/config" className="rounded-lg px-3 py-2 text-sm opacity-70 hover:bg-slate-100">Configuración</Link>
            {rol === 'Administrador' && (
              <>
                <Link href="/usuarios" className="rounded-lg px-3 py-2 text-sm opacity-70 hover:bg-slate-100">Usuarios</Link>
                <Link href="/auditoria" className="rounded-lg px-3 py-2 text-sm opacity-70 hover:bg-slate-100">Auditoría</Link>
                <Link href="/facturacion" className="rounded-lg px-3 py-2 text-sm opacity-70 hover:bg-slate-100">Facturación ARCA</Link>
              </>
            )}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white md:hidden">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          <Link href="/" className="rounded-lg px-1 py-2 text-center text-[11px] font-semibold active:bg-slate-100">Inicio</Link>
          {mods.slice(0, 4).map((m) => (
            <Link key={m.key} href={m.href} className="rounded-lg px-1 py-2 text-center text-[11px] font-semibold active:bg-slate-100">
              {m.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
