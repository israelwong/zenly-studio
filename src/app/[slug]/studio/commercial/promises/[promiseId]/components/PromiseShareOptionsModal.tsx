'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { ZenDialog, ZenButton, ZenSwitch, ZenInput, ZenCard, ZenCardContent, ZenConfirmModal } from '@/components/ui/zen';
import { getPromiseShareSettings, updatePromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PromiseShareOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
  /** Llamado tras guardar (esta promesa o global) para refrescar la vista */
  onSuccess?: () => void;
}

export function PromiseShareOptionsModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
  onSuccess,
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
  const [autoGenerateContract, setAutoGenerateContract] = useState(false);
  const [allowRecalc, setAllowRecalc] = useState(true);
  const [roundingMode, setRoundingMode] = useState<'exact' | 'charm'>('charm');
  const [weContactYou, setWeContactYou] = useState(false);
  const [sendToContractProcess, setSendToContractProcess] = useState(false);
  const [showMinDaysToHire, setShowMinDaysToHire] = useState(true); // Activo por defecto
  const [showConfirmSensitiveModal, setShowConfirmSensitiveModal] = useState(false);
  const [pendingSensitiveOption, setPendingSensitiveOption] = useState<'subtotals' | 'prices' | null>(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [pendingSaveScope, setPendingSaveScope] = useState<'all' | 'single' | null>(null);
  /** Ámbito del guardado: solo esta promesa (remember_preferences: false) o todas (true) */
  const [saveScope, setSaveScope] = useState<'single' | 'all'>('single');

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
        setAutoGenerateContract(result.data.auto_generate_contract ?? false);
        setAllowRecalc(result.data.allow_recalc ?? true);
        setRoundingMode(result.data.rounding_mode === 'exact' ? 'exact' : 'charm');
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

  const handleSensitiveOptionChange = (option: 'subtotals' | 'prices', checked: boolean) => {
    if (checked) {
      // Si se está activando, mostrar modal de confirmación
      setPendingSensitiveOption(option);
      setShowConfirmSensitiveModal(true);
    } else {
      // Si se está desactivando, permitir directamente
      if (option === 'subtotals') {
        setShowCategoriesSubtotals(false);
      } else {
        setShowItemsPrices(false);
      }
    }
  };

  const handleConfirmSensitiveOption = () => {
    if (pendingSensitiveOption === 'subtotals') {
      setShowCategoriesSubtotals(true);
    } else if (pendingSensitiveOption === 'prices') {
      setShowItemsPrices(true);
    }
    setShowConfirmSensitiveModal(false);
    setPendingSensitiveOption(null);
  };

  const handleSave = async (rememberPreferences: boolean) => {
    if (minDaysToHire < 1) {
      toast.error('El mínimo de días debe ser mayor a 0');
      return;
    }

    // Si hay opciones sensibles activadas, mostrar confirmación adicional
    if (showCategoriesSubtotals || showItemsPrices) {
      setPendingSaveScope(rememberPreferences ? 'all' : 'single');
      setShowSaveConfirmModal(true);
      return;
    }

    // Si no hay opciones sensibles, guardar directamente
    await performSave(rememberPreferences);
  };

  const performSave = async (rememberPreferences: boolean) => {
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
        auto_generate_contract: autoGenerateContract,
        allow_recalc: allowRecalc,
        rounding_mode: roundingMode,
        remember_preferences: rememberPreferences,
      });

      if (result.success) {
        if (rememberPreferences) {
          toast.success('Preferencias guardadas para todas las promesas');
        } else {
          toast.success('Preferencias guardadas solo para esta promesa');
        }
        onSuccess?.();
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
      setShowSaveConfirmModal(false);
      setPendingSaveScope(null);
    }
  };

  const handleConfirmSave = () => {
    if (pendingSaveScope !== null) {
      performSave(pendingSaveScope === 'all');
    }
  };



  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Opciones de automatización"
      description="Define que información verá el prospecto de manera automatica en la pagina de promesa"
      maxWidth="2xl"
      zIndex={10080}
      onSave={undefined}
      onCancel={onClose}
      footerLeftContent={
        <div className="flex flex-col gap-3 w-full min-w-0">
          <div
            className="flex w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-0.5"
            role="group"
            aria-label="Ámbito de guardado"
          >
            <button
              type="button"
              onClick={() => setSaveScope('single')}
              disabled={saving}
              className={cn(
                'flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors',
                saveScope === 'single'
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-300'
              )}
            >
              Solo esta promesa
            </button>
            <button
              type="button"
              onClick={() => setSaveScope('all')}
              disabled={saving}
              className={cn(
                'flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors',
                saveScope === 'all'
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-300'
              )}
            >
              Todas las promesas
            </button>
          </div>
          <ZenButton
            type="button"
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => handleSave(saveScope === 'all')}
            loading={saving}
            disabled={minDaysToHire < 1 || saving}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </ZenButton>
        </div>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {/* Skeleton: Mostrar en vista general de promesas */}
            <div className="space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-64" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-24" />
                      <div className="h-3 bg-zinc-800 rounded w-48" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Skeleton: Límite de días */}
              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-48" />
                    <div className="h-3 bg-zinc-800 rounded w-56" />
                  </div>
                  <div className="w-20 h-10 bg-zinc-800 rounded" />
                </div>
              </div>
            </div>

            {/* Skeleton: Mostrar información en cotización y paquetes */}
            <div className="space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-72" />
              <div className="space-y-4">
                {/* Primera fila */}
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                      <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-40" />
                        <div className="h-3 bg-zinc-800 rounded w-48" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Segunda fila */}
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                      <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-36" />
                        <div className="h-3 bg-zinc-800 rounded w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Skeleton: Después de confirmar interés */}
            <div className="space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-64" />
              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="w-11 h-6 bg-zinc-800 rounded-full mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-56" />
                  <div className="h-3 bg-zinc-800 rounded w-72" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Badge si tiene configuración personalizada */}
            {hasOverride && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-amber-400 font-medium">
                  Configuración activa solo para esta promesa
                </span>
              </div>
            )}

            {/* Sección: Vista general — Portafolios (izq) y Paquetes (der) misma altura */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">Mostrar en vista general de promesas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={showPortafolios}
                    onCheckedChange={setShowPortafolios}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Portafolios
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      El prospecto verá los portafolios disponibles según el tipo de evento
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={showPackages}
                    onCheckedChange={setShowPackages}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Paquetes
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {hasCotizacion
                        ? 'El prospecto verá los paquetes disponibles'
                        : 'Si no hay cotización existente se mostrarán los paquetes'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Precios de paquetes (revelación progresiva) */}
            <ZenCard
              variant="outlined"
              padding="sm"
              className={`transition-opacity duration-200 ease-out ${!showPackages ? 'opacity-60' : 'opacity-100'}`}
            >
              <ZenCardContent className="p-0 pt-0">
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Precios de paquetes</h3>

                {/* Nivel 1: Paquetes desactivados — estado vacío */}
                {!showPackages && (
                  <div
                    className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-lg bg-zinc-900/30 border border-zinc-800/50 border-dashed"
                    role="status"
                    aria-live="polite"
                  >
                    <Package className="h-8 w-8 text-zinc-500" aria-hidden />
                    <p className="text-sm text-zinc-500 text-center max-w-[280px]">
                      Activa la opción de paquetes arriba para configurar la automatización de precios.
                    </p>
                  </div>
                )}

                {/* Nivel 2: Paquetes activados — toggle recálculo */}
                {showPackages && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                      <ZenSwitch
                        checked={allowRecalc}
                        onCheckedChange={setAllowRecalc}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium text-zinc-200">
                          Recálculo automático de paquetes
                        </label>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Ajusta el precio proporcionalmente si las horas del evento cambian.
                        </p>
                      </div>
                    </div>

                    {/* Nivel 3: Recálculo activado — Radio Cards estilo de redondeo */}
                    {allowRecalc && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                        <p className="text-xs font-medium text-zinc-400 col-span-full mb-0.5">
                          Estilo de redondeo
                        </p>
                        <button
                          type="button"
                          onClick={() => setRoundingMode('exact')}
                          className={`text-left p-4 rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                            roundingMode === 'exact'
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                          }`}
                          aria-pressed={roundingMode === 'exact'}
                          aria-label="Estilo Exacto"
                        >
                          <span className="text-sm font-medium text-zinc-200 block">Exacto</span>
                          <span className="text-lg font-semibold text-emerald-400/90 mt-1 block tabular-nums">
                            $18,452.12
                          </span>
                          <p className="text-xs text-zinc-500 mt-1.5">
                            Muestra el cálculo técnico exacto.
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoundingMode('charm')}
                          className={`text-left p-4 rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                            roundingMode === 'charm'
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                          }`}
                          aria-pressed={roundingMode === 'charm'}
                          aria-label="Estilo Mágico (Charm)"
                        >
                          <span className="text-sm font-medium text-zinc-200 block">Mágico (Charm)</span>
                          <span className="text-lg font-semibold text-emerald-400/90 mt-1 block tabular-nums">
                            $18,499
                          </span>
                          <p className="text-xs text-zinc-500 mt-1.5">
                            Aplica redondeo comercial estratégico.
                          </p>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </ZenCardContent>
            </ZenCard>

            {/* Sección: Información en cotización y paquetes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">Mostrar información en cotización y paquetes</h3>
              <div className="space-y-4">
                {/* Primera fila: Subtotales y precios (arriba) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`flex items-start gap-3 p-3 border rounded-lg bg-zinc-900/50 ${
                    showCategoriesSubtotals 
                      ? 'border-amber-500/50 bg-amber-500/5' 
                      : 'border-zinc-800'
                  }`}>
                    <ZenSwitch
                      checked={showCategoriesSubtotals}
                      onCheckedChange={(checked) => handleSensitiveOptionChange('subtotals', checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <label className="text-sm font-medium text-zinc-200">
                          Subtotal por categoría
                        </label>
                        {showCategoriesSubtotals && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-medium text-amber-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span>Información sensible</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá el monto del subtotal por categoría
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-3 border rounded-lg bg-zinc-900/50 ${
                    showItemsPrices 
                      ? 'border-amber-500/50 bg-amber-500/5' 
                      : 'border-zinc-800'
                  }`}>
                    <ZenSwitch
                      checked={showItemsPrices}
                      onCheckedChange={(checked) => handleSensitiveOptionChange('prices', checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <label className="text-sm font-medium text-zinc-200">
                          Precio por item
                        </label>
                        {showItemsPrices && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-medium text-amber-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span>Información sensible</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá el precio individual de cada item
                      </p>
                    </div>
                  </div>
                </div>

                {/* Segunda fila: Condiciones comerciales (abajo) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <ZenSwitch
                      checked={showStandardConditions}
                      onCheckedChange={() => { }}
                      disabled
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-zinc-200">
                        Condiciones comerciales estándar
                      </label>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá las condiciones comerciales estándar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                    <ZenSwitch
                      checked={showOfferConditions}
                      onCheckedChange={setShowOfferConditions}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-zinc-200">
                        Condiciones comerciales especiales
                      </label>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        El prospecto verá las condiciones comerciales de tipo oferta
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contratación (arriba de Después de confirmar interés) */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">Contratación</h3>
              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <ZenSwitch
                  checked={showMinDaysToHire}
                  onCheckedChange={() => { }}
                  disabled
                  className="mt-0.5"
                />
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Límite de días para poder contratar
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Días que el prospecto tiene disponibles para contratar
                    </p>
                  </div>
                  <div className="w-20">
                    <ZenInput
                      type="number"
                      min="1"
                      value={minDaysToHire.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value > 0) {
                          setMinDaysToHire(value);
                        } else if (e.target.value === '') {
                          setMinDaysToHire(1);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (isNaN(value) || value < 1) {
                          setMinDaysToHire(1);
                        }
                      }}
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Opciones post-confirmación (sin label) */}
            <div className="space-y-3">
              {/* TODO: Próxima implementación */}
              {/* <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={weContactYou}
                    onCheckedChange={(checked) => {
                      setWeContactYou(checked);
                      if (checked) {
                        setSendToContractProcess(false);
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Nosotros te contactamos
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      El prospecto recibirá un mensaje indicando que serás contactado
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <ZenSwitch
                    checked={sendToContractProcess}
                    onCheckedChange={(checked) => {
                      setSendToContractProcess(checked);
                      if (checked) {
                        setWeContactYou(false);
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-zinc-200">
                      Enviarlo a página de proceso de contratación
                    </label>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Redirigir al prospecto al proceso de contratación automáticamente
                    </p>
                  </div>
                </div>
              </div> */}

              <div className="flex items-start gap-3 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <ZenSwitch
                  checked={autoGenerateContract}
                  onCheckedChange={setAutoGenerateContract}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-200">
                    Generar contrato automáticamente al autorizar
                  </label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Si está activado, el contrato se generará automáticamente usando la plantilla por defecto cuando el prospecto autorice la cotización
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmación al activar opción sensible */}
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
                : 'Al activar "Precio por item", el prospecto podrá ver el precio individual de cada servicio o producto.'}
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
        zIndex={10090}
      />

      {/* Modal de confirmación al guardar con opciones sensibles */}
      <ZenConfirmModal
        isOpen={showSaveConfirmModal}
        onClose={() => {
          setShowSaveConfirmModal(false);
          setPendingSaveScope(null);
        }}
        onConfirm={handleConfirmSave}
        title={`Confirmar guardado ${pendingSaveScope === 'all' ? 'para todas las promesas' : 'para esta promesa'}`}
        description={
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              Estás a punto de guardar la configuración con las siguientes opciones sensibles activadas:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-400 ml-2">
              {showCategoriesSubtotals && (
                <li>Subtotal por categoría</li>
              )}
              {showItemsPrices && (
                <li>Precio por item</li>
              )}
            </ul>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-400 mb-1">
                    {pendingSaveScope === 'all' ? 'Aplicará a todas las promesas' : 'Solo aplicará a esta promesa'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {pendingSaveScope === 'all' 
                      ? 'Esta configuración se aplicará a todas las promesas futuras y existentes que no tengan una configuración personalizada.'
                      : 'Esta configuración solo se aplicará a esta promesa específica.'}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              ¿Deseas continuar con el guardado?
            </p>
          </div>
        }
        confirmText={pendingSaveScope === 'all' ? 'Sí, guardar para todas' : 'Sí, guardar para esta promesa'}
        cancelText="Cancelar"
        variant="default"
        loading={saving}
        loadingText={pendingSaveScope === 'all' ? 'Guardando para todas las promesas...' : 'Guardando para esta promesa...'}
        zIndex={10090}
      />
    </ZenDialog>
  );
}
