'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, KanbanSquare, Calculator, Wallet,
  BookOpen, Factory, Boxes, LifeBuoy, ReceiptText, ClipboardList,
  Users, Settings, ShieldCheck, Globe, ChevronDown,
} from 'lucide-react';
import { GRUPOS, type Grupo, type Modulo } from '@/lib/roles';

export type NavMod = { key: Modulo; label: string; href: string; grupo: Grupo };

const ICONOS: Record<Modulo, React.ComponentType<{ className?: string }>> = {
  panel: LayoutDashboard,
  cotizador: FileText,
  crm: KanbanSquare,
  computo: Calculator,
  caja: Wallet,
  catalogo: BookOpen,
  produccion: Factory,
  stock: Boxes,
  postventa: LifeBuoy,
  facturacion: ReceiptText,
  fichas: ClipboardList,
  usuarios: Users,
  config: Settings,
  auditoria: ShieldCheck,
};

export function SidebarNav({
  mods, counts, colapsado, onNavegar,
}: {
  mods: NavMod[];
  counts: Record<string, number>;
  colapsado?: boolean;
  onNavegar?: () => void;
}) {
  const path = usePathname();
  return (
    <nav aria-label="Módulos" className="flex flex-col gap-3">
      <SidebarLink href="/" label="Inicio" icon={LayoutDashboard} activo={path === '/'} colapsado={colapsado} onNavegar={onNavegar} />
      {GRUPOS.map((g) => {
        const items = mods.filter((m) => m.grupo === g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            {!colapsado && (
              <p className="lbl-mono px-3 !text-[#8fb5a5]">{g}</p>
            )}
            {items.map((m) => (
              <SidebarLink
                key={m.key}
                href={m.href}
                label={m.label}
                icon={ICONOS[m.key]}
                activo={path === m.href || path.startsWith(m.href + '/')}
                colapsado={colapsado}
                insignia={counts[m.key] ?? 0}
                onNavegar={onNavegar}
              />
            ))}
          </div>
        );
      })}
      <div>
        {!colapsado && <p className="lbl-mono px-3 !text-[#8fb5a5]">Web</p>}
        <SidebarLink href="/web" label="Web pública" icon={Globe} activo={false} colapsado={colapsado} onNavegar={onNavegar} externa />
      </div>
    </nav>
  );
}

function SidebarLink({ href, label, icon: Icon, activo, colapsado, insignia, onNavegar, externa }: {
  href: string; label: string; icon: React.ComponentType<{ className?: string }>;
  activo: boolean; colapsado?: boolean; insignia?: number; onNavegar?: () => void; externa?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavegar}
      aria-current={activo ? 'page' : undefined}
      title={colapsado ? label : undefined}
      {...(externa ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        activo
          ? 'bg-[#e8fe85] font-bold text-[#053d30]'
          : 'text-white/90 hover:bg-white/10 hover:text-white'
      } ${colapsado ? 'justify-center px-2' : ''}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!colapsado && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!colapsado && (insignia ?? 0) > 0 && (
        <span className={`tnum rounded-full px-1.5 py-0.5 text-[11px] font-bold ${activo ? 'bg-[#053d30] text-[#e8fe85]' : 'bg-red-500 text-white'}`}>
          {insignia}
        </span>
      )}
      {!colapsado && externa && <ChevronDown className="h-3 w-3 -rotate-90 opacity-50" />}
    </Link>
  );
}
