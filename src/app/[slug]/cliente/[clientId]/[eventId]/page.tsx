'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, MapPin, Tag } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useToast } from '@/hooks/useToast';
import { useFavicon } from '@/hooks/useFavicon';
import { obtenerEventoDetalle, obtenerStudioPublicInfo } from '@/lib/actions/public/cliente';
import {
  ServiciosContratadosTree,
  ResumenPago,
  EventDetailSkeleton,
  ToastContainer,
} from '@/components/client';
import type { ClientEventDetail } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

export default function EventoDetallePage() {
  const [evento, setEvento] = useState<ClientEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [studioInfo, setStudioInfo] = useState<StudioPublicInfo | null>(null);
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const { toasts, removeToast, error: showError } = useToast();
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const eventId = params?.eventId as string;

  // Actualizar favicon dinámicamente
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente || clientId !== cliente.id) {
        return;
      }

      try {
        setLoading(true);
        const [eventoResponse, studioInfoData] = await Promise.all([
          obtenerEventoDetalle(eventId, cliente.id),
          obtenerStudioPublicInfo(slug),
        ]);

        if (eventoResponse.success && eventoResponse.data) {
          setEvento(eventoResponse.data);
        } else {
          showError(eventoResponse.message || 'Error al cargar evento');
          setTimeout(() => {
            router.push(`/${slug}/cliente/${clientId}`);
          }, 2000);
        }

        if (studioInfoData) {
          setStudioInfo(studioInfoData);
        }
      } catch (error) {
        showError('Error de conexión. Por favor intenta de nuevo.');
        setTimeout(() => {
          router.push(`/${slug}/cliente/${clientId}`);
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && clientId === cliente.id && eventId) {
      fetchData();
    }
  }, [isAuthenticated, cliente, clientId, eventId, router, slug, showError]);

  const formatFecha = (fecha: string) => {
    try {
      const fechaSolo = fecha.split('T')[0];
      const fechaObj = new Date(fechaSolo + 'T00:00:00');

      return fechaObj.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  if (isLoading || loading) {
    return <EventDetailSkeleton />;
  }

  if (!isAuthenticated || !cliente || !evento) {
    return null;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Info del evento */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-zinc-100">
              {evento.name || 'Evento sin nombre'}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span>{formatFecha(evento.event_date)}</span>
              </div>

              {evento.event_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-zinc-500" />
                  <span>{evento.event_location}</span>
                </div>
              )}

              {evento.event_type && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-zinc-500" />
                  <span>{evento.event_type.name}</span>
                </div>
              )}
            </div>

            {evento.address && (
              <p className="text-sm text-zinc-400">{evento.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Servicios contratados */}
          <div>
            <ServiciosContratadosTree servicios={evento.cotizacion.servicios} />
          </div>

          {/* Resumen de pago */}
          <div className="space-y-6">
            <ResumenPago
              eventoId={evento.id}
              total={evento.cotizacion.total}
              pagado={evento.cotizacion.pagado}
              pendiente={evento.cotizacion.pendiente}
              descuento={evento.cotizacion.descuento}
            />

            {/* Descripción si existe */}
            {evento.cotizacion.descripcion && (
              <ZenCard>
                <div className="p-6 space-y-2">
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Descripción
                  </h3>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                    {evento.cotizacion.descripcion}
                  </p>
                </div>
              </ZenCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
