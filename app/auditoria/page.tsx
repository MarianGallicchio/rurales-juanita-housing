import { AppLayout } from '@/components/app-layout';
import { PageHero } from '@/components/ui-brand';
import { queryLocal } from '@/lib/db-local';
import { fmtFechaHoraAR } from '@/lib/formato-ar';

export const dynamic = 'force-dynamic';

export default async function Auditoria() {
  const rows = await queryLocal<{ email: string | null; entidad: string; entidad_id: string; accion: string; fecha: string }>(
    `select p.email, a.entidad, a.entidad_id, a.accion::text as accion, a.fecha_hora as fecha
     from public.registro_auditoria a left join public.perfiles p on p.id=a.usuario_id
     order by a.fecha_hora desc limit 100`);
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero kicker="Fase 0 · Solo inserción" titulo="Auditoría"
          bajada="Quién hizo qué y cuándo. Nadie puede editar ni borrar estos registros (ISO 9001)." />
        <div className="rj-card">
          {rows.length === 0 && <p className="text-sm opacity-60">Sin movimientos todavía. Creá una cotización o un movimiento de stock.</p>}
          {rows.map((r, i) => (
            <p key={i} className="border-b py-1 text-xs">
              <b>{r.accion}</b> {r.entidad} <span className="opacity-60">{r.entidad_id.slice(0, 8)}</span> · {r.email ?? 'sistema'} · {fmtFechaHoraAR(r.fecha)}
            </p>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
