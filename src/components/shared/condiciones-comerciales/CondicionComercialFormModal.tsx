'use client';

import { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Unlink, ExternalLink, Search } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea, ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerCondicionComercial,
  crearCondicionComercial,
  actualizarCondicionComercial,
  obtenerConfiguracionPrecios,
  desvincularOfertaCondicionComercial,
  obtenerOfertasParaVincular,
  type OfertaParaVincular,
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import type { CondicionComercialForm } from '@/lib/actions/schemas/condiciones-comerciales-schemas';
import { useConfiguracionPreciosUpdateListener, type ConfiguracionPreciosUpdateEventDetail } from '@/hooks/useConfiguracionPreciosRefresh';
import { RentabilidadForm } from '@/components/shared/configuracion/RentabilidadForm';
import { toast } from 'sonner';

interface CondicionComercialFormModalProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  condicionId?: string | null; // null = crear, string = editar
  onSuccess?: (updatedCondition?: { discount_percentage: number | null; description: string | null }) => void;
  context?: {
    type: 'offer';
    offerId: string;
    offerName: string;
  };
}

export function CondicionComercialFormModal({
  studioSlug,
  isOpen,
  onClose,
  condicionId = null,
  onSuccess,
  context,
}: CondicionComercialFormModalProps) {
  const isEditMode = !!condicionId;
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    advance_type: 'percentage' as 'percentage' | 'fixed_amount',
    advance_percentage: '',
    advance_amount: '',
    is_public: true,
    offer_id: null as string | null,
  });
  const [formErrors, setFormErrors] = useState<{
    nombre?: string[];
    descripcion?: string[];
    porcentaje_descuento?: string[];
    porcentaje_anticipo?: string[];
  }>({});
  const [initialFormData, setInitialFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    advance_type: 'percentage' as 'percentage' | 'fixed_amount',
    advance_percentage: '',
    advance_amount: '',
    is_public: true,
    offer_id: null as string | null,
  });
  const [ofertasParaVincular, setOfertasParaVincular] = useState<OfertaParaVincular[]>([]);
  const [busquedaOfertas, setBusquedaOfertas] = useState('');
  const [cargandoOfertas, setCargandoOfertas] = useState(false);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maxDescuento, setMaxDescuento] = useState<number | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showUtilidadModal, setShowUtilidadModal] = useState(false);
  const [showDesvincularConfirm, setShowDesvincularConfirm] = useState(false);
  const [loadedCondicion, setLoadedCondicion] = useState<{
    type?: string | null;
    offer_id?: string | null;
    exclusive_offer?: {
      id: string;
      name: string;
      is_active: boolean;
      is_permanent: boolean | null;
      has_date_range: boolean | null;
      start_date: Date | null;
      end_date: Date | null;
    } | null;
  } | null>(null);

  // Cargar condición cuando se abre el modal en modo edición
  useEffect(() => {
    if (isOpen) {
      loadConfiguracion();
      if (isEditMode && condicionId) {
        loadCondicion();
      } else if (!isEditMode) {
        // Resetear formulario para crear
        resetForm();
      }
    }
  }, [isOpen, condicionId, isEditMode, studioSlug]);

  const isOfferType = context?.type === 'offer' || (isEditMode && loadedCondicion && (loadedCondicion.type === 'offer' || !!loadedCondicion.offer_id));
  useEffect(() => {
    if (!isOpen || !isOfferType) return;
    loadOfertasParaVincular();
  }, [isOpen, isOfferType, isEditMode, condicionId, studioSlug]);

  // Escuchar actualizaciones de configuración de precios
  useConfiguracionPreciosUpdateListener(studioSlug, (config?: ConfiguracionPreciosUpdateEventDetail) => {
    if (config?.sobreprecio !== undefined) {
      setMaxDescuento(config.sobreprecio);
    } else {
      loadConfiguracion();
    }
  });

  async function loadConfiguracion() {
    try {
      const result = await obtenerConfiguracionPrecios(studioSlug);
      if (result.success && result.data) {
        setMaxDescuento(result.data.sobreprecio || 0);
      }
    } catch (error) {
      console.error('Error loading configuracion:', error);
    }
  }

  async function loadCondicion() {
    if (!condicionId) return;

    setIsLoading(true);
    try {
      const result = await obtenerCondicionComercial(studioSlug, condicionId);
      if (result.success && result.data) {
        const condicion = result.data;
        const advanceType = condicion.advance_type || 'percentage';
        const condicionWithPublic = condicion as { is_public?: boolean; offer_id?: string | null };
        const editForm = {
          name: condicion.name,
          description: condicion.description || '',
          discount_percentage: condicion.discount_percentage?.toString() || '',
          advance_type: advanceType as 'percentage' | 'fixed_amount',
          advance_percentage: condicion.advance_percentage?.toString() || '',
          advance_amount: condicion.advance_amount?.toString() || '',
          is_public: condicionWithPublic.is_public ?? true,
          offer_id: condicionWithPublic.offer_id ?? null,
        };
        setFormData(editForm);
        setInitialFormData(editForm);
        setLoadedCondicion(result.data as typeof loadedCondicion);
      } else {
        toast.error('Error al cargar la condición comercial');
        onClose();
      }
    } catch (error) {
      console.error('Error loading condicion:', error);
      toast.error('Error al cargar la condición comercial');
      onClose();
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    const emptyForm = {
      name: '',
      description: '',
      discount_percentage: '',
      advance_type: 'percentage' as 'percentage' | 'fixed_amount',
      advance_percentage: '',
      advance_amount: '',
      is_public: true,
      offer_id: null as string | null,
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
    setLoadedCondicion(null);
    setOfertasParaVincular([]);
    setBusquedaOfertas('');
  }

  async function loadOfertasParaVincular() {
    setCargandoOfertas(true);
    try {
      const result = await obtenerOfertasParaVincular(studioSlug, isEditMode ? condicionId ?? undefined : undefined);
      if (result.success && result.data) {
        setOfertasParaVincular(result.data);
      } else {
        setOfertasParaVincular([]);
      }
    } catch {
      setOfertasParaVincular([]);
    } finally {
      setCargandoOfertas(false);
    }
  }

  const hasUnsavedChanges = () => {
    return (
      formData.name !== initialFormData.name ||
      formData.description !== initialFormData.description ||
      formData.discount_percentage !== initialFormData.discount_percentage ||
      formData.advance_type !== initialFormData.advance_type ||
      formData.advance_percentage !== initialFormData.advance_percentage ||
      formData.advance_amount !== initialFormData.advance_amount ||
      formData.is_public !== initialFormData.is_public ||
      formData.offer_id !== initialFormData.offer_id
    );
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmClose(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    resetForm();
    setShowConfirmClose(false);
    onClose();
  };

  const handleAdvancePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, advance_percentage: '' });
      return;
    }
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 100) {
      value = '100';
    }
    setFormData({ ...formData, advance_percentage: value });
    if (formErrors.porcentaje_anticipo) {
      setFormErrors({ ...formErrors, porcentaje_anticipo: undefined });
    }
  };

  const handleAdvanceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, advance_amount: '' });
      return;
    }
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setFormData({ ...formData, advance_amount: value });
    if (formErrors.porcentaje_anticipo) {
      setFormErrors({ ...formErrors, porcentaje_anticipo: undefined });
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, discount_percentage: '' });
      if (formErrors.porcentaje_descuento) {
        setFormErrors({ ...formErrors, porcentaje_descuento: undefined });
      }
      return;
    }
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 100) {
      value = '100';
    }
    if (maxDescuento !== null && numValue > maxDescuento) {
      toast.error(`El descuento no puede ser mayor a ${maxDescuento}%`);
      return;
    }
    setFormData({ ...formData, discount_percentage: value });
    if (formErrors.porcentaje_descuento) {
      setFormErrors({ ...formErrors, porcentaje_descuento: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validar que el descuento no exceda el máximo permitido
      if (maxDescuento !== null && formData.discount_percentage) {
        const descuento = parseFloat(formData.discount_percentage);
        if (!isNaN(descuento) && descuento > maxDescuento) {
          toast.error(`El descuento no puede ser mayor a ${maxDescuento}%`);
          setIsSubmitting(false);
          return;
        }
      }

      const montoAnticipo = formData.advance_type === 'fixed_amount' 
        ? (formData.advance_amount && formData.advance_amount.trim() !== '' ? formData.advance_amount.trim() : null)
        : null;

      const isOffer = !!(formData.offer_id || context?.type === 'offer' || (isEditMode && loadedCondicion?.type === 'offer'));
      const data: CondicionComercialForm = {
        nombre: formData.name,
        descripcion: formData.description || null,
        porcentaje_descuento: formData.discount_percentage || null,
        porcentaje_anticipo: formData.advance_type === 'percentage' ? (formData.advance_percentage || null) : null,
        tipo_anticipo: formData.advance_type,
        monto_anticipo: montoAnticipo,
        status: 'active',
        orden: 0,
        type: isOffer ? 'offer' : 'standard',
        offer_id: formData.offer_id ?? null,
        override_standard: false,
        is_public: context?.type === 'offer' || isOffer ? true : formData.is_public,
      };

      const actionContext = context ? { offerId: context.offerId, type: context.type } : undefined;
      let result;

      if (isEditMode && condicionId) {
        result = await actualizarCondicionComercial(studioSlug, condicionId, data, actionContext);
      } else {
        result = await crearCondicionComercial(studioSlug, data, actionContext);
      }

      if (result.success && result.data) {
        toast.success(
          isEditMode 
            ? 'Condición comercial actualizada exitosamente'
            : 'Condición comercial creada exitosamente'
        );
        startTransition(() => router.refresh());
        if (isEditMode && onSuccess) {
          onSuccess({
            discount_percentage: result.data.discount_percentage,
            description: result.data.description,
          });
        } else if (!isEditMode && onSuccess) {
          onSuccess();
        }
        resetAndClose();
      } else {
        if (typeof result.error === 'object') {
          setFormErrors(result.error as typeof formErrors);
          if (result.error.nombre) {
            toast.error(result.error.nombre[0]);
          }
        } else {
          toast.error(result.error || `Error al ${isEditMode ? 'actualizar' : 'crear'} condición`);
        }
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} condicion:`, error);
      toast.error(`Error al ${isEditMode ? 'actualizar' : 'crear'} condición`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isEditMode 
    ? 'Editar Condición Comercial'
    : (context ? 'Nueva Condición Especial (Oferta)' : 'Nueva Condición Comercial');
  
  const description = isEditMode
    ? 'Modifica los detalles de la condición comercial'
    : (context ? `Condición especial vinculada a la oferta: ${context.offerName}` : 'Crea una nueva condición comercial');

  const saveDisabled =
    !formData.name ||
    isSubmitting ||
    (!!formData.discount_percentage &&
      (() => {
        const numValue = parseFloat(formData.discount_percentage);
        return !isNaN(numValue) && maxDescuento !== null && numValue > maxDescuento;
      })());

  const handleSaveClick = () => {
    document.getElementById('condicion-comercial-form-modal')?.requestSubmit();
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        description={description}
        maxWidth="md"
        zIndex={10090}
        onCancel={handleClose}
        onSave={handleSaveClick}
        saveLabel={isEditMode ? 'Guardar cambios' : 'Crear Condición'}
        cancelLabel="Cancelar"
        isLoading={isSubmitting}
        saveDisabled={saveDisabled}
      >
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {/* Skeleton Nombre */}
            <div className="space-y-2">
              <div className="h-4 w-40 bg-zinc-800 rounded" />
              <div className="h-10 bg-zinc-800 rounded" />
            </div>

            {/* Skeleton Descripción */}
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded" />
              <div className="h-20 bg-zinc-800 rounded" />
            </div>

            {/* Skeleton Tipo de Anticipo */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-32 bg-zinc-800 rounded" />
                  <div className="h-3 w-64 bg-zinc-800/50 rounded" />
                </div>
                <div className="h-6 w-20 bg-zinc-800 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-40 bg-zinc-800 rounded" />
                <div className="h-10 bg-zinc-800 rounded" />
                <div className="h-3 w-48 bg-zinc-800/50 rounded" />
              </div>
            </div>

            {/* Skeleton Porcentaje de Descuento */}
            <div className="space-y-2">
              <div className="h-4 w-48 bg-zinc-800 rounded" />
              <div className="h-10 bg-zinc-800 rounded" />
              <div className="h-3 w-72 bg-zinc-800/50 rounded" />
            </div>

            {/* Skeleton Botones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <div className="h-9 w-24 bg-zinc-800 rounded" />
              <div className="h-9 w-32 bg-zinc-800 rounded" />
            </div>
          </div>
        ) : (
          <form
            id="condicion-comercial-form-modal"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <ZenInput
              label="Nombre de la condición"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.nombre) {
                  setFormErrors({ ...formErrors, nombre: undefined });
                }
              }}
              required
              placeholder="Ej: 10% Descuento Enero"
              error={formErrors.nombre?.[0]}
            />

            <ZenTextarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (formErrors.descripcion) {
                  setFormErrors({ ...formErrors, descripcion: undefined });
                }
              }}
              error={formErrors.descripcion?.[0]}
              rows={3}
              placeholder="Descripción opcional de la condición"
            />

            <div className="space-y-2 p-4 border border-zinc-800 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium text-zinc-300">
                    Condición Pública
                  </label>
                  <p className="text-xs text-zinc-500">
                    {context?.type === 'offer'
                      ? 'Las condiciones de oferta son siempre públicas'
                      : 'Si se desactiva, solo será visible para el estudio y en negociaciones directas'}
                  </p>
                </div>
                <div className="pt-1">
                  <ZenSwitch
                    checked={context?.type === 'offer' ? true : formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    disabled={context?.type === 'offer'}
                    label={formData.is_public ? 'Pública' : 'Privada'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border border-zinc-800 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium text-zinc-300">
                    Tipo de anticipo
                  </label>
                  <p className="text-xs text-zinc-500">
                    Elige si el anticipo será un porcentaje o un monto fijo
                  </p>
                </div>
                <div className="pt-1">
                  <ZenSwitch
                    checked={formData.advance_type === 'fixed_amount'}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        advance_type: checked ? 'fixed_amount' : 'percentage',
                        advance_percentage: checked ? '' : formData.advance_percentage,
                        advance_amount: checked ? formData.advance_amount : '',
                      });
                    }}
                    label={formData.advance_type === 'fixed_amount' ? 'Monto fijo ($)' : 'Porcentaje (%)'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.advance_type === 'percentage' ? (
                  <ZenInput
                    label="Porcentaje de anticipo"
                    type="text"
                    inputMode="decimal"
                    value={formData.advance_percentage}
                    onChange={handleAdvancePercentageChange}
                    placeholder="10"
                    hint="Porcentaje que se solicita como anticipo (0-100%)"
                    error={formErrors.porcentaje_anticipo?.[0]}
                  />
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Monto fijo de anticipo</label>
                    <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900/50 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500/50">
                      <span className="pl-3 text-zinc-400 font-medium">$</span>
                      <ZenInput
                        type="text"
                        inputMode="decimal"
                        value={formData.advance_amount}
                        onChange={handleAdvanceAmountChange}
                        placeholder="1,000"
                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-1"
                        error={formErrors.porcentaje_anticipo?.[0]}
                      />
                    </div>
                    <p className="text-xs text-zinc-500">Monto fijo que se solicita como anticipo (mayor a 0)</p>
                  </div>
                )}
                <ZenInput
                  label="Porcentaje de descuento"
                  type="text"
                  inputMode="decimal"
                  value={formData.discount_percentage}
                  onChange={handleDiscountChange}
                  placeholder="10"
                  error={
                    formData.discount_percentage
                      ? (() => {
                          const numValue = parseFloat(formData.discount_percentage);
                          if (isNaN(numValue)) {
                            return undefined;
                          }
                          if (numValue > 100) {
                            return 'El porcentaje no puede ser mayor a 100%';
                          }
                          if (maxDescuento !== null && numValue > maxDescuento) {
                            return `No es posible aplicar el ${formData.discount_percentage}% de descuento por seguridad de la utilidad del negocio. El máximo permitido es ${maxDescuento}%`;
                          }
                          return undefined;
                        })()
                      : formErrors.porcentaje_descuento?.[0]
                  }
                />
              </div>
            </div>

            <div className="mt-2">
              {maxDescuento !== null ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>
                    Máximo descuento permitido para garantizar{' '}
                    <span className="font-medium text-emerald-400">{maxDescuento}%</span>{' '}
                    utilidad{' '}
                    <button
                      type="button"
                      onClick={() => setShowUtilidadModal(true)}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      configurar
                    </button>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUtilidadModal(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Configurar utilidad máxima
                  </button>
                </div>
              )}
            </div>

            {/* Sección de Vínculos: buscador + lista de ofertas con toggle Vincular / Desvincular */}
            {(() => {
              const isOfferType = context?.type === 'offer' || (isEditMode && loadedCondicion && (loadedCondicion.type === 'offer' || !!loadedCondicion.offer_id));
              if (!isOfferType) return null;

              const currentOfferId = formData.offer_id ?? loadedCondicion?.offer_id ?? null;
              const isLinked = (offerId: string) => currentOfferId === offerId;
              const q = busquedaOfertas.trim().toLowerCase();
              const filtered = ofertasParaVincular.filter(
                (o) => !q || o.name.toLowerCase().includes(q) || o.id === currentOfferId
              );
              const displayedOfertas = currentOfferId
                ? [...filtered].sort((a, b) => (a.id === currentOfferId ? -1 : b.id === currentOfferId ? 1 : 0))
                : filtered;

              return (
                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <h4 className="text-sm font-medium text-zinc-300">Ofertas</h4>
                  <p className="text-xs text-zinc-500">Vincula o desvincula una oferta. Solo puede haber una oferta vinculada por condición.</p>
                  {cargandoOfertas ? (
                    <div className="text-sm text-zinc-400">Cargando ofertas…</div>
                  ) : ofertasParaVincular.length === 0 ? (
                    <div className="text-sm text-zinc-400">No hay ofertas en este estudio.</div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                        <ZenInput
                          type="text"
                          value={busquedaOfertas}
                          onChange={(e) => setBusquedaOfertas(e.target.value)}
                          placeholder="Buscar ofertas..."
                          className="pl-8"
                        />
                      </div>
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {displayedOfertas.map((o) => (
                        <li
                          key={o.id}
                          className="p-3 rounded-lg border border-zinc-700 bg-zinc-800/50 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-medium text-white truncate">{o.name}</span>
                            <span
                              className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                                o.isVigente ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {o.isVigente ? 'Vigente' : 'Vencida'}
                            </span>
                            <span className="text-xs text-zinc-400 shrink-0">{o.vigenciaLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isLinked(o.id) ? (
                              <>
                                <ZenButton
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="min-w-[8rem] h-7 justify-center gap-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/40"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setShowDesvincularConfirm(true);
                                  }}
                                >
                                  <Unlink className="h-3.5 w-3.5 shrink-0" />
                                  Desvincular oferta
                                </ZenButton>
                                <a
                                  href={`/${studioSlug}/studio/commercial/ofertas/${o.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1 min-w-[8rem] h-7 px-2.5 text-xs rounded border border-zinc-600 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                  Gestionar oferta
                                </a>
                              </>
                            ) : (
                              <ZenButton
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 disabled:opacity-60"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFormData({ ...formData, offer_id: o.id });
                                }}
                                disabled={o.linkedToOtraCondicion}
                                title={o.linkedToOtraCondicion ? 'Vinculada a otra condición' : undefined}
                              >
                                Vincular oferta
                              </ZenButton>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {displayedOfertas.length === 0 && (
                      <p className="text-sm text-zinc-500">Ninguna oferta coincide con la búsqueda. La oferta vinculada siempre se muestra arriba.</p>
                    )}
                    </>
                  )}
                </div>
              );
            })()}
          </form>
        )}
      </ZenDialog>

      <ZenConfirmModal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        onConfirm={resetAndClose}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar. Si cierras ahora, los cambios no se guardarán."
        confirmText="Descartar cambios"
        cancelText="Cancelar"
        variant="destructive"
        zIndex={10300}
      />

      <ZenConfirmModal
        isOpen={showDesvincularConfirm}
        onClose={() => setShowDesvincularConfirm(false)}
        onConfirm={async () => {
          if (!condicionId) return;
          const result = await desvincularOfertaCondicionComercial(studioSlug, condicionId);
          setShowDesvincularConfirm(false);
          if (result.success) {
            toast.success('Oferta desvinculada. La condición pasó a tipo estándar.');
            startTransition(() => router.refresh());
            await loadCondicion();
            onSuccess?.();
          } else {
            toast.error(result.error ?? 'Error al desvincular');
          }
        }}
        title="¿Desvincular oferta?"
        description="La condición pasará a ser de tipo estándar y el switch Pública/Privada volverá a ser editable."
        confirmText="Desvincular"
        cancelText="Cancelar"
        variant="destructive"
        zIndex={10300}
      />

      {showUtilidadModal && (
        <RentabilidadForm
          studioSlug={studioSlug}
          onClose={() => {
            setShowUtilidadModal(false);
            loadConfiguracion();
          }}
        />
      )}
    </>
  );
}

