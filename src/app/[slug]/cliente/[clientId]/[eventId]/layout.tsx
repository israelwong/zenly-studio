import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getClienteSession, obtenerEventoDetalle, obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import { ZenSidebarProvider } from '@/components/ui/zen';
import { ClientLayoutWrapper } from '../components/ClientLayoutWrapper';
import { EventoLayoutClient } from './components/EventoLayoutClient';
import type { ClientEventDetail } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/cliente';

interface EventoLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; clientId: string; eventId: string }>;
}

export default async function EventoLayout({ children, params }: EventoLayoutProps) {
  const { slug, clientId, eventId } = await params;

  // Autenticación en servidor
  const cliente = await getClienteSession();

  if (!cliente) {
    redirect(`/${slug}/cliente/login`);
  }

  // Verificar que el clientId coincida con el cliente autenticado
  if (clientId !== cliente.id) {
    redirect(`/${slug}/cliente/${cliente.id}`);
  }

  // Verificar si eventId es un event_id (studio_events) o promise_id (studio_promises)
  const { prisma } = await import('@/lib/prisma');

  // Primero intentar como event_id (studio_events)
  const event = await prisma.studio_events.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      promise_id: true,
      contact_id: true,
    },
  });

  let promiseId = eventId; // Por defecto asumir que es promise_id

  if (event) {
    // Es un event_id, usar el promise_id asociado
    if (event.contact_id !== cliente.id) {
      redirect(`/${slug}/cliente/${clientId}`);
    }
    promiseId = event.promise_id;
  } else {
    // No es event_id, verificar que sea promise_id válido
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: eventId,
        contact_id: cliente.id,
      },
      select: { id: true },
    });

    if (!promise) {
      redirect(`/${slug}/cliente/${clientId}`);
    }
  }

  // Cargar datos en paralelo (memoizados con React.cache)
  const [eventoResponse, studioInfo] = await Promise.all([
    obtenerEventoDetalle(promiseId, cliente.id),
    obtenerStudioPublicInfo(slug),
  ]);

  // Si no se encuentra el evento completo, redirigir al dashboard del cliente
  // Esto evita loops infinitos cuando el evento no tiene cotizaciones aprobadas
  if (!eventoResponse.success || !eventoResponse.data) {
    redirect(`/${slug}/cliente/${clientId}`);
  }

  const evento: ClientEventDetail = eventoResponse.data;

  return (
    <EventoLayoutClient evento={evento} studioInfo={studioInfo}>
      <ZenSidebarProvider>
        <ClientLayoutWrapper
          slug={slug}
          cliente={cliente}
          evento={evento}
          studioInfo={studioInfo}
        >
          {children}
        </ClientLayoutWrapper>
      </ZenSidebarProvider>
    </EventoLayoutClient>
  );
}

/**
 * Generar metadata para SEO
 */
export async function generateMetadata({ params }: EventoLayoutProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const studioInfo = await obtenerStudioPublicInfo(slug);

    if (!studioInfo) {
      return {
        title: 'Evento',
        description: 'Información del evento',
      };
    }

    const baseTitle = studioInfo.studio_name || 'ZEN Platform';
    const title = `Evento - ${baseTitle}`;
    const description = `Gestiona tu evento con ${baseTitle}`;

    // Configurar favicon dinámico usando el logo del studio
    const icons = studioInfo.logo_url ? {
      icon: [
        { url: studioInfo.logo_url, type: 'image/png' },
        { url: studioInfo.logo_url, sizes: '32x32', type: 'image/png' },
        { url: studioInfo.logo_url, sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: studioInfo.logo_url, sizes: '180x180', type: 'image/png' },
      ],
      shortcut: studioInfo.logo_url,
    } : undefined;

    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Evento',
      description: 'Información del evento',
    };
  }
}
