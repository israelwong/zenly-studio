'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  crearCondicionComercial,
  obtenerConfiguracionPrecios,
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { useConfiguracionPreciosUpdateListener, type ConfiguracionPreciosUpdateEventDetail } from '@/hooks/useConfiguracionPreciosRefresh';
import { UtilidadForm } from '@/components/shared/configuracion/UtilidadForm';
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
    advance_percentage: '',
  });
  const [formErrors, setFormErrors] = useState<{
    nombre?: string[];
  }>({});
  const [initialFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    advance_percentage: '',
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
      formData.advance_percentage !== initialFormData.advance_percentage
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
      advance_percentage: '',
    });
    setFormErrors({});
    setShowConfirmClose(false);
    onClose();
  };

  const handleAdvanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const data: {
        nombre: string;
        descripcion: string;
        porcentaje_descuento: string;
        porcentaje_anticipo: string;
        status: 'active' | 'inactive';
        orden: number;
      } = {
        nombre: formData.name,
        descripcion: formData.description || '',
        porcentaje_descuento: formData.discount_percentage || '0',
        porcentaje_anticipo: formData.advance_percentage || '0',
        status: 'active',
        orden: 0,
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

          <ZenInput
            label="Porcentaje de anticipo"
            type="text"
            inputMode="decimal"
            value={formData.advance_percentage}
            onChange={handleAdvanceChange}
            placeholder="10"
            hint="Porcentaje que se solicita como anticipo"
          />

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
        <UtilidadForm
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
