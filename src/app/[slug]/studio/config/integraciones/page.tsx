'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Cloud } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent } from '@/components/ui/zen';
import {
  ManychatIntegrationModal,
  StripeIntegrationModal,
  ZenMagicIntegrationModal,
} from '@/components/shared/integrations';
import {
  GoogleIntegrationCard,
  ManychatIntegrationCard,
  StripeIntegrationCard,
  ZenMagicIntegrationCard,
} from './components';
import { toast } from 'sonner';

type IntegrationId = 'google-drive' | 'manychat' | 'stripe' | 'zen-magic';

export default function IntegracionesPage() {
  const params = useParams();

  useEffect(() => {
    document.title = 'Zen Studio - Integraciones';
  }, []);

  const studioSlug = params?.slug as string;

  // Detectar cuando se conecta exitosamente y disparar evento
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    
    // Manejar éxito completo
    if (urlParams.get('success') === 'google_suite_connected') {
      toast.success('Google Suite conectado correctamente');
      // Disparar evento para que AppHeader actualice
      window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));
      // Limpiar el parámetro de la URL
      urlParams.delete('success');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
    
    // Manejar éxito parcial (con advertencias)
    if (urlParams.get('success') === 'google_suite_partial') {
      const warning = urlParams.get('warning');
      if (warning) {
        toast.warning(decodeURIComponent(warning), {
          duration: 8000,
        });
      } else {
        toast.success('Google Suite conectado parcialmente');
      }
      // Disparar evento para que AppHeader actualice
      window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));
      // Limpiar los parámetros de la URL
      urlParams.delete('success');
      urlParams.delete('warning');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
    
    // Manejar errores
    const error = urlParams.get('error');
    if (error) {
      toast.error(decodeURIComponent(error), {
        duration: 8000,
      });
      urlParams.delete('error');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
    
    // Legacy: mantener compatibilidad con códigos anteriores
    if (urlParams.get('success') === 'google_connected') {
      window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));
      urlParams.delete('success');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
    if (urlParams.get('success') === 'google_contacts_connected') {
      toast.success('Google Contacts conectado correctamente');
      urlParams.delete('success');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const [openModal, setOpenModal] = useState<IntegrationId | null>(null);


  const handleCloseModal = () => {
    setOpenModal(null);
  };


  if (!studioSlug) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Cloud className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <ZenCardTitle>Integraciones</ZenCardTitle>
              <ZenCardDescription>
                Conecta herramientas externas para potenciar tu flujo de trabajo
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GoogleIntegrationCard
              studioSlug={studioSlug}
            />
            <ManychatIntegrationCard />
            <StripeIntegrationCard />
            <ZenMagicIntegrationCard />
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modales */}
      {studioSlug && (
        <>
          <ManychatIntegrationModal
            isOpen={openModal === 'manychat'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
          />
          <StripeIntegrationModal
            isOpen={openModal === 'stripe'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
          />
          <ZenMagicIntegrationModal
            isOpen={openModal === 'zen-magic'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
          />
        </>
      )}
    </div>
  );
}

