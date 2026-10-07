import { AppLayout } from '@/components/app-layout';
import { PageHero } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function cambiarRol(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const rol = String(fd.get('rol') ?? '');
  const activo = String(fd.get('activo') ?? 'true') === 'true';
  if (!['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'].includes(rol)) return;
  await queryLocal(`update public.perfiles set rol=$2::rol_usuario, activo=$3 where id=$1`, [id, rol, activo]);
  await auditLocal('perfiles', id, 'modificacion', { rol, activo });
  redirect('/usuarios');
}

async function cambiarPin(fd: FormData) {
  'use server';
  const { queryLocal, auditLocal } = await import('@/lib/db-local');
  const { hashPin } = await import('@/lib/sesion');
  const { redirect } = await import('next/navigation');
  const id = String(fd.get('id') ?? '');
  const pin = String(fd.get('pin') ?? '');
  if (!id || !/^\d{4,8}$/.test(pin)) return;
  await queryLocal(`update public.perfiles set pin_hash=$2 where id=$1`, [id, hashPin(pin)]);
  await auditLocal('perfiles', id, 'modificacion', { pin: 'cambiado' });
  redirect('/usuarios');
}

export default async function Usuarios() {
  const users = await queryLocal<{ id: string; email: string; nombre: string; rol: string; activo: boolean }>(
    `select id, email, nombre, rol::text as rol, activo from public.perfiles order by rol`);
  const matriz = await queryLocal<{ rol: string; modulo: string; v: boolean; c: boolean; e: boolean; b: boolean }>(
    `select rol::text as rol, modulo, puede_ver as v, puede_crear as c, puede_editar as e, puede_borrar as b from public.roles_permisos order by rol, modulo`);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 0 · Mínimo privilegio" titulo="Usuarios y permisos"
          bajada="Cada rol ve y hace solo lo que necesita. Solo Administrador entra acá." />
        {users.map((u) => (
          <form key={u.id} action={cambiarRol} className="rj-card flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={u.id} />
            <span className="min-w-40 flex-1 text-sm"><b>{u.email}</b> · {u.nombre} {u.activo ? '' : '· INACTIVO'}</span>
            <select name="rol" defaultValue={u.rol} className="rounded-xl border px-2 py-2 text-sm">
              {['Administrador', 'Ventas', 'Produccion', 'Compras', 'Postventa'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select name="activo" defaultValue={String(u.activo)} className="rounded-xl border px-2 py-2 text-sm">
              <option value="true">activo</option><option value="false">inactivo</option>
            </select>
            <button className="rj-btn-primary">Guardar</button>
          </form>
        ))}
        <form action={cambiarPin} className="rj-card">
          <p className="text-sm font-black">Cambiar PIN (4–8 dígitos, solo local)</p>
          <div className="mt-1 flex gap-2">
            <select name="id" className="rj-input">{users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}</select>
            <input name="pin" inputMode="numeric" placeholder="Nuevo PIN" className="rj-input" required />
            <button className="rj-btn-accent">Cambiar</button>
          </div>
        </form>
        <div className="rj-card">
          <p className="text-sm font-black">Matriz de permisos (lectura; se edita en base)</p>
          <div className="mt-1 grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
            {matriz.map((m, i) => <p key={i}>· <b>{m.rol}</b>/{m.modulo}: {m.v ? 'ver' : '—'} {m.c ? '+crear' : ''} {m.e ? '+editar' : ''} {m.b ? '+borrar' : ''}</p>)}
          </div>
          <Link href="/auditoria" className="mt-2 inline-block text-sm underline">Ver auditoría →</Link>
        </div>
      </div>
    </AppLayout>
  );
}
