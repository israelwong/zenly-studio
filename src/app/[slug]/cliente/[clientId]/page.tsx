import { Suspense } from 'react';
import { getClienteSession } from '@/lib/actions/cliente';
import { DashboardSkeleton } from '@/components/client';
import { ToastProvider } from './components/ToastProvider';
import { EventosList } from './components/EventosList';

interface ClienteDashboardProps {
  params: Promise<{ slug: string; clientId: string }>;
}

export default async function ClienteDashboard({ params }: ClienteDashboardProps) {
  const { clientId } = await params;
  const cliente = await getClienteSession();

  if (!cliente || clientId !== cliente.id) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <ToastProvider>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Mis Eventos</h1>
          <p className="text-zinc-400">Bienvenido, {cliente.name}</p>
        </div>

        {/* Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <EventosList clientId={clientId} />
        </Suspense>
      </ToastProvider>
    </div>
  );
}
