'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge } from '@/components/ui/zen';
import { PaymentMethodsModal } from '@/components/shared/payments/PaymentMethodsModal';
import { verificarMetodosSinConfigurar } from '@/lib/actions/studio/config/metodos-pago.actions';
import { EventsKanbanClient } from './EventsKanbanClient';
import { EventsDeferred } from './EventsDeferred';
import { Suspense } from 'react';
import { EventsSkeleton } from './EventsSkeleton';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import type { EventsListResponse } from '@/lib/actions/studio/business/events';

interface EventsPageClientProps {
  studioSlug: string;
  initialPipelineStages: EventPipelineStage[];
  eventsPromise: Promise<EventsListResponse>;
  metodosSinConfigurar: number;
}

export function EventsPageClient({
  studioSlug,
  initialPipelineStages,
  eventsPromise,
  metodosSinConfigurar: initialMetodosSinConfigurar,
}: EventsPageClientProps) {
  const [showMethodsModal, setShowMethodsModal] = useState(false);
  const [metodosSinConfigurar, setMetodosSinConfigurar] = useState(initialMetodosSinConfigurar);

  useEffect(() => {
    document.title = 'Zenly Studio - Eventos';
  }, []);

  const handleMethodsModalSuccess = async () => {
    const result = await verificarMetodosSinConfigurar(studioSlug);
    if (result.success && result.count !== undefined) {
      setMetodosSinConfigurar(result.count);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <ZenCardTitle>Eventos</ZenCardTitle>
                <ZenCardDescription>
                  Gestiona tus eventos autorizados y sus procesos operativos
                </ZenCardDescription>
              </div>
            </div>
            <ZenButton
              variant="outline"
              size="sm"
              onClick={() => setShowMethodsModal(true)}
              className="relative"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Métodos de pago
              {metodosSinConfigurar > 0 && (
                <ZenBadge
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {metodosSinConfigurar}
                </ZenBadge>
              )}
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-hidden">
          <Suspense fallback={<EventsSkeleton />}>
            <EventsKanbanClient
              studioSlug={studioSlug}
              initialPipelineStages={initialPipelineStages}
              eventsPromise={eventsPromise}
            />
          </Suspense>
        </ZenCardContent>
      </ZenCard>

      <PaymentMethodsModal
        isOpen={showMethodsModal}
        onClose={() => setShowMethodsModal(false)}
        studioSlug={studioSlug}
        onSuccess={handleMethodsModalSuccess}
      />
    </div>
  );
}
