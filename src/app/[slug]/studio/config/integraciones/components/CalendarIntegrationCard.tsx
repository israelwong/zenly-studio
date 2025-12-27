'use client';

import React, { useState } from 'react';
import { IntegrationCard } from './IntegrationCard';
import { ZenButton } from '@/components/ui/zen';
import { GoogleCalendarDisconnectModal } from '@/components/shared/integrations/GoogleCalendarDisconnectModal';
import { desvincularRecursoGoogle } from '@/lib/actions/auth/desconectar-google-calendar.actions';
import { toast } from 'sonner';

interface CalendarIntegrationCardProps {
  isConnected: boolean;
  studioSlug: string;
  onConnect: () => void;
  onDisconnected?: () => void;
}

export function CalendarIntegrationCard({
  isConnected,
  studioSlug,
  onConnect,
  onDisconnected,
}: CalendarIntegrationCardProps) {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = async (limpiarEventos: boolean) => {
    setDisconnecting(true);
    try {
      const result = await desvincularRecursoGoogle(studioSlug, limpiarEventos);

      if (result.success) {
        if (limpiarEventos && result.eventosEliminados) {
          toast.success(
            `Google Calendar desconectado. Se eliminaron ${result.eventosEliminados} eventos de tu calendario.`
          );
        } else {
          toast.success('Google Calendar desconectado. Los eventos se mantienen en tu calendario.');
        }
        setShowDisconnectModal(false);
        if (onDisconnected) {
          onDisconnected();
        }
      } else {
        toast.error(result.error || 'Error al desconectar Google Calendar');
      }
    } catch (error) {
      console.error('Error desconectando Google Calendar:', error);
      toast.error('Error al desconectar Google Calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <IntegrationCard
        name="Calendar"
        description="Sincroniza tu agenda con Google Calendar automáticamente"
        iconColor="text-purple-400"
        isConnected={isConnected}
        isComingSoon={false}
        onConnect={onConnect}
      >
        {!isConnected ? (
          <ZenButton
            variant="primary"
            size="sm"
            onClick={onConnect}
            className="w-full"
          >
            Conectar
          </ZenButton>
        ) : (
          <ZenButton
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDisconnectClick();
            }}
            className="w-full"
          >
            Desconectar
          </ZenButton>
        )}
      </IntegrationCard>
      {showDisconnectModal && (
        <GoogleCalendarDisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          onConfirm={handleConfirmDisconnect}
          studioSlug={studioSlug}
          isDisconnecting={disconnecting}
        />
      )}
    </>
  );
}

