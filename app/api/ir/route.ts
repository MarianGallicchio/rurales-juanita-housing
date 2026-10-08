import { queryLocal } from '@/lib/db-local';

// GET /api/ir?q=COT-2026-0001 -> { url } — resuelve códigos a su pantalla de detalle.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return Response.json({ url: null });
  const upper = q.toUpperCase();
  if (upper.startsWith('COT-')) {
    const r = await queryLocal<{ id: string }>(`select id from public.cotizacion where numero ilike $1 limit 1`, [upper + '%']);
    if (r[0]) return Response.json({ url: `/cotizador/${r[0].id}` });
  }
  if (upper.startsWith('OP-')) {
    const r = await queryLocal<{ id: string }>(`select id from public.orden_produccion where numero ilike $1 limit 1`, [upper + '%']);
    if (r[0]) return Response.json({ url: `/produccion?op=${r[0].id}` });
  }
  if (upper.startsWith('RJ-') || upper.startsWith('FAC-')) {
    const u = await queryLocal<{ orden_id: string }>(`select orden_id from public.unidad where numero_serie ilike $1 limit 1`, [upper + '%']);
    if (u[0]) return Response.json({ url: `/produccion?op=${u[0].orden_id}` });
    const f = await queryLocal<{ id: string }>(`select id from public.comprobante where numero ilike $1 limit 1`, [upper + '%']);
    if (f[0]) return Response.json({ url: `/facturacion/${f[0].id}` });
  }
  if (/^\d{10,11}$/.test(q.replace(/\D/g, ''))) {
    const c = await queryLocal<{ id: string }>(`select id from public.cliente where regexp_replace(cuit,'\\D','','g') like '%' || $1 || '%' limit 1`, [q.replace(/\D/g, '')]);
    if (c[0]) return Response.json({ url: `/crm?cliente=${c[0].id}` });
  }
  const cli = await queryLocal<{ id: string }>(`select id from public.cliente where razon_social ilike '%' || $1 || '%' limit 1`, [q]);
  if (cli[0]) return Response.json({ url: `/crm?cliente=${cli[0].id}` });
  return Response.json({ url: null });
}
