export type Rol = 'Administrador' | 'Ventas' | 'Produccion' | 'Compras' | 'Postventa';

export const ROLES: Rol[] = ['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'];

export type Modulo = 'catalogo' | 'cotizador' | 'crm' | 'produccion' | 'stock' | 'web' | 'postventa' | 'panel' | 'usuarios' | 'config';

export const MODULOS: { key: Modulo; label: string; href: string; roles: Rol[] }[] = [
  { key: 'catalogo', label: 'Catálogo', href: '/catalogo', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras'] },
  { key: 'cotizador', label: 'Cotizador', href: '/cotizador', roles: ['Administrador', 'Ventas'] },
  { key: 'crm', label: 'CRM', href: '/crm', roles: ['Administrador', 'Ventas', 'Postventa'] },
  { key: 'produccion', label: 'Producción', href: '/produccion', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'] },
  { key: 'stock', label: 'Stock', href: '/stock', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras'] },
  { key: 'postventa', label: 'Postventa', href: '/postventa', roles: ['Administrador', 'Ventas', 'Produccion', 'Postventa'] },
  { key: 'panel', label: 'Panel', href: '/panel', roles: ['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'] },
];

export function modulosParaRol(rol?: Rol | null) {
  if (!rol) return [];
  if (rol === 'Administrador') return MODULOS;
  return MODULOS.filter((m) => m.roles.includes(rol));
}

export function puedeVer(rol: Rol, modulo: Modulo): boolean {
  return modulosParaRol(rol).some((m) => m.key === modulo);
}
