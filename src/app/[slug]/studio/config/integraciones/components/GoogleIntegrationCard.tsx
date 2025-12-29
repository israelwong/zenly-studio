'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IntegrationCard } from './IntegrationCard';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { obtenerEstadoConexion } from '@/lib/integrations/google';
import { GoogleBundleModal } from '@/components/shared/integrations/GoogleBundleModal';
import { GoogleContactsDisconnectModal } from '@/components/shared/integrations/GoogleContactsDisconnectModal';
import { GoogleCalendarDisconnectModal } from '@/components/shared/integrations/GoogleCalendarDisconnectModal';
import { GoogleDriveDisconnectModal } from '@/components/shared/integrations/GoogleDriveDisconnectModal';
import { desconectarGoogleContacts, desconectarGoogleDrive, desvincularRecursoGoogle } from '@/lib/integrations/google';
import { CheckCircle2, XCircle, Settings, X } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleIntegrationCardProps {
  studioSlug: string;
}

interface ServiceStatus {
  name: string;
  key: 'drive' | 'calendar' | 'contacts';
  connected: boolean;
  description: string;
}

export function GoogleIntegrationCard({
  studioSlug,
}: GoogleIntegrationCardProps) {
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const status = await obtenerEstadoConexion(studioSlug);

      // Verificar scopes y que tenga email (el token ya está verificado en obtenerEstadoConexion)
      // Cada recurso se evalúa independientemente: scope + email = conectado
      const hasDriveScope = status.scopes?.some((scope) =>
        scope.includes('drive')
      ) || false;
      const hasCalendarScope = status.scopes?.some((scope) =>
        scope.includes('calendar')
      ) || false;
      const hasContactsScope = status.scopes?.some((scope) =>
        scope.includes('contacts')
      ) || false;

      // Un servicio está conectado si tiene scope + email (el token ya está verificado en obtenerEstadoConexion)
      // No usar status.isConnected porque es un valor general, verificar cada recurso independientemente
      const driveConnected = hasDriveScope && !!status.email;
      const calendarConnected = hasCalendarScope && !!status.email;
      const contactsConnected = hasContactsScope && !!status.email;

      setServices([
        {
          name: 'Google Drive',
          key: 'drive',
          connected: driveConnected,
          description: 'Vincula carpetas de Google Drive a tus entregables para optimizar almacenamiento',
        },
        {
          name: 'Google Calendar',
          key: 'calendar',
          connected: calendarConnected,
          description: 'Sincroniza tu agenda con Google Calendar automáticamente',
        },
        {
          name: 'Google Contacts',
          key: 'contacts',
          connected: contactsConnected,
          description: 'Sincroniza tus contactos y staff con Google Contacts automáticamente',
        },
      ]);

      setEmail(status.email || null);
    } catch (error) {
      console.error('Error cargando estado de Google:', error);
      setServices([
        { name: 'Google Drive', key: 'drive', connected: false, description: 'Vincula carpetas de Google Drive a tus entregables para optimizar almacenamiento' },
        { name: 'Google Calendar', key: 'calendar', connected: false, description: 'Sincroniza tu agenda con Google Calendar automáticamente' },
        { name: 'Google Contacts', key: 'contacts', connected: false, description: 'Sincroniza tus contactos y staff con Google Contacts automáticamente' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Recargar estado cuando hay cambios en la conexión
  useEffect(() => {
    const handleConnectionChange = () => {
      loadStatus();
    };
    window.addEventListener('google-calendar-connection-changed', handleConnectionChange);
    return () => {
      window.removeEventListener('google-calendar-connection-changed', handleConnectionChange);
    };
  }, [loadStatus]);

  const allConnected = services.every((s) => s.connected);
  const anyConnected = services.some((s) => s.connected);
  const connectedCount = services.filter((s) => s.connected).length;
  const partialConnection = anyConnected && !allConnected; // 1 o 2 de 3 conectados

  const handleManage = () => {
    setShowBundleModal(true);
  };

  const handleDisconnect = (serviceKey: string) => {
    setShowDisconnectModal(serviceKey);
  };

  const handleConfirmDisconnect = async (serviceKey: string, option: boolean) => {
    setDisconnecting(serviceKey);
    try {
      let result;

      if (serviceKey === 'contacts') {
        result = await desconectarGoogleContacts(studioSlug, option);
        if (result.success) {
          if (option && result.contactosEliminados) {
            toast.success(
              `Google Contacts desconectado. Se eliminaron ${result.contactosEliminados} contactos de tu Google Contacts.`
            );
          } else {
            toast.success('Google Contacts desconectado. Los contactos se mantienen en tu Google Contacts.');
          }
        }
      } else if (serviceKey === 'calendar') {
        result = await desvincularRecursoGoogle(studioSlug, option);
        if (result.success) {
          if (option && result.eventosEliminados) {
            toast.success(
              `Google Calendar desconectado. Se eliminaron ${result.eventosEliminados} eventos de tu calendario.`
            );
          } else {
            toast.success('Google Calendar desconectado. Los eventos se mantienen en tu calendario.');
          }
        }
      } else if (serviceKey === 'drive') {
        result = await desconectarGoogleDrive(studioSlug, option);
        if (result.success) {
          toast.success('Google Drive desconectado correctamente');
        }
      }

      if (result && !result.success) {
        toast.error(result.error || `Error al desconectar ${serviceKey}`);
      } else {
        setShowDisconnectModal(null);
        await loadStatus();
        // Disparar evento para que AppHeader actualice
        window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));
      }
    } catch (error) {
      console.error(`Error desconectando ${serviceKey}:`, error);
      toast.error(`Error al desconectar ${serviceKey}`);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleModalClose = () => {
    setShowBundleModal(false);
    loadStatus();
    // Disparar evento para que AppHeader actualice
    window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));
  };

  // No renderizar contenido hasta que termine de cargar
  if (loading) {
    return (
      <IntegrationCard
        name="Google Suite"
        description="Conecta Drive, Calendar y Contacts para sincronizar tu flujo de trabajo"
        iconColor="text-blue-400"
        isConnected={false}
        isComingSoon={false}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 bg-zinc-800/50 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      </IntegrationCard>
    );
  }

  // Construir descripción dinámica basada en servicios conectados
  const getDescription = () => {
    if (!anyConnected) {
      return 'Eleva la productividad de tu estudio con la Suite de Google integrada en Zen';
    }

    const connectedServices = services.filter(s => s.connected);
    if (connectedServices.length === 1) {
      return connectedServices[0].description;
    }
    if (connectedServices.length === 2) {
      return `${connectedServices[0].name} y ${connectedServices[1].name} conectados. Gestiona desde aquí.`;
    }
    return 'Suite completa conectada. Gestiona Drive, Calendar y Contacts desde un solo lugar.';
  };

  return (
    <>
      <IntegrationCard
        name="Google Suite"
        description={getDescription()}
        iconColor="text-blue-400"
        isConnected={anyConnected}
        isComingSoon={false}
        onConnect={handleManage}
        onManage={handleManage}
        manageLabel="Gestionar"
      >
        <div className="space-y-3">
          {/* Lista de servicios */}
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.key}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  service.connected
                    ? 'bg-zinc-800/50 border border-zinc-700'
                    : 'bg-zinc-800/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status icon */}
                  {service.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-zinc-500 shrink-0" />
                  )}
                  
                  {/* Nombre de integración */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-zinc-300 block">
                      {service.name}
                    </span>
                    {service.connected && email && (
                      <span className="text-xs text-zinc-500 mt-0.5 block">
                        {email}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Botón Desconectar (solo si está conectado) */}
                {service.connected && (
                  <ZenButton
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDisconnect(service.key);
                    }}
                    className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-400"
                    disabled={disconnecting === service.key}
                    title="Desconectar"
                  >
                    <X className="h-4 w-4" />
                  </ZenButton>
                )}
              </div>
            ))}
          </div>

          {/* Email conectado (solo si todas están conectadas con la misma cuenta) */}
          {allConnected && email && (
            <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800 text-center">
              Conectado como: <span className="text-zinc-300 font-medium">{email}</span>
            </div>
          )}

          {/* Botón de acción - Solo mostrar si no todas están conectadas */}
          {!allConnected && (
            <ZenButton
              variant={anyConnected ? 'outline' : 'primary'}
              size="sm"
              onClick={handleManage}
              className="w-full"
            >
              <Settings className="h-3 w-3 mr-2" />
              {anyConnected
                ? `Gestionar (${connectedCount}/3)`
                : 'Conectar Google Suite'}
            </ZenButton>
          )}
        </div>
      </IntegrationCard>

      <GoogleBundleModal
        isOpen={showBundleModal}
        onClose={handleModalClose}
        studioSlug={studioSlug}
      />

      {/* Modales de desconexión */}
      {showDisconnectModal === 'contacts' && (
        <GoogleContactsDisconnectModal
          isOpen={true}
          onClose={() => setShowDisconnectModal(null)}
          onConfirm={(eliminarContactos) => handleConfirmDisconnect('contacts', eliminarContactos)}
          studioSlug={studioSlug}
          isDisconnecting={disconnecting === 'contacts'}
        />
      )}

      {showDisconnectModal === 'calendar' && (
        <GoogleCalendarDisconnectModal
          isOpen={true}
          onClose={() => setShowDisconnectModal(null)}
          onConfirm={(limpiarEventos) => handleConfirmDisconnect('calendar', limpiarEventos)}
          studioSlug={studioSlug}
          isDisconnecting={disconnecting === 'calendar'}
        />
      )}

      {showDisconnectModal === 'drive' && (
        <GoogleDriveDisconnectModal
          isOpen={true}
          onClose={() => setShowDisconnectModal(null)}
          onConfirm={(limpiarPermisos) => handleConfirmDisconnect('drive', limpiarPermisos)}
          studioSlug={studioSlug}
          isDisconnecting={disconnecting === 'drive'}
        />
      )}
    </>
  );
}
