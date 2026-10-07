// Formato Argentina: DD/MM/AAAA, $ ARS con punto miles / coma decimal, USD con código.
// Zona horaria: America/Argentina/Buenos_Aires. No usar toLocaleString sin locale.

export const TZ_AR = 'America/Argentina/Buenos_Aires';

export function fmtFechaAR(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ_AR }).format(dt);
}

export function fmtFechaHoraAR(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ_AR }).format(dt);
}

export function fmtUSD(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return 'USD —';
  return `USD ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

export function fmtARS(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return 'ARS —';
  return `$ ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;
}

// Cálculo cotizador (misma fórmula que SQL/DB debe respetar). Redondeo al final.
export function calcularTotales(args: { materiales: number; manoObra: number; margenPct: number; fleteUsd: number; ivaPct: number; tipoCambio: number }) {
  const costo = args.materiales + args.manoObra;
  const sinFlete = costo * (1 + args.margenPct / 100);
  const subtotal = sinFlete + args.fleteUsd;
  const totalUsd = Math.round(subtotal * (1 + args.ivaPct / 100) * 100) / 100;
  const totalArs = Math.round(totalUsd * args.tipoCambio);
  return { costo, sinFlete, subtotal, totalUsd, totalArs };
}

export function tcVencido(fechaTc?: string | Date | null, maxHoras = 24): boolean {
  if (!fechaTc) return true;
  const ms = Date.now() - new Date(fechaTc).getTime();
  return ms > maxHoras * 3600 * 1000;
}
