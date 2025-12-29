'use client';

import React, { useState } from 'react';
import { IntegrationCard } from './IntegrationCard';
import { ZenButton } from '@/components/ui/zen';
import { iniciarConexionGoogleContacts, desconectarGoogleContacts } from '@/lib/integrations/google';
import { GoogleContactsConnectionModal } from '@/components/shared/integrations/GoogleContactsConnectionModal';
import { GoogleContactsDisconnectModal } from '@/components/shared/integrations/GoogleContactsDisconnectModal';
import { toast } from 'sonner';

interface GoogleContactsIntegrationCardProps {
  isConnected: boolean;
  studioSlug: string;
  onConnect: () => void;
  onDisconnected?: () => void;
}

export function GoogleContactsIntegrationCard({
  isConnected,
  studioSlug,
  onConnect,
  onDisconnected,
}: GoogleContactsIntegrationCardProps) {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnectClick = () => {
    setShowConnectionModal(true);
  };

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const handleConfirmConnect = async () => {
    setConnecting(true);
    try {
      const result = await iniciarConexionGoogleContacts(studioSlug);

      if (!result.success) {
        toast.error(result.error || 'Error al iniciar conexión con Google Contacts');
        setConnecting(false);
        setShowConnectionModal(false);
        return;
      }

      // Redirigir a la URL de OAuth
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error conectando Google Contacts:', error);
      toast.error('Error al conectar con Google Contacts');
      setConnecting(false);
      setShowConnectionModal(false);
    }
  };

  const handleConfirmDisconnect = async (eliminarContactos: boolean) => {
    setDisconnecting(true);
    try {
      const result = await desconectarGoogleContacts(studioSlug, eliminarContactos);

      if (result.success) {
        if (eliminarContactos && result.contactosEliminados) {
          toast.success(
            `Google Contacts desconectado. Se eliminaron ${result.contactosEliminados} contactos de tu Google Contacts.`
          );
        } else {
          toast.success('Google Contacts desconectado. Los contactos se mantienen en tu Google Contacts.');
        }
        setShowDisconnectModal(false);
        if (onDisconnected) {
          onDisconnected();
        }
      } else {
        toast.error(result.error || 'Error al desconectar Google Contacts');
      }
    } catch (error) {
      console.error('Error desconectando Google Contacts:', error);
      toast.error('Error al desconectar Google Contacts');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <IntegrationCard
        name="Google Contacts"
        description="Sincroniza tus contactos y staff con Google Contacts automáticamente"
        iconColor="text-green-400"
        isConnected={isConnected}
        isComingSoon={false}
        onConnect={handleConnectClick}
      >
        {!isConnected ? (
          <ZenButton
            variant="primary"
            size="sm"
            onClick={handleConnectClick}
            disabled={connecting}
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
      <GoogleContactsConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConfirmConnect}
        connecting={connecting}
      />
      <GoogleContactsDisconnectModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleConfirmDisconnect}
        studioSlug={studioSlug}
        isDisconnecting={disconnecting}
      />
    </>
  );
}

