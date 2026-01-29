'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, Settings2, AlertTriangle } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenCardFooter, ZenSwitch, ZenButton, ZenInput, ZenConfirmModal } from '@/components/ui/zen';
import { getPromiseShareSettings, updatePromiseShareSettings, type PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface SavedSnapshot {
  show_packages: boolean;
  portafolios: boolean;
  allow_recalc: boolean;
  rounding_mode: 'exact' | 'charm';
  show_standard_conditions: boolean;
  show_offer_conditions: boolean;
  min_days_to_hire: number;
  auto_generate_contract: boolean;
  show_categories_subtotals: boolean;
  show_items_prices: boolean;
}

type ShareSettingsData = PromiseShareSettings & { has_cotizacion?: boolean; remember_preferences?: boolean };

interface PromisePublicConfigCardProps {
  studioSlug: string;
  promiseId: string;
  /** Datos iniciales del servidor (Protocolo Zenly). Sin fetch en mount. */
  initialShareSettings?: ShareSettingsData | null;
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
  const router = useRouter();
  const hasInitialData = initialShareSettingsProp != null;
  const [loading, setLoading] = useState(!hasInitialData);
  const [saving, setSaving] = useState(false);
  const [showOfertasModal, setShowOfertasModal] = useState(false);
  const [showPackages, setShowPackages] = useState(initialShareSettingsProp?.show_packages ?? true);
  const [showPortafolios, setShowPortafolios] = useState(initialShareSettingsProp?.portafolios ?? true);
  const [allowRecalc, setAllowRecalc] = useState(initialShareSettingsProp?.allow_recalc ?? true);
  const [roundingMode, setRoundingMode] = useState<'exact' | 'charm'>(
    initialShareSettingsProp?.rounding_mode ?? 'charm'
  );
  const [showStandardConditions, setShowStandardConditions] = useState(
    initialShareSettingsProp?.show_standard_conditions ?? true
  );
  const [showOfferConditions, setShowOfferConditions] = useState(
    initialShareSettingsProp?.show_offer_conditions ?? false
  );
  const [minDaysToHire, setMinDaysToHire] = useState(initialShareSettingsProp?.min_days_to_hire ?? 30);
  const [autoGenerateContract, setAutoGenerateContract] = useState(
    initialShareSettingsProp?.auto_generate_contract ?? false
  );
  const [showCategoriesSubtotals, setShowCategoriesSubtotals] = useState(
    initialShareSettingsProp?.show_categories_subtotals ?? false
  );
  const [showItemsPrices, setShowItemsPrices] = useState(
    initialShareSettingsProp?.show_items_prices ?? false
  );
  const [showConfirmSensitiveModal, setShowConfirmSensitiveModal] = useState(false);
  const [pendingSensitiveOption, setPendingSensitiveOption] = useState<'subtotals' | 'prices' | null>(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const lastSavedRef = useRef<SavedSnapshot | null>(
    hasInitialData && initialShareSettingsProp
      ? {
          show_packages: initialShareSettingsProp.show_packages,
          portafolios: initialShareSettingsProp.portafolios,
          allow_recalc: initialShareSettingsProp.allow_recalc,
          rounding_mode: initialShareSettingsProp.rounding_mode,
          show_standard_conditions: initialShareSettingsProp.show_standard_conditions ?? true,
          show_offer_conditions: initialShareSettingsProp.show_offer_conditions ?? false,
          min_days_to_hire: initialShareSettingsProp.min_days_to_hire ?? 30,
          auto_generate_contract: initialShareSettingsProp.auto_generate_contract ?? false,
          show_categories_subtotals: initialShareSettingsProp.show_categories_subtotals ?? false,
          show_items_prices: initialShareSettingsProp.show_items_prices ?? false,
        }
      : null
  );

  useEffect(() => {
    if (hasInitialData) return;
    loadSettings();
  }, [studioSlug, promiseId, hasInitialData]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getPromiseShareSettings(studioSlug, promiseId);
      if (result.success && result.data) {
        const d = result.data;
        setShowPackages(d.show_packages);
        setShowPortafolios(d.portafolios);
        setAllowRecalc(d.allow_recalc);
        setRoundingMode(d.rounding_mode);
        setShowStandardConditions(d.show_standard_conditions ?? true);
        setShowOfferConditions(d.show_offer_conditions ?? false);
        setMinDaysToHire(d.min_days_to_hire ?? 30);
        setAutoGenerateContract(d.auto_generate_contract ?? false);
        setShowCategoriesSubtotals(d.show_categories_subtotals ?? false);
        setShowItemsPrices(d.show_items_prices ?? false);
        lastSavedRef.current = {
          show_packages: d.show_packages,
          portafolios: d.portafolios,
          allow_recalc: d.allow_recalc,
          rounding_mode: d.rounding_mode,
          show_standard_conditions: d.show_standard_conditions ?? true,
          show_offer_conditions: d.show_offer_conditions ?? false,
          min_days_to_hire: d.min_days_to_hire ?? 30,
          auto_generate_contract: d.auto_generate_contract ?? false,
          show_categories_subtotals: d.show_categories_subtotals ?? false,
          show_items_prices: d.show_items_prices ?? false,
        };
      }
    } catch (error) {
      console.error('Error loading share settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    const s = lastSavedRef.current;
    if (!s) return false;
    return (
      s.show_packages !== showPackages ||
      s.portafolios !== showPortafolios ||
      s.allow_recalc !== allowRecalc ||
      s.rounding_mode !== roundingMode ||
      s.show_standard_conditions !== showStandardConditions ||
      s.show_offer_conditions !== showOfferConditions ||
      s.min_days_to_hire !== minDaysToHire ||
      s.auto_generate_contract !== autoGenerateContract ||
      s.show_categories_subtotals !== showCategoriesSubtotals ||
      s.show_items_prices !== showItemsPrices
    );
  }, [
    showPackages,
    showPortafolios,
    allowRecalc,
    roundingMode,
    showStandardConditions,
    showOfferConditions,
    minDaysToHire,
    autoGenerateContract,
    showCategoriesSubtotals,
    showItemsPrices,
  ]);

  const saveAllSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        show_packages: showPackages,
        portafolios: showPortafolios,
        allow_recalc: allowRecalc,
        rounding_mode: roundingMode,
        show_standard_conditions: showStandardConditions,
        show_offer_conditions: showOfferConditions,
        min_days_to_hire: Math.max(1, minDaysToHire),
        auto_generate_contract: autoGenerateContract,
        show_categories_subtotals: showCategoriesSubtotals,
        show_items_prices: showItemsPrices,
        remember_preferences: false,
      };
      const updateResult = await updatePromiseShareSettings(studioSlug, promiseId, payload);
      if (updateResult.success) {
        lastSavedRef.current = { ...payload };
        setShowSaveConfirmModal(false);
        router.refresh();
        toast.success('Cambios guardados');
      } else {
        toast.error(updateResult.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    const s = lastSavedRef.current;
    if (s) {
      setShowPackages(s.show_packages);
      setShowPortafolios(s.portafolios);
      setAllowRecalc(s.allow_recalc);
      setRoundingMode(s.rounding_mode);
      setShowStandardConditions(s.show_standard_conditions);
      setShowOfferConditions(s.show_offer_conditions);
      setMinDaysToHire(s.min_days_to_hire);
      setAutoGenerateContract(s.auto_generate_contract);
      setShowCategoriesSubtotals(s.show_categories_subtotals);
      setShowItemsPrices(s.show_items_prices);
    }
    setShowSaveConfirmModal(false);
  };

  const handleSensitiveOptionChange = (option: 'subtotals' | 'prices', checked: boolean) => {
    if (checked) {
      setPendingSensitiveOption(option);
      setShowConfirmSensitiveModal(true);
    } else {
      if (option === 'subtotals') setShowCategoriesSubtotals(false);
      else setShowItemsPrices(false);
    }
  };

  const handleConfirmSensitiveOption = () => {
    if (pendingSensitiveOption === 'subtotals') setShowCategoriesSubtotals(true);
    else if (pendingSensitiveOption === 'prices') setShowItemsPrices(true);
    setShowConfirmSensitiveModal(false);
    setPendingSensitiveOption(null);
  };

  if (loading) {
    return (
      <ZenCard variant="outlined" className="border-zinc-800">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
        </ZenCardHeader>
        <ZenCardContent className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </ZenCardContent>
      </ZenCard>
    );
  }

  const rowClass = 'flex items-center justify-between gap-3 py-1.5 min-h-[2rem]';
  const labelClass = 'text-sm font-medium text-zinc-300';
  const descClass = 'text-[11px] text-zinc-500 leading-tight mt-0.5';

  return (
    <>
      <ZenCard variant="outlined" className="border-zinc-800 shadow-lg shadow-black/20">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <ZenCardTitle className="text-sm font-medium flex items-center gap-1.5 pt-1">
            <Eye className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            Lo que el prospecto ve
          </ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-3 space-y-3">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Define qué información y opciones verá el prospecto en la página de la promesa.
          </p>

          {/* Disclaimer (Protocolo Zenly) */}
          <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 leading-snug">
            Ajustes locales para esta promesa. Sobreescribe la configuración global.
          </p>

          {/* A. Portafolio (al inicio) */}
          <div>
            <div className={rowClass}>
              <div className="min-w-0 flex-1">
                <span className={labelClass}>Portafolios</span>
                <p className={descClass}>Mostrar portafolios según el tipo de evento</p>
              </div>
              <ZenSwitch
                checked={showPortafolios}
                onCheckedChange={setShowPortafolios}
                disabled={saving}
                className="shrink-0"
              />
            </div>
          </div>

          {/* B. Bloque Paquetes (card interna) */}
          <div className="rounded-lg border border-zinc-700/80 bg-zinc-800/30 p-2 space-y-1">
            <div className={rowClass}>
              <div className="min-w-0 flex-1">
                <span className={labelClass}>Paquetes</span>
                <p className={descClass}>Mostrar paquetes disponibles según el tipo de evento</p>
              </div>
              <ZenSwitch
                checked={showPackages}
                onCheckedChange={setShowPackages}
                disabled={saving}
                className="shrink-0"
              />
            </div>
            {showPackages && (
              <>
                <div className={rowClass}>
                  <div className="min-w-0 flex-1">
                    <span className={labelClass}>Recálculo automático</span>
                    <p className={descClass}>Ajustar precio si las horas del evento cambian</p>
                  </div>
                  <ZenSwitch
                    checked={allowRecalc}
                    onCheckedChange={setAllowRecalc}
                    disabled={saving}
                    className="shrink-0"
                  />
                </div>
                {allowRecalc && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-zinc-400">Estilo de redondeo</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoundingMode('exact')}
                        className={`text-left p-2.5 rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                          roundingMode === 'exact'
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                        }`}
                        aria-pressed={roundingMode === 'exact'}
                        aria-label="Estilo Exacto"
                      >
                        <span className="text-xs font-medium text-zinc-200 block">Exacto</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5 block">Cálculo técnico exacto.</span>
                        <span className="text-[10px] text-zinc-500/80 mt-1 font-mono block">Ej.: $36,450.00</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoundingMode('charm')}
                        className={`text-left p-2.5 rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                          roundingMode === 'charm'
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                        }`}
                        aria-pressed={roundingMode === 'charm'}
                        aria-label="Estilo Mágico (Charm)"
                      >
                        <span className="text-xs font-medium text-zinc-200 block">Mágico</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5 block">Redondeo comercial.</span>
                        <span className="text-[10px] text-zinc-500/80 mt-1 font-mono block">Ej.: $36,499</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* C. Bloque Cotización (subtotal + precio ítem) */}
          <div className="space-y-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Cotización</p>
            </div>
            <div className={rowClass}>
              <div className="min-w-0 flex-1">
                <span className={labelClass}>Condiciones comerciales estándar</span>
                <p className={descClass}>El prospecto verá las condiciones comerciales estándar</p>
              </div>
              <ZenSwitch
                checked={showStandardConditions}
                onCheckedChange={setShowStandardConditions}
                disabled={saving}
                className="shrink-0"
              />
            </div>
            <div className={`${rowClass} rounded-lg px-2 -mx-2 ${showCategoriesSubtotals ? 'bg-amber-500/5 border border-amber-500/30' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={labelClass}>Subtotal por categoría</span>
                  {showCategoriesSubtotals && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-medium text-amber-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Información sensible
                    </span>
                  )}
                </div>
                <p className={descClass}>Mostrar monto subtotal por categoría en la cotización</p>
              </div>
              <ZenSwitch
                checked={showCategoriesSubtotals}
                onCheckedChange={(v) => handleSensitiveOptionChange('subtotals', v)}
                disabled={saving}
                className="shrink-0"
              />
            </div>
            <div className={`${rowClass} rounded-lg px-2 -mx-2 ${showItemsPrices ? 'bg-amber-500/5 border border-amber-500/30' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={labelClass}>Precio por ítem</span>
                  {showItemsPrices && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-medium text-amber-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Información sensible
                    </span>
                  )}
                </div>
                <p className={descClass}>Mostrar precio individual de cada servicio o producto en la cotización</p>
              </div>
              <ZenSwitch
                checked={showItemsPrices}
                onCheckedChange={(v) => handleSensitiveOptionChange('prices', v)}
                disabled={saving}
                className="shrink-0"
              />
            </div>
          </div>

          {/* D. Bloque Ofertas (lista + Gestionar + Smart Warning) */}
          {(() => {
            const ofertas = initialCondicionesComerciales.filter(
              (c) => (c.type ?? 'standard') === 'offer' || (c as { type?: string }).type === 'oferta'
            );
            const hasAdvanceWarning =
              showOfferConditions &&
              selectedCotizacionPrice != null &&
              selectedCotizacionPrice > 0 &&
              ofertas.some((o) => (o.advance_percentage ?? 0) > 50);
            return (
              <div className="space-y-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Ofertas</p>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOfertasModal(true)}
                    className="h-6 px-1.5 text-zinc-400 hover:text-emerald-400 shrink-0"
                    title="Gestionar ofertas"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </ZenButton>
                </div>
                {ofertas.length > 0 ? (
                  <div className="space-y-1">
                    {ofertas.map((oferta) => (
                      <div key={oferta.id} className={rowClass}>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className={labelClass}>{oferta.name}</span>
                          {(oferta.advance_percentage ?? 0) > 50 && showOfferConditions && selectedCotizacionPrice != null && selectedCotizacionPrice > 0 && (
                            <span
                              className="inline-flex items-center text-amber-400"
                              title="Anticipo mayor al 50% del total de la cotización"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className={rowClass}>
                      <div className="min-w-0 flex-1">
                        <span className={labelClass}>Mostrar ofertas especiales</span>
                        <p className={descClass}>El prospecto verá las condiciones de tipo oferta</p>
                      </div>
                      <ZenSwitch
                        checked={showOfferConditions}
                        onCheckedChange={setShowOfferConditions}
                        disabled={saving}
                        className="shrink-0"
                      />
                    </div>
                  </div>
                ) : (
                  <div className={rowClass}>
                    <div className="min-w-0 flex-1">
                      <span className={labelClass}>Condiciones comerciales especiales</span>
                      <p className={descClass}>El prospecto verá las condiciones de tipo oferta</p>
                    </div>
                    <ZenSwitch
                      checked={showOfferConditions}
                      onCheckedChange={setShowOfferConditions}
                      disabled={saving}
                      className="shrink-0"
                    />
                  </div>
                )}
                {hasAdvanceWarning && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1" title="Una oferta activa tiene anticipo mayor al 50% del total">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Anticipo &gt; 50% del total de la cotización
                  </p>
                )}
              </div>
            );
          })()}

          {/* E. Bloque Cierre (límite días + contrato automático) */}
          <div className="space-y-0">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5">Cierre</p>
            <div className={rowClass}>
              <div className="min-w-0 flex-1">
                <span className={labelClass}>Límite de días</span>
                <p className={descClass}>Días disponibles para que el prospecto contrate</p>
              </div>
              <ZenInput
                type="number"
                min={1}
                value={minDaysToHire.toString()}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setMinDaysToHire(v);
                  else if (e.target.value === '') setMinDaysToHire(30);
                }}
                onBlur={() => {
                  const v = Math.max(1, minDaysToHire);
                  if (v !== minDaysToHire) setMinDaysToHire(v);
                }}
                className="h-7 w-14 px-2 text-xs text-center shrink-0"
              />
            </div>
            <div className={rowClass}>
              <div className="min-w-0 flex-1">
                <span className={labelClass}>Contrato automático</span>
                <p className={descClass}>Generar contrato al autorizar la cotización</p>
              </div>
              <ZenSwitch
                checked={autoGenerateContract}
                onCheckedChange={setAutoGenerateContract}
                disabled={saving}
                className="shrink-0"
              />
            </div>
          </div>
        </ZenCardContent>

        <ZenCardFooter className="p-3 pt-2 border-t border-zinc-800 flex flex-col gap-2">
          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setShowSaveConfirmModal(true)}
            disabled={saving || !isDirty}
            className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500"
          >
            Guardar cambios para esta promesa
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={handleRevert}
            disabled={saving || !isDirty}
            className="w-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            Cancelar y revertir
          </ZenButton>
        </ZenCardFooter>
      </ZenCard>

      <ZenConfirmModal
        isOpen={showSaveConfirmModal}
        onClose={handleRevert}
        onConfirm={saveAllSettings}
        title="Guardar cambios"
        description="Se aplicarán las preferencias de lo que el prospecto ve en esta promesa. ¿Continuar?"
        confirmText="Guardar"
        cancelText="Cancelar"
        variant="default"
        loading={saving}
      />

      <ZenConfirmModal
        isOpen={showConfirmSensitiveModal}
        onClose={() => {
          setShowConfirmSensitiveModal(false);
          setPendingSensitiveOption(null);
        }}
        onConfirm={handleConfirmSensitiveOption}
        title="Mostrar información sensible"
        description={
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              {pendingSensitiveOption === 'subtotals'
                ? 'Al activar "Subtotal por categoría", el prospecto podrá ver los montos de cada categoría en la cotización.'
                : 'Al activar "Precio por ítem", el prospecto podrá ver el precio individual de cada servicio o producto.'}
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-400 mb-1">
                    Información sensible
                  </p>
                  <p className="text-xs text-zinc-400">
                    Esta información puede ser utilizada por el prospecto para negociar o comparar con otros proveedores. Asegúrate de que esta es la estrategia comercial que deseas seguir.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              ¿Deseas continuar?
            </p>
          </div>
        }
        confirmText="Sí, activar"
        cancelText="Cancelar"
        variant="default"
      />

      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={showOfertasModal}
        onClose={() => setShowOfertasModal(false)}
        onRefresh={() => router.refresh()}
      />
    </>
  );
}
