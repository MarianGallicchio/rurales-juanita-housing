'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bell, ChevronsLeft, ChevronsRight, Menu, Plus, Rows3, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { SidebarNav, type NavMod } from '@/components/sidebar-nav';
import { CommandPalette } from '@/components/command-palette';
import { SalirButton } from '@/components/salir-button';

export type Recientes = {
  cotizaciones: { numero: string }[];
  clientes: { razon: string }[];
  ops: { numero: string }[];
};

export function Shell({ nombre, rolLabel, email, mods, counts, usd, recents, tareasBadge, children }: {
  nombre: string;
  rolLabel: string;
  email?: string | null;
  mods: NavMod[];
  counts: Record<string, number>;
  usd: { valor: string; fecha: string; fuente: string };
  recents: Recientes;
  tareasBadge: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [paleta, setPaleta] = useState(false);
  const [colapsado, setColapsado] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('rj-nav-colapsado') === '1') setColapsado(true);
      if (localStorage.getItem('rj-density') === 'compacta') {
        setCompacto(true);
        document.documentElement.classList.add('density-compact');
      }
    } catch { /* sin storage */ }
  }, []);

  const alternarDensidad = useCallback(() => {
    setCompacto((c) => {
      const sig = !c;
      try { localStorage.setItem('rj-density', sig ? 'compacta' : 'comoda'); } catch { /* noop */ }
      document.documentElement.classList.toggle('density-compact', sig);
      return sig;
    });
  }, []);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const escribiendo = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaleta((v) => !v); return; }
      if (escribiendo || e.ctrlKey || e.metaKey) return;
      if (e.altKey && e.key.toLowerCase() === 'v') { e.preventDefault(); router.push('/cotizador'); }
      if (e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); router.push('/caja'); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f1efdf] text-[#212529] dark:bg-[#101413] dark:text-neutral-100">
      {/* Cabecera única */}
      <header className="sticky top-0 z-30 border-b border-[#053d30]/20 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#161b1a]/95">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-1 px-3 md:gap-2 md:px-4">
          <button className="rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-lg p-2 hover:bg-slate-100 md:block"
            onClick={() => setColapsado((c) => { try { localStorage.setItem('rj-nav-colapsado', c ? '0' : '1'); } catch { /* noop */ } return !c; })}
            aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            title="Colapsar barra lateral"
          >
            {colapsado ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
          <Link href="/" className="flex items-center gap-2" aria-label="Inicio">
            <span className="grid h-8 w-8 place-items-center rounded bg-[#07503f] font-black text-sm text-[#e8fe85]">RJ</span>
          </Link>
          <button
            onClick={() => setPaleta(true)}
            className="ml-1 hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#07503f]/20 bg-[#f1efdf] px-3 py-2 text-sm text-[#3f3f46] hover:border-[#07503f]/40 sm:flex md:max-w-sm dark:bg-white/5 dark:text-neutral-300"
            aria-label="Buscar o ir a (Ctrl+K)"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Buscar cliente, COT, OP…</span>
            <kbd className="tnum ml-auto hidden rounded border bg-white px-1.5 font-mono2 text-[11px] lg:block">Ctrl K</kbd>
          </button>
          <button onClick={() => setPaleta(true)} className="rounded-lg p-2 hover:bg-slate-100 sm:hidden" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-[#07503f] font-bold text-white hover:bg-[#053d30]">
                  <Plus className="h-4 w-4" /><span className="hidden sm:inline">Nuevo</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link href="/cotizador">Cotización</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/crm">Lead / cliente</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/crm">Tarea</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/produccion">Orden de producción</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/caja">Cobro / movimiento</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/#bandeja" className="relative rounded-lg p-2 hover:bg-slate-100" aria-label={`Tareas pendientes: ${tareasBadge}`}>
              <Bell className="h-5 w-5" />
              {tareasBadge > 0 && (
                <span className="tnum absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                  {tareasBadge > 99 ? '99+' : tareasBadge}
                </span>
              )}
            </Link>
            <span
              className="tnum hidden rounded-lg border border-[#07503f]/20 px-2 py-1.5 font-mono2 text-[12px] font-medium text-[#07503f] lg:block dark:text-[#e8fe85]"
              title={`Dólar oficial · Fuente: ${usd.fuente} · Fecha: ${usd.fecha}. Se edita en Configuración.`}
            >
              USD ${usd.valor} · {usd.fecha}
            </span>
            <button
              onClick={alternarDensidad}
              className="hidden rounded-lg p-2 hover:bg-slate-100 md:block"
              aria-label={compacto ? 'Densidad cómoda' : 'Densidad compacta'}
              title={compacto ? 'Densidad cómoda' : 'Densidad compacta'}
            >
              <Rows3 className="h-5 w-5" />
            </button>
            <ThemeSwitcher />
            <div className="hidden items-center gap-2 border-l border-[#07503f]/15 pl-2 sm:flex" title={email ?? ''}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#07503f] text-sm font-bold text-[#e8fe85]">
                {(nombre || '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden leading-tight xl:block">
                <span className="block max-w-32 truncate text-sm font-bold">{nombre}</span>
                <span className="block text-[12px] text-[#07503f] dark:text-[#8fb5a5]">{rolLabel}</span>
              </span>
              <SalirButton compacto />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-3 pb-24 pt-3 md:px-4 md:pb-10">
        {/* Lateral escritorio */}
        <aside className={`hidden shrink-0 md:block ${colapsado ? 'w-14' : 'w-60'}`}>
          <div className="sticky top-[68px] rounded-xl bg-[#053d30] p-2 text-white dark:bg-[#0b100f]">
            <SidebarNav mods={mods} counts={counts} colapsado={colapsado} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Drawer móvil */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-[#053d30] p-3 text-white">
            <div className="mb-2 flex items-center justify-between">
              <span className="px-1 text-sm font-bold">{nombre} · {rolLabel}</span>
              <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav mods={mods} counts={counts} onNavegar={() => setDrawer(false)} />
            <div className="mt-3 border-t border-white/15 pt-3"><SalirButton /></div>
          </div>
        </div>
      )}

      {/* Barra inferior móvil: mismos destinos que el lateral */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#07503f]/15 bg-white md:hidden dark:bg-[#161b1a]" aria-label="Accesos rápidos">
        <div className="grid grid-cols-5 gap-1 px-2 py-2 text-center">
          <Link href="/" className="rounded-lg px-1 py-2 text-[11px] font-bold text-[#07503f]">Inicio</Link>
          <Link href="/cotizador" className="rounded-lg bg-[#07503f] px-1 py-2 text-[11px] font-bold text-white">Vender</Link>
          <Link href="/caja" className="rounded-lg px-1 py-2 text-[11px] font-bold text-[#07503f]">Cobrar</Link>
          <Link href="/produccion" className="rounded-lg px-1 py-2 text-[11px] font-bold text-[#07503f]">Planta</Link>
          <Link href="/stock" className="rounded-lg px-1 py-2 text-[11px] font-bold text-[#07503f]">Stock</Link>
        </div>
      </nav>

      <CommandPalette abierto={paleta} alCerrar={() => setPaleta(false)} mods={mods} recents={recents} />
    </div>
  );
}
