import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/clientes?q=pluspetrol|3012345 — busca por razón social o CUIT, sugiere Factura A/B.
export async function GET(req: Request) {
  try {
    const { queryLocal } = await import('@/lib/db-local');
    const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
    const digits = q.replace(/\D/g, '');
    let rows: { id: string; razon_social: string; cuit: string | null; condicion_iva: string }[] = [];
    if (q.length >= 2) {
      const conds = [`razon_social ilike $1`];
      const vals: string[] = [`%${q}%`];
      if (digits.length >= 2) { conds.push(`regexp_replace(coalesce(cuit,''), '\\D', '', 'g') like $2`); vals.push(`%${digits}%`); }
      rows = await queryLocal(
        `select id, razon_social, cuit, condicion_iva from public.cliente where ${conds.join(' or ')} order by razon_social limit 10`, vals
      );
    }
    return NextResponse.json(rows.map((r) => ({
      ...r,
      tipo_sugerido: r.condicion_iva === 'Responsable Inscripto' ? 'A' : 'B',
    })));
  } catch (e) {
    const path = await import('node:path');
    let tablas = '?';
    try {
      const { queryLocal: q2 } = await import('@/lib/db-local');
      tablas = JSON.stringify((await q2<{ tablename: string }>(`select tablename from pg_tables where schemaname='public' order by 1`)).map((r) => r.tablename));
    } catch (e2) { tablas = 'list-fail:' + String(e2).slice(0, 120); }
    return NextResponse.json({ error: String(e).slice(0, 300), cwd: process.cwd(), tablas }, { status: 500 });
  }
}
