'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ZenCard } from '@/components/ui/zen';
import { ToastContainer } from '@/components/client';
import { useToast } from '@/hooks/useToast';
import { obtenerEntregablesCliente } from '@/lib/actions/cliente/deliverables.actions';
import { DeliverablesGallery } from '../components/DeliverablesGallery';
import { Loader2 } from 'lucide-react';
import type { ClienteDeliverable } from '@/lib/actions/cliente/deliverables.actions';

export default function EntregaDigitalPage() {
  const { toasts, removeToast } = useToast();
  const params = useParams();
  const eventId = params?.eventId as string;
  const clientId = params?.clientId as string;

  const [entregables, setEntregables] = useState<ClienteDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntregables = async () => {
      if (!eventId || !clientId) return;

      try {
        setLoading(true);
        setError(null);
        const result = await obtenerEntregablesCliente(eventId, clientId);

        if (result.success && result.data) {
          setEntregables(result.data);
        } else {
          setError(result.error || 'Error al cargar entregables');
        }
      } catch (err) {
        setError('Error al cargar entregables');
      } finally {
        setLoading(false);
      }
    };

    loadEntregables();
  }, [eventId, clientId]);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Entrega Digital</h1>
        <p className="text-zinc-400">Descarga tus archivos digitales</p>
      </div>

      {error ? (
        <ZenCard className="border-red-500/20 bg-red-950/10">
          <div className="p-12 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </ZenCard>
      ) : (
        <DeliverablesGallery
          eventId={eventId}
          clientId={clientId}
          entregables={entregables}
          loading={loading}
        />
      )}
    </>
  );
}
