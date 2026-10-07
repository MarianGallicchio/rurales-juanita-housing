import { queryLocal } from '@/lib/db-local';

// GET /api/panel/export?desde=&hasta= -> CSV ventas por línea (estilo DUX: Excel-compatible con ;)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const conds: string[] = [];
  const vals: unknown[] = [];
  if (u.searchParams.get('desde')) { vals.push(u.searchParams.get('desde')); conds.push(`c.creada_en >= $${vals.length}`); }
  if (u.searchParams.get('hasta')) { vals.push(u.searchParams.get('hasta')); conds.push(`c.creada_en <= $${vals.length}::date + interval '1 day'`); }
  const w = conds.length ? `where ${conds.join(' and ')}` : '';
  const rows = await queryLocal<{ linea: string; n: number; total: number }>(
    `select cat.nombre as linea, count(distinct c.id)::int as n, coalesce(sum(c.total_usd),0) as total
     from public.cotizacion c join public.cotizacion_item i on i.cotizacion_id=c.id
     join public.modelo m on m.id=i.modelo_id join public.categoria cat on cat.id=m.categoria_id ${w} group by cat.nombre order by total desc`, vals);
  const csv = 'linea;cotizaciones;total_usd\n' + rows.map((r) => [r.linea, r.n, r.total].join(';')).join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ventas-por-linea.csv"' } });
}
