import { queryLocal } from '@/lib/db-local';

// GET /api/clientes/export -> CSV razon;cuit;tipo;condicion_iva
export async function GET() {
  const rows = await queryLocal<{ razon_social: string; cuit: string | null; tipo: string; condicion_iva: string }>(
    `select razon_social, cuit, tipo, condicion_iva from public.cliente order by razon_social`);
  const csv = 'razon_social;cuit;tipo;condicion_iva\n' +
    rows.map((r) => [r.razon_social, r.cuit ?? '', r.tipo, r.condicion_iva].join(';')).join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clientes.csv"' } });
}
