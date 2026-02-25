'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';

interface StudioDefaults {
  promise_share_default_show_packages: boolean;
  promise_share_default_show_categories_subtotals: boolean;
  promise_share_default_show_items_prices: boolean;
  promise_share_default_min_days_to_hire: number;
  promise_share_default_show_standard_conditions: boolean;
  promise_share_default_show_offer_conditions: boolean;
  promise_share_default_portafolios: boolean;
  promise_share_default_auto_generate_contract: boolean;
  promise_share_default_allow_online_authorization: boolean;
}

interface UsePromiseSettingsRealtimeProps {
  studioSlug: string;
  promiseId: string;
  studioDefaults: StudioDefaults;
  onSettingsUpdated?: (settings: PromiseShareSettings) => void;
}

export function usePromiseSettingsRealtime({
  studioSlug,
  promiseId,
  studioDefaults,
  onSettingsUpdated,
}: UsePromiseSettingsRealtimeProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);
  const onSettingsUpdatedRef = useRef(onSettingsUpdated);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onSettingsUpdatedRef.current = onSettingsUpdated;
  }, [onSettingsUpdated]);

  const extractSettings = useCallback((payload: unknown): PromiseShareSettings | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const p = payload as any;
    const record = p.payload?.new || p.payload?.record || p.new || p.record;

    if (!record || typeof record !== 'object') {
      return null;
    }

    // Verificar que el promiseId coincida
    if (record.id !== promiseId) {
      return null;
    }

    // Calcular settings combinando overrides con defaults (igual que getPublicPromiseData)
    return {
      show_packages: record.share_show_packages ?? studioDefaults.promise_share_default_show_packages,
      show_categories_subtotals: record.share_show_categories_subtotals ?? studioDefaults.promise_share_default_show_categories_subtotals,
      show_items_prices: record.share_show_items_prices ?? studioDefaults.promise_share_default_show_items_prices,
      min_days_to_hire: record.share_min_days_to_hire ?? studioDefaults.promise_share_default_min_days_to_hire,
      show_standard_conditions: record.share_show_standard_conditions ?? studioDefaults.promise_share_default_show_standard_conditions,
      show_offer_conditions: record.share_show_offer_conditions ?? studioDefaults.promise_share_default_show_offer_conditions,
      portafolios: record.share_portafolios ?? studioDefaults.promise_share_default_portafolios,
      allow_online_authorization: record.share_allow_online_authorization ?? studioDefaults.promise_share_default_allow_online_authorization ?? true,
      auto_generate_contract: record.share_auto_generate_contract ?? studioDefaults.promise_share_default_auto_generate_contract,
    };
  }, [promiseId, studioDefaults]);

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;

      const settings = extractSettings(payload);
      if (!settings) return;

      // Verificar si realmente cambiaron los campos share_*
      const p = payload as any;
      const record = p.payload?.new || p.payload?.record || p.new || p.record;
      const oldRecord = p.payload?.old || p.payload?.old_record || p.old || p.old_record;

      if (oldRecord) {
        const shareFieldsChanged =
          record.share_show_packages !== oldRecord.share_show_packages ||
          record.share_show_categories_subtotals !== oldRecord.share_show_categories_subtotals ||
          record.share_show_items_prices !== oldRecord.share_show_items_prices ||
          record.share_min_days_to_hire !== oldRecord.share_min_days_to_hire ||
          record.share_show_standard_conditions !== oldRecord.share_show_standard_conditions ||
          record.share_show_offer_conditions !== oldRecord.share_show_offer_conditions ||
          record.share_portafolios !== oldRecord.share_portafolios ||
          record.share_auto_generate_contract !== oldRecord.share_auto_generate_contract ||
          record.share_allow_online_authorization !== oldRecord.share_allow_online_authorization;

        if (!shareFieldsChanged) {
          return;
        }
      }

      if (onSettingsUpdatedRef.current) {
        onSettingsUpdatedRef.current(settings);
      }
    },
    [extractSettings]
  );

  useEffect(() => {
    if (!studioSlug || !promiseId) {
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          console.error('[usePromiseSettingsRealtime] Error configurando auth:', authResult.error);
          return;
        }

        const channelConfig = RealtimeChannelPresets.promises(studioSlug, true);
        const channel = createRealtimeChannel(supabase, channelConfig);

        channel
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'UPDATE') handleUpdate(payload);
          })
          .on('broadcast', { event: 'UPDATE' }, handleUpdate);

        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[usePromiseSettingsRealtime] Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error('[usePromiseSettingsRealtime] Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug, promiseId, handleUpdate, supabase]);
}
