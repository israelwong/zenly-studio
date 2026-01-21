import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { obtenerEntregablesCliente } from '@/lib/actions/cliente/deliverables.actions';
import { obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import { EntregaDigitalClient } from './components/EntregaDigitalClient';

interface EntregaDigitalPageProps {
  params: Promise<{ slug: string; clientId: string; eventId: string }>;
}

export async function generateMetadata({ params }: EntregaDigitalPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const studioInfo = await obtenerStudioPublicInfo(slug);

    if (!studioInfo) {
      return {
        title: 'Entrega Digital',
        description: 'Entrega digital del evento',
      };
    }

    const baseTitle = studioInfo.studio_name || 'Zenly Studio';
    const title = `Entrega Digital - ${baseTitle}`;
    const description = `Entrega digital del evento - ${baseTitle}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Entrega Digital',
      description: 'Entrega digital del evento',
    };
  }
}

export default async function EntregaDigitalPage({ params }: EntregaDigitalPageProps) {
  const { eventId, clientId } = await params;

  // Cachear entregables con tag para invalidación granular
  // ⚠️ CRÍTICO: Tag incluye eventId y clientId para aislamiento
  const getCachedEntregables = unstable_cache(
    async () => {
      return obtenerEntregablesCliente(eventId, clientId);
    },
    ['cliente-entregables', eventId, clientId], // ✅ Incluye eventId y clientId en keys
    {
      tags: [`cliente-entregables-${eventId}-${clientId}`], // ✅ Tag granular por evento y cliente
      revalidate: false, // No cachear por tiempo, solo por tags
    }
  );

  const entregablesResult = await getCachedEntregables();

  if (!entregablesResult.success || !entregablesResult.data) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-red-400">
            {entregablesResult.error || 'Error al cargar los entregables'}
          </p>
        </div>
      </div>
    );
  }

  return <EntregaDigitalClient initialEntregables={entregablesResult.data} />;
}
