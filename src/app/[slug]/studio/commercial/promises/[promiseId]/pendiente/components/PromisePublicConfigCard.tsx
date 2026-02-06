'use client';

import React, { useState, useEffect } from 'react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible';
import { getPromiseShareSettings, type PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { PublicConfigList } from './PublicConfigList';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);

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
    show_packages: s?.show_packages ?? true,
    portafolios: s?.portafolios ?? true,
    allow_recalc: s?.allow_recalc ?? true,
    rounding_mode: s?.rounding_mode === 'exact' ? 'exact' : 'charm',
    show_categories_subtotals: s?.show_categories_subtotals ?? false,
    show_items_prices: s?.show_items_prices ?? false,
    show_standard_conditions: s?.show_standard_conditions ?? true,
    show_offer_conditions: s?.show_offer_conditions ?? false,
    min_days_to_hire: s?.min_days_to_hire ?? 30,
    auto_generate_contract: s?.auto_generate_contract ?? false,
  };

  const openConfigModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('open-share-options-modal'));
  };

  const totalAjustes =
    2 + // Vista general
    (configProps.show_packages ? 2 : 0) + // Precios (recálculo + redondeo)
    4 + // Info cotización
    2; // Contratación

  return (
    <Collapsible open={open} onOpenChange={setOpen} defaultOpen={false}>
      <ZenCard variant="outlined" className="border-zinc-800">
        <div className="flex items-center justify-between gap-2 py-2 px-3 border-b border-zinc-800">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex-1 flex items-center gap-2 text-left rounded transition-colors min-w-0',
                'hover:bg-zinc-800/50 py-0.5 -my-0.5 px-1 -mx-1'
              )}
            >
              <span className="text-sm font-medium text-zinc-300 truncate">
                {totalAjustes} ajustes activos
              </span>
              {open ? (
                <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
              )}
            </button>
          </CollapsibleTrigger>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={openConfigModal}
            className="gap-1 px-1.5 py-0.5 h-6 text-[11px] border-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 shrink-0"
            title="Opciones de automatización"
          >
            <Zap className="h-3 w-3" />
          </ZenButton>
        </div>
        <CollapsibleContent>
          <ZenCardContent className="p-3 border-t-0">
            <PublicConfigList {...configProps} />
          </ZenCardContent>
        </CollapsibleContent>
      </ZenCard>
    </Collapsible>
  );
}
