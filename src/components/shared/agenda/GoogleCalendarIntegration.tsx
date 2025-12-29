'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  X,
  MoreVertical,
} from 'lucide-react';
import {
  ZenButton,
  ZenCard,
  ZenBadge,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { iniciarVinculacionRecursoGoogleClient } from '@/lib/actions/auth/oauth-client.actions';
import { obtenerEstadoConexion } from '@/lib/integrations/google';
import {
  desvincularRecursoGoogle,
} from '@/lib/integrations/google';
import {
  sincronizarTodosEventosPrincipales,
  contarEventosPendientesSincronizar,
} from '@/lib/integrations/google/clients/calendar/helpers';
import { GoogleCalendarConnectionModal } from '@/components/shared/integrations/GoogleCalendarConnectionModal';
import { toast } from 'sonner';
import { GoogleCalendarDisconnectModal } from '@/components/shared/integrations/GoogleCalendarDisconnectModal';

interface GoogleCalendarIntegrationProps {
  studioSlug: string;
  onSync?: () => void;
}

type ConnectionState = 'loading' | 'connected' | 'disconnected' | 'error';

export function GoogleCalendarIntegration({
  studioSlug,
  onSync,
}: GoogleCalendarIntegrationProps) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConnectionState>('loading');
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleName, setGoogleName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [eventosPendientes, setEventosPendientes] = useState<number | null>(null);

  const cargarEventosPendientes = useCallback(async () => {
    try {
      const result = await contarEventosPendientesSincronizar(studioSlug);
      if (result.success && result.pendientes !== undefined) {
        setEventosPendientes(result.pendientes);
      } else {
        setEventosPendientes(0);
      }
    } catch (error) {
      console.error('Error cargando eventos pendientes:', error);
      setEventosPendientes(0);
    }
  }, [studioSlug]);

  const loadConnectionStatus = useCallback(async () => {
    try {
      const result = await obtenerEstadoConexion(studioSlug);

      if (!result.success) {
        setState('error');
        return;
      }

      // Verificar si está conectado Y tiene scopes de Calendar
      const hasCalendarScope =
        result.scopes?.some(
          (scope) =>
            scope.includes('calendar') || scope.includes('calendar.events')
        ) || false;

      // Considerar conectado si: está conectado Y tiene scopes de Calendar
      // El email puede ser null pero aún estar conectado (aunque debería tenerlo)
      if (result.isConnected && hasCalendarScope) {
        setState('connected');
        setGoogleEmail(result.email || null);
        setGoogleName(result.name || null);
        
        // Cargar eventos pendientes de sincronizar (llamar directamente sin dependencia)
        try {
          const eventosResult = await contarEventosPendientesSincronizar(studioSlug);
          if (eventosResult.success && eventosResult.pendientes !== undefined) {
            setEventosPendientes(eventosResult.pendientes);
          } else {
            setEventosPendientes(0);
          }
        } catch (error) {
          console.error('Error cargando eventos pendientes:', error);
          setEventosPendientes(0);
        }
      } else if (result.isConnected && !hasCalendarScope) {
        // Conectado pero sin scopes de Calendar - mostrar como desconectado para Calendar
        setState('disconnected');
        setGoogleEmail(null);
        setGoogleName(null);
      } else {
        setState('disconnected');
        setGoogleEmail(null);
        setGoogleName(null);
      }
    } catch (error) {
      console.error('[GoogleCalendarIntegration] Error cargando estado de conexión:', error);
      setState('error');
    }
  }, [studioSlug]);

  useEffect(() => {
    loadConnectionStatus();
  }, [loadConnectionStatus]);


  useEffect(() => {
    // Verificar parámetros de URL para mensajes de error/éxito
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error === 'oauth_cancelled') {
      toast.error('La vinculación fue cancelada por el usuario.');
    } else if (error === 'auth_failed') {
      toast.error('Hubo un problema al conectar con Google. Reintenta.');
    } else if (error === 'access_denied') {
      toast.error(
        'Necesitamos permisos de escritura para sincronizar el calendario.'
      );
    } else if (success === 'google_connected') {
      toast.success('Google Calendar conectado exitosamente');
      loadConnectionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnectClick = () => {
    // Mostrar modal informativo primero
    setShowConnectionModal(true);
  };

  const handleConfirmConnect = async () => {
    setConnecting(true);
    try {
      const result = await iniciarVinculacionRecursoGoogleClient(studioSlug);

      if (!result.success) {
        // Manejar errores específicos de Supabase
        let errorMessage = result.error || 'Error al iniciar conexión con Google';

        if (result.error?.includes('provider is not enabled') || result.error?.includes('Unsupported provider')) {
          errorMessage = 'El proveedor de Google no está habilitado en Supabase. Por favor, contacta al administrador.';
        } else if (result.error?.includes('validation_failed')) {
          errorMessage = 'Error de configuración de Google OAuth. Verifica la configuración en Supabase Dashboard.';
        }

        toast.error(errorMessage);
        setConnecting(false);
        setShowConnectionModal(false);
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
      setShowConnectionModal(false);
    }
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const result = await sincronizarTodosEventosPrincipales(studioSlug);

      if (result.success) {
        if (result.sincronizados && result.sincronizados > 0) {
          toast.success(
            `✅ ${result.sincronizados} evento(s) sincronizado(s) con Google Calendar`
          );

          // Actualizar estado local del card (recargar estado de conexión y eventos pendientes)
          // Esto asegura que el card refleje los cambios sin recargar todo
          await loadConnectionStatus();
          await cargarEventosPendientes();
        } else {
          toast.info('Todos los eventos ya están sincronizados');
        }

        if (result.errores && result.errores > 0) {
          toast.warning(`${result.errores} evento(s) tuvieron errores al sincronizar`);
        }

        // NO llamar a onSync() para evitar recargar el calendario completo
        // El calendario se actualizará automáticamente cuando el usuario navegue o recargue
        // Solo actualizamos el estado local del card de integración
      } else {
        toast.error(result.error || 'Error al sincronizar eventos');
      }
    } catch (error) {
      console.error('Error sincronizando eventos:', error);
      toast.error('Error al sincronizar eventos');
    } finally {
      setSincronizando(false);
    }
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
        await loadConnectionStatus();

        // Disparar evento personalizado para actualizar AppHeader en tiempo real
        window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));

        if (onSync) {
          onSync();
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

  if (state === 'loading') {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-zinc-800/50 rounded-lg"></div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <ZenCard className="p-4 bg-red-950/20 border-red-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-400 mb-1">
              Error de Conexión
            </h3>
            <p className="text-xs text-red-300/80 mb-3">
              Hubo un problema al verificar el estado de Google Calendar.
            </p>
            <ZenButton
              variant="outline"
              size="sm"
              onClick={loadConnectionStatus}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reintentar
            </ZenButton>
          </div>
        </div>
      </ZenCard>
    );
  }

  if (state === 'disconnected') {
    return (
      <>
        {/* Disparador minimalista */}
        <div className="p-3 border border-dashed border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors bg-zinc-800/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-1.5 bg-zinc-700/50 rounded shrink-0">
                <ExternalLink className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-300">
                  Configurar Google Calendar
                </div>
                <div className="text-xs text-zinc-500">
                  Sincroniza eventos y tareas automáticamente
                </div>
              </div>
            </div>
            <ZenButton
              variant="primary"
              size="sm"
              onClick={handleConnectClick}
              className="shrink-0"
            >
              Conectar ahora
            </ZenButton>
          </div>
        </div>

        {/* Modal informativo */}
        <GoogleCalendarConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          onConnect={handleConfirmConnect}
          connecting={connecting}
        />
      </>
    );
  }

  // Estado: Conectado
  return (
    <>
      <ZenCard className="p-4 bg-zinc-800/50 border-zinc-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-zinc-200 truncate">
                  {googleName
                    ? `Conectado al Calendario de ${googleName}`
                    : googleEmail
                      ? `Conectado al Calendario de ${googleEmail}`
                      : 'Conectado al Calendario'}
                </h3>
                <ZenBadge
                  variant={eventosPendientes && eventosPendientes > 0 ? 'warning' : 'success'}
                  size="sm"
                  className="shrink-0"
                >
                  {eventosPendientes && eventosPendientes > 0
                    ? `${eventosPendientes} Pendiente${eventosPendientes > 1 ? 's' : ''}`
                    : 'Sincronizado'}
                </ZenBadge>
              </div>
              {googleEmail && (
                <p className="text-xs text-zinc-400 mb-3">
                  Sincronizando con <span className="text-zinc-300 font-medium break-all">{googleEmail}</span>
                </p>
              )}
            </div>
          </div>

          {/* Botones de acción a la derecha */}
          <div className="flex items-center gap-2 shrink-0">
            <ZenButton
              variant="primary"
              size="sm"
              onClick={handleSincronizar}
              disabled={sincronizando}
              className="text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${sincronizando ? 'animate-spin' : ''}`} />
              {eventosPendientes && eventosPendientes > 0
                ? 'Sincronizar Agenda'
                : 'Sincronizar Nuevamente'}
            </ZenButton>

            <ZenDropdownMenu>
              <ZenDropdownMenuTrigger asChild>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 border-0"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </ZenButton>
              </ZenDropdownMenuTrigger>
              <ZenDropdownMenuContent align="end" className="w-48">
                <ZenDropdownMenuItem
                  onClick={() => setShowConnectionModal(true)}
                  className="cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Cambiar Cuenta
                </ZenDropdownMenuItem>
                <ZenDropdownMenuSeparator />
                <ZenDropdownMenuItem
                  onClick={() => setShowDisconnectModal(true)}
                  className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-950/20"
                >
                  <X className="h-3.5 w-3.5 mr-2" />
                  Desconectar
                </ZenDropdownMenuItem>
              </ZenDropdownMenuContent>
            </ZenDropdownMenu>
          </div>
        </div>
      </ZenCard>

      {/* Modal informativo de conexión */}
      <GoogleCalendarConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConfirmConnect}
        connecting={connecting}
      />

      {/* Modal de Confirmación para Desconectar */}
      <GoogleCalendarDisconnectModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleConfirmDisconnect}
        studioSlug={studioSlug}
        isDisconnecting={disconnecting}
      />
    </>
  );
}

