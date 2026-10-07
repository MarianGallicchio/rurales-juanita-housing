import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/app-layout";
import { PageHero } from "@/components/ui-brand";
import { ROLES, type Rol } from "@/lib/roles";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

async function setRol(fd: FormData) {
  'use server';
  // Atajo dev local: cambia la sesión al perfil de ese rol (en nube manda el login).
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

const TARJETAS = [
  { t: "Cotizador", d: "Asistente 4 pasos, versiones y firma", href: "/cotizador" },
  { t: "CRM", d: "Kanban, homologaciones y leads", href: "/crm" },
  { t: "Producción", d: "Trazabilidad ISO 9001 por unidad", href: "/produccion" },
  { t: "Stock", d: "BOM, compras y conteo", href: "/stock" },
  { t: "Postventa", d: "Garantía y reclamos", href: "/postventa" },
  { t: "Panel", d: "Ventas, planta y calidad", href: "/panel" },
];

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
  const { Tarjeta } = await import('@/components/ui-brand');
  const contenido = (
    <div className="flex flex-col gap-3">
      <PageHero kicker="Panel de inicio" titulo={<>Hola, {perfil.rol} <em className="rj-gold">a producir</em></>}
        bajada="Elegí un módulo. El menú muestra solo lo que tu rol puede usar."
        accion={<><Link href="/web" className="rj-btn bg-white text-[#212529]">Ver web pública</Link><form action={salir}><button className="rj-btn border border-[#e8fe85] text-[#e8fe85]">Salir</button></form></>} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tarjeta titulo="Tareas urgentes" valor={String(tareas)} pie="Vencidas o vencen mañana" alerta={tareas > 0} tono={1} />
        <Tarjeta titulo="Márgenes por aprobar" valor={String(aprobs)} alerta={aprobs > 0} tono={2} />
        <Tarjeta titulo="Stock crítico" valor={String(crit)} alerta={crit > 0} tono={3} />
        <Tarjeta titulo="NC abiertas" valor={String(ncs)} alerta={ncs > 0} tono={0} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TARJETAS.map((c) => (
          <Link key={c.t} href={c.href} className="rj-card rj-tilt active:bg-[#f1efdf]">
            <p className="font-display text-xl font-medium">{c.t}</p>
            <p className="text-sm opacity-70">{c.d}</p>
          </Link>
        ))}
      </div>
      <form action={setRol} className="rj-card flex items-center gap-2">
        <span className="flex-1 text-sm">Probar otro rol (dev local):</span>
        <select name="rol" defaultValue={perfil?.rol} className="rounded-full border px-3 py-2 text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="rj-btn-primary">Ver</button>
      </form>
    </div>
  );

  return <AppLayout rol={perfil.rol} email={perfil.email}>{contenido}</AppLayout>;
}
