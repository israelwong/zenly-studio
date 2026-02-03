'use client';

import { useState, useEffect } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerCondicionComercial,
  actualizarCondicionComercial,
  obtenerConfiguracionPrecios,
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import type { CondicionComercialForm } from '@/lib/actions/schemas/condiciones-comerciales-schemas';
import { useConfiguracionPreciosUpdateListener, type ConfiguracionPreciosUpdateEventDetail } from '@/hooks/useConfiguracionPreciosRefresh';
import { RentabilidadForm } from '@/components/shared/configuracion/RentabilidadForm';
import { toast } from 'sonner';

interface EditarCondicionComercialModalProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  condicionId: string | null;
  onSuccess: (updatedCondition: { discount_percentage: number | null; description: string | null }) => void;
  context?: {
    type: 'offer';
    offerId: string;
    offerName: string;
  };
}

export function EditarCondicionComercialModal({
  studioSlug,
  isOpen,
  onClose,
  condicionId,
  onSuccess,
  context,
}: EditarCondicionComercialModalProps) {
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

  // Cargar condición cuando se abre el modal
  useEffect(() => {
    if (isOpen && condicionId) {
      loadCondicion();
      loadConfiguracion();
    }
  }, [isOpen, condicionId, studioSlug]);

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
    setFormData({
      name: '',
      description: '',
      discount_percentage: '',
      advance_type: 'percentage',
      advance_percentage: '',
      advance_amount: '',
    });
    setInitialFormData({
      name: '',
      description: '',
      discount_percentage: '',
      advance_type: 'percentage',
      advance_percentage: '',
      advance_amount: '',
    });
    setFormErrors({});
    setShowConfirmClose(false);
    onClose();
  };

  const handleDiscountChange = (value: string) => {
    const numValue = value === '' ? '' : parseFloat(value);
    
    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
      if (maxDescuento !== null && numValue !== '' && numValue > maxDescuento) {
        toast.error(`El descuento no puede ser mayor a ${maxDescuento}%`);
        return;
      }
      setFormData({ ...formData, discount_percentage: value });
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
      
      if (!condicionId) {
        toast.error('ID de condición no válido');
        setIsSubmitting(false);
        return;
      }

      const result = await actualizarCondicionComercial(studioSlug, condicionId, data, actionContext);

      if (result.success && result.data) {
        toast.success('Condición comercial actualizada exitosamente');
        
        // Notificar al componente padre con los nuevos valores
        onSuccess({
          discount_percentage: result.data.discount_percentage,
          description: result.data.description,
        });
        
        resetAndClose();
      } else {
        if (typeof result.error === 'object') {
          setFormErrors(result.error as typeof formErrors);
          if (result.error.nombre) {
            toast.error(result.error.nombre[0]);
          }
        } else {
          toast.error(result.error || 'Error al actualizar condición');
        }
      }
    } catch (error) {
      console.error('Error updating condicion:', error);
      toast.error('Error al actualizar condición');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Editar Condición Comercial"
        description="Modifica los detalles de la condición comercial"
        maxWidth="md"
        zIndex={10090}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-zinc-400">Cargando...</div>
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
              error={formErrors.nombre?.[0]}
              required
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
              placeholder="Descripción de la condición comercial"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">
                  Tipo de anticipo
                </label>
                <div className="flex gap-2">
                  <ZenButton
                    type="button"
                    variant={formData.advance_type === 'fixed_amount' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, advance_type: 'fixed_amount' })}
                  >
                    Monto fijo
                  </ZenButton>
                  <ZenButton
                    type="button"
                    variant={formData.advance_type === 'percentage' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, advance_type: 'percentage' })}
                  >
                    Porcentaje
                  </ZenButton>
                </div>
              </div>

              {formData.advance_type === 'fixed_amount' ? (
                <ZenInput
                  label="Monto fijo de anticipo"
                  type="number"
                  value={formData.advance_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, advance_amount: e.target.value });
                    if (formErrors.porcentaje_anticipo) {
                      setFormErrors({ ...formErrors, porcentaje_anticipo: undefined });
                    }
                  }}
                  error={formErrors.porcentaje_anticipo?.[0]}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              ) : (
                <ZenInput
                  label="Porcentaje de anticipo"
                  type="number"
                  value={formData.advance_percentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
                      setFormData({ ...formData, advance_percentage: value });
                      if (formErrors.porcentaje_anticipo) {
                        setFormErrors({ ...formErrors, porcentaje_anticipo: undefined });
                      }
                    }
                  }}
                  error={formErrors.porcentaje_anticipo?.[0]}
                  placeholder="0"
                  min="0"
                  max="100"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">
                  Porcentaje de descuento
                </label>
                {maxDescuento !== null && (
                  <span className="text-xs text-zinc-500">
                    Máximo: {maxDescuento}%
                  </span>
                )}
              </div>
              <ZenInput
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => handleDiscountChange(e.target.value)}
                error={formErrors.porcentaje_descuento?.[0]}
                placeholder="0"
                min="0"
                max={maxDescuento !== null ? maxDescuento : 100}
                hint={maxDescuento !== null ? `Máximo permitido: ${maxDescuento}%` : undefined}
              />
              {maxDescuento === null && (
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

            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
              <ZenButton
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </ZenButton>
              <ZenButton
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
                className="flex-1"
              >
                Guardar cambios
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

