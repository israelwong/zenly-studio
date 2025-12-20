'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ZenCard } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useToast } from '@/hooks/useToast';
import { obtenerPagosEvento, obtenerInfoBancariaStudio } from '@/lib/actions/public/cliente';
import {
  HistorialPagosTable,
  BankInfoCard,
  ToastContainer,
} from '@/components/client';
import type { ClientPago, StudioBankInfo } from '@/types/client';

export default function EventoPagosPage() {
  const [pagos, setPagos] = useState<ClientPago[]>([]);
  const [bankInfo, setBankInfo] = useState<StudioBankInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { cliente, isAuthenticated, isLoading } = useClientAuth();
  const { toasts, removeToast, error: showError } = useToast();
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const eventId = params?.eventId as string;

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente || clientId !== cliente.id) {
        return;
      }

      try {
        setLoading(true);

        // Obtener pagos y info bancaria en paralelo
        const [pagosResponse, bankResponse] = await Promise.all([
          obtenerPagosEvento(eventId, cliente.id),
          obtenerInfoBancariaStudio(cliente.studio_id),
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
      } catch (error) {
        showError('Error de conexión. Por favor intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && clientId === cliente.id && eventId) {
      fetchData();
    }
  }, [isAuthenticated, cliente, clientId, eventId, showError]);

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
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Historial de Pagos</h1>
        <p className="text-zinc-400">Consulta tus pagos e información bancaria</p>
      </div>

      {/* Content */}
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
    </>
  );
}
