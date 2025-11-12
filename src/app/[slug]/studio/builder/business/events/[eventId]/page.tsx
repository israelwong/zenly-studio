'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, User, Phone, Mail, DollarSign } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { obtenerEventoDetalle } from '@/lib/actions/studio/builder/business/events/events.actions';
import type { EventoDetalle } from '@/lib/actions/studio/builder/business/events/events.actions';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [evento, setEvento] = useState<EventoDetalle | null>(null);

  useEffect(() => {
    const loadEvento = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventoDetalle(studioSlug, eventId);

        if (result.success && result.data) {
          setEvento(result.data);
        } else {
          toast.error(result.error || 'Evento no encontrado');
          router.push(`/${studioSlug}/studio/builder/business/events`);
        }
      } catch (error) {
        console.error('Error loading evento:', error);
        toast.error('Error al cargar evento');
        router.push(`/${studioSlug}/studio/builder/business/events`);
      } finally {
        setLoading(false);
      }
    };

    loadEvento();
  }, [studioSlug, eventId, router]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard>
          <ZenCardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-zinc-400">Cargando evento...</div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!evento) {
    return null;
  }

  // Determinar contacto (contact o promise)
  const contacto = evento.contact || evento.promise;
  const contactoNombre = evento.contact?.name || evento.promise?.contact_name || 'Sin nombre';
  const contactoTelefono = evento.contact?.phone || evento.promise?.contact_phone || 'Sin teléfono';
  const contactoEmail = evento.contact?.email || evento.promise?.contact_email || null;

  // Calcular monto total de cotizaciones autorizadas
  const montoTotal = evento.cotizaciones
    ?.filter((c) => c.status === 'autorizada')
    .reduce((sum, c) => sum + c.price, 0) || 0;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${studioSlug}/studio/builder/business/events`)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <ZenCardTitle>{evento.name || 'Evento sin nombre'}</ZenCardTitle>
              <ZenCardDescription>
                {evento.event_type?.name || 'Sin tipo de evento'}
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna 1: Información del Contacto */}
            <div className="space-y-6">
              <ZenCard variant="outlined">
                <ZenCardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <User className="h-5 w-5 text-purple-400" />
                    </div>
                    <ZenCardTitle className="text-lg">Información del Contacto</ZenCardTitle>
                  </div>
                </ZenCardHeader>
                <ZenCardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Nombre</label>
                    <div className="flex items-center gap-2 text-white">
                      <User className="h-4 w-4 text-zinc-400" />
                      <span>{contactoNombre}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Teléfono</label>
                    <div className="flex items-center gap-2 text-white">
                      <Phone className="h-4 w-4 text-zinc-400" />
                      <span>{contactoTelefono}</span>
                    </div>
                  </div>

                  {contactoEmail && (
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                      <div className="flex items-center gap-2 text-white">
                        <Mail className="h-4 w-4 text-zinc-400" />
                        <span>{contactoEmail}</span>
                      </div>
                    </div>
                  )}
                </ZenCardContent>
              </ZenCard>

              {/* Información del Evento */}
              <ZenCard variant="outlined">
                <ZenCardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-400" />
                    </div>
                    <ZenCardTitle className="text-lg">Información del Evento</ZenCardTitle>
                  </div>
                </ZenCardHeader>
                <ZenCardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Fecha del Evento</label>
                    <div className="text-white">
                      {new Date(evento.event_date).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {evento.address && (
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Dirección</label>
                      <div className="text-white">{evento.address}</div>
                    </div>
                  )}

                  {evento.sede && (
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Sede</label>
                      <div className="text-white">{evento.sede}</div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Estado</label>
                    <div className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-sm">
                      {evento.status === 'active' ? 'Activo' : evento.status}
                    </div>
                  </div>
                </ZenCardContent>
              </ZenCard>
            </div>

            {/* Columna 2: Cotizaciones y Pagos */}
            <div className="space-y-6">
              {/* Resumen Financiero */}
              <ZenCard variant="outlined">
                <ZenCardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600/20 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                    </div>
                    <ZenCardTitle className="text-lg">Resumen Financiero</ZenCardTitle>
                  </div>
                </ZenCardHeader>
                <ZenCardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Monto Total Autorizado</label>
                    <div className="text-2xl font-bold text-emerald-400">
                      ${montoTotal.toLocaleString('es-MX', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <p className="text-sm text-zinc-400">
                      Los pagos se registrarán aquí próximamente
                    </p>
                  </div>
                </ZenCardContent>
              </ZenCard>

              {/* Cotizaciones */}
              {evento.cotizaciones && evento.cotizaciones.length > 0 && (
                <ZenCard variant="outlined">
                  <ZenCardHeader>
                    <ZenCardTitle className="text-lg">Cotizaciones</ZenCardTitle>
                  </ZenCardHeader>
                  <ZenCardContent>
                    <div className="space-y-3">
                      {evento.cotizaciones.map((cotizacion) => (
                        <div
                          key={cotizacion.id}
                          className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">{cotizacion.name}</div>
                              <div className="text-sm text-zinc-400 mt-1">
                                ${cotizacion.price.toLocaleString('es-MX', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                            <div className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300">
                              {cotizacion.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ZenCardContent>
                </ZenCard>
              )}
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

