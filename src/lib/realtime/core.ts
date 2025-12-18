/**
 * REALTIME CORE - Fuente Única de Verdad v2.0.0
 * 
 * Configuración centralizada para Supabase Realtime
 * - Unifica creación de canales
 * - Maneja autenticación correctamente
 * - Soporta usuarios autenticados y anónimos
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeChannelConfig {
  /** Nombre del canal (ej: 'studio:mi-estudio:cotizaciones') */
  channelName: string;
  /** Si el canal es privado (requerido para realtime.broadcast_changes) */
  isPrivate: boolean;
  /** Si requiere autenticación (true para studio, false para promises públicos) */
  requiresAuth: boolean;
  /** Si debe recibir sus propios broadcasts */
  self: boolean;
  /** Si requiere acknowledgment */
  ack: boolean;
}

export interface RealtimeAuthResult {
  success: boolean;
  hasSession: boolean;
  error?: string;
}

/**
 * Configura autenticación para Realtime
 * IMPORTANTE: Debe llamarse ANTES de suscribirse al canal
 */
export async function setupRealtimeAuth(
  supabase: SupabaseClient,
  requiresAuth: boolean = false
): Promise<RealtimeAuthResult> {
  try {
    // Usar getUser() primero para verificar autenticación (más confiable)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError && requiresAuth) {
      console.warn('[Realtime Core] ⚠️ Error obteniendo usuario:', userError);
      return { success: false, hasSession: false, error: userError.message };
    }

    // Si no hay usuario y requiere auth, retornar error
    if (requiresAuth && !user) {
      return {
        success: false,
        hasSession: false,
        error: 'Autenticación requerida pero no hay usuario autenticado'
      };
    }

    // Obtener sesión para el token
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Si hay error o no hay sesión y requiere auth, intentar refrescar
    if ((sessionError || !session) && requiresAuth && user) {
      console.log('[Realtime Core] 🔄 Intentando refrescar sesión...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshedSession) {
        session = refreshedSession;
        sessionError = null;
        console.log('[Realtime Core] ✅ Sesión refrescada exitosamente');
      }
    }

    if (sessionError) {
      console.warn('[Realtime Core] ⚠️ Error obteniendo sesión:', sessionError);
      // Si no requiere auth, continuar sin sesión
      if (!requiresAuth) {
        await supabase.realtime.setAuth(null);
        return { success: true, hasSession: false };
      }
      return { success: false, hasSession: false, error: sessionError.message };
    }

    // Verificar que el token existe y es válido
    const accessToken = session?.access_token;

    if (requiresAuth && !accessToken) {
      return {
        success: false,
        hasSession: false,
        error: 'Token de acceso no disponible'
      };
    }

    // IMPORTANTE: setAuth debe llamarse ANTES de crear cualquier canal
    // Para canales privados, SIEMPRE pasar el token explícitamente
    // Esto asegura que Realtime tenga el contexto de autenticación correcto
    try {
      if (requiresAuth && accessToken) {
        // Para canales privados, pasar el token explícitamente
        // Esto es CRÍTICO para que auth.uid() funcione en las políticas RLS
        await supabase.realtime.setAuth(accessToken);
        console.log('[Realtime Core] 🔑 Token pasado explícitamente a setAuth()');
      } else if (!requiresAuth) {
        // Para canales públicos, pasar null
        await supabase.realtime.setAuth(null);
      } else {
        // Si requiere auth pero no hay token, intentar obtenerlo automáticamente
        await supabase.realtime.setAuth();
        console.log('[Realtime Core] ⚠️ setAuth() llamado sin token (fallback)');
      }

      // Decodificar token para verificar contenido (solo para debugging)
      let tokenPayload: any = null;
      if (accessToken) {
        try {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            tokenPayload = JSON.parse(atob(parts[1]));
          }
        } catch {
          // Ignorar error de decodificación
        }
      }

      console.log('[Realtime Core] ✅ setAuth llamado con token:', {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        tokenSub: tokenPayload?.sub || 'N/A',
        tokenExp: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : 'N/A',
        tokenExpired: tokenPayload?.exp ? Date.now() > tokenPayload.exp * 1000 : false,
      });
    } catch (setAuthError) {
      console.error('[Realtime Core] ❌ Error en setAuth:', setAuthError);
      if (requiresAuth) {
        return { success: false, hasSession: false, error: 'Error configurando autenticación Realtime' };
      }
    }

    const hasSession = !!accessToken;

    console.log('[Realtime Core] 🔐 Auth configurado:', {
      hasSession,
      requiresAuth,
      userId: user?.id,
      hasToken: !!accessToken,
      timestamp: new Date().toISOString(),
    });

    // Si requiere auth pero no hay sesión, retornar error
    if (requiresAuth && !hasSession) {
      return {
        success: false,
        hasSession: false,
        error: 'Autenticación requerida pero no hay sesión activa'
      };
    }

    // IMPORTANTE: Esperar más tiempo para asegurar que el token se propaga completamente
    // Realtime necesita tiempo para procesar el token antes de suscribirse
    if (hasSession) {
      console.log('[Realtime Core] ⏳ Esperando propagación del token...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[Realtime Core] ✅ Espera completada');
    }

    return { success: true, hasSession };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[Realtime Core] ❌ Error configurando auth:', error);

    // Si no requiere auth, continuar de todas formas
    if (!requiresAuth) {
      try {
        await supabase.realtime.setAuth(null);
        return { success: true, hasSession: false };
      } catch {
        return { success: false, hasSession: false, error: errorMessage };
      }
    }

    return { success: false, hasSession: false, error: errorMessage };
  }
}

