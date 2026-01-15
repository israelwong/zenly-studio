'use client';

import { useParams, useRouter } from 'next/navigation';
import { Calendar, MapPin, Tag, ChevronRight } from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import type { ClientEvent } from '@/types/client';

interface EventCardProps {
  evento: ClientEvent;
}

export function EventCard({ evento }: EventCardProps) {
  const router = useRouter();
  const params = useParams();
  const { cliente } = useClientAuth();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string || cliente?.id;

  const formatFecha = (fecha: string) => {
    try {
      const fechaSolo = fecha.split('T')[0];
      const [year, month, day] = fechaSolo.split('-').map(Number);
      // Crear fecha usando componentes UTC para evitar problemas de zona horaria
      const fechaObj = new Date(Date.UTC(year, month - 1, day));

      return fechaObj.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isPagado = evento.cotizacion.pendiente <= 0;

  if (!clientId) return null;

  return (
    <ZenCard
      className="hover:border-emerald-500/50 transition-colors cursor-pointer"
      onClick={() => router.push(`/${slug}/cliente/${clientId}/${evento.id}`)}
    >
      <div className="p-6 space-y-4">
        {/* Header con badge de pago */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">
              {evento.name || 'Evento sin nombre'}
            </h3>
            {evento.event_type && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Tag className="h-4 w-4" />
                <span>{evento.event_type.name}</span>
              </div>
            )}
          </div>
          <ZenBadge 
            variant={isPagado ? 'success' : 'warning'}
            className="rounded-full text-xs px-2 py-0.5"
          >
            {isPagado ? 'Pagado' : 'Saldo pendiente'}
          </ZenBadge>
        </div>

        {/* Info del evento */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <span>{formatFecha(evento.event_date)}</span>
          </div>
          {evento.event_location && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 text-zinc-500" />
              <span>{evento.event_location}</span>
            </div>
          )}
        </div>

        {/* Resumen de pago */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Total:</span>
              <span className="text-zinc-300">{formatMoney(evento.cotizacion.total)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Pagado:</span>
              <span className="text-emerald-400">{formatMoney(evento.cotizacion.pagado)}</span>
            </div>
            {!isPagado && (
              <div className="flex justify-between font-semibold text-zinc-300 pt-1">
                <span>Pendiente:</span>
                <span className="text-yellow-400">{formatMoney(evento.cotizacion.pendiente)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botón ver detalle */}
        <ZenButton
          variant="outline"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/${slug}/cliente/${clientId}/${evento.id}`);
          }}
        >
          Ver detalle
          <ChevronRight className="h-4 w-4 ml-2" />
        </ZenButton>
      </div>
    </ZenCard>
  );
}

