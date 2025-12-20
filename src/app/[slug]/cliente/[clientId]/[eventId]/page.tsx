'use client';

import { Calendar, MapPin, Tag } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
import { useToast } from '@/hooks/useToast';
import { useEvento } from './context/EventoContext';
import {
  ServiciosContratadosTree,
  ResumenPago,
  ToastContainer,
} from '@/components/client';

function formatFecha(fecha: string): string {
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
}

export default function EventoResumenPage() {
  const { evento } = useEvento();
  const { toasts, removeToast } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">
          {evento.name || 'Evento sin nombre'}
        </h1>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-300 mt-4">
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
          <p className="text-sm text-zinc-400 mt-2">{evento.address}</p>
        )}
      </div>

      {/* Content */}
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
    </>
  );
}