/**
 * Crea un canal de Realtime con configuración unificada
 */
export function createRealtimeChannel(
  supabase: SupabaseClient,
  config: RealtimeChannelConfig
): RealtimeChannel {
  const channel = supabase.channel(config.channelName, {
    config: {
      private: config.isPrivate,
      broadcast: {
        self: config.self,
        ack: config.ack,
      },
    },
  });

  console.log('[Realtime Core] 📡 Canal creado:', {
    channelName: config.channelName,
    isPrivate: config.isPrivate,
    requiresAuth: config.requiresAuth,
    timestamp: new Date().toISOString(),
  });

  return channel;
}

/**
 * Configuración predefinida para diferentes tipos de canales
 */
export const RealtimeChannelPresets = {
  /** Canal para cotizaciones (studio autenticado o promise público) */
  cotizaciones: (studioSlug: string, usePublicChannel: boolean = true): RealtimeChannelConfig => ({
    channelName: `studio:${studioSlug}:cotizaciones`,
    isPrivate: !usePublicChannel, // Con realtime.send, usar canales públicos
    requiresAuth: false, // Canales públicos no requieren auth
    self: true,
    ack: true,
  }),

  /** Canal para notificaciones (solo studio autenticado) */
  notifications: (studioSlug: string, usePublicChannel: boolean = false): RealtimeChannelConfig => ({
    channelName: `studio:${studioSlug}:notifications`,
    isPrivate: !usePublicChannel, // Si usa realtime.send, puede ser público
    requiresAuth: !usePublicChannel, // Si es público, no requiere auth
    self: true,
    ack: true,
  }),

  /** Canal para promises (solo studio autenticado) */
  promises: (studioSlug: string, usePublicChannel: boolean = false): RealtimeChannelConfig => ({
    channelName: `studio:${studioSlug}:promises`,
    isPrivate: !usePublicChannel, // Si usa realtime.send, puede ser público
    requiresAuth: !usePublicChannel, // Si es público, no requiere auth
    self: true,
    ack: true,
  }),
};

/**
 * Helper para suscribirse a un canal con manejo de errores
 * IMPORTANTE: Asegura que setAuth() se haya propagado antes de suscribirse
 */
export async function subscribeToChannel(
  channel: RealtimeChannel,
  onStatusChange?: (status: string, err?: Error) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    // Pequeña pausa adicional para asegurar que el token se propaga
    setTimeout(() => {
      channel.subscribe((status, err) => {
        console.log('[Realtime Core] 📡 Estado de suscripción:', {
          status,
          error: err?.message,
          channelName: channel.topic,
          timestamp: new Date().toISOString(),
        });

        if (onStatusChange) {
          onStatusChange(status, err);
        }

        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Core] ✅ Suscrito exitosamente:', channel.topic);
          resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const errorMsg = err?.message || 'Error desconocido';
          const isUnauthorized = errorMsg.includes('Unauthorized') || errorMsg.includes('permissions');

          console.error('[Realtime Core] ❌ Error en suscripción:', {
            status,
            error: errorMsg,
            isUnauthorized,
            channelName: channel.topic,
            suggestion: isUnauthorized
              ? 'Verificar que setAuth() se llamó con token válido y que la política RLS permite acceso'
              : 'Error desconocido en suscripción',
          });
          resolve(false);
        } else if (status === 'CLOSED') {
          console.log('[Realtime Core] 🔒 Canal cerrado:', channel.topic);
          resolve(false);
        }
      });
    }, 100); // Pausa adicional para propagación del token
  });
}
