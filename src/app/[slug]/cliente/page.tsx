'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useToast } from '@/hooks/useToast';
import { useFavicon } from '@/hooks/useFavicon';
import { obtenerEventosCliente, obtenerStudioPublicInfo } from '@/lib/actions/public/cliente';
import {
  ClientNavbar,
  ClientFooter,
  EventCard,
  DashboardSkeleton,
  ToastContainer,
} from '@/components/client';
import type { ClientEvent } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

export default function ClientDashboard() {
  const [eventos, setEventos] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [studioInfo, setStudioInfo] = useState<StudioPublicInfo | null>(null);
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const { toasts, removeToast, error: showError } = useToast();
  const params = useParams();
  const slug = params?.slug as string;

  // Actualizar favicon dinámicamente
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente) {
        return;
      }

      try {
        setLoading(true);
        const [eventosResponse, studioInfoData] = await Promise.all([
          obtenerEventosCliente(cliente.id),
          obtenerStudioPublicInfo(slug),
        ]);

        if (eventosResponse.success && eventosResponse.data) {
          setEventos(eventosResponse.data);
        } else {
          showError(eventosResponse.message || 'Error al cargar eventos');
        }

        if (studioInfoData) {
          setStudioInfo(studioInfoData);
        }
      } catch (error) {
        showError('Error de conexión. Por favor intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente) {
      fetchData();
    }
  }, [isAuthenticated, cliente, slug, showError]);

  if (isLoading || loading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated || !cliente) {
    return null;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ClientNavbar 
        cliente={cliente} 
        studioName={studioInfo?.studio_name}
        studioLogo={studioInfo?.logo_url}
      />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Mis Eventos</h1>
            <p className="text-zinc-400">Bienvenido, {cliente.name}</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {eventos.length === 0 ? (
            <ZenCard>
              <div className="p-12 text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
                <h3 className="text-lg font-medium text-zinc-100 mb-2">
                  No tienes eventos contratados
                </h3>
                <p className="text-zinc-400">
                  Contacta con el estudio para crear tu primer evento.
                </p>
              </div>
            </ZenCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {eventos.map((evento) => (
                <EventCard key={evento.id} evento={evento} />
              ))}
            </div>
          )}
        </div>
      </main>

      <ClientFooter />
    </>
  );
}
