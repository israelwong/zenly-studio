'use client';

import React, { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { ZenDialog, ZenButton, ZenSwitch, ZenInput } from '@/components/ui/zen';
import { getPromiseShareSettings, updatePromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { toast } from 'sonner';

interface PromiseShareOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
}

export function PromiseShareOptionsModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
}: PromiseShareOptionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingScope, setSavingScope] = useState<'all' | 'single' | null>(null);
  const [hasCotizacion, setHasCotizacion] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [showPackages, setShowPackages] = useState(true);
  const [showCategoriesSubtotals, setShowCategoriesSubtotals] = useState(false);
  const [showItemsPrices, setShowItemsPrices] = useState(false);
  const [minDaysToHire, setMinDaysToHire] = useState(30);
  const [showStandardConditions, setShowStandardConditions] = useState(true); // Siempre true, no modificable
  const [showOfferConditions, setShowOfferConditions] = useState(false);
  const [showPortafolios, setShowPortafolios] = useState(true);

  useEffect(() => {
    if (isOpen && promiseId) {
      loadSettings();
    } else if (!isOpen) {
      // Resetear estados cuando el modal se cierra
      setLoading(false);
      setSaving(false);
    }
  }, [isOpen, promiseId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getPromiseShareSettings(studioSlug, promiseId);
      if (result.success && result.data) {
        setHasCotizacion(result.data.has_cotizacion);
        setHasOverride(!result.data.remember_preferences); // true si tiene override específico
        setShowPackages(result.data.show_packages);
        setShowCategoriesSubtotals(result.data.show_categories_subtotals);
        setShowItemsPrices(result.data.show_items_prices);
        setMinDaysToHire(result.data.min_days_to_hire);
        setShowStandardConditions(result.data.show_standard_conditions ?? true);
        setShowOfferConditions(result.data.show_offer_conditions ?? false);
        setShowPortafolios(result.data.portafolios ?? true);
      } else {
        toast.error(result.error || 'Error al cargar preferencias');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (rememberPreferences: boolean) => {
    if (minDaysToHire < 1) {
      toast.error('El mínimo de días debe ser mayor a 0');
      return;
    }

    setSaving(true);
    setSavingScope(rememberPreferences ? 'all' : 'single');
    try {
      const result = await updatePromiseShareSettings(studioSlug, promiseId, {
        show_packages: showPackages,
        show_categories_subtotals: showCategoriesSubtotals,
        show_items_prices: showItemsPrices,
        min_days_to_hire: minDaysToHire,
        show_standard_conditions: showStandardConditions,
        show_offer_conditions: showOfferConditions,
        portafolios: showPortafolios,
        remember_preferences: rememberPreferences,
      });

      if (result.success) {
        if (rememberPreferences) {
          toast.success('Preferencias guardadas para todas las promesas');
        } else {
          toast.success('Preferencias guardadas solo para esta promesa');
        }
        onClose();
      } else {
        toast.error(result.error || 'Error al guardar preferencias');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
      setSavingScope(null);
    }
  };



  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Opciones de compartir"
      description="Configura cómo se mostrará la información de las cotizaciones al prospecto"
      maxWidth="md"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {/* Skeleton switches */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-32" />
                  <div className="h-3 bg-zinc-800 rounded w-48" />
                </div>
                <div className="w-11 h-6 bg-zinc-800 rounded-full" />
              </div>
            ))}

            {/* Skeleton input */}
            <div className="space-y-2">
              <div className="h-4 bg-zinc-800 rounded w-40" />
              <div className="h-10 bg-zinc-800 rounded w-full" />
              <div className="h-3 bg-zinc-800 rounded w-56" />
            </div>

            {/* Skeleton buttons */}
            <div className="flex gap-2 pt-4 border-t border-zinc-800">
              <div className="h-10 bg-zinc-800 rounded flex-1" />
              <div className="h-10 bg-zinc-800 rounded flex-1" />
            </div>
          </div>
        ) : (
          <>
            {/* Badge si tiene configuración personalizada */}
            {hasOverride && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-amber-400 font-medium">
                  Configuración activa solo para esta promesa
                </span>
              </div>
            )}

            {/* Switch para mostrar paquetes */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-200">
                  Mostrar paquetes
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {hasCotizacion
                    ? 'El prospecto verá los paquetes disponibles'
                    : 'Si no hay cotización existente se mostrarán los paquetes'}
                </p>
              </div>
              <ZenSwitch
                checked={showPackages}
                onCheckedChange={setShowPackages}
              />
            </div>

            {/* Switch para mostrar subtotales por categoría */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-200">
                  Mostrar subtotal por categoría
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  El prospecto verá el subtotal por categoría
                </p>
              </div>
              <ZenSwitch
                checked={showCategoriesSubtotals}
                onCheckedChange={setShowCategoriesSubtotals}
              />
            </div>

            {/* Switch para mostrar precios por item */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-200">
                  Mostrar precio por item
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  El prospecto verá el precio individual de cada item
                </p>
              </div>
              <ZenSwitch
                checked={showItemsPrices}
                onCheckedChange={setShowItemsPrices}
              />
            </div>

            {/* Switch para mostrar condiciones comerciales estándar */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-200">
                  Mostrar condiciones comerciales estándar
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  El prospecto verá las condiciones comerciales estándar
                </p>
              </div>
              <ZenSwitch
                checked={showStandardConditions}
                onCheckedChange={() => { }} // No modificable, siempre true
                disabled
              />
            </div>

            {/* Switch para mostrar condiciones comerciales de oferta */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-200">
                  Mostrar condiciones comerciales de oferta
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  El prospecto verá las condiciones comerciales de tipo oferta
                </p>
              </div>
              <ZenSwitch
                checked={showOfferConditions}
                onCheckedChange={setShowOfferConditions}
              />
            </div>

            {/* Switch para mostrar portafolios */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-200">
                  Mostrar portafolios
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  El prospecto verá los portafolios disponibles según el tipo de evento
                </p>
              </div>
              <ZenSwitch
                checked={showPortafolios}
                onCheckedChange={setShowPortafolios}
              />
            </div>

            {/* Input para límite de días */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">
                Límite de días para poder contratar
              </label>
              <ZenInput
                type="number"
                min="1"
                value={minDaysToHire.toString()}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value > 0) {
                    setMinDaysToHire(value);
                  }
                }}
                placeholder="30"
              />
              <p className="text-xs text-zinc-400">
                Días que el prospecto tiene disponibles para contratar
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-4 border-t border-zinc-800">
              {saving ? (
                <div className="flex items-center justify-center gap-2 py-2 flex-1">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
                  <span className="text-sm text-zinc-400">
                    {savingScope === 'all' 
                      ? 'Guardando para todas las promesas...' 
                      : 'Guardando para esta promesa...'}
                  </span>
                </div>
              ) : (
                <>
                  <ZenButton
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                  >
                    Cancelar
                  </ZenButton>
                  <ZenButton
                    type="button"
                    variant="primary"
                    onClick={() => handleSave(true)}
                    disabled={minDaysToHire < 1}
                    className="flex-1"
                  >
                    Para todas
                  </ZenButton>
                  <ZenButton
                    type="button"
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={minDaysToHire < 1}
                    className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500"
                  >
                    Solo esta promesa
                  </ZenButton>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </ZenDialog>
  );
}
