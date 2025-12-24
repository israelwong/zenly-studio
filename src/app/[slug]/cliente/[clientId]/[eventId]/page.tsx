'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, MapPin, Tag } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useEvento } from './context/EventoContext';
import { ToastContainer } from '@/components/client';
import { obtenerDashboardInfo } from '@/lib/actions/public/cliente/dashboard.actions';
import { BalanceFinancieroCard } from './components/BalanceFinancieroCard';
import { EstatusEntregablesCard } from './components/EstatusEntregablesCard';
import { EntregaDigitalCard } from './components/EntregaDigitalCard';
import type { DashboardInfo } from '@/lib/actions/public/cliente/dashboard.actions';

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
  const params = useParams();
  const slug = params.slug as string;
  const clientId = params.clientId as string;
  const eventId = params.eventId as string;

  const [dashboardInfo, setDashboardInfo] = useState<DashboardInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardInfo = async () => {
      try {
        setLoading(true);
        const result = await obtenerDashboardInfo(eventId, clientId, slug);
        if (result.success && result.data) {
          setDashboardInfo(result.data);
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardInfo();
  }, [eventId, clientId, slug]);

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

      {/* Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <BalanceFinancieroCard
          evento={evento}
          slug={slug}
          clientId={clientId}
          eventId={eventId}
        />

        <EstatusEntregablesCard
          dashboardInfo={dashboardInfo}
          loading={loading}
        />

        <EntregaDigitalCard
          dashboardInfo={dashboardInfo}
          loading={loading}
          slug={slug}
          clientId={clientId}
          eventId={eventId}
        />

        {/* Invitación - Próximamente */}
        {/* <ZenCard className="opacity-75">
          <ZenCardHeader>
            <ZenCardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-400" />
              Invitación Digital
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent>
            <div className="text-center py-6 space-y-3">
              <ZenBadge variant="secondary" className="text-xs">
                Próximamente
              </ZenBadge>
              <p className="text-sm text-zinc-400">
                Esta funcionalidad estará disponible próximamente
              </p>
            </div>
          </ZenCardContent>
        </ZenCard> */}
      </div>
    </>
  );
}
