'use client';

import React, { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { getPromiseShareSettings, type PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { PublicConfigList } from './PublicConfigList';

type ShareSettingsData = PromiseShareSettings & { has_cotizacion?: boolean; remember_preferences?: boolean };

interface PromisePublicConfigCardProps {
  studioSlug: string;
  promiseId: string;
  initialShareSettings: ShareSettingsData | null;
  initialCondicionesComerciales?: Array<{
    id: string;
    name: string;
    advance_percentage?: number | null;
    type?: string | null;
  }>;
  selectedCotizacionPrice?: number | null;
}

export function PromisePublicConfigCard({
  studioSlug,
  promiseId,
  initialShareSettings: initialShareSettingsProp = null,
  initialCondicionesComerciales = [],
  selectedCotizacionPrice = null,
}: PromisePublicConfigCardProps) {
  const hasInitialData = initialShareSettingsProp != null;
  const [loading, setLoading] = useState(!hasInitialData);
  const [settings, setSettings] = useState<ShareSettingsData | null>(initialShareSettingsProp);

  useEffect(() => {
    if (!hasInitialData) {
      getPromiseShareSettings(studioSlug, promiseId)
        .then((res) => {
          if (res.success && res.data) setSettings(res.data);
        })
        .finally(() => setLoading(false));
    }
  }, [studioSlug, promiseId, hasInitialData]);

  useEffect(() => {
    if (initialShareSettingsProp != null) setSettings(initialShareSettingsProp);
  }, [initialShareSettingsProp]);

  if (loading) {
    return (
      <ZenCard variant="outlined" className="border-zinc-800">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
        </ZenCardHeader>
        <ZenCardContent className="p-3 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </ZenCardContent>
      </ZenCard>
    );
  }

  const s = settings;
  const configProps = {
    paquetes: s?.show_packages ?? true,
    portafolios: s?.portafolios ?? true,
    contrato: s?.auto_generate_contract ?? false,
    redondeo: (s?.rounding_mode === 'exact' ? 'Exacto' : 'Mágico') as 'Exacto' | 'Mágico',
    condEstandar: s?.show_standard_conditions ?? true,
    ofertas: s?.show_offer_conditions ?? false,
    dias: s?.min_days_to_hire ?? 30,
  };

  const openConfigModal = () => window.dispatchEvent(new CustomEvent('open-share-options-modal'));

  return (
    <ZenCard variant="outlined" className="border-zinc-800">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
<ZenCardTitle className="text-sm font-medium">
              Lo que el prospecto ve
            </ZenCardTitle>
          <ZenButton
            variant="outline"
            size="sm"
            onClick={openConfigModal}
            className="gap-1.5 px-2 py-1 h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            title="Configurar opciones de automatización"
          >
            <Settings2 className="h-3.5 w-3.5 shrink-0" />
            <span>Configurar</span>
          </ZenButton>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-3">
        <PublicConfigList {...configProps} />
      </ZenCardContent>
    </ZenCard>
  );
}
