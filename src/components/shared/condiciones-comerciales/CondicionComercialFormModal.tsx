'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea, ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerCondicionComercial,
  crearCondicionComercial,
  actualizarCondicionComercial,
  obtenerConfiguracionPrecios,
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maxDescuento, setMaxDescuento] = useState<number | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showUtilidadModal, setShowUtilidadModal] = useState(false);

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
        const editForm = {
          name: condicion.name,
          description: condicion.description || '',
          discount_percentage: condicion.discount_percentage?.toString() || '',
          advance_type: advanceType as 'percentage' | 'fixed_amount',
          advance_percentage: condicion.advance_percentage?.toString() || '',
          advance_amount: condicion.advance_amount?.toString() || '',
        };
        setFormData(editForm);
        setInitialFormData(editForm);
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
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
  }

  const hasUnsavedChanges = () => {
    return (
      formData.name !== initialFormData.name ||
      formData.description !== initialFormData.description ||
      formData.discount_percentage !== initialFormData.discount_percentage ||
      formData.advance_type !== initialFormData.advance_type ||
      formData.advance_percentage !== initialFormData.advance_percentage ||
      formData.advance_amount !== initialFormData.advance_amount
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

      const data: CondicionComercialForm = {
        nombre: formData.name,
        descripcion: formData.description || null,
        porcentaje_descuento: formData.discount_percentage || null,
        porcentaje_anticipo: formData.advance_type === 'percentage' ? (formData.advance_percentage || null) : null,
        tipo_anticipo: formData.advance_type,
        monto_anticipo: montoAnticipo,
        status: 'active',
        orden: 0,
        type: context?.type === 'offer' ? 'offer' : 'standard',
        override_standard: false,
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
        
        // Notificar al componente padre con los nuevos valores (solo en modo edición)
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

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        description={description}
        maxWidth="md"
        zIndex={10090}
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    label={formData.advance_type === 'fixed_amount' ? 'Monto fijo' : 'Porcentaje'}
                  />
                </div>
              </div>

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
                <ZenInput
                  label="Monto fijo de anticipo"
                  type="text"
                  inputMode="decimal"
                  value={formData.advance_amount}
                  onChange={handleAdvanceAmountChange}
                  placeholder="1000"
                  hint="Monto fijo que se solicita como anticipo (ej: $1,000)"
                  error={formErrors.porcentaje_anticipo?.[0]}
                />
              )}
            </div>

            <div className="space-y-2">
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <ZenButton
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </ZenButton>
              <ZenButton
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={
                  !formData.name ||
                  isSubmitting ||
                  (formData.discount_percentage
                    ? (() => {
                        const numValue = parseFloat(formData.discount_percentage);
                        return (
                          !isNaN(numValue) &&
                          maxDescuento !== null &&
                          numValue > maxDescuento
                        );
                      })()
                    : false)
                }
              >
                {isEditMode ? 'Guardar cambios' : 'Crear Condición'}
              </ZenButton>
            </div>
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

