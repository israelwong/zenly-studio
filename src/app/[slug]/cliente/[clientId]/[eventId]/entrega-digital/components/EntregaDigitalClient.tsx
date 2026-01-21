'use client';

import { useParams } from 'next/navigation';
import { ZenSidebarTrigger } from '@/components/ui/zen';
import { ToastContainer } from '@/components/client';
import { useToast } from '@/hooks/useToast';
import { DeliverablesGallery } from './DeliverablesGallery';
import { useEvento } from '../../context/EventoContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { ClienteDeliverable } from '@/lib/actions/cliente/deliverables.actions';

interface EntregaDigitalClientProps {
  initialEntregables: ClienteDeliverable[];
}

export function EntregaDigitalClient({ initialEntregables }: EntregaDigitalClientProps) {
  const { studioInfo } = useEvento();
  const pageTitle = studioInfo?.studio_name 
    ? `Entrega Digital - ${studioInfo.studio_name}`
    : 'Entrega Digital';
  usePageTitle(pageTitle);
  const { toasts, removeToast } = useToast();
  const params = useParams();
  const eventId = params?.eventId as string;
  const clientId = params?.clientId as string;

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-8 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-3 mb-2">
          <ZenSidebarTrigger className="lg:hidden" />
          <h1 className="text-3xl font-bold text-zinc-100">Entrega Digital</h1>
        </div>
        <p className="text-zinc-400">Navega en tus archivos digitales</p>
      </div>

      <DeliverablesGallery
        eventId={eventId}
        clientId={clientId}
        entregables={initialEntregables}
        loading={false}
      />
    </>
  );
}
