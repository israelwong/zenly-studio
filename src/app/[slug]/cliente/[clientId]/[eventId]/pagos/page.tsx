import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { obtenerPagosEvento, obtenerInfoBancariaStudio, obtenerEventoDetalle, obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import { EventoPagosClient } from './components/EventoPagosClient';
import { getClienteSession } from '@/lib/actions/cliente';

interface EventoPagosPageProps {
  params: Promise<{ slug: string; clientId: string; eventId: string }>;
}

export async function generateMetadata({ params }: EventoPagosPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const studioInfo = await obtenerStudioPublicInfo(slug);

    if (!studioInfo) {
      return {
        title: 'Pagos',
        description: 'Pagos del evento',
      };
    }

    const baseTitle = studioInfo.studio_name || 'Zenly Studio';
    const title = `Pagos - ${baseTitle}`;
    const description = `Pagos del evento - ${baseTitle}`;

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
      title: 'Pagos',
      description: 'Pagos del evento',
    };
  }
}

export default async function EventoPagosPage({ params }: EventoPagosPageProps) {
  const { slug, clientId, eventId } = await params;

  // Autenticación en servidor
  const cliente = await getClienteSession();
  if (!cliente || clientId !== cliente.id) {
    return null;
  }

  // Cachear datos con tags para invalidación granular
  // ⚠️ CRÍTICO: Tags incluyen eventId y clientId para aislamiento
  const getCachedPagos = unstable_cache(
    async () => {
      return obtenerPagosEvento(eventId, clientId);
    },
    ['cliente-pagos', eventId, clientId],
    {
      tags: [`cliente-pagos-${eventId}-${clientId}`],
      revalidate: false,
    }
  );

  const getCachedBankInfo = unstable_cache(
    async () => {
      return obtenerInfoBancariaStudio(cliente.studio_id);
    },
    ['cliente-bank-info', cliente.studio_id],
    {
      tags: [`cliente-bank-info-${cliente.studio_id}`],
      revalidate: 3600, // Info bancaria cambia poco
    }
  );

  const getCachedEvento = unstable_cache(
    async () => {
      return obtenerEventoDetalle(eventId, clientId);
    },
    ['cliente-evento', eventId, clientId],
    {
      tags: [`cliente-evento-${eventId}-${clientId}`],
      revalidate: false,
    }
  );

  // Cargar datos en paralelo
  const [pagosResponse, bankResponse, eventoResponse] = await Promise.all([
    getCachedPagos(),
    getCachedBankInfo(),
    getCachedEvento(),
  ]);

  if (!pagosResponse.success || !pagosResponse.data) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-red-400">
            {pagosResponse.message || 'Error al cargar los pagos'}
          </p>
        </div>
      </div>
    );
  }

  if (!eventoResponse.success || !eventoResponse.data) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-red-400">
            {eventoResponse.message || 'Error al cargar la información del evento'}
          </p>
        </div>
      </div>
    );
  }

  const balance = {
    total: eventoResponse.data.total,
    pagado: eventoResponse.data.pagado,
    pendiente: eventoResponse.data.pendiente,
    descuento: eventoResponse.data.descuento,
  };

  return (
    <EventoPagosClient
      initialPagos={pagosResponse.data}
      initialBankInfo={bankResponse.success ? bankResponse.data || null : null}
      initialBalance={balance}
    />
  );
}
