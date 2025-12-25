'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { useEvento } from './context/EventoContext';
import { ToastContainer } from '@/components/client';
import { ZenSidebarTrigger } from '@/components/ui/zen';
import { obtenerDashboardInfo } from '@/lib/actions/cliente/dashboard.actions';
import { BalanceFinancieroCard } from './components/BalanceFinancieroCard';
import { EstatusEntregablesCard } from './components/EstatusEntregablesCard';
import { EntregaDigitalCard } from './components/EntregaDigitalCard';
import { InformacionEventoCard } from './components/InformacionEventoCard';
import type { DashboardInfo } from '@/lib/actions/cliente/dashboard.actions';

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
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ZenSidebarTrigger className="lg:hidden" />
          <h1 className="text-3xl font-bold text-zinc-100">
            Resumen del evento
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mt-2">Revisa la información del evento y los entregables</p>
      </div>

      {/* Información del Evento */}
      <div className="mb-6">
        <InformacionEventoCard
          slug={slug}
          clientId={clientId}
          eventId={eventId}
        />
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
          dashboardInfo={null}
          loading={false}
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
