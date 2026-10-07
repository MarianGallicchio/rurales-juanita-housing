import { AppLayout } from '@/components/app-layout';
import { PageHero } from '@/components/ui-brand';
import { ComputoClient } from './computo-client';
import { SAMPLE_VIVIENDA_UNIFAMILIAR } from '@/lib/obra/proyecto-ejemplo';

export const dynamic = 'force-dynamic';

export default async function ComputoPage() {
  const { exigirRol } = await import('@/lib/sesion');
  const ses = await exigirRol(['Administrador', 'Ventas', 'Produccion', 'Compras']);
  return (
    <AppLayout rol={ses.rol} email={ses.email}>
      <div className="flex flex-col gap-3">
        <PageHero
          kicker="Obra Metrics · Cómputo y presupuesto AR"
          titulo="Cómputo métrico — 15 rubros"
          bajada="Base unificada: motor INDEC / CAMARCO / UOCRA + regiones + materiales. Auth y roles de Rurales Juanita. DB Supabase lista para configurar después (usa local por ahora)."
          vivo
        />
        <ComputoClient initialProject={SAMPLE_VIVIENDA_UNIFAMILIAR} />
      </div>
    </AppLayout>
  );
}
