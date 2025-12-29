'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ExternalLink, Settings, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/shadcn/popover';
import { ZenButton } from '@/components/ui/zen';
import { obtenerEstadoConexion } from '@/lib/integrations/google';
import { GoogleBundleModal } from './GoogleBundleModal';
import { GoogleContactsDisconnectModal } from './GoogleContactsDisconnectModal';
import { GoogleCalendarDisconnectModal } from './GoogleCalendarDisconnectModal';
import { GoogleDriveDisconnectModal } from './GoogleDriveDisconnectModal';
import { desconectarGoogleContacts, desconectarGoogleDrive, desvincularRecursoGoogle } from '@/lib/integrations/google';
import { toast } from 'sonner';

interface GoogleStatusPopoverProps {
  studioSlug: string;
  children: React.ReactNode;
}

interface ServiceStatus {
  name: string;
  connected: boolean;
  email?: string;
}

export function GoogleStatusPopover({
  studioSlug,
  children,
}: GoogleStatusPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [openFullSuite, setOpenFullSuite] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Evitar mismatch de hidratación renderizando solo en cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen, studioSlug]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const status = await obtenerEstadoConexion(studioSlug);
      
      const hasDriveScope = status.scopes?.some((scope) =>
        scope.includes('drive')
      ) || false;
      const hasCalendarScope = status.scopes?.some((scope) =>
        scope.includes('calendar')
      ) || false;
      const hasContactsScope = status.scopes?.some((scope) =>
        scope.includes('contacts')
      ) || false;

      const newServices: ServiceStatus[] = [
        {
          name: 'Google Drive',
          connected: hasDriveScope && !!status.email,
          email: status.email || undefined,
        },
        {
          name: 'Google Calendar',
          connected: hasCalendarScope && !!status.email,
          email: status.email || undefined,
        },
        {
          name: 'Google Contacts',
          connected: hasContactsScope && !!status.email,
          email: status.email || undefined,
        },
      ];

      setServices(newServices);
      setEmail(status.email || null);
    } catch (error) {
      console.error('Error cargando estado de Google:', error);
      setServices([
        { name: 'Google Drive', connected: false },
        { name: 'Google Calendar', connected: false },
        { name: 'Google Contacts', connected: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const allConnected = services.every((s) => s.connected);
  const anyConnected = services.some((s) => s.connected);
  const partialConnection = anyConnected && !allConnected; // 1 o 2 de 3 conectados

  const handleDisconnect = (serviceKey: string) => {
    setIsOpen(false);
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

  // Evitar renderizar Popover hasta que esté montado en cliente
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild suppressHydrationWarning>{children}</PopoverTrigger>
        <PopoverContent
          className="w-80 bg-zinc-900 border-zinc-800 p-0"
          align="end"
        >
          <div className="p-4 space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <h3 className="text-sm font-semibold text-white">
                  Google Suite
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Eleva la productividad de tu estudio con la Suite de Google integrada en Zen
              </p>
            </div>

            {/* Services Status */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-zinc-800/50 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {services.map((service) => {
                  const serviceKey = service.name.toLowerCase().includes('drive') ? 'drive' :
                                   service.name.toLowerCase().includes('calendar') ? 'calendar' : 'contacts';
                  return (
                    <div
                      key={service.name}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        service.connected ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {service.connected ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-zinc-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-300">
                            {service.name}
                          </div>
                          {service.connected && service.email && (
                            <div className="text-xs text-zinc-500 mt-0.5 truncate">
                              {service.email}
                            </div>
                          )}
                        </div>
                      </div>
                      {service.connected && (
                        <ZenButton
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDisconnect(serviceKey);
                          }}
                          className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-400"
                          disabled={disconnecting === serviceKey}
                          title="Desconectar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </ZenButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions - Solo mostrar después de cargar */}
            {!loading && !allConnected && (
              <div className="pt-2 border-t border-zinc-800">
                {!anyConnected ? (
                  <ZenButton
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setIsOpen(false);
                      setShowBundleModal(true);
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Conectar Google Suite
                  </ZenButton>
                ) : (
                  <ZenButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setIsOpen(false);
                      setShowBundleModal(true);
                    }}
                  >
                    <Settings className="h-3 w-3 mr-2" />
                    Gestionar
                  </ZenButton>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <GoogleBundleModal
        isOpen={showBundleModal}
        onClose={() => {
          setShowBundleModal(false);
          setOpenFullSuite(false);
          loadStatus();
        }}
        studioSlug={studioSlug}
        openFullSuite={openFullSuite}
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

