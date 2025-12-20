'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea, ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerTodasCondicionesComerciales,
  crearCondicionComercial,
  actualizarCondicionComercial,
  eliminarCondicionComercial,
  actualizarOrdenCondicionesComerciales,
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import type { CondicionComercialForm } from '@/lib/actions/schemas/condiciones-comerciales-schemas';
import { useConfiguracionPreciosUpdateListener, type ConfiguracionPreciosUpdateEventDetail } from '@/hooks/useConfiguracionPreciosRefresh';
import { UtilidadForm } from '@/app/[slug]/studio/commercial/catalogo/components/UtilidadForm';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  status: string;
  order: number | null;
  type?: string;
  offer_id?: string | null;
  override_standard?: boolean;
}

interface CondicionesComercialesManagerProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  context?: {
    type: 'offer';
    offerId: string;
    offerName: string;
  };
}

interface SortableCondicionItemProps {
  condicion: CondicionComercial;
  index: number;
  totalItems: number;
  onEdit: (condicion: CondicionComercial) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, newStatus: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function SortableCondicionItem({
  condicion,
  index,
  totalItems,
  onEdit,
  onDelete,
  onToggleStatus,
  onMoveUp,
  onMoveDown
}: SortableCondicionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: condicion.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isActive = condicion.status === 'active';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg w-full cursor-pointer transition-all ${isActive
        ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
        : 'border-zinc-700 bg-zinc-800/30 opacity-75'
        }`}
      onClick={() => onEdit(condicion)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1 text-zinc-500 hover:text-zinc-400"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                {condicion.name}
              </h4>
              {condicion.type === 'offer' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                  OFERTA
                </span>
              )}
            </div>
            {condicion.description && (
              <p className={`text-sm mt-1 ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {condicion.description}
              </p>
            )}
            <div className={`flex items-center gap-4 mt-2 text-sm ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {(() => {
                const advanceType = condicion.advance_type || 'percentage';
                if (advanceType === 'fixed_amount' && condicion.advance_amount) {
                  return <span>Anticipo: ${condicion.advance_amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                } else if (advanceType === 'percentage' && condicion.advance_percentage) {
                  return <span>Anticipo: {condicion.advance_percentage}%</span>;
                }
                return null;
              })()}
              <span>Descuento: {condicion.discount_percentage ?? 0}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <ZenSwitch
            checked={isActive}
            onCheckedChange={(checked) => onToggleStatus(condicion.id, checked)}
            label={isActive ? 'Activa' : 'Inactiva'}
          />
          <div className="flex items-center gap-1">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => onMoveUp(condicion.id)}
              disabled={index === 0}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </ZenButton>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => onMoveDown(condicion.id)}
              disabled={index === totalItems - 1}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </ZenButton>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => onDelete(condicion.id)}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </ZenButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CondicionesComercialesManager({
  studioSlug,
  isOpen,
  onClose,
  onRefresh,
  context,
}: CondicionesComercialesManagerProps) {
  const [condiciones, setCondiciones] = useState<CondicionComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [maxDescuento, setMaxDescuento] = useState<number | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showUtilidadModal, setShowUtilidadModal] = useState(false);
  const [viewingOfferCondition, setViewingOfferCondition] = useState<CondicionComercial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    advance_type: 'percentage' as 'percentage' | 'fixed_amount',
    advance_percentage: '',
    advance_amount: '',
    status: true,
    is_offer: false,
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
    status: true,
    is_offer: false,
  });

  // Verificar si hay cambios sin guardar
  const hasUnsavedChanges = () => {
    if (!showForm && !viewingOfferCondition) return false;
    if (viewingOfferCondition) return false; // Ficha informativa no tiene cambios editables
    return (
      formData.name !== initialFormData.name ||
      formData.description !== initialFormData.description ||
      formData.discount_percentage !== initialFormData.discount_percentage ||
      formData.advance_type !== initialFormData.advance_type ||
      formData.advance_percentage !== initialFormData.advance_percentage ||
      formData.advance_amount !== initialFormData.advance_amount ||
      formData.status !== initialFormData.status ||
      formData.is_offer !== initialFormData.is_offer
    );
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setPendingClose(() => onClose);
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowForm(false);
    setEditingId(null);
    setViewingOfferCondition(null);
    const emptyForm = {
      name: '',
      description: '',
      discount_percentage: '',
      advance_type: 'percentage' as 'percentage' | 'fixed_amount',
      advance_percentage: '',
      advance_amount: '',
      status: true,
      is_offer: false,
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setShowConfirmClose(false);
    if (pendingClose) {
      pendingClose();
      setPendingClose(null);
    }
  };

  const handleCancelClose = () => {
    setShowConfirmClose(false);
    setPendingClose(null);
  };

  useEffect(() => {
    if (isOpen) {
      loadCondiciones();
      loadConfiguracion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studioSlug]);

  // Recargar configuración cuando se muestra el formulario
  // Para asegurar que siempre tenga el valor más reciente
  useEffect(() => {
    if (showForm && isOpen) {
      loadConfiguracion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, isOpen]);

  // Escuchar actualizaciones de configuración de precios
  useConfiguracionPreciosUpdateListener(studioSlug, (config?: ConfiguracionPreciosUpdateEventDetail) => {
    // Si se pasa el sobreprecio directamente, actualizar inmediatamente
    // El sobreprecio viene en decimal (0.05 = 5%), convertir a porcentaje
    if (config?.sobreprecio !== undefined) {
      setMaxDescuento(config.sobreprecio * 100);
    } else {
      // Si no viene el sobreprecio, recargar la configuración completa
      loadConfiguracion();
    }
  });

  // Recargar configuración cuando la ventana recupera el foco
  // Útil cuando el usuario cambia el valor en otra pestaña/ventana
  useEffect(() => {
    if (!isOpen) return;

    const handleFocus = () => {
      // Recargar configuración cuando la ventana recupera el foco
      loadConfiguracion();
    };

    const handleVisibilityChange = () => {
      // Recargar cuando la pestaña se vuelve visible
      if (!document.hidden) {
        loadConfiguracion();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studioSlug]);

  const loadConfiguracion = async () => {
    try {
      const result = await obtenerConfiguracionPrecios(studioSlug);
      if (result.success && result.data) {
        // sobreprecio ya viene convertido a porcentaje (ej: 10 = 10%)
        // No multiplicar nuevamente, usar directamente
        setMaxDescuento(result.data.sobreprecio);
      }
    } catch (error) {
      console.error('Error loading configuracion:', error);
    }
  };

  const loadCondiciones = async () => {
    try {
      setLoading(true);
      const result = await obtenerTodasCondicionesComerciales(studioSlug);

      if (result.success && result.data) {
        setCondiciones(result.data);
      } else {
        toast.error(result.error || 'Error al cargar condiciones');
      }
    } catch (error) {
      console.error('Error loading condiciones:', error);
      toast.error('Error al cargar condiciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    const emptyForm = {
      name: '',
      description: '',
      discount_percentage: '',
      advance_type: 'percentage' as 'percentage' | 'fixed_amount',
      advance_percentage: '',
      advance_amount: '',
      status: true,
      is_offer: false,
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (condicion: CondicionComercial) => {
    setEditingId(condicion.id);
    setViewingOfferCondition(null);
    const advanceType = condicion.advance_type || 'percentage';
    const editForm = {
      name: condicion.name,
      description: condicion.description || '',
      discount_percentage: condicion.discount_percentage?.toString() || '',
      advance_type: advanceType as 'percentage' | 'fixed_amount',
      advance_percentage: condicion.advance_percentage?.toString() || '',
      advance_amount: condicion.advance_amount?.toString() || '',
      status: condicion.status === 'active',
      is_offer: condicion.type === 'offer',
    };
    setFormData(editForm);
    setInitialFormData(editForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      const result = await eliminarCondicionComercial(studioSlug, pendingDeleteId);
      if (result.success) {
        // Actualizar estado local en lugar de recargar todo
        setCondiciones(prev => prev.filter(c => c.id !== pendingDeleteId));
        toast.success('Condición eliminada exitosamente');
        onRefresh?.();
      } else {
        toast.error(result.error || 'Error al eliminar condición');
      }
    } catch (error) {
      console.error('Error deleting condicion:', error);
      toast.error('Error al eliminar condición');
    } finally {
      setShowConfirmDelete(false);
      setPendingDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
    setPendingDeleteId(null);
  };

  const handleConvertToStandard = async () => {
    if (!viewingOfferCondition) return;

    try {
      const tipoAnticipo: 'percentage' | 'fixed_amount' =
        (viewingOfferCondition.advance_type === 'percentage' || viewingOfferCondition.advance_type === 'fixed_amount')
          ? viewingOfferCondition.advance_type
          : 'percentage';

      const data = {
        nombre: viewingOfferCondition.name,
        descripcion: viewingOfferCondition.description || null,
        porcentaje_descuento: viewingOfferCondition.discount_percentage?.toString() || null,
        porcentaje_anticipo: viewingOfferCondition.advance_percentage?.toString() || null,
        tipo_anticipo: tipoAnticipo,
        monto_anticipo: viewingOfferCondition.advance_amount?.toString() || null,
        status: (viewingOfferCondition.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
        orden: viewingOfferCondition.order || 0,
        type: 'standard' as const,
        offer_id: null,
        override_standard: viewingOfferCondition.override_standard || false,
      } satisfies CondicionComercialForm;

      const result = await actualizarCondicionComercial(studioSlug, viewingOfferCondition.id, data);

      if (result.success && result.data) {
        const condicionMapeada: CondicionComercial = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          discount_percentage: result.data.discount_percentage,
          advance_percentage: result.data.advance_percentage,
          status: result.data.status,
          order: result.data.order,
          type: result.data.type,
          offer_id: result.data.offer_id,
          override_standard: result.data.override_standard,
        };

        setCondiciones(prev =>
          prev.map(c => (c.id === viewingOfferCondition.id ? condicionMapeada : c))
        );

        toast.success('Condición convertida a estándar exitosamente');
        setViewingOfferCondition(null);
        onRefresh?.();
      } else {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : 'Error al convertir condición';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error converting condition:', error);
      toast.error('Error al convertir condición');
    }
  };

  const handleRemoveFromOffer = async () => {
    if (!viewingOfferCondition) return;
    await handleConvertToStandard();
  };

  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
      const condicion = condiciones.find(c => c.id === id);
      if (!condicion) return;

      const tipoAnticipo: 'percentage' | 'fixed_amount' =
        (condicion.advance_type === 'percentage' || condicion.advance_type === 'fixed_amount')
          ? condicion.advance_type
          : 'percentage';

      const data = {
        nombre: condicion.name,
        descripcion: condicion.description || null,
        porcentaje_descuento: condicion.discount_percentage?.toString() || null,
        porcentaje_anticipo: condicion.advance_percentage?.toString() || null,
        tipo_anticipo: tipoAnticipo,
        monto_anticipo: condicion.advance_amount?.toString() || null,
        status: (newStatus ? 'active' : 'inactive') as 'active' | 'inactive',
        orden: condicion.order || 0,
        type: (condicion.type === 'standard' || condicion.type === 'offer' ? condicion.type : 'standard') as 'standard' | 'offer',
        offer_id: condicion.offer_id || null,
        override_standard: condicion.override_standard || false,
      } satisfies CondicionComercialForm;

      const result = await actualizarCondicionComercial(studioSlug, id, data);

      if (result.success && result.data) {
        const condicionMapeada: CondicionComercial = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          discount_percentage: result.data.discount_percentage,
          advance_percentage: result.data.advance_percentage,
          status: result.data.status,
          order: result.data.order,
          type: result.data.type,
          offer_id: result.data.offer_id,
          override_standard: result.data.override_standard,
        };

        setCondiciones(prev =>
          prev.map(c => (c.id === id ? condicionMapeada : c))
        );

        toast.success(`Condición ${newStatus ? 'activada' : 'desactivada'} exitosamente`);
        onRefresh?.();
      } else {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : 'Error al actualizar el estado';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || isReordering) {
      return;
    }

    const oldIndex = condiciones.findIndex((c) => c.id === active.id);
    const newIndex = condiciones.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newCondiciones = arrayMove(condiciones, oldIndex, newIndex);

    try {
      setIsReordering(true);

      // Actualizar estado local primero
      setCondiciones(newCondiciones);

      // Actualizar orden en el servidor
      const condicionesConOrden = newCondiciones.map((condicion, index) => ({
        id: condicion.id,
        orden: index,
      }));

      const result = await actualizarOrdenCondicionesComerciales(studioSlug, condicionesConOrden);

      if (!result.success) {
        // Revertir si falla
        setCondiciones(condiciones);
        toast.error(result.error || 'Error al actualizar el orden');
      } else {
        toast.success('Orden actualizado exitosamente');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error reordering condiciones:', error);
      // Revertir si falla
      setCondiciones(condiciones);
      toast.error('Error al actualizar el orden');
    } finally {
      setIsReordering(false);
    }
  };

  const handleMoveUp = async (id: string) => {
    const currentIndex = condiciones.findIndex((c) => c.id === id);
    if (currentIndex === 0 || isReordering) return;

    const newIndex = currentIndex - 1;
    const newCondiciones = arrayMove(condiciones, currentIndex, newIndex);

    try {
      setIsReordering(true);
      setCondiciones(newCondiciones);

      const condicionesConOrden = newCondiciones.map((condicion, index) => ({
        id: condicion.id,
        orden: index,
      }));

      const result = await actualizarOrdenCondicionesComerciales(studioSlug, condicionesConOrden);

      if (!result.success) {
        setCondiciones(condiciones);
        toast.error(result.error || 'Error al actualizar el orden');
      } else {
        toast.success('Orden actualizado exitosamente');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error moving condicion:', error);
      setCondiciones(condiciones);
      toast.error('Error al actualizar el orden');
    } finally {
      setIsReordering(false);
    }
  };

  const handleMoveDown = async (id: string) => {
    const currentIndex = condiciones.findIndex((c) => c.id === id);
    if (currentIndex === condiciones.length - 1 || isReordering) return;

    const newIndex = currentIndex + 1;
    const newCondiciones = arrayMove(condiciones, currentIndex, newIndex);

    try {
      setIsReordering(true);
      setCondiciones(newCondiciones);

      const condicionesConOrden = newCondiciones.map((condicion, index) => ({
        id: condicion.id,
        orden: index,
      }));

      const result = await actualizarOrdenCondicionesComerciales(studioSlug, condicionesConOrden);

      if (!result.success) {
        setCondiciones(condiciones);
        toast.error(result.error || 'Error al actualizar el orden');
      } else {
        toast.success('Orden actualizado exitosamente');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error moving condicion:', error);
      setCondiciones(condiciones);
      toast.error('Error al actualizar el orden');
    } finally {
      setIsReordering(false);
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Permitir solo números y punto decimal
    const onlyNumbers = value.replace(/[^0-9.]/g, '');

    // Evitar múltiples puntos decimales
    const parts = onlyNumbers.split('.');
    const cleaned = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : onlyNumbers;

    // Limitar a máximo 3 dígitos (sin contar el punto decimal)
    const digitsOnly = cleaned.replace('.', '');
    if (digitsOnly.length > 3) {
      return; // No actualizar si excede 3 dígitos
    }

    // Validar que no exceda 100
    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue) && numValue > 100) {
      return; // No actualizar si excede 100
    }

    setFormData({ ...formData, discount_percentage: cleaned });
  };

  const handleAdvancePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Permitir solo números y punto decimal
    const onlyNumbers = value.replace(/[^0-9.]/g, '');

    // Evitar múltiples puntos decimales
    const parts = onlyNumbers.split('.');
    const cleaned = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : onlyNumbers;

    // Limitar a máximo 3 dígitos (sin contar el punto decimal)
    const digitsOnly = cleaned.replace('.', '');
    if (digitsOnly.length > 3) {
      return; // No actualizar si excede 3 dígitos
    }

    // Validar que no exceda 100
    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue) && numValue > 100) {
      return; // No actualizar si excede 100
    }

    setFormData({ ...formData, advance_percentage: cleaned });
  };

  const handleAdvanceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Permitir solo números y punto decimal
    const onlyNumbers = value.replace(/[^0-9.]/g, '');

    // Evitar múltiples puntos decimales
    const parts = onlyNumbers.split('.');
    const cleaned = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : onlyNumbers;

    setFormData({ ...formData, advance_amount: cleaned });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que el descuento no exceda 100%
    if (formData.discount_percentage) {
      const descuento = parseFloat(formData.discount_percentage);
      if (isNaN(descuento) || descuento < 0) {
        toast.error('El porcentaje de descuento debe ser un número válido mayor o igual a 0');
        return;
      }
      if (descuento > 100) {
        toast.error('El porcentaje de descuento no puede ser mayor a 100%');
        return;
      }
      if (maxDescuento !== null && descuento > maxDescuento) {
        toast.error(
          `No es posible aplicar el ${descuento}% de descuento por seguridad de la utilidad del negocio. El máximo permitido es ${maxDescuento}%`
        );
        return;
      }
    }

    // Validar anticipo según tipo
    if (formData.advance_type === 'percentage') {
      if (formData.advance_percentage) {
        const anticipo = parseFloat(formData.advance_percentage);
        if (isNaN(anticipo) || anticipo < 0) {
          toast.error('El porcentaje de anticipo debe ser un número válido mayor o igual a 0');
          return;
        }
        if (anticipo > 100) {
          toast.error('El porcentaje de anticipo no puede ser mayor a 100%');
          return;
        }
      }
    } else if (formData.advance_type === 'fixed_amount') {
      if (formData.advance_amount) {
        const monto = parseFloat(formData.advance_amount);
        if (isNaN(monto) || monto <= 0) {
          toast.error('El monto de anticipo debe ser un número válido mayor a 0');
          return;
        }
      }
    }

    try {
      const condicionExistente = editingId ? condiciones.find(c => c.id === editingId) : null;
      const data = {
        nombre: formData.name,
        descripcion: formData.description || null,
        porcentaje_descuento: formData.discount_percentage || null,
        porcentaje_anticipo: formData.advance_type === 'percentage' ? (formData.advance_percentage || null) : null,
        tipo_anticipo: formData.advance_type,
        monto_anticipo: formData.advance_type === 'fixed_amount' ? (formData.advance_amount || null) : null,
        status: (formData.status ? 'active' : 'inactive') as 'active' | 'inactive',
        orden: editingId ? (condicionExistente?.order || 0) : condiciones.length,
        type: (formData.is_offer ? 'offer' : 'standard') as 'standard' | 'offer',
        offer_id: formData.is_offer && context?.offerId ? context.offerId : (editingId && !formData.is_offer ? null : condicionExistente?.offer_id || null),
        override_standard: editingId ? (condicionExistente?.override_standard || false) : false,
      } satisfies CondicionComercialForm;

      let result;
      const actionContext = context ? { offerId: context.offerId, type: context.type } : undefined;

      if (editingId) {
        result = await actualizarCondicionComercial(studioSlug, editingId, data, actionContext);
      } else {
        result = await crearCondicionComercial(studioSlug, data, actionContext);
      }

      if (result.success && result.data) {
        // Mapear datos de Prisma al formato del componente
        const condicionMapeada: CondicionComercial = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          discount_percentage: result.data.discount_percentage,
          advance_percentage: result.data.advance_percentage,
          status: result.data.status,
          order: result.data.order,
          type: result.data.type,
          offer_id: result.data.offer_id,
          override_standard: result.data.override_standard,
        };

        if (editingId) {
          // Actualizar condición existente en el estado local
          setCondiciones(prev =>
            prev.map(c => (c.id === editingId ? condicionMapeada : c))
          );
        } else {
          // Agregar nueva condición al estado local
          setCondiciones(prev => [...prev, condicionMapeada]);
        }

        toast.success(
          editingId ? 'Condición actualizada exitosamente' : 'Condición creada exitosamente'
        );
        setShowForm(false);
        setEditingId(null);
        // Actualizar initialFormData para que no detecte cambios
        setInitialFormData(formData);
        setFormErrors({});
        onRefresh?.();
      } else {
        // Manejar errores de validación
        if (result.error && typeof result.error === 'object' && !Array.isArray(result.error)) {
          // Errores de campo (Zod o validación de nombre único)
          setFormErrors(result.error as typeof formErrors);
          const firstError = Object.values(result.error).flat()[0];
          if (firstError) {
            toast.error(firstError);
          }
        } else {
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : 'Error al guardar condición';
          toast.error(errorMessage);
          setFormErrors({});
        }
      }
    } catch (error) {
      console.error('Error saving condicion:', error);
      toast.error('Error al guardar condición');
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Gestionar Condiciones Comerciales"
        description="Crea y gestiona condiciones comerciales reutilizables"
        maxWidth="xl"
      >
        {viewingOfferCondition ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{viewingOfferCondition.name}</h3>
                {viewingOfferCondition.description && (
                  <p className="text-sm text-zinc-400">{viewingOfferCondition.description}</p>
                )}
              </div>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setViewingOfferCondition(null)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </ZenButton>
            </div>

            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Descuento</span>
                <span className="text-sm font-medium text-white">
                  {viewingOfferCondition.discount_percentage ?? 0}%
                </span>
              </div>
              {(() => {
                const advanceType = viewingOfferCondition.advance_type || 'percentage';
                if (advanceType === 'fixed_amount' && viewingOfferCondition.advance_amount) {
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Anticipo</span>
                      <span className="text-sm font-medium text-white">
                        ${viewingOfferCondition.advance_amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                } else if (advanceType === 'percentage' && viewingOfferCondition.advance_percentage) {
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Anticipo</span>
                      <span className="text-sm font-medium text-white">
                        {viewingOfferCondition.advance_percentage}%
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="space-y-4 pt-2">
              <ZenSwitch
                checked={viewingOfferCondition.status === 'active'}
                onCheckedChange={(checked) => {
                  handleToggleStatus(viewingOfferCondition.id, checked);
                  setViewingOfferCondition(prev => prev ? {
                    ...prev,
                    status: checked ? 'active' : 'inactive'
                  } : null);
                }}
                label="Activa"
                description={viewingOfferCondition.status === 'active' ? 'La condición está activa y disponible para usar' : 'La condición está inactiva y no se mostrará'}
              />

              <div className="pt-2 border-t border-zinc-700">
                <ZenSwitch
                  checked={false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleConvertToStandard();
                    }
                  }}
                  label="Convertir a condición estándar"
                  description="Desvincula esta condición de la oferta y la convierte en una condición estándar reutilizable"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <ZenButton
                type="button"
                variant="ghost"
                onClick={() => setViewingOfferCondition(null)}
              >
                Cerrar
              </ZenButton>
              <ZenButton
                type="button"
                variant="destructive"
                onClick={handleRemoveFromOffer}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Desvincular de oferta
              </ZenButton>
            </div>
          </div>
        ) : showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <ZenInput
              label="Nombre de la condición"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                // Limpiar error cuando el usuario empiece a escribir
                if (formErrors.nombre) {
                  setFormErrors(prev => ({ ...prev, nombre: undefined }));
                }
              }}
              required
              placeholder="Ej: Pago de contado 10%"
              error={formErrors.nombre?.[0]}
            />

            <ZenTextarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción opcional de la condición"
              rows={3}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-zinc-300">
                    Tipo de anticipo
                  </label>
                  <p className="text-xs text-zinc-500">
                    Elige si el anticipo será un porcentaje o un monto fijo
                  </p>
                </div>
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

              {formData.advance_type === 'percentage' ? (
                <ZenInput
                  label="Porcentaje de anticipo"
                  type="text"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  value={formData.advance_percentage}
                  onChange={handleAdvancePercentageChange}
                  placeholder="10"
                />
              ) : (
                <ZenInput
                  label="Monto fijo de anticipo"
                  type="text"
                  inputMode="decimal"
                  value={formData.advance_amount}
                  onChange={handleAdvanceAmountChange}
                  placeholder="1000"
                />
              )}
            </div>

            <div className="space-y-2">
              <ZenInput
                label="Porcentaje de descuento"
                type="text"
                inputMode="decimal"
                min="0"
                max={maxDescuento !== null ? maxDescuento.toString() : '100'}
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
                <p className="text-xs text-zinc-400">
                  Porcentaje de descuento máximo del {maxDescuento}% definido en la{' '}
                  <button
                    type="button"
                    onClick={() => setShowUtilidadModal(true)}
                    className="text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
                  >
                    configuración
                  </button>
                </p>
              )}
            </div>

            <ZenSwitch
              checked={formData.status}
              onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
              label="Activa"
              description={formData.status ? 'La condición está activa y disponible para usar' : 'La condición está inactiva y no se mostrará'}
            />

            <ZenSwitch
              checked={formData.is_offer}
              onCheckedChange={(checked) => setFormData({ ...formData, is_offer: checked })}
              label="Es oferta"
              description={formData.is_offer ? 'Esta condición está vinculada a una oferta específica' : 'Esta condición es estándar y está disponible para todas las ofertas'}
            />

            <div className="flex items-center justify-end gap-3 pt-4">
              <ZenButton
                type="button"
                variant="ghost"
                onClick={() => {
                  if (hasUnsavedChanges()) {
                    setPendingClose(() => () => setShowForm(false));
                    setShowConfirmClose(true);
                  } else {
                    setShowForm(false);
                    setEditingId(null);
                  }
                }}
              >
                Cancelar
              </ZenButton>
              <ZenButton type="submit" variant="primary">
                {editingId ? 'Actualizar' : 'Crear'} Condición
              </ZenButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                {condiciones.length} condición(es) comercial(es)
              </p>
              <ZenButton variant="primary" size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Condición
              </ZenButton>
            </div>

            {loading ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/50 animate-pulse"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Título skeleton */}
                        <div className="h-5 bg-zinc-700 rounded w-3/4"></div>
                        {/* Descripción skeleton */}
                        <div className="space-y-2">
                          <div className="h-4 bg-zinc-700 rounded w-full"></div>
                          <div className="h-4 bg-zinc-700 rounded w-5/6"></div>
                        </div>
                        {/* Porcentajes skeleton */}
                        <div className="flex items-center gap-4">
                          <div className="h-4 bg-zinc-700 rounded w-24"></div>
                          <div className="h-4 bg-zinc-700 rounded w-24"></div>
                        </div>
                      </div>
                      {/* Botones skeleton */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-zinc-700 rounded"></div>
                        <div className="h-8 w-8 bg-zinc-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : condiciones.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-4">No hay condiciones comerciales</p>
                <ZenButton variant="outline" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera condición
                </ZenButton>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={condiciones.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={`space-y-2 max-h-[600px] overflow-y-auto overflow-x-hidden ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                    {condiciones.map((condicion, index) => (
                      <SortableCondicionItem
                        key={condicion.id}
                        condicion={condicion}
                        index={index}
                        totalItems={condiciones.length}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleStatus={handleToggleStatus}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </ZenDialog>

      <ZenConfirmModal
        isOpen={showConfirmClose}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar. Si cierras ahora, los cambios no se guardarán."
        confirmText="Descartar cambios"
        cancelText="Cancelar"
        variant="destructive"
      />

      <ZenConfirmModal
        isOpen={showConfirmDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar condición comercial?"
        description="Esta acción no se puede deshacer. La condición comercial se eliminará permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />

      {/* Modal de Configuración de Utilidad */}
      <ZenDialog
        isOpen={showUtilidadModal}
        onClose={() => setShowUtilidadModal(false)}
        title="Configuración de Márgenes de Utilidad"
        description="Gestiona los márgenes de utilidad, comisiones y sobreprecios para tus servicios y productos"
        maxWidth="2xl"
        closeOnClickOutside={false}
      >
        <UtilidadForm
          studioSlug={studioSlug}
          onClose={() => {
            setShowUtilidadModal(false);
            // Recargar configuración después de cerrar el modal para actualizar maxDescuento
            loadConfiguracion();
          }}
        />
      </ZenDialog>
    </>
  );
}

