'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';
import type { RealtimeChannel } from '@supabase/realtime-js';

interface UseContactsRealtimeProps {
  studioSlug: string;
  onContactInserted?: (contactId: string) => void;
  onContactUpdated?: (contactId: string) => void;
  onContactDeleted?: (contactId: string) => void;
  enabled?: boolean;
}

/**
 * Hook para escuchar cambios en tiempo real de contactos (studio_contacts)
 * Útil para actualizar la UI cuando el cliente modifica sus datos de contacto
 */
export function useContactsRealtime({
  studioSlug,
  onContactInserted,
  onContactUpdated,
  onContactDeleted,
  enabled = true,
}: UseContactsRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  // Handlers para cada tipo de operación
  const handleInsert = useCallback(
    (payload: unknown) => {
      const p = payload as any;
      const contact = p.record || p.new || p.payload?.record || p.payload?.new;
      if (contact?.id) {
        console.log('[useContactsRealtime] Contacto insertado:', contact.id);
        onContactInserted?.(contact.id);
      }
    },
    [onContactInserted]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      const p = payload as any;
      const contact = p.record || p.new || p.payload?.record || p.payload?.new;
      if (contact?.id) {
        console.log('[useContactsRealtime] Contacto actualizado:', contact.id);
        onContactUpdated?.(contact.id);
      }
    },
    [onContactUpdated]
  );

  const handleDelete = useCallback(
    (payload: unknown) => {
      const p = payload as any;
      const contact = p.old_record || p.old || p.payload?.old_record || p.payload?.old;
      if (contact?.id) {
        console.log('[useContactsRealtime] Contacto eliminado:', contact.id);
        onContactDeleted?.(contact.id);
      }
    },
    [onContactDeleted]
  );

  useEffect(() => {
    if (!studioSlug || !enabled) {
      return;
    }

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Configurar Realtime usando utilidad centralizada
    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          console.error('[useContactsRealtime] Error configurando auth:', authResult.error);
          return;
        }

        // Crear canal para contactos
        const channel = createRealtimeChannel(supabase, {
          channelName: `studio:${studioSlug}:contacts`,
          isPrivate: false,
          requiresAuth: false,
          self: true,
          ack: true,
        });

        // Agregar listeners
        channel
          .on('broadcast', { event: 'INSERT' }, handleInsert)
          .on('broadcast', { event: 'UPDATE' }, handleUpdate)
          .on('broadcast', { event: 'DELETE' }, handleDelete)
          // También escuchar eventos genéricos de realtime.send (formato alternativo)
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'INSERT') handleInsert(payload);
            else if (operation === 'UPDATE') handleUpdate(payload);
            else if (operation === 'DELETE') handleDelete(payload);
          });

        // Suscribirse usando utilidad centralizada
        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[useContactsRealtime] Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
        console.log('[useContactsRealtime] ✅ Canal configurado y suscrito exitosamente');
      } catch (error) {
        console.error('[useContactsRealtime] ❌ Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        console.log('[useContactsRealtime] 🧹 Desuscribiéndose del canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug, enabled, handleInsert, handleUpdate, handleDelete, supabase]);
}

