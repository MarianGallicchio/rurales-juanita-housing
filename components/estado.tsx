import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Insignias de estado unificadas: siempre texto + color (nunca solo color).
const MAPA: Record<string, { label: string; clase: string }> = {
  borrador: { label: 'Borrador', clase: 'bg-slate-200 text-slate-800' },
  alquiler: { label: 'Alquiler', clase: 'bg-[#e8fe85] text-[#053d30]' },
  enviada: { label: 'Enviada', clase: 'bg-sky-200 text-sky-900' },
  aceptada: { label: 'Ganada', clase: 'bg-emerald-200 text-emerald-900' },
  rechazada: { label: 'Perdida', clase: 'bg-red-200 text-red-900' },
  vencida: { label: 'Vencida', clase: 'bg-amber-200 text-amber-900' },
  pendiente: { label: 'Pendiente', clase: 'bg-amber-200 text-amber-900' },
  en_produccion: { label: 'En producción', clase: 'bg-sky-200 text-sky-900' },
  completa: { label: 'Completa', clase: 'bg-emerald-200 text-emerald-900' },
  despachada: { label: 'Despachada', clase: 'bg-emerald-200 text-emerald-900' },
  cancelada: { label: 'Cancelada', clase: 'bg-slate-300 text-slate-800' },
  consulta: { label: 'Consulta', clase: 'bg-slate-200 text-slate-800' },
  cotizado: { label: 'Cotizado', clase: 'bg-sky-200 text-sky-900' },
  negociacion: { label: 'En negociación', clase: 'bg-amber-200 text-amber-900' },
  ganado: { label: 'Ganado', clase: 'bg-emerald-200 text-emerald-900' },
  perdido: { label: 'Perdido', clase: 'bg-red-200 text-red-900' },
  abierta: { label: 'Abierta', clase: 'bg-sky-200 text-sky-900' },
  cerrada: { label: 'Cerrada', clase: 'bg-slate-200 text-slate-800' },
  en_tramite: { label: 'En trámite', clase: 'bg-amber-200 text-amber-900' },
  aprobada: { label: 'Aprobada', clase: 'bg-emerald-200 text-emerald-900' },
  aprobado: { label: 'Aprobado', clase: 'bg-emerald-200 text-emerald-900' },
  borrador_cae: { label: 'Borrador', clase: 'bg-slate-200 text-slate-800' },
  cae_simulado: { label: 'CAE simulado', clase: 'bg-amber-200 text-amber-900' },
  rechazado: { label: 'Rechazado', clase: 'bg-red-200 text-red-900' },
};

export function Estado({ valor }: { valor: string }) {
  const e = MAPA[valor] ?? { label: valor.replace(/_/g, ' '), clase: 'bg-slate-200 text-slate-800' };
  return <Badge className={cn('tnum font-bold', e.clase)}>{e.label}</Badge>;
}
