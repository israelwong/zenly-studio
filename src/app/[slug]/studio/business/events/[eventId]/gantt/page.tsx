'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { obtenerEventoDetalle, type EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';

export default function EventGanttPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventoDetalle(studioSlug, eventId);

        if (result.success && result.data) {
          setEventData(result.data);
        } else {
          toast.error(result.error || 'Evento no encontrado');
          router.push(`/${studioSlug}/studio/business/events/${eventId}`);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Error al cargar el evento');
        router.push(`/${studioSlug}/studio/business/events/${eventId}`);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId, studioSlug, router]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="text-center py-12 text-zinc-400">
              Cargando cronograma...
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!eventData) {
    return null;
  }

  const cotizacionesAprobadas = (eventData.cotizaciones || []).filter(
    (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
  );

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventId}`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>Cronograma Gantt</ZenCardTitle>
                <ZenCardDescription>
                  {eventData.name || 'Evento sin nombre'}
                </ZenCardDescription>
              </div>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <div className="space-y-6">
            {/* Placeholder para vista Gantt */}
            <div className="p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
              <Calendar className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                Vista Gantt
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Aquí se mostrará el cronograma con las cotizaciones y sus items
              </p>
              {cotizacionesAprobadas.length > 0 ? (
                <div className="text-sm text-zinc-500">
                  {cotizacionesAprobadas.length} cotización{cotizacionesAprobadas.length > 1 ? 'es' : ''} aprobada{cotizacionesAprobadas.length > 1 ? 's' : ''} encontrada{cotizacionesAprobadas.length > 1 ? 's' : ''}
                </div>
              ) : (
                <div className="text-sm text-zinc-500">
                  No hay cotizaciones aprobadas para mostrar
                </div>
              )}
            </div>

            {/* Información de cotizaciones */}
            {cotizacionesAprobadas.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-zinc-300">
                  Cotizaciones aprobadas
                </h4>
                <div className="space-y-2">
                  {cotizacionesAprobadas.map((cotizacion) => (
                    <div
                      key={cotizacion.id}
                      className="p-4 bg-zinc-900 rounded-lg border border-zinc-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {cotizacion.name}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Items de esta cotización aparecerán en el Gantt
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

