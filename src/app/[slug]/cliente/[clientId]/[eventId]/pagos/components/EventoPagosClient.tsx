'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { ZenButton, ZenDialog, ZenSidebarTrigger } from '@/components/ui/zen';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/client';
import { HistorialPagosTable } from './HistorialPagosTable';
import { BankInfoCard } from './BankInfoCard';
import { ResumenPago } from '../../components/ResumenPago';
import { useEvento } from '../../context/EventoContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { ClientPago, StudioBankInfo } from '@/types/client';

interface EventoPagosClientProps {
  initialPagos: ClientPago[];
  initialBankInfo: StudioBankInfo | null;
  initialBalance: {
    total: number;
    pagado: number;
    pendiente: number;
    descuento: number | null;
  };
}

export function EventoPagosClient({
  initialPagos,
  initialBankInfo,
  initialBalance,
}: EventoPagosClientProps) {
  const { studioInfo, evento } = useEvento();
  const pageTitle = studioInfo?.studio_name 
    ? `Pagos - ${studioInfo.studio_name}`
    : 'Pagos';
  usePageTitle(pageTitle);
  const { toasts, removeToast } = useToast();
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-8 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <ZenSidebarTrigger className="lg:hidden" />
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Historial de Pagos</h1>
            <p className="text-zinc-400">Consulta tus pagos</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Historial de pagos */}
        <div>
          {/* Botón de información bancaria - arriba del card */}
          <div className="mb-4">
            <ZenButton
              variant="primary"
              size="sm"
              onClick={() => setIsBankModalOpen(true)}
              disabled={!initialBankInfo}
              className="w-full lg:w-auto"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Información bancaria para pagos
            </ZenButton>
          </div>
          <HistorialPagosTable pagos={initialPagos} />
        </div>

        {/* Resumen de balance */}
        <div>
          <ResumenPago
            eventoId={evento.id}
            total={initialBalance.total}
            pagado={initialBalance.pagado}
            pendiente={initialBalance.pendiente}
            descuento={initialBalance.descuento}
            showHistorialButton={false}
          />
        </div>
      </div>

      {/* Modal de información bancaria */}
      {initialBankInfo && (
        <ZenDialog
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          title="Información Bancaria"
          description="Datos para realizar transferencias SPEI"
          maxWidth="md"
          showCloseButton={true}
          closeOnClickOutside={true}
        >
          <BankInfoCard bankInfo={initialBankInfo} showCard={false} />
        </ZenDialog>
      )}
    </>
  );
}
