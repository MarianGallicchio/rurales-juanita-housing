import { queryLocal } from '@/lib/db-local';
import { hashPin } from '@/lib/sesion';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function entrar(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const { hashPin } = await import('@/lib/sesion');
  const { cookies } = await import('next/headers');
  const { redirect } = await import('next/navigation');
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const pin = String(fd.get('pin') ?? '');
  const p = (await queryLocal<{ id: string; pin_hash: string | null }>(`select id, pin_hash from public.perfiles where lower(email)=$1 and activo=true`, [email]))[0];
  if (!p || p.pin_hash !== hashPin(pin)) redirect('/ingresar?error=1');
  (await cookies()).set('sesion_local', p.id, { path: '/', maxAge: 60 * 60 * 12, httpOnly: true, sameSite: 'lax' });
  redirect('/');
}

async function salir() {
  'use server';
  const { cookies } = await import('next/headers');
  const { redirect } = await import('next/navigation');
  (await cookies()).delete('sesion_local');
  redirect('/ingresar');
}

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const mails = await queryLocal<{ email: string }>(`select email from public.perfiles where activo=true order by rol`).catch(() => []);
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center bg-[#f1efdf] p-4">
      <div className="w-full">
        <div className="text-center">
          <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-[#e8fe85] text-2xl font-black text-[#053d30]">RJ</span>
          <h1 className="mt-2 font-display text-3xl font-medium">Rurales Juanita</h1>
          <p className="font-mono2 text-[11px] uppercase tracking-[.18em] text-[#07503f]">Sistema interno · 9 de Julio</p>
        </div>
        <form action={entrar} className="rj-card mt-4 grid gap-2">
          {sp.error && <p className="rounded-2xl bg-red-100 p-2 text-sm font-bold">Email o PIN incorrectos.</p>}
          <input name="email" type="email" list="mails" placeholder="Email *" className="rj-input" required />
          <datalist id="mails">{mails.map((m) => <option key={m.email} value={m.email} />)}</datalist>
          <input name="pin" type="password" inputMode="numeric" placeholder="PIN (4 dígitos) *" className="rj-input" required />
          <button className="rj-btn-primary">Entrar</button>
          <p className="text-xs opacity-60">PIN inicial de todos: <b>1234</b>. Cambialo en Usuarios.</p>
        </form>
        <form action={salir} className="mt-2 text-center"><button className="text-xs underline">Cerrar sesión</button></form>
        <p className="mt-2 text-center text-xs opacity-60"><Link href="/web" className="underline">← Web pública</Link></p>
      </div>
    </main>
  );
}
