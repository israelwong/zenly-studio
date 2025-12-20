import { redirect } from 'next/navigation';
import { getClienteSession, obtenerEventoDetalle, obtenerStudioPublicInfo } from '@/lib/actions/public/cliente';
import { ZenSidebarProvider } from '@/components/ui/zen';
import { ClientLayoutWrapper } from '../components/ClientLayoutWrapper';
import { EventoLayoutClient } from './components/EventoLayoutClient';
import { EventoProvider } from './context/EventoContext';
import type { ClientEventDetail } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

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

  // Cargar datos en paralelo (memoizados con React.cache)
  const [eventoResponse, studioInfo] = await Promise.all([
    obtenerEventoDetalle(eventId, cliente.id),
    obtenerStudioPublicInfo(slug),
  ]);

  if (!eventoResponse.success || !eventoResponse.data) {
    redirect(`/${slug}/cliente/${clientId}`);
  }

  const evento: ClientEventDetail = eventoResponse.data;

  return (
    <EventoLayoutClient studioInfo={studioInfo}>
      <EventoProvider evento={evento}>
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
      </EventoProvider>
    </EventoLayoutClient>
  );
}
