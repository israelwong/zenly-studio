'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { ZenCard, ZenButton, ZenDialog, ZenSidebarTrigger } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useToast } from '@/hooks/useToast';
import { obtenerPagosEvento, obtenerInfoBancariaStudio, obtenerEventoDetalle } from '@/lib/actions/cliente';
import { ToastContainer } from '@/components/client';
import { HistorialPagosTable } from './components/HistorialPagosTable';
import { BankInfoCard } from './components/BankInfoCard';
import { ResumenPago } from '../components/ResumenPago';
import type { ClientPago, StudioBankInfo } from '@/types/client';

export default function EventoPagosPage() {
  const [pagos, setPagos] = useState<ClientPago[]>([]);
  const [bankInfo, setBankInfo] = useState<StudioBankInfo | null>(null);
  const [balance, setBalance] = useState<{
    total: number;
    pagado: number;
    pendiente: number;
    descuento: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const { toasts, removeToast, error: showError } = useToast();
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const eventId = params?.eventId as string;

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente || clientId !== cliente.id || !eventId) {
        return;
      }

      try {
        setLoading(true);

        // Obtener pagos, info bancaria y balance en paralelo
        // obtenerPagosEvento y obtenerEventoDetalle ahora aceptan tanto event_id como promise_id
        const [pagosResponse, bankResponse, eventoResponse] = await Promise.all([
          obtenerPagosEvento(eventId, cliente.id),
          obtenerInfoBancariaStudio(cliente.studio_id),
          obtenerEventoDetalle(eventId, cliente.id),
        ]);

        if (pagosResponse.success && pagosResponse.data) {
          setPagos(pagosResponse.data);
        } else {
          showError(pagosResponse.message || 'Error al cargar pagos');
        }

        if (bankResponse.success && bankResponse.data) {
          setBankInfo(bankResponse.data);
        } else {
          showError(bankResponse.message || 'Error al cargar información bancaria');
        }

        if (eventoResponse.success && eventoResponse.data) {
          setBalance({
            total: eventoResponse.data.total,
            pagado: eventoResponse.data.pagado,
            pendiente: eventoResponse.data.pendiente,
            descuento: eventoResponse.data.descuento,
          });
        }
      } catch (error) {
        showError('Error de conexión. Por favor intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && clientId === cliente.id && eventId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, cliente, clientId, eventId]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <div className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-48"></div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Skeleton historial */}
            <ZenCard>
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-zinc-800 rounded w-40"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-4 bg-zinc-800 rounded"></div>
                </div>
              </div>
            </ZenCard>

            {/* Skeleton resumen */}
            <ZenCard>
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-zinc-800 rounded w-40"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-4 bg-zinc-800 rounded"></div>
                  <div className="h-4 bg-zinc-800 rounded"></div>
                </div>
              </div>
            </ZenCard>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !cliente) {
    return null;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZenSidebarTrigger className="lg:hidden" />
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-2">Historial de Pagos</h1>
              <p className="text-zinc-400">Consulta tus pagos e información bancaria</p>
            </div>
          </div>
          <ZenButton
            variant="primary"
            size="sm"
            onClick={() => setIsBankModalOpen(true)}
            disabled={!bankInfo}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Información bancaria para pagos
          </ZenButton>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Historial de pagos */}
        <div>
          <HistorialPagosTable pagos={pagos} />
        </div>

        {/* Resumen de balance */}
        <div>
          {balance && (
            <ResumenPago
              eventoId={eventId}
              total={balance.total}
              pagado={balance.pagado}
              pendiente={balance.pendiente}
              descuento={balance.descuento}
              showHistorialButton={false}
            />
          )}
        </div>
      </div>

      {/* Modal de información bancaria */}
      {bankInfo && (
        <ZenDialog
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          title="Información Bancaria"
          description="Datos para realizar transferencias SPEI"
          maxWidth="md"
          showCloseButton={true}
          closeOnClickOutside={true}
        >
          <BankInfoCard bankInfo={bankInfo} showCard={false} />
        </ZenDialog>
      )}
    </>
  );
}
