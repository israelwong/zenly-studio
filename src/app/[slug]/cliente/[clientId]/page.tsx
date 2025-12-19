'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useToast } from '@/hooks/useToast';
import { obtenerEventosCliente } from '@/lib/actions/public/cliente';
import { EventCard, DashboardSkeleton, ToastContainer } from '@/components/client';
import type { ClientEvent } from '@/types/client';

export default function ClienteDashboard() {
  const [eventos, setEventos] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { cliente, isAuthenticated } = useClientAuth();
  const { toasts, removeToast, error: showError } = useToast();
  const params = useParams();
  const clientId = params?.clientId as string;

  // Cargar eventos
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !cliente || clientId !== cliente.id) {
        return;
      }

      try {
        setLoading(true);
        const eventosResponse = await obtenerEventosCliente(cliente.id);

        if (eventosResponse.success && eventosResponse.data) {
          setEventos(eventosResponse.data);
        } else {
          showError(eventosResponse.message || 'Error al cargar eventos');
        }
      } catch (error) {
        showError('Error de conexión. Por favor intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && cliente && clientId === cliente.id) {
      fetchData();
    }
  }, [isAuthenticated, cliente, clientId, showError]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Mis Eventos</h1>
        <p className="text-zinc-400">Bienvenido, {cliente?.name}</p>
      </div>

      {/* Content */}
      <div>
        {eventos.length === 0 ? (
          <ZenCard>
            <div className="p-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
              <h3 className="text-lg font-medium text-zinc-100 mb-2">
                No tienes eventos contratados
              </h3>
              <p className="text-zinc-400">
                Contacta con el estudio para crear tu primer evento.
              </p>
            </div>
          </ZenCard>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {eventos.map((evento) => (
              <EventCard key={evento.id} evento={evento} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
