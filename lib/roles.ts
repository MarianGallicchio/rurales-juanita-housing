export type Rol = 'Administrador' | 'Ventas' | 'Produccion' | 'Compras' | 'Postventa';

export const ROLES: Rol[] = ['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'];

export type Modulo =
  | 'panel' | 'cotizador' | 'crm' | 'computo' | 'caja'
  | 'catalogo' | 'produccion' | 'stock'
  | 'postventa' | 'facturacion' | 'fichas'
  | 'usuarios' | 'config' | 'auditoria';

export type Grupo = 'Operar' | 'Producir' | 'Cuidar' | 'Sistema';

export const MODULOS: { key: Modulo; label: string; href: string; grupo: Grupo; roles: Rol[] }[] = [
  // Operar — vender y presupuestar
  { key: 'panel', label: 'Panel', href: '/panel', grupo: 'Operar', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'] },
  { key: 'cotizador', label: 'Cotizador', href: '/cotizador', grupo: 'Operar', roles: ['Administrador', 'Ventas'] },
  { key: 'crm', label: 'CRM', href: '/crm', grupo: 'Operar', roles: ['Administrador', 'Ventas', 'Postventa'] },
  { key: 'computo', label: 'Cómputo', href: '/computo', grupo: 'Operar', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras'] },
  { key: 'caja', label: 'Caja', href: '/caja', grupo: 'Operar', roles: ['Administrador', 'Ventas', 'Compras'] },
  // Producir — fabricar
  { key: 'catalogo', label: 'Catálogo', href: '/catalogo', grupo: 'Producir', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras'] },
  { key: 'produccion', label: 'Producción', href: '/produccion', grupo: 'Producir', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'] },
  { key: 'stock', label: 'Stock', href: '/stock', grupo: 'Producir', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras'] },
  // Cuidar — entregar, cobrar, respaldar
  { key: 'postventa', label: 'Postventa', href: '/postventa', grupo: 'Cuidar', roles: ['Administrador', 'Ventas', 'Produccion', 'Postventa'] },
  { key: 'facturacion', label: 'Facturación ARCA', href: '/facturacion', grupo: 'Cuidar', roles: ['Administrador'] },
  { key: 'fichas', label: 'Fichas técnicas', href: '/fichas', grupo: 'Cuidar', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'] },
  // Sistema — administrar
  { key: 'usuarios', label: 'Usuarios', href: '/usuarios', grupo: 'Sistema', roles: ['Administrador'] },
  { key: 'config', label: 'Configuración', href: '/config', grupo: 'Sistema', roles: ['Administrador'] },
  { key: 'auditoria', label: 'Auditoría', href: '/auditoria', grupo: 'Sistema', roles: ['Administrador'] },
];

export const GRUPOS: Grupo[] = ['Operar', 'Producir', 'Cuidar', 'Sistema'];

// Etiquetas visibles por rol (el enum de BD no se toca). Mapeo aprobado en Fase 0:
// Administrador→Dirección · Produccion→Planta · Compras→Administración.
export const ROLE_LABELS: Record<Rol, string> = {
  Administrador: 'Dirección',
  Ventas: 'Ventas',
  Produccion: 'Planta',
  Compras: 'Administración',
  Postventa: 'Postventa',
};

export function rolLabel(rol?: Rol | null): string {
  if (!rol) return '—';
  return ROLE_LABELS[rol] ?? rol;
}

export function modulosParaRol(rol?: Rol | null) {
  if (!rol) return [];
  if (rol === 'Administrador') return MODULOS;
  return MODULOS.filter((m) => m.roles.includes(rol));
}

export function puedeVer(rol: Rol, modulo: Modulo): boolean {
  return modulosParaRol(rol).some((m) => m.key === modulo);
}
