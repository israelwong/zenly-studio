'use client';

import { useEvento } from '../context/EventoContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/client';
import { ZenSidebarTrigger } from '@/components/ui/zen';
import { BalanceFinancieroCard } from './BalanceFinancieroCard';
import { EstatusEntregablesCard } from './EstatusEntregablesCard';
import { EntregaDigitalCard } from './EntregaDigitalCard';
import { InformacionEventoCard } from './InformacionEventoCard';
import { ConfirmClientDataCard } from './ConfirmClientDataCard';
import { ClientContractViewCard } from './ClientContractViewCard';
import type { DashboardInfo } from '@/lib/actions/cliente/dashboard.actions';
import { useParams } from 'next/navigation';

interface EventoResumenClientProps {
  initialDashboardInfo: DashboardInfo;
}

export function EventoResumenClient({ initialDashboardInfo }: EventoResumenClientProps) {
  const { evento, studioInfo } = useEvento();
  usePageTitle(studioInfo?.studio_name || 'Resumen del evento');
  const { toasts, removeToast } = useToast();
  const params = useParams();
  const slug = params.slug as string;
  const clientId = params.clientId as string;
  const eventId = params.eventId as string;

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
        <InformacionEventoCard />
      </div>

      {/* Flujo de Contrato - Mostrar según estado de cotización */}
      {initialDashboardInfo?.cotizacion && (
        <>
          {/* Confirmar datos (si contract_pending) */}
          {initialDashboardInfo.cotizacion.status === 'contract_pending' && (
            <div className="mb-6">
              <ConfirmClientDataCard
                studioSlug={slug}
                promiseId={initialDashboardInfo.cotizacion.promise_id || ''}
                contactId={clientId}
                initialData={{
                  name: initialDashboardInfo.contact?.name || '',
                  phone: initialDashboardInfo.contact?.phone || '',
                  email: initialDashboardInfo.contact?.email || null,
                  address: initialDashboardInfo.contact?.address || null,
                }}
                onSuccess={() => {
                  // Recargar dashboard
                  window.location.reload();
                }}
              />
            </div>
          )}

          {/* Ver/Firmar contrato (si contract_generated o contract_signed) */}
          {(initialDashboardInfo.cotizacion.status === 'contract_generated' ||
            initialDashboardInfo.cotizacion.status === 'contract_signed') &&
            initialDashboardInfo.contract && initialDashboardInfo.contract.content && (
              <div className="mb-6">
                <ClientContractViewCard
                  studioSlug={slug}
                  contactId={clientId}
                  contract={initialDashboardInfo.contract}
                  cotizacionStatus={initialDashboardInfo.cotizacion.status}
                  onSuccess={() => {
                    // Recargar dashboard
                    window.location.reload();
                  }}
                />
              </div>
            )}
        </>
      )}

      {/* Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <BalanceFinancieroCard
          evento={evento}
          slug={slug}
          clientId={clientId}
          eventId={eventId}
        />

        <EstatusEntregablesCard
          dashboardInfo={initialDashboardInfo}
          loading={false}
        />

        <EntregaDigitalCard
          dashboardInfo={initialDashboardInfo}
          loading={false}
          slug={slug}
          clientId={clientId}
          eventId={eventId}
        />
      </div>
    </>
  );
}
