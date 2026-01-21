import { unstable_cache } from 'next/cache';
import { obtenerDashboardInfo } from '@/lib/actions/cliente/dashboard.actions';
import { EventoResumenClient } from './components/EventoResumenClient';

interface EventoResumenPageProps {
  params: Promise<{ slug: string; clientId: string; eventId: string }>;
}

export default async function EventoResumenPage({ params }: EventoResumenPageProps) {
  const { slug, clientId, eventId } = await params;
  
  // Cachear dashboard info con tag para invalidación granular
  // ⚠️ CRÍTICO: Tag incluye eventId y clientId para aislamiento
  const getCachedDashboardInfo = unstable_cache(
    async () => {
      return obtenerDashboardInfo(eventId, clientId, slug);
    },
    ['cliente-dashboard', eventId, clientId, slug], // ✅ Incluye eventId, clientId y slug en keys
    {
      tags: [`cliente-dashboard-${eventId}-${clientId}`], // ✅ Tag granular por evento y cliente
      revalidate: false, // No cachear por tiempo, solo por tags
    }
  );

  const dashboardResult = await getCachedDashboardInfo();

  if (!dashboardResult.success || !dashboardResult.data) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-red-400">
            {dashboardResult.message || 'Error al cargar la información del dashboard'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <EventoResumenClient initialDashboardInfo={dashboardResult.data} />
  );
}
