import { Shell } from '@/components/shell';
import { modulosParaRol, rolLabel, type Rol } from '@/lib/roles';

// Shell único del software interno. Los datos (contadores, USD, recientes) se
// consultan acá una sola vez en el servidor; la interacción vive en <Shell/>.
export async function AppLayout({ rol, email, nombre, children }: {
  rol: Rol;
  email?: string | null;
  nombre?: string | null;
  children: React.ReactNode;
}) {
  const mods = modulosParaRol(rol);
  let hud = { tc: '—', fecha: '', fuente: 'interno', tareas: 0, nc: 0, stock: 0, aprob: 0, caja: '—' };
  let recents = { cotizaciones: [], clientes: [], ops: [] } as {
    cotizaciones: { numero: string }[]; clientes: { razon: string }[]; ops: { numero: string }[];
  };
  try {
    const { queryLocal } = await import('@/lib/db-local');
    const tc = (await queryLocal<{ v: number; f: string; s: string }>(
      `select valor_ars_por_usd as v, fecha::text as f, fuente as s from public.tipo_cambio order by fecha desc limit 1`))[0];
    if (tc) { hud.tc = String(tc.v); hud.fecha = tc.f; hud.fuente = tc.s; }
    hud.tareas = (await queryLocal<{ n: number }>(
      `select count(*)::int n from public.tarea where completada_en is null and (vence_en is null or vence_en <= current_date + 7)`))[0]?.n ?? 0;
    hud.nc = (await queryLocal<{ n: number }>(`select count(*)::int n from public.no_conformidad where estado<>'cerrada'`))[0]?.n ?? 0;
    hud.stock = (await queryLocal<{ n: number }>(
      `select count(*)::int n from public.material m where (select coalesce(sum(case when tipo in ('entrada','ajuste') then cantidad when tipo in ('salida','reserva') then -cantidad else 0 end),0) from public.movimiento_stock s where s.material_id=m.id) < m.stock_minimo`))[0]?.n ?? 0;
    hud.aprob = (await queryLocal<{ n: number }>(`select count(*)::int n from public.cotizacion_aprobacion where estado='pendiente'`))[0]?.n ?? 0;
    try {
      const cj = (await queryLocal<{ s: number }>(
        `select coalesce((select saldo_inicial_ars from public.caja where estado='abierta' order by abierta_en desc limit 1),0)
         + coalesce((select sum(case when m.tipo='ingreso' then m.monto_ars else -m.monto_ars end) from public.caja_movimiento m join public.caja c on c.id=m.caja_id where c.estado='abierta'),0) as s`))[0]?.s;
      if (cj != null) hud.caja = String(Math.round(Number(cj)));
    } catch { /* sin tabla caja aún */ }
    recents.cotizaciones = await queryLocal<{ numero: string }>(`select numero from public.cotizacion order by creada_en desc limit 5`).catch((): { numero: string }[] => []);
    recents.clientes = await queryLocal<{ razon: string }>(`select razon_social as razon from public.cliente order by razon_social limit 5`).catch((): { razon: string }[] => []);
    recents.ops = await queryLocal<{ numero: string }>(`select numero from public.orden_produccion order by numero desc limit 5`).catch((): { numero: string }[] => []);
  } catch { /* sin base: shell vacío */ }
  const counts: Record<string, number> = {
    crm: hud.tareas, produccion: hud.nc, stock: hud.stock, cotizador: hud.aprob,
  };
  return (
    <Shell
      nombre={nombre ?? email ?? rolLabel(rol)}
      rolLabel={rolLabel(rol)}
      email={email}
      mods={mods}
      counts={counts}
      usd={{ valor: hud.tc, fecha: hud.fecha, fuente: hud.fuente }}
      recents={recents}
      tareasBadge={hud.tareas}
    >
      {children}
    </Shell>
  );
}
