'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea, ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  crearCondicionComercial,
  obtenerConfiguracionPrecios,
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import type { CondicionComercialForm } from '@/lib/actions/schemas/condiciones-comerciales-schemas';
import { useConfiguracionPreciosUpdateListener, type ConfiguracionPreciosUpdateEventDetail } from '@/hooks/useConfiguracionPreciosRefresh';
import { RentabilidadForm } from '@/components/shared/configuracion/RentabilidadForm';
import { toast } from 'sonner';

interface CrearCondicionComercialModalProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback para recargar lista padre
  context?: {
    type: 'offer';
    offerId: string;
    offerName: string;
  };
}

export function CrearCondicionComercialModal({
  studioSlug,
  isOpen,
  onClose,
  onSuccess,
  context,
}: CrearCondicionComercialModalProps) {
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
  }>({});
  const [initialFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    advance_type: 'percentage' as 'percentage' | 'fixed_amount',
    advance_percentage: '',
    advance_amount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxDescuento, setMaxDescuento] = useState<number | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showUtilidadModal, setShowUtilidadModal] = useState(false);

  // Cargar configuración de precios
  useEffect(() => {
    if (isOpen) {
      loadConfiguracion();
    }
  }, [isOpen, studioSlug]);

  // Escuchar actualizaciones de configuración de precios
  useConfiguracionPreciosUpdateListener(studioSlug, (config?: ConfiguracionPreciosUpdateEventDetail) => {
    if (config?.sobreprecio !== undefined) {
      // Ya viene como porcentaje (20, no 0.20)
      setMaxDescuento(config.sobreprecio);
    } else {
      loadConfiguracion();
    }
  });

  async function loadConfiguracion() {
    try {
      const result = await obtenerConfiguracionPrecios(studioSlug);
      if (result.success && result.data) {
        // Ya viene convertido a porcentaje desde el action (20, no 0.20)
        setMaxDescuento(result.data.sobreprecio || 0);
      }
    } catch (error) {
      console.error('Error loading configuracion:', error);
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
    setFormErrors({});
    setShowConfirmClose(false);
    onClose();
  };

  const handleAdvancePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Permitir campo vacío
    if (value === '') {
      setFormData({ ...formData, advance_percentage: '' });
      return;
    }
    // Eliminar caracteres no numéricos excepto punto decimal
    value = value.replace(/[^0-9.]/g, '');
    // Permitir solo un punto decimal
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    // Limitar a 100
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 100) {
      value = '100';
    }
    setFormData({ ...formData, advance_percentage: value });
  };

  const handleAdvanceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Permitir campo vacío
    if (value === '') {
      setFormData({ ...formData, advance_amount: '' });
      return;
    }
    // Eliminar caracteres no numéricos excepto punto decimal
    value = value.replace(/[^0-9.]/g, '');
    // Permitir solo un punto decimal
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setFormData({ ...formData, advance_amount: value });
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value === '') {
      setFormData({ ...formData, discount_percentage: '' });
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
    setFormData({ ...formData, discount_percentage: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: CondicionComercialForm = {
        nombre: formData.name,
        descripcion: formData.description || '',
        porcentaje_descuento: formData.discount_percentage || '0',
        porcentaje_anticipo: formData.advance_type === 'percentage' ? (formData.advance_percentage || '0') : null,
        tipo_anticipo: formData.advance_type,
        monto_anticipo: formData.advance_type === 'fixed_amount' ? (formData.advance_amount || null) : null,
        status: 'active',
        orden: 0,
        type: context?.type === 'offer' ? 'offer' : 'standard',
        override_standard: false,
      };

      const actionContext = context ? { offerId: context.offerId, type: context.type } : undefined;
      const result = await crearCondicionComercial(studioSlug, data, actionContext);

      if (result.success) {
        toast.success('Condición comercial creada exitosamente');
        onSuccess(); // Callback para recargar lista
        resetAndClose();
      } else {
        if (typeof result.error === 'object') {
          setFormErrors(result.error as { nombre?: string[] });
          if (result.error.nombre) {
            toast.error(result.error.nombre[0]);
          }
        } else {
          toast.error(result.error || 'Error al crear condición');
        }
      }
    } catch (error) {
      console.error('Error creating condicion:', error);
      toast.error('Error al crear condición');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title={context ? "Nueva Condición Especial (Oferta)" : "Nueva Condición Comercial"}
        description={context ? `Condición especial vinculada a la oferta: ${context.offerName}` : 'Crea una nueva condición comercial'}
        maxWidth="md"
      >
        {/* Banner de contexto de oferta */}
        {context && (
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-purple-300">
              <span className="text-lg">📦</span>
              <div>
                <p className="text-sm font-medium">Condición especial para oferta</p>
                <p className="text-xs text-purple-400 mt-0.5">
                  {context.offerName}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <ZenInput
            label="Nombre de la condición"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.nombre) {
                setFormErrors(prev => ({ ...prev, nombre: undefined }));
              }
            }}
            required
            placeholder="Ej: 10% Descuento Enero"
            error={formErrors.nombre?.[0]}
          />

          <ZenTextarea
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descripción opcional de la condición"
            rows={3}
          />

          <div className="space-y-4">
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
                  : undefined
              }
            />
            {maxDescuento !== null && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Descuento máximo permitido: <span className="font-medium text-emerald-400">{maxDescuento}%</span>
                </p>
                <ZenButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUtilidadModal(true)}
                  className="h-6 text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Configurar
                </ZenButton>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <ZenButton
              type="button"
              variant="ghost"
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
              Crear Condición
            </ZenButton>
          </div>
        </form>
      </ZenDialog>

      {/* Modal de confirmación de cierre */}
      <ZenConfirmModal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        onConfirm={resetAndClose}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar. Si cierras ahora, los cambios no se guardarán."
        confirmText="Descartar cambios"
        cancelText="Cancelar"
        variant="destructive"
      />

      {/* Modal de Configuración de Utilidad */}
      <ZenDialog
        isOpen={showUtilidadModal}
        onClose={() => setShowUtilidadModal(false)}
        title="Configuración de Márgenes de Utilidad"
        description="Gestiona los márgenes de utilidad, comisiones y sobreprecios"
        maxWidth="2xl"
        closeOnClickOutside={false}
      >
        <RentabilidadForm
          studioSlug={studioSlug}
          onClose={() => {
            setShowUtilidadModal(false);
            // Recargar configuración después de cerrar
            loadConfiguracion();
          }}
        />
      </ZenDialog>
    </>
  );
}
