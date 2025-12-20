'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, CreditCard } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge } from '@/components/ui/zen';
import { EventsWrapper } from './components/EventsWrapper';
import { PaymentMethodsModal } from '@/components/shared/payments';
import { verificarMetodosSinConfigurar } from '@/lib/actions/studio/config/metodos-pago.actions';

export default function EventsPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const [showMethodsModal, setShowMethodsModal] = useState(false);
  const [metodosSinConfigurar, setMetodosSinConfigurar] = useState(0);

  useEffect(() => {
    const checkMetodos = async () => {
      const result = await verificarMetodosSinConfigurar(studioSlug);
      if (result.success && result.count !== undefined) {
        setMetodosSinConfigurar(result.count);
      }
    };
    checkMetodos();
  }, [studioSlug]);

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
          <EventsWrapper studioSlug={studioSlug} />
        </ZenCardContent>
      </ZenCard>

      {/* Modal de métodos de pago */}
      <PaymentMethodsModal
        isOpen={showMethodsModal}
        onClose={() => setShowMethodsModal(false)}
        studioSlug={studioSlug}
        onSuccess={async () => {
          const result = await verificarMetodosSinConfigurar(studioSlug);
          if (result.success && result.count !== undefined) {
            setMetodosSinConfigurar(result.count);
          }
        }}
      />
    </div>
  );
}
