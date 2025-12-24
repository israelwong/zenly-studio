import { CalendarDays } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
import { obtenerEventosCliente } from '@/lib/actions/cliente';
import { EventCard } from '@/components/client';
import type { ClientEvent } from '@/types/client';

interface EventosListProps {
  clientId: string;
}

export async function EventosList({ clientId }: EventosListProps) {
  const eventosResponse = await obtenerEventosCliente(clientId);

  // Estado de error
  if (!eventosResponse.success || !eventosResponse.data) {
    return (
      <ZenCard className="border-red-500/20 bg-red-950/10">
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            Error al cargar eventos
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            {eventosResponse.message || 'Por favor intenta de nuevo más tarde.'}
          </p>
        </div>
      </ZenCard>
    );
  }

  const eventos: ClientEvent[] = eventosResponse.data;

  // Estado vacío
  if (eventos.length === 0) {
    return (
      <ZenCard className="border-zinc-800/50">
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            No tienes eventos contratados
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Contacta con el estudio para crear tu primer evento y comenzar a gestionar tus sesiones fotográficas.
          </p>
        </div>
      </ZenCard>
    );
  }

  // Lista de eventos
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {eventos.map((evento) => (
        <EventCard key={evento.id} evento={evento} />
      ))}
    </div>
  );
}
