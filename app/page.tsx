import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/app-layout";
import { GRUPOS, modulosParaRol, ROLES, type Rol } from "@/lib/roles";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

async function setRol(fd: FormData) {
  'use server';
  const { queryLocal } = await import('@/lib/db-local');
  const rol = String(fd.get('rol') ?? 'Ventas');
  const p = (await queryLocal<{ id: string }>(`select id from public.perfiles where rol=$1::rol_usuario limit 1`, [rol]))[0];
  if (p) (await cookies()).set('sesion_local', p.id, { path: '/', maxAge: 60 * 60 * 12, httpOnly: true, sameSite: 'lax' });
  redirect('/');
}

async function getPerfil() {
  const useLocal = process.env.USE_LOCAL_DB === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http");
  if (useLocal) {
    const { sesionLocal } = await import('@/lib/sesion');
    return sesionLocal();
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("perfiles").select("rol,email").eq("id", user.id).single();
    return (data as { rol: Rol; email: string; id: string } | null) ?? null;
  } catch {
    return null;
  }
}

const DESCRIPCIONES: Record<string, string> = {
  panel: 'Ventas, planta y calidad',
  cotizador: 'Asistente 4 pasos, versiones y firma',
  crm: 'Kanban, homologaciones y leads',
  computo: 'Cómputo 15 rubros + INDEC/CAMARCO/UOCRA',
  caja: 'Caja diaria, cobros y arqueo',
  catalogo: 'Modelos, fotos reales y fichas',
  produccion: 'Trazabilidad ISO 9001 por unidad',
  stock: 'BOM, compras y conteo',
  postventa: 'Garantía y reclamos',
  facturacion: 'Comprobantes ARCA con CAE',
  fichas: '6 líneas técnicas corregidas',
  usuarios: 'Perfiles, roles y PIN',
  config: 'Dólar, IVA y márgenes',
  auditoria: 'Registro inmutable',
};

async function salir() {
  'use server';
  const { cookies } = await import('next/headers');
  const { redirect } = await import('next/navigation');
  (await cookies()).delete('sesion_local');
  redirect('/ingresar');
}

export default async function Home() {
  const perfil = await getPerfil();
  if (!perfil) redirect('/ingresar');
  const { queryLocal } = await import('@/lib/db-local');
  const tareas = (await queryLocal<{ n: number }>(`select count(*)::int n from public.tarea where completada_en is null and vence_en <= current_date + 1`))[0]?.n ?? 0;
  const aprobs = (await queryLocal<{ n: number }>(`select count(*)::int n from public.cotizacion_aprobacion where estado='pendiente'`))[0]?.n ?? 0;
  const crit = (await queryLocal<{ n: number }>(
    `select count(*)::int n from public.material m where (select coalesce(sum(case when tipo in ('entrada','ajuste') then cantidad when tipo in ('salida','reserva') then -cantidad else 0 end),0) from public.movimiento_stock s where s.material_id=m.id) < m.stock_minimo`))[0]?.n ?? 0;
  const ncs = (await queryLocal<{ n: number }>(`select count(*)::int n from public.no_conformidad where estado<>'cerrada'`))[0]?.n ?? 0;
  const pend = await queryLocal<{ titulo: string; vence: string }>(
    `select titulo, vence_en as vence from public.tarea where completada_en is null order by vence_en nulls last limit 5`).catch(() => []);
  const { Tarjeta } = await import('@/components/ui-brand');
  const mods = modulosParaRol(perfil.rol);
  return (
    <AppLayout rol={perfil.rol} email={perfil.email}>
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#07503f] via-[#07503f] to-[#053d30] text-white">
          <div className="vector-dots-ondark pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative p-5 md:p-7">
            <p className="rj-eyebrow rj-eyebrow-ondark">Centro de comando · {perfil.rol}</p>
            <h1 className="hero-legible mt-2 text-3xl font-medium leading-tight">Hola, {perfil.rol}: <span className="text-[#e8fe85]">todo el software en un solo lugar.</span></h1>
            <p className="hero-pill hero-legible mt-2 max-w-[62ch] rounded-xl p-2 text-sm text-white">Operá, producí y cuidá sin salir de acá. Abajo tenés cada función agrupada según tu rol.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/cotizador" className="rj-btn bg-[#e8fe85] font-bold text-[#053d30]">+ Nueva cotización</Link>
              <Link href="/computo" className="rj-btn collage-sticker bg-white font-bold text-[#053d30]">Cómputo ✂</Link>
              <Link href="/web" className="rj-btn border border-white/60 font-bold text-white">Ver web pública</Link>
              <form action={salir}><button className="rj-btn border border-dashed border-[#e8fe85] font-bold text-[#e8fe85]">Salir</button></form>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Tarjeta titulo="Tareas urgentes" valor={String(tareas)} pie="Vencidas o vencen mañana" alerta={tareas > 0} tono={1} />
          <Tarjeta titulo="Márgenes por aprobar" valor={String(aprobs)} alerta={aprobs > 0} tono={2} />
          <Tarjeta titulo="Stock crítico" valor={String(crit)} alerta={crit > 0} tono={3} />
          <Tarjeta titulo="NC abiertas" valor={String(ncs)} alerta={ncs > 0} tono={0} />
        </div>

        {GRUPOS.map((g) => {
          const items = mods.filter((m) => m.grupo === g);
          if (items.length === 0) return null;
          return (
            <section key={g} className="rj-card">
              <div className="flex items-center gap-2">
                <span className="collage-caption">{g}</span>
                <p className="font-display text-xl font-medium">
                  {g === 'Operar' ? 'Vender y presupuestar' : g === 'Producir' ? 'Fabricar' : g === 'Cuidar' ? 'Entregar y cobrar' : 'Administrar'}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => (
                  <Link key={m.key} href={m.href} className="rj-tilt rounded-2xl border border-[#07503f]/15 bg-[#f1efdf] p-3 hover:bg-white">
                    <p className="font-display text-lg font-medium text-[#07503f]">{m.label}</p>
                    <p className="text-sm text-[#3f3f46]">{DESCRIPCIONES[m.key] ?? m.href}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <div className="rj-card">
          <p className="font-display text-xl font-medium">Pendientes próximos</p>
          {pend.length === 0 ? (
            <p className="mt-1 text-sm text-[#3f3f46]">Sin tareas pendientes. Buen momento para cotizar.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {pend.map((t, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-dashed border-[#07503f]/20 py-1">
                  <span className="text-[#212529]">{t.titulo}</span>
                  <span className="font-mono2 text-[11px] uppercase text-[#07503f]">{t.vence ?? 'sin fecha'}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/crm" className="mt-2 inline-block rounded-full bg-[#07503f] px-4 py-2 font-mono2 text-[11px] uppercase tracking-widest text-white">Ir al CRM →</Link>
        </div>

        <form action={setRol} className="rj-card flex items-center gap-2">
          <span className="flex-1 text-sm text-[#3f3f46]">Probar otro rol (dev local):</span>
          <select name="rol" defaultValue={perfil?.rol} className="rounded-full border px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="rj-btn-primary">Ver</button>
        </form>
      </div>
    </AppLayout>
  );
}
