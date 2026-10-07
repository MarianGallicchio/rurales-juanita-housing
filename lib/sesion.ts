import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { queryLocal } from './db-local';
import type { Rol } from './roles';

const SAL = 'rj-local-9dejulio';

// PIN simple para base local (dev). En nube manda Supabase Auth.
export function hashPin(pin: string): string {
  return createHash('sha256').update(`${SAL}:${pin.trim()}`).digest('hex');
}

export async function sesionLocal(): Promise<{ id: string; rol: Rol; email: string } | null> {
  const id = (await cookies()).get('sesion_local')?.value;
  if (!id) return null;
  try {
    const rows = await queryLocal<{ id: string; rol: Rol; email: string }>(
      `select id, rol::text as rol, email from public.perfiles where id=$1 and activo=true`, [id]
    );
    return rows[0] ?? null;
  } catch { return null; }
}

export async function exigirRol(roles: Rol[]): Promise<{ id: string; rol: Rol; email: string }> {
  const s = await sesionLocal();
  const { redirect } = await import('next/navigation');
  if (!s) redirect('/ingresar');
  const ses = s as { id: string; rol: Rol; email: string };
  if (!roles.includes(ses.rol)) redirect('/');
  return ses;
}
