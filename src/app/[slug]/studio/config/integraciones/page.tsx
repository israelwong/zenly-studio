'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Cloud } from 'lucide-react';
import { obtenerEstadoConexion } from '@/lib/actions/studio/integrations';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent } from '@/components/ui/zen';
import {
  GoogleDriveIntegrationModal,
  ManychatIntegrationModal,
  StripeIntegrationModal,
  ZenMagicIntegrationModal,
} from '@/components/shared/integrations';
import {
  CalendarIntegrationCard,
  GoogleDriveIntegrationCard,
  ManychatIntegrationCard,
  StripeIntegrationCard,
  ZenMagicIntegrationCard,
} from './components';
import { GoogleCalendarConnectionModal } from '@/components/shared/integrations/GoogleCalendarConnectionModal';
import { GoogleDriveDisconnectModal } from '@/components/shared/integrations/GoogleDriveDisconnectModal';
import { iniciarVinculacionRecursoGoogleClient } from '@/lib/actions/auth/oauth-client.actions';
import { desconectarGoogleDrive } from '@/lib/actions/studio/integrations';
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
    if (urlParams.get('success') === 'google_connected') {
      // Disparar evento para que AppHeader actualice
      window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));
      // Limpiar el parámetro de la URL
      urlParams.delete('success');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const [scopes, setScopes] = useState<string[]>([]);
  const [openModal, setOpenModal] = useState<IntegrationId | null>(null);
  // Estados para modales de Google Calendar
  const [showCalendarConnectionModal, setShowCalendarConnectionModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // Estados para modal de desconexión de Google Drive
  const [showDriveDisconnectModal, setShowDriveDisconnectModal] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);

  const loadConnectionStatus = useCallback(async () => {
    if (!studioSlug) return;
    const status = await obtenerEstadoConexion(studioSlug);
    setScopes(status.scopes || []);
  }, [studioSlug]);

  useEffect(() => {
    loadConnectionStatus();
  }, [loadConnectionStatus]);

  const hasDriveScope = scopes.some((scope) => scope.includes('drive'));
  const hasCalendarScope = scopes.some((scope) => scope.includes('calendar'));

  const handleConnectCalendar = () => {
    setShowCalendarConnectionModal(true);
  };


  const handleConnectDrive = () => {
    setOpenModal('google-drive');
  };

  const handleManageDrive = () => {
    setShowDriveDisconnectModal(true);
  };

  const handleConfirmDisconnectDrive = async (limpiarPermisos: boolean) => {
    if (!studioSlug) return;
    
    setDisconnectingDrive(true);
    try {
      const result = await desconectarGoogleDrive(studioSlug, limpiarPermisos);
      if (result.success) {
        toast.success('Google Drive desconectado correctamente');
        setShowDriveDisconnectModal(false);
        await loadConnectionStatus();
      } else {
        toast.error(result.error || 'Error al desconectar Google Drive');
      }
    } catch (error) {
      console.error('Error desconectando Google Drive:', error);
      toast.error('Error al desconectar Google Drive');
    } finally {
      setDisconnectingDrive(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(null);
    loadConnectionStatus();
  };

  // Handlers para Google Calendar
  const handleConfirmConnectCalendar = async () => {
    setConnecting(true);
    try {
      const result = await iniciarVinculacionRecursoGoogleClient(studioSlug);

      if (!result.success) {
        let errorMessage = result.error || 'Error al iniciar conexión con Google';

        if (result.error?.includes('provider is not enabled') || result.error?.includes('Unsupported provider')) {
          errorMessage = 'El proveedor de Google no está habilitado en Supabase. Por favor, contacta al administrador.';
        } else if (result.error?.includes('validation_failed')) {
          errorMessage = 'Error de configuración de Google OAuth. Verifica la configuración en Supabase Dashboard.';
        }

        toast.error(errorMessage);
        setConnecting(false);
        setShowCalendarConnectionModal(false);
      }
      // La redirección ocurre automáticamente
    } catch (error) {
      console.error('Error conectando Google Calendar:', error);

      let errorMessage = 'Error al conectar con Google Calendar';
      if (error instanceof Error) {
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          errorMessage = 'El proveedor de Google no está habilitado en Supabase. Por favor, contacta al administrador.';
        }
      }

      toast.error(errorMessage);
      setConnecting(false);
      setShowCalendarConnectionModal(false);
    }
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
            <CalendarIntegrationCard
              isConnected={hasCalendarScope}
              studioSlug={studioSlug}
              onConnect={handleConnectCalendar}
              onDisconnected={loadConnectionStatus}
            />
            <GoogleDriveIntegrationCard
              isConnected={hasDriveScope}
              onConnect={handleConnectDrive}
              onManage={handleManageDrive}
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
          <GoogleDriveIntegrationModal
            isOpen={openModal === 'google-drive'}
            onClose={handleCloseModal}
            studioSlug={studioSlug}
            onConnected={loadConnectionStatus}
          />
          {/* Modales de Google Calendar */}
          <GoogleCalendarConnectionModal
            isOpen={showCalendarConnectionModal}
            onClose={() => setShowCalendarConnectionModal(false)}
            onConnect={handleConfirmConnectCalendar}
            connecting={connecting}
          />
          <GoogleDriveDisconnectModal
            isOpen={showDriveDisconnectModal}
            onClose={() => setShowDriveDisconnectModal(false)}
            onConfirm={handleConfirmDisconnectDrive}
            studioSlug={studioSlug}
            isDisconnecting={disconnectingDrive}
          />
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

