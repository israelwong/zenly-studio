'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { useEvento } from './context/EventoContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ToastContainer } from '@/components/client';
import { ZenSidebarTrigger, ZenCard, ZenCardHeader, ZenCardContent } from '@/components/ui/zen';
import { obtenerDashboardInfo } from '@/lib/actions/cliente/dashboard.actions';
import { BalanceFinancieroCard } from './components/BalanceFinancieroCard';
import { EstatusEntregablesCard } from './components/EstatusEntregablesCard';
import { EntregaDigitalCard } from './components/EntregaDigitalCard';
import { InformacionEventoCard } from './components/InformacionEventoCard';
import type { DashboardInfo } from '@/lib/actions/cliente/dashboard.actions';

export default function EventoResumenPage() {
  const { evento, studioInfo } = useEvento();
  usePageTitle({ sectionName: '', studioName: studioInfo?.studio_name });
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

  // Skeleton component
  const EventoSkeleton = () => (
    <>
      {/* Page Header Skeleton */}
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-6 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-3 mb-2">
          <ZenSidebarTrigger className="lg:hidden" />
          <div className="h-9 bg-zinc-800 rounded w-64 animate-pulse" />
        </div>
        <div className="h-5 bg-zinc-800 rounded w-80 max-w-full animate-pulse mt-2" />
      </div>

      {/* Información del Evento Skeleton */}
      <div className="mb-6">
        <ZenCard>
          <ZenCardHeader>
            <div className="h-6 bg-zinc-800 rounded w-48 animate-pulse" />
          </ZenCardHeader>
          <ZenCardContent>
            <div className="space-y-4">
              <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse" />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Dashboard Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <ZenCard key={i}>
            <ZenCardHeader>
              <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse" />
            </ZenCardHeader>
            <ZenCardContent>
              <div className="space-y-3">
                <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                <div className="h-10 bg-zinc-800 rounded w-full animate-pulse mt-4" />
              </div>
            </ZenCardContent>
          </ZenCard>
        ))}
      </div>
    </>
  );

  if (loading) {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <EventoSkeleton />
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-6 lg:static lg:bg-transparent lg:backdrop-blur-none">
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
