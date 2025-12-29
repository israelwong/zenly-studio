'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  ZenButton,
  ZenBadge,
} from '@/components/ui/zen';
import {
  obtenerEstadoConexion,
} from '@/lib/actions/studio/integrations';
import {
  desvincularRecursoGoogle,
} from '@/lib/integrations/google';
import { GoogleCalendarDisconnectModal } from './GoogleCalendarDisconnectModal';
import { GoogleCalendarConnectionModal } from './GoogleCalendarConnectionModal';
import { iniciarVinculacionRecursoGoogleClient } from '@/lib/actions/auth/oauth-client.actions';
import { toast } from 'sonner';

interface GoogleCalendarConnectionProps {
  studioSlug: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  returnUrl?: string;
  variant?: 'default' | 'compact' | 'inline';
  showDisconnect?: boolean;
}

export function GoogleCalendarConnection({
  studioSlug,
  onConnected,
  onDisconnected,
  returnUrl,
  variant = 'default',
  showDisconnect = true,
}: GoogleCalendarConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | undefined>();
  const [scopes, setScopes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  useEffect(() => {
    loadConnectionStatus();
  }, [studioSlug]);

  const loadConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await obtenerEstadoConexion(studioSlug);

      // Verificar específicamente si Calendar está conectado
      const hasCalendarScope = status.scopes?.some(
        (scope) => scope.includes('calendar') || scope.includes('calendar.events')
      ) || false;

      setIsConnected(hasCalendarScope);
      setEmail(status.email);
      setScopes(status.scopes || []);

      if (hasCalendarScope && onConnected) {
        onConnected();
      }
    } catch (error) {
      console.error('Error loading connection status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectClick = () => {
    setShowConnectionModal(true);
  };

  const handleConfirmConnect = async () => {
    try {
      setIsConnecting(true);
      setShowConnectionModal(false);
      const result = await iniciarVinculacionRecursoGoogleClient(studioSlug);
      if (!result.success) {
        toast.error(result.error || 'Error al conectar con Google Calendar');
        setIsConnecting(false);
      }
      // La redirección ocurre automáticamente con Supabase OAuth
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Error al conectar con Google Calendar');
      setIsConnecting(false);
    }
  };

  const handleDisconnectClick = () => {
    console.log('[GoogleCalendarConnection] Mostrando modal de desconexión');
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = async (limpiarEventos: boolean) => {
    try {
      setIsDisconnecting(true);
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
        setIsConnected(false);
        setEmail(undefined);
        setScopes([]);
        await loadConnectionStatus();
        if (onDisconnected) {
          onDisconnected();
        }
      } else {
        toast.error(result.error || 'Error al desconectar Google Calendar');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error al desconectar Google Calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const hasCalendarScope = scopes.some((scope) => scope.includes('calendar'));


  // Variant: compact (para modales pequeños)
  if (variant === 'compact') {
    if (isLoading) {
      return (
        <>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          </div>
          <GoogleCalendarDisconnectModal
            isOpen={showDisconnectModal}
            onClose={() => setShowDisconnectModal(false)}
            onConfirm={handleConfirmDisconnect}
            studioSlug={studioSlug}
            isDisconnecting={isDisconnecting}
          />
        </>
      );
    }

    if (isConnected && hasCalendarScope) {
      return (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-zinc-300">
                Conectado: <span className="font-medium">{email}</span>
              </span>
            </div>
            {showDisconnect && (
              <ZenButton
                variant="outline"
                size="sm"
                onClick={handleDisconnectClick}
                disabled={isDisconnecting}
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Desconectar
              </ZenButton>
            )}
          </div>
          <GoogleCalendarDisconnectModal
            isOpen={showDisconnectModal}
            onClose={() => setShowDisconnectModal(false)}
            onConfirm={handleConfirmDisconnect}
            studioSlug={studioSlug}
            isDisconnecting={isDisconnecting}
          />
        </>
      );
    }

    return (
      <>
        <div className="bg-purple-950/20 rounded-lg p-4 border border-purple-800/50">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-1.5 bg-purple-600/20 rounded">
              <img
                src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-calendar.svg"
                alt="Google Calendar"
                className="h-4 w-4 object-contain"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-zinc-200 mb-1">
                Conecta Google Calendar
              </h4>
              <p className="text-xs text-zinc-400 mb-2">
                Sincroniza tu agenda con Google Calendar automáticamente.
              </p>
              <p className="text-xs text-purple-300/80">
                Tus eventos se sincronizarán bidireccionalmente con tu calendario de Google.
              </p>
            </div>
          </div>
          <ZenButton
            variant="primary"
            size="sm"
            onClick={handleConnectClick}
            disabled={isConnecting}
            className="w-full"
          >
            <img
              src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-calendar.svg"
              alt="Google Calendar"
              className="h-4 w-4 mr-2 object-contain"
            />
            Conectar con Google Calendar
          </ZenButton>
        </div>
        <GoogleCalendarConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          onConnect={handleConfirmConnect}
          connecting={isConnecting}
        />
        <GoogleCalendarDisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          onConfirm={handleConfirmDisconnect}
          studioSlug={studioSlug}
          isDisconnecting={isDisconnecting}
        />
      </>
    );
  }

  // Variant: inline (para usar dentro de formularios)
  if (variant === 'inline') {
    if (isConnected && hasCalendarScope) {
      return (
        <>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-300">
              Google Calendar conectado: <span className="font-medium">{email}</span>
            </span>
            {showDisconnect && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleDisconnectClick}
                disabled={isDisconnecting}
                className="h-6 px-2 text-xs"
              >
                Desconectar
              </ZenButton>
            )}
          </div>
          <GoogleCalendarDisconnectModal
            isOpen={showDisconnectModal}
            onClose={() => setShowDisconnectModal(false)}
            onConfirm={handleConfirmDisconnect}
            studioSlug={studioSlug}
            isDisconnecting={isDisconnecting}
          />
        </>
      );
    }

    return (
      <>
        <ZenButton
          variant="outline"
          size="sm"
          onClick={handleConnectClick}
          disabled={isConnecting}
        >
          <img
            src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-calendar.svg"
            alt="Google Calendar"
            className="h-4 w-4 mr-2 object-contain"
          />
          Conectar Google Calendar
        </ZenButton>
        <GoogleCalendarConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          onConnect={handleConfirmConnect}
          connecting={isConnecting}
        />
        <GoogleCalendarDisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          onConfirm={handleConfirmDisconnect}
          studioSlug={studioSlug}
          isDisconnecting={isDisconnecting}
        />
      </>
    );
  }

  // Variant: default (para páginas completas)
  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        </div>
        <GoogleCalendarDisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          onConfirm={handleConfirmDisconnect}
          studioSlug={studioSlug}
          isDisconnecting={isDisconnecting}
        />
      </>
    );
  }

  if (isConnected && hasCalendarScope) {
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-300">
              Conectado como: <span className="font-medium">{email}</span>
            </span>
            <ZenBadge variant="success" className="text-xs">
              Conectado
            </ZenBadge>
          </div>
          {showDisconnect && (
            <ZenButton
              variant="outline"
              onClick={handleDisconnectClick}
              disabled={isDisconnecting}
              className="w-full sm:w-auto"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Desconectar Google Calendar
            </ZenButton>
          )}
        </div>
        <GoogleCalendarDisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          onConfirm={handleConfirmDisconnect}
          studioSlug={studioSlug}
          isDisconnecting={isDisconnecting}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <XCircle className="h-4 w-4 text-zinc-500" />
          <span>No conectado</span>
        </div>
        <ZenButton
          onClick={handleConnectClick}
          disabled={isConnecting}
          className="w-full sm:w-auto"
        >
          <img
            src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-calendar.svg"
            alt="Google Calendar"
            className="h-4 w-4 mr-2 object-contain"
          />
          Conectar Google Calendar
        </ZenButton>
      </div>
      <GoogleCalendarConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConfirmConnect}
        connecting={isConnecting}
      />
      <GoogleCalendarDisconnectModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleConfirmDisconnect}
        studioSlug={studioSlug}
        isDisconnecting={isDisconnecting}
      />
    </>
  );
}

