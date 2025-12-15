'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useToast } from '@/hooks/useToast';
import { useFavicon } from '@/hooks/useFavicon';
import { obtenerPagosEvento, obtenerInfoBancariaStudio, obtenerStudioPublicInfo } from '@/lib/actions/public/cliente';
import {
  ClientNavbar,
  ClientFooter,
  HistorialPagosTable,
  BankInfoCard,
  ToastContainer,
} from '@/components/client';
import type { ClientPago, StudioBankInfo } from '@/types/client';
import type { StudioPublicInfo } from '@/lib/actions/public/cliente';

export default function EventoPagosPage() {
  const [pagos, setPagos] = useState<ClientPago[]>([]);
  const [bankInfo, setBankInfo] = useState<StudioBankInfo | null>(null);
  const [studioInfo, setStudioInfo] = useState<StudioPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const { toasts, removeToast, error: showError } = useToast();
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const eventId = params?.eventId as string;

  // Actualizar favicon dinámicamente
  useFavicon(studioInfo?.isotipo_url || studioInfo?.logo_url, studioInfo?.studio_name);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente) {
        return;
      }

      try {
        setLoading(true);

        // Obtener pagos y info bancaria en paralelo
        const [pagosResponse, bankResponse, studioInfoData] = await Promise.all([
          obtenerPagosEvento(eventId, cliente.id),
          obtenerInfoBancariaStudio(cliente.studio_id),
          obtenerStudioPublicInfo(slug),
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

        if (studioInfoData) {
          setStudioInfo(studioInfoData);
        }
      } catch (error) {
        showError('Error de conexión. Por favor intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && eventId) {
      fetchData();
    }
  }, [isAuthenticated, cliente, eventId, showError]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <nav className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 animate-pulse">
              <div className="h-6 bg-zinc-800 rounded w-32"></div>
              <div className="h-8 bg-zinc-800 rounded w-24"></div>
            </div>
          </div>
        </nav>
        <main className="flex-1">
          <div className="bg-zinc-900 border-b border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
              <div className="h-8 bg-zinc-800 rounded w-48"></div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <ZenCard>
                <div className="p-6 space-y-4 animate-pulse">
                  <div className="h-6 bg-zinc-800 rounded w-40"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-zinc-800 rounded"></div>
                    <div className="h-4 bg-zinc-800 rounded"></div>
                  </div>
                </div>
              </ZenCard>
              <ZenCard>
                <div className="p-6 space-y-4 animate-pulse">
                  <div className="h-6 bg-zinc-800 rounded w-48"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-zinc-800 rounded"></div>
                    <div className="h-4 bg-zinc-800 rounded"></div>
                  </div>
                </div>
              </ZenCard>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated || !cliente) {
    return null;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ClientNavbar 
        cliente={cliente} 
        studioName={studioInfo?.studio_name}
        studioLogo={studioInfo?.logo_url}
      />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <ZenButton
              variant="ghost"
              onClick={() => router.push(`/${slug}/cliente/${eventId}`)}
              className="text-zinc-300 hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al evento
            </ZenButton>

            <h1 className="text-3xl font-bold text-zinc-100">Historial de Pagos</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Historial de pagos */}
            <div>
              <HistorialPagosTable pagos={pagos} />
            </div>

            {/* Información bancaria */}
            <div>
              {bankInfo ? (
                <BankInfoCard bankInfo={bankInfo} />
              ) : (
                <div className="text-zinc-400 text-center py-8">
                  Información bancaria no disponible
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ClientFooter />
    </>
  );
}

