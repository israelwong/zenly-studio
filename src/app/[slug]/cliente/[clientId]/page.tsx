import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getClienteSession, obtenerStudioPublicInfo } from '@/lib/actions/cliente';
import { DashboardSkeleton } from '@/components/client';
import { ToastProvider } from './components/ToastProvider';
import { EventosList } from './components/EventosList';

interface ClienteDashboardProps {
  params: Promise<{ slug: string; clientId: string }>;
}

export async function generateMetadata({ params }: ClienteDashboardProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const studioInfo = await obtenerStudioPublicInfo(slug);

    if (!studioInfo) {
      return {
        title: 'Mis Eventos',
        description: 'Portal del cliente',
      };
    }

    const title = `Mis Eventos - ${studioInfo.studio_name}`;
    const description = `Portal del cliente de ${studioInfo.studio_name}`;

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
      title: 'Mis Eventos',
      description: 'Portal del cliente',
    };
  }
}

export default async function ClienteDashboard({ params }: ClienteDashboardProps) {
  const { clientId } = await params;
  const cliente = await getClienteSession();

  if (!cliente || clientId !== cliente.id) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <ToastProvider>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Mis Eventos</h1>
          <p className="text-zinc-400">Bienvenido, {cliente.name}</p>
        </div>

        {/* Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <EventosList clientId={clientId} />
        </Suspense>
      </ToastProvider>
    </div>
  );
}
