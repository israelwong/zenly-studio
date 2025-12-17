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
  const [hasCotizacion, setHasCotizacion] = useState(false);
  const [showPackages, setShowPackages] = useState(true);
  const [showCategoriesSubtotals, setShowCategoriesSubtotals] = useState(false);
  const [showItemsPrices, setShowItemsPrices] = useState(false);
  const [minDaysToHire, setMinDaysToHire] = useState(30);
  const [showStandardConditions, setShowStandardConditions] = useState(true); // Siempre true, no modificable
  const [showOfferConditions, setShowOfferConditions] = useState(false);

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
        setShowPackages(result.data.show_packages);
        setShowCategoriesSubtotals(result.data.show_categories_subtotals);
        setShowItemsPrices(result.data.show_items_prices);
        setMinDaysToHire(result.data.min_days_to_hire);
        setShowStandardConditions(result.data.show_standard_conditions ?? true);
        setShowOfferConditions(result.data.show_offer_conditions ?? false);
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

  const handleSave = async () => {
    if (minDaysToHire < 1) {
      toast.error('El mínimo de días debe ser mayor a 0');
      return;
    }

    setSaving(true);
    try {
      const result = await updatePromiseShareSettings(studioSlug, promiseId, {
        show_packages: showPackages,
        show_categories_subtotals: showCategoriesSubtotals,
        show_items_prices: showItemsPrices,
        min_days_to_hire: minDaysToHire,
        show_standard_conditions: showStandardConditions,
        show_offer_conditions: showOfferConditions,
        remember_preferences: false, // Siempre guardar solo para esta promesa
      });

      if (result.success) {
        toast.success('Preferencias guardadas');
        onClose();
      } else {
        toast.error(result.error || 'Error al guardar preferencias');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
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
            {[1, 2, 3, 4, 5].map((i) => (
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
              <ZenButton
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Cancelar
              </ZenButton>
              <ZenButton
                type="button"
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={saving || minDaysToHire < 1}
                className="flex-1"
              >
                Guardar
              </ZenButton>
            </div>
          </>
        )}
      </div>
    </ZenDialog>
  );
}
