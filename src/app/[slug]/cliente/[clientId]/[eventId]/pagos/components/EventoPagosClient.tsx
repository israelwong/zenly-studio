'use client';

import { useState } from 'react';
import { Building2, Eye } from 'lucide-react';
import { ZenButton, ZenDialog, ZenSidebarTrigger, ZenCard } from '@/components/ui/zen';
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
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">Historial de Pagos</h1>
                <p className="text-zinc-400">Consulta tus pagos</p>
              </div>
              {/* Botón de información bancaria - Desktop: a la altura del título */}
              {initialBalance.pendiente > 0 && initialBankInfo && (
                <div className="hidden lg:block">
                  <ZenButton
                    variant="primary"
                    size="sm"
                    onClick={() => setIsBankModalOpen(true)}
                    className="shrink-0"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Información bancaria para pagos
                  </ZenButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Historial de pagos */}
        <div>
          <HistorialPagosTable pagos={initialPagos} />
          
          {/* Card minimalista de información bancaria - Mobile: debajo del historial */}
          {initialBalance.pendiente > 0 && initialBankInfo && (
            <div className="lg:hidden mt-4">
              <ZenCard>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Building2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-300">CLABE para pagos</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {initialBankInfo.banco || 'Información bancaria disponible'}
                      </p>
                    </div>
                  </div>
                  <ZenButton
                    variant="primary"
                    size="sm"
                    onClick={() => setIsBankModalOpen(true)}
                    className="shrink-0"
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    Mostrar
                  </ZenButton>
                </div>
              </ZenCard>
            </div>
          )}
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
