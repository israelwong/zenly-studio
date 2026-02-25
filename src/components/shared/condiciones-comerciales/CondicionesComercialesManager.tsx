'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, X, Lock, Globe, Info, AlertCircle, Unlink, ExternalLink, ArrowRight } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea, ZenSwitch, ZenSelect } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import {
  obtenerTodasCondicionesComerciales,
  crearCondicionComercial,
  actualizarCondicionComercial,
  eliminarCondicionComercial,
  eliminarYMigrarCondicion,
  actualizarOrdenCondicionesComerciales,
  checkCondicionComercialAssociations,
  obtenerCotizacionesPorCondicion,
  obtenerConfiguracionPrecios,
  obtenerOfertasParaVincular,
  desvincularOfertaCondicionComercial,
  type OfertaParaVincular,
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import type { CondicionComercialForm } from '@/lib/actions/schemas/condiciones-comerciales-schemas';
import { useConfiguracionPreciosUpdateListener, type ConfiguracionPreciosUpdateEventDetail } from '@/hooks/useConfiguracionPreciosRefresh';
import { RentabilidadForm } from '@/components/shared/configuracion/RentabilidadForm';
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

interface ExclusiveOfferInfo {
  id: string;
  name: string;
  is_active: boolean;
  is_permanent: boolean;
  has_date_range: boolean;
  start_date: Date | null;
  end_date: Date | null;
}

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
  is_public?: boolean;
  exclusive_offer?: ExclusiveOfferInfo | null;
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
  onSelect?: (condicionId: string) => void; // Callback opcional para modo selección
  initialEditingId?: string | null; // ID de condición para abrir directamente en modo edición
  /** Abrir directamente en modo creación (sin listado). Usado desde negociación. */
  initialMode?: 'list' | 'create';
  /** Por defecto para nueva condición (ej. false = privada en negociación). */
  defaultIsPublic?: boolean;
  /** Título del modal cuando se abre desde un contexto específico (ej. negociación). */
  customTitle?: string;
  /** Origen: desde negociación se oculta descuento y switches oferta/pública, se fuerza is_public false. */
  originContext?: 'negotiation';
}

interface SortableCondicionItemProps {
  condicion: CondicionComercial;
  index: number;
  totalItems: number;
  onEdit: (condicion: CondicionComercial) => void;
  onToggleStatus: (id: string, newStatus: boolean) => void;
  onSelect?: (condicionId: string) => void;
}

/** Solo true cuando la oferta existe pero está inactiva o fuera de rango de fechas. No aplica si no hay oferta vinculada. */
function isOfertaVencida(offer: ExclusiveOfferInfo | null | undefined): boolean {
  if (!offer) return false;
  if (!offer.is_active) return true;
  if (offer.is_permanent) return false;
  if (!offer.has_date_range || !offer.start_date || !offer.end_date) return false;
  const now = new Date();
  return now < offer.start_date || now > offer.end_date;
}

const BADGE_BASE = 'inline-flex items-center gap-1 min-h-[20px] px-2 py-1 text-[10px] font-medium rounded-full';

function SortableCondicionItem({
  condicion,
  index,
  totalItems,
  onEdit,
  onToggleStatus,
  onSelect,
}: SortableCondicionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: condicion.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 1 : undefined,
    zIndex: isDragging ? 1 : undefined,
    boxShadow: isDragging ? '0 10px 40px -10px rgba(0,0,0,0.5)' : undefined,
  };

  const isActive = condicion.status === 'active';
  const isPrivada = condicion.is_public === false;
  const offer = condicion.exclusive_offer;
  const hasOffer = !!offer;
  const offerVencida = condicion.type === 'offer' && hasOffer && isOfertaVencida(offer);
  const offerSinVinculada = condicion.type === 'offer' && !hasOffer;
  const switchActivaDisabled = offerVencida || offerSinVinculada;
  const tooltipReason = isPrivada
    ? 'No aparece en el portal del cliente porque está marcada como privada.'
    : offerVencida
      ? 'No aparece en el portal porque la oferta vinculada está inactiva o fuera de fechas.'
      : offerSinVinculada
        ? 'No aparece en el portal porque no tiene una oferta vinculada activa.'
        : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border border-zinc-700/50 rounded-lg w-full cursor-pointer transition-shadow duration-200 ${isActive
        ? 'bg-zinc-800 hover:bg-zinc-700/50'
        : 'bg-zinc-800 opacity-75'
        } ${isDragging ? 'ring-2 ring-emerald-500/40' : ''}`}
      onClick={() => {
        // Si hay onSelect, seleccionar en lugar de editar
        if (onSelect) {
          onSelect(condicion.id);
        } else {
          onEdit(condicion);
        }
      }}
    >
      <div className="flex flex-col gap-2">
        {/* Fila 1: título + badges + switch + menú */}
        <div className="flex items-center gap-3 w-full">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-400 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <h4
            className={`font-semibold flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${isActive ? 'text-white' : 'text-zinc-400'}`}
            title={condicion.name}
          >
            {condicion.name}
          </h4>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {condicion.type === 'offer' ? (
              <span className={`${BADGE_BASE} bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`}>Oferta</span>
            ) : (
              <span className={`${BADGE_BASE} bg-slate-500/20 text-slate-300 border border-slate-500/40`}>Normal</span>
            )}
            {isPrivada ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`${BADGE_BASE} bg-zinc-600 text-zinc-300 border border-zinc-500`}>
                    <Lock className="h-2.5 w-2.5 shrink-0" />
                    Privada
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{tooltipReason}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`${BADGE_BASE} bg-sky-500/20 text-sky-300 border border-sky-500/30`}>
                    <Globe className="h-2.5 w-2.5 shrink-0" />
                    Pública
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>Visible en el portal del cliente.</p>
                </TooltipContent>
              </Tooltip>
            )}
            {condicion.type === 'offer' && hasOffer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`${BADGE_BASE} bg-emerald-500/15 text-emerald-300 border border-emerald-500/40`}>
                    Vinculada: {offer!.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>Oferta vinculada: {offer!.name}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {condicion.type === 'offer' && offerSinVinculada && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`${BADGE_BASE} bg-zinc-500/20 text-zinc-300 border border-zinc-500/40`}>
                    <Info className="h-2.5 w-2.5 shrink-0" />
                    Sin oferta vinculada
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{tooltipReason}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {condicion.type === 'offer' && offerVencida && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`${BADGE_BASE} bg-amber-500/20 text-amber-300 border border-amber-500/30`}>
                    <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                    Oferta vencida
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{tooltipReason}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="h-6 w-px bg-zinc-600 shrink-0" aria-hidden />
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {switchActivaDisabled ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <ZenSwitch
                      checked={false}
                      onCheckedChange={(checked) => onToggleStatus(condicion.id, checked)}
                      className="scale-90 origin-center"
                      disabled
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>
                    {offerSinVinculada
                      ? 'No se puede activar: vincula una oferta activa para habilitar el switch.'
                      : 'No se puede activar: la oferta vinculada está vencida o inactiva.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <ZenSwitch
                checked={isActive}
                onCheckedChange={(checked) => onToggleStatus(condicion.id, checked)}
                className="scale-90 origin-center"
              />
            )}
          </div>
        </div>
        {/* Contenido: descripción + anticipo/descuento */}
        <div className="pl-8 space-y-1">
            {condicion.description && (
              <p className={`text-sm ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {condicion.description}
              </p>
            )}
            <div className={`flex items-center gap-4 text-sm ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
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
    </div>
  );
}

// Función helper para ordenar condiciones: estándar primero, luego especiales
const sortCondiciones = (condiciones: CondicionComercial[]): CondicionComercial[] => {
  return [...condiciones].sort((a, b) => {
    const aType = a.type || 'standard';
    const bType = b.type || 'standard';
    
    // Si ambos son del mismo tipo, mantener orden original
    if (aType === bType) {
      return (a.order || 0) - (b.order || 0);
    }
    
    // Estándar primero, luego ofertas
    if (aType === 'standard' && bType === 'offer') return -1;
    if (aType === 'offer' && bType === 'standard') return 1;
    
    return 0;
  });
};

export function CondicionesComercialesManager({
  studioSlug,
  isOpen,
  onClose,
  onRefresh,
  context,
  onSelect,
  initialEditingId,
  initialMode = 'list',
  defaultIsPublic = true,
  customTitle,
  originContext,
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
  /** True cuando se edita una condición de negociación (privada sin descuento) abierta desde otro contexto. Deshabilita descuento y switches. */
  const [editingConditionIsSpecial, setEditingConditionIsSpecial] = useState(false);
  const [maxDescuento, setMaxDescuento] = useState<number | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmDesvincularEliminar, setShowConfirmDesvincularEliminar] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteCotizacionesCount, setPendingDeleteCotizacionesCount] = useState(0);
  const [pendingDeleteCotizacionesList, setPendingDeleteCotizacionesList] = useState<{ id: string; name: string; contact_name?: string | null }[]>([]);
  const [condicionDestinoId, setCondicionDestinoId] = useState<string | null>(null);
  const [loadingCotizacionesList, setLoadingCotizacionesList] = useState(false);
  const [loadingMigrar, setLoadingMigrar] = useState(false);
  /** Tras migración exitosa: vista de éxito y listado Contacto — Cotización para confirmar. */
  const [migracionExitosaView, setMigracionExitosaView] = useState<{
    origenName: string;
    destinoName: string;
    movidas: { contact_name: string; cotizacion_name: string }[];
  } | null>(null);
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
    is_public: true,
    offer_id: null as string | null,
  });
  const [ofertasParaVincular, setOfertasParaVincular] = useState<OfertaParaVincular[]>([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(false);
  const [showDesvincularConfirm, setShowDesvincularConfirm] = useState(false);
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
    is_public: true,
    offer_id: null as string | null,
  });

  /** Crear/editar condición de negociación (originContext negotiation o condición privada sin descuento): descuento y switches deshabilitados. */
  const isNegotiationSpecial = originContext === 'negotiation' || editingConditionIsSpecial;

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
      formData.is_offer !== initialFormData.is_offer ||
      formData.is_public !== initialFormData.is_public ||
      formData.offer_id !== initialFormData.offer_id
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

  const resetFormState = () => {
    setShowForm(false);
    setEditingId(null);
    setEditingConditionIsSpecial(false);
    setViewingOfferCondition(null);
    setOfertasParaVincular([]);
    setShowDesvincularConfirm(false);
    const emptyForm = {
      name: '',
      description: '',
      discount_percentage: '',
      advance_type: 'percentage' as 'percentage' | 'fixed_amount',
      advance_percentage: '',
      advance_amount: '',
      status: true,
      is_offer: false,
      is_public: true,
      offer_id: null as string | null,
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
  };

  const handleConfirmClose = () => {
    resetFormState();
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
  }, [isOpen]);

  // Recargar configuración cuando se muestra el formulario
  useEffect(() => {
    if (showForm && isOpen) {
      loadConfiguracion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, isOpen]);

  // Cargar ofertas para vincular cuando el formulario es tipo oferta
  useEffect(() => {
    if (isOpen && showForm && formData.is_offer) {
      loadOfertasParaVincular();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showForm, formData.is_offer, editingId, studioSlug]);

  // Resetear el estado del formulario cuando el modal se cierra
  useEffect(() => {
    if (!isOpen) {
      resetFormState();
      setShowConfirmClose(false);
      setShowConfirmDelete(false);
      setPendingClose(null);
      setPendingDeleteId(null);
    }
  }, [isOpen]);

  // Abrir formulario de edición cuando se pasa initialEditingId
  useEffect(() => {
    if (isOpen && initialEditingId && condiciones.length > 0 && !loading) {
      const condicionToEdit = condiciones.find(c => c.id === initialEditingId);
      if (condicionToEdit && !showForm) {
        // Pequeño delay para asegurar que el modal esté completamente renderizado
        setTimeout(() => {
          handleEdit(condicionToEdit);
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialEditingId, condiciones.length, loading]);

  // Abrir directamente en modo creación (ej. desde negociación, condición privada)
  useEffect(() => {
    if (isOpen && initialMode === 'create' && !showForm) {
      const isPublic = defaultIsPublic ?? false;
      setFormData((prev) => ({
        ...prev,
        is_public: isPublic,
        ...(originContext === 'negotiation' ? { discount_percentage: '' } : {}),
      }));
      setInitialFormData((prev) => ({
        ...prev,
        is_public: isPublic,
        ...(originContext === 'negotiation' ? { discount_percentage: '' } : {}),
      }));
      setShowForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, defaultIsPublic, originContext]);

  // Escuchar actualizaciones de configuración de precios
  useConfiguracionPreciosUpdateListener(studioSlug, (config?: ConfiguracionPreciosUpdateEventDetail) => {
    // Si se pasa el sobreprecio directamente, actualizar inmediatamente
    // El sobreprecio viene en decimal (0.10 = 10%), convertir a porcentaje
    // IMPORTANTE: Usar sobreprecio (markup), NO comision_venta
    if (config?.sobreprecio !== undefined) {
      const sobreprecioPorcentaje = config.sobreprecio * 100;
      setMaxDescuento(sobreprecioPorcentaje);
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
  }, [isOpen]);

  const loadConfiguracion = async () => {
    try {
      const result = await obtenerConfiguracionPrecios(studioSlug);
      if (result.success && result.data && result.data.sobreprecio !== undefined) {
        // sobreprecio ya viene convertido a porcentaje (ej: 10 = 10%)
        // Asegurar que sea un número válido
        const sobreprecioValue = typeof result.data.sobreprecio === 'number' 
          ? result.data.sobreprecio 
          : parseFloat(String(result.data.sobreprecio));
        
        if (!isNaN(sobreprecioValue) && sobreprecioValue >= 0) {
          setMaxDescuento(sobreprecioValue);
        } else {
          setMaxDescuento(null);
        }
      } else {
        setMaxDescuento(null);
      }
    } catch (error) {
      console.error('[CondicionesComercialesManager] Error loading configuracion:', error);
      setMaxDescuento(null);
    }
  };

  const loadCondiciones = async () => {
    try {
      setLoading(true);
      const result = await obtenerTodasCondicionesComerciales(studioSlug);

      if (result.success && result.data) {
        setCondiciones(sortCondiciones(result.data));
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
      is_public: true,
      offer_id: null as string | null,
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (condicion: CondicionComercial) => {
    setEditingId(condicion.id);
    setViewingOfferCondition(null);
    setEditingConditionIsSpecial(condicion.discount_percentage === null && condicion.is_public === false);
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
      is_public: condicion.is_public !== false,
      offer_id: condicion.offer_id ?? null,
    };
    setFormData(editForm);
    setInitialFormData(editForm);
    setFormErrors({});
    setShowForm(true);
  };

  const loadOfertasParaVincular = async () => {
    setCargandoOfertas(true);
    try {
      const result = await obtenerOfertasParaVincular(studioSlug, editingId ?? undefined);
      if (result.success && result.data) setOfertasParaVincular(result.data);
      else setOfertasParaVincular([]);
    } catch {
      setOfertasParaVincular([]);
    } finally {
      setCargandoOfertas(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Verificar asociaciones antes de mostrar el modal
      const checkResult = await checkCondicionComercialAssociations(studioSlug, id);

      if (!checkResult.success) {
        toast.error(checkResult.error || 'Error al verificar asociaciones');
        return;
      }

      if (checkResult.hasCotizaciones) {
        setPendingDeleteId(id);
        setPendingDeleteCotizacionesCount(checkResult.cotizacionesCount);
        setCondicionDestinoId(null);
        setLoadingCotizacionesList(true);
        setShowConfirmDesvincularEliminar(true);
        try {
          const listResult = await obtenerCotizacionesPorCondicion(studioSlug, id);
          if (listResult.success && listResult.data) {
            setPendingDeleteCotizacionesList(listResult.data);
          } else {
            setPendingDeleteCotizacionesList([]);
          }
        } catch {
          setPendingDeleteCotizacionesList([]);
        } finally {
          setLoadingCotizacionesList(false);
        }
        return;
      }

      setPendingDeleteId(id);
      setShowConfirmDelete(true);
    } catch (error) {
      console.error('Error checking condicion associations:', error);
      toast.error('Error al verificar asociaciones de la condición');
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    const idToDelete = pendingDeleteId;
    const wasEditingDeleted = idToDelete === editingId;

    try {
      const result = await eliminarCondicionComercial(studioSlug, idToDelete);
      if (result.success) {
        setCondiciones(prev => sortCondiciones(prev.filter(c => c.id !== idToDelete)));
        toast.success('Condición eliminada exitosamente');
        onRefresh?.();
        if (wasEditingDeleted) resetFormState();
        setPendingDeleteId(null);
      } else {
        const err = result.error ?? '';
        const cotizacionMatch = err.match(/tiene (\d+) cotización/);
        if (cotizacionMatch) {
          setPendingDeleteCotizacionesCount(parseInt(cotizacionMatch[1], 10));
          setCondicionDestinoId(null);
          setShowConfirmDelete(false);
          setShowConfirmDesvincularEliminar(true);
          setLoadingCotizacionesList(true);
          obtenerCotizacionesPorCondicion(studioSlug, idToDelete).then((listResult) => {
            if (listResult.success && listResult.data) setPendingDeleteCotizacionesList(listResult.data);
            else setPendingDeleteCotizacionesList([]);
          }).finally(() => setLoadingCotizacionesList(false));
          return;
        }
        toast.error(err || 'Error al eliminar condición');
        setPendingDeleteId(null);
      }
    } catch (error) {
      console.error('Error deleting condicion:', error);
      toast.error('Error al eliminar condición');
      setPendingDeleteId(null);
    } finally {
      setShowConfirmDelete(false);
    }
  };

  const handleConfirmMigrarEliminar = async () => {
    if (!pendingDeleteId || !condicionDestinoId) return;
    const idToDelete = pendingDeleteId;
    const idDestino = condicionDestinoId;
    const wasEditingDeleted = idToDelete === editingId;
    const condicionOrigen = condiciones.find(c => c.id === idToDelete);
    const condicionDestino = condiciones.find(c => c.id === idDestino);

    setLoadingMigrar(true);
    try {
      const result = await eliminarYMigrarCondicion(studioSlug, idToDelete, idDestino);
      if (result.success) {
        setCondiciones(prev => sortCondiciones(prev.filter(c => c.id !== idToDelete)));
        toast.success(result.message ?? 'Condición eliminada y cotizaciones migradas');
        onRefresh?.();
        if (wasEditingDeleted) resetFormState();
        setMigracionExitosaView({
          origenName: condicionOrigen?.name ?? 'Condición',
          destinoName: condicionDestino?.name ?? 'Condición destino',
          movidas: pendingDeleteCotizacionesList.map((c) => ({
            contact_name: c.contact_name ?? '—',
            cotizacion_name: c.name,
          })),
        });
        setPendingDeleteId(null);
        setPendingDeleteCotizacionesCount(0);
        setPendingDeleteCotizacionesList([]);
        setCondicionDestinoId(null);
      } else {
        toast.error(result.error ?? 'Error al eliminar y migrar');
      }
    } catch (error) {
      console.error('Error eliminando y migrando condición:', error);
      toast.error('Error al eliminar y migrar condición');
    } finally {
      setLoadingMigrar(false);
    }
  };

  const handleCerrarMigracionExitosa = () => {
    setMigracionExitosaView(null);
    setShowConfirmDesvincularEliminar(false);
    setPendingDeleteId(null);
    setPendingDeleteCotizacionesCount(0);
    setPendingDeleteCotizacionesList([]);
    setCondicionDestinoId(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
    setPendingDeleteId(null);
  };

  const handleCancelDesvincularEliminar = () => {
    setMigracionExitosaView(null);
    setShowConfirmDesvincularEliminar(false);
    setPendingDeleteId(null);
    setPendingDeleteCotizacionesCount(0);
    setPendingDeleteCotizacionesList([]);
    setCondicionDestinoId(null);
  };

  const opcionesCondicionDestino =
    pendingDeleteId && condiciones.length > 0
      ? condiciones
          .filter(c => c.status === 'active' && c.id !== pendingDeleteId)
          .map(c => ({ value: c.id, label: c.name }))
      : [];

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
        const resultData = result.data as { exclusive_offer?: ExclusiveOfferInfo | null; is_public?: boolean };
        const condicionMapeada: CondicionComercial = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          discount_percentage: result.data.discount_percentage,
          advance_percentage: result.data.advance_percentage,
          advance_type: result.data.advance_type || null,
          advance_amount: result.data.advance_amount || null,
          status: result.data.status,
          order: result.data.order,
          type: result.data.type,
          offer_id: result.data.offer_id,
          override_standard: result.data.override_standard,
          is_public: resultData.is_public ?? true,
          exclusive_offer: resultData.exclusive_offer ?? null,
        };

        setCondiciones(prev =>
          sortCondiciones(prev.map(c => (c.id === viewingOfferCondition.id ? condicionMapeada : c)))
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
        const resultData = result.data as { exclusive_offer?: ExclusiveOfferInfo | null; is_public?: boolean };
        const condicionMapeada: CondicionComercial = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          discount_percentage: result.data.discount_percentage,
          advance_percentage: result.data.advance_percentage,
          advance_type: result.data.advance_type || null,
          advance_amount: result.data.advance_amount || null,
          status: result.data.status,
          order: result.data.order,
          type: result.data.type,
          offer_id: result.data.offer_id,
          override_standard: result.data.override_standard,
          is_public: resultData.is_public ?? true,
          exclusive_offer: resultData.exclusive_offer ?? null,
        };

        setCondiciones(prev =>
          sortCondiciones(prev.map(c => (c.id === id ? condicionMapeada : c)))
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
    const condicionesConOrden = newCondiciones.map((condicion, index) => ({
      id: condicion.id,
      orden: index,
    }));

    // Actualización optimista: reordenar la lista al soltar para que la animación no revierta (evita el "rebote")
    const previousCondiciones = condiciones;
    setCondiciones(newCondiciones.map((c, i) => ({ ...c, order: i })));

    try {
      setIsReordering(true);
      const result = await actualizarOrdenCondicionesComerciales(studioSlug, condicionesConOrden);

      if (!result.success) {
        setCondiciones(previousCondiciones);
        toast.error(result.error || 'Error al actualizar el orden');
      } else {
        toast.success('Orden actualizado');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error reordering condiciones:', error);
      setCondiciones(previousCondiciones);
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
      // Preparar monto_anticipo: si es fixed_amount y tiene valor, enviar el string (se parseará en el servidor)
      // Si está vacío o es null, enviar null
      const montoAnticipo = formData.advance_type === 'fixed_amount' 
        ? (formData.advance_amount && formData.advance_amount.trim() !== '' ? formData.advance_amount.trim() : null)
        : null;

      const data = {
        nombre: formData.name,
        descripcion: formData.description || null,
        porcentaje_descuento: isNegotiationSpecial ? null : (formData.discount_percentage || null),
        porcentaje_anticipo: formData.advance_type === 'percentage' ? (formData.advance_percentage || null) : null,
        tipo_anticipo: formData.advance_type,
        monto_anticipo: montoAnticipo,
        status: (formData.status ? 'active' : 'inactive') as 'active' | 'inactive',
        orden: editingId ? (condicionExistente?.order || 0) : condiciones.length,
        type: (formData.is_offer ? 'offer' : 'standard') as 'standard' | 'offer',
        offer_id: formData.is_offer ? (formData.offer_id ?? (context?.offerId ?? (condicionExistente?.offer_id ?? null))) : null,
        override_standard: editingId ? (condicionExistente?.override_standard || false) : false,
        is_public: isNegotiationSpecial ? false : (formData.is_offer ? true : formData.is_public),
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
        const resultData = result.data as { exclusive_offer?: ExclusiveOfferInfo | null; is_public?: boolean };
        const condicionMapeada: CondicionComercial = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          discount_percentage: result.data.discount_percentage,
          advance_percentage: result.data.advance_percentage,
          advance_type: result.data.advance_type || null,
          advance_amount: result.data.advance_amount || null,
          status: result.data.status,
          order: result.data.order,
          type: result.data.type,
          offer_id: result.data.offer_id,
          override_standard: result.data.override_standard,
          is_public: resultData.is_public ?? true,
          exclusive_offer: resultData.exclusive_offer ?? null,
        };

        if (editingId) {
          // Actualizar condición existente en el estado local
          setCondiciones(prev =>
            sortCondiciones(prev.map(c => (c.id === editingId ? condicionMapeada : c)))
          );
        } else {
          // Agregar nueva condición al estado local
          setCondiciones(prev => sortCondiciones([...prev, condicionMapeada]));
        }

        toast.success(
          editingId ? 'Condición actualizada exitosamente' : 'Condición creada exitosamente'
        );
        setShowForm(false);
        setEditingId(null);
        setEditingConditionIsSpecial(false);
        // Actualizar initialFormData para que no detecte cambios
        setInitialFormData(formData);
        setFormErrors({});
        onRefresh?.();

        // Si se creó una nueva condición y hay onSelect, seleccionarla automáticamente
        if (!editingId && onSelect && result.data) {
          onSelect(result.data.id);
        }
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
        title={customTitle ?? 'Gestionar Condiciones Comerciales'}
        description={customTitle ? 'Crea una condición privada para esta negociación' : 'Crea y gestiona condiciones comerciales reutilizables'}
        maxWidth="xl"
        zIndex={10090}
        {...(showForm
          ? {
              onCancel: handleClose,
              onSave: () => document.getElementById('condiciones-comerciales-form')?.requestSubmit(),
              saveLabel: editingId ? 'Actualizar Condición' : 'Crear Condición',
              cancelLabel: 'Cancelar',
              isLoading: false,
              saveDisabled: !!formErrors.nombre,
              cancelAlignRight: !!editingId,
              cancelVariant: editingId ? 'outline' : 'ghost',
              footerLeftContent: editingId ? (
                <ZenButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 gap-1.5"
                  onClick={() => {
                    setPendingDeleteId(editingId);
                    setShowConfirmDelete(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </ZenButton>
              ) : undefined,
            }
          : {})}
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

            <div className="p-4 bg-zinc-800 border border-zinc-700/50 rounded-lg space-y-3">
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
          <form id="condiciones-comerciales-form" onSubmit={handleSubmit} className="space-y-4">
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
              error={formErrors.nombre?.[0]?.includes('Ya existe') ? 'Este nombre ya está en uso. Elige uno diferente o usa la condición existente' : formErrors.nombre?.[0]}
            />

            <ZenTextarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción opcional de la condición"
              rows={3}
            />

            <div className="space-y-3 !mt-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <ZenInput
                  label="Porcentaje de descuento"
                  type="text"
                  inputMode="decimal"
                  min="0"
                  max={maxDescuento !== null ? maxDescuento.toString() : '100'}
                  value={isNegotiationSpecial ? '0' : formData.discount_percentage}
                  onChange={handleDiscountChange}
                  placeholder="10"
                  disabled={isNegotiationSpecial}
                  error={
                    isNegotiationSpecial
                      ? undefined
                      : formData.discount_percentage
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
              </div>
            </div>

            {originContext !== 'negotiation' && maxDescuento !== null && (
              <p className="text-xs text-zinc-400 mt-2">
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
            {isNegotiationSpecial && (
              <p className="text-xs text-zinc-500 mt-1">
                En condición de negociación el descuento no aplica (se mantiene en 0%).
              </p>
            )}

            <ZenSwitch
              checked={formData.status}
              onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
              label="Activa"
              description={formData.status ? 'La condición está activa y disponible para usar' : 'La condición está inactiva y no se mostrará'}
            />

            <ZenSwitch
              checked={formData.is_offer}
              onCheckedChange={(checked) => setFormData({ ...formData, is_offer: checked, is_public: checked ? true : formData.is_public })}
              disabled={isNegotiationSpecial}
              label="Es oferta"
              description={formData.is_offer ? 'Esta condición está vinculada a una oferta específica' : 'Esta condición es estándar y está disponible para todas las ofertas'}
            />

            <ZenSwitch
              checked={formData.is_offer ? true : formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              disabled={isNegotiationSpecial || formData.is_offer}
              label="Es pública"
              description={formData.is_offer ? 'Las condiciones de oferta son siempre públicas' : formData.is_public ? 'Visible en el portal del cliente' : (defaultIsPublic === false || isNegotiationSpecial ? 'Esta condición será privada y solo visible para el estudio' : 'Solo visible para el estudio y en negociaciones directas')}
            />
            {(defaultIsPublic === false || isNegotiationSpecial) && !formData.is_public && !formData.is_offer && (
              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Esta condición será privada y solo visible para el estudio.
              </p>
            )}

            {formData.is_offer && (
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <h4 className="text-sm font-medium text-zinc-300">Ofertas</h4>
                <p className="text-xs text-zinc-500">Vincula o desvincula una oferta. Solo puede haber una oferta vinculada por condición.</p>
                {cargandoOfertas ? (
                  <p className="text-sm text-zinc-400">Cargando ofertas…</p>
                ) : ofertasParaVincular.length === 0 ? (
                  <p className="text-sm text-zinc-400">No hay ofertas en este estudio.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {ofertasParaVincular.map((o) => {
                      const isLinked = (formData.offer_id ?? null) === o.id;
                      return (
                        <li
                          key={o.id}
                          className="p-3 rounded-lg border border-zinc-700/50 bg-zinc-800 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-medium text-white truncate">{o.name}</span>
                            <span
                              className={`inline-flex shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                                o.isVigente ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {o.isVigente ? 'Vigente' : 'Vencida'}
                            </span>
                            <span className="text-xs text-zinc-400 shrink-0">{o.vigenciaLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isLinked ? (
                              <>
                                <ZenButton
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="min-w-[8rem] h-7 justify-center gap-1 text-xs text-zinc-300 hover:text-amber-400 border-zinc-600"
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
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
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
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 border border-zinc-700/50 rounded-lg bg-zinc-800 animate-pulse"
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
                  <div className={`space-y-2 max-h-[480px] overflow-y-auto overflow-x-hidden ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                    {condiciones.map((condicion, index) => (
                      <SortableCondicionItem
                        key={condicion.id}
                        condicion={condicion}
                        index={index}
                        totalItems={condiciones.length}
                        onEdit={handleEdit}
                        onToggleStatus={handleToggleStatus}
                        onSelect={onSelect}
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
        zIndex={10300}
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
        zIndex={10300}
      />

      <ZenConfirmModal
        isOpen={showConfirmDesvincularEliminar}
        onClose={migracionExitosaView ? handleCerrarMigracionExitosa : handleCancelDesvincularEliminar}
        onConfirm={migracionExitosaView ? handleCerrarMigracionExitosa : handleConfirmMigrarEliminar}
        title={migracionExitosaView ? '' : 'Transferencia de condiciones'}
        description={
          <div className="text-left transition-opacity duration-200 ease-out" key={migracionExitosaView ? 'success' : 'form'}>
            {migracionExitosaView ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-emerald-400">¡Migración exitosa!</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  La condición <span className="font-medium text-zinc-200">{migracionExitosaView.origenName}</span> ha sido eliminada y sus cotizaciones asociadas se han movido a <span className="font-medium text-zinc-200">{migracionExitosaView.destinoName}</span>.
                </p>
                {migracionExitosaView.movidas.length > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-2 border-b border-zinc-800">
                      Movidas correctamente ({migracionExitosaView.movidas.length})
                    </p>
                    <div className="max-h-[120px] overflow-y-auto p-2 space-y-1.5">
                      {migracionExitosaView.movidas.map((m, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-xs">
                          <span className="text-zinc-300 truncate shrink-0 max-w-[45%]">{m.contact_name}</span>
                          <span className="text-zinc-500 shrink-0">—</span>
                          <span className="text-zinc-500 truncate">{m.cotizacion_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 mb-3">
                  Esta condición está asignada a {pendingDeleteCotizacionesCount} cotización{pendingDeleteCotizacionesCount !== 1 ? 'es' : ''}. Elige a qué condición migrarlas.
                </p>
                {/* Layout: Origen → Flecha → Destinos (mismo diseño: borde zinc-800, fondo sutil) */}
                <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
                  {/* Origen */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Origen</p>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {condiciones.find(c => c.id === pendingDeleteId)?.name ?? '—'}
                      </p>
                      {(() => {
                        const orig = condiciones.find(c => c.id === pendingDeleteId);
                        if (!orig) return null;
                        const ant = orig.advance_type === 'fixed_amount' && orig.advance_amount != null
                          ? `Anticipo: $${Number(orig.advance_amount).toFixed(0)}`
                          : `Anticipo: ${orig.advance_percentage ?? 0}%`;
                        const desc = `Descuento: ${orig.discount_percentage ?? 0}%`;
                        return <p className="text-xs text-zinc-500 mt-1">{ant} • {desc}</p>;
                      })()}
                    </div>
                  </div>
                  <div className="hidden sm:flex shrink-0 items-center text-zinc-500" aria-hidden>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="sm:hidden flex justify-center text-zinc-500" aria-hidden>
                    <ArrowRight className="h-5 w-5 rotate-90" />
                  </div>
                  {/* Lista de destinos (tarjetas con misma caja + label de referencia) */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Destino</p>
                    {loadingCotizacionesList ? (
                      <p className="text-xs text-zinc-500">Cargando...</p>
                    ) : opcionesCondicionDestino.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {opcionesCondicionDestino.map((opt) => {
                          const destCond = condiciones.find(c => c.id === opt.value);
                          const origCond = condiciones.find(c => c.id === pendingDeleteId);
                          const cambioDrastico = origCond && destCond && (origCond.advance_type ?? 'percentage') !== (destCond.advance_type ?? 'percentage');
                          const antStr = destCond
                            ? (destCond.advance_type === 'fixed_amount' && destCond.advance_amount != null
                              ? `Anticipo: $${Number(destCond.advance_amount).toFixed(0)}`
                              : `Anticipo: ${destCond.advance_percentage ?? 0}%`)
                            : '';
                          const descStr = destCond ? `Descuento: ${destCond.discount_percentage ?? 0}%` : '';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setCondicionDestinoId(opt.value)}
                              className={`text-left rounded-lg border bg-zinc-900/50 px-4 py-3 min-w-0 w-full transition-colors ${
                                condicionDestinoId === opt.value
                                  ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                                  : 'border-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50'
                              }`}
                            >
                              <p className="text-sm font-medium truncate">{opt.label}</p>
                              {destCond && (
                                <p className={`text-xs mt-1 ${cambioDrastico ? 'text-amber-400' : 'text-zinc-500'}`}>
                                  {antStr} • {descStr}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400">No hay otras condiciones activas. Activa otra o crea una nueva.</p>
                    )}
                  </div>
                </div>
                {/* Lista informativa de cotizaciones afectadas (máx 3 visibles, scroll) */}
                {pendingDeleteCotizacionesList.length > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-2 border-b border-zinc-800">
                      Cotizaciones afectadas ({pendingDeleteCotizacionesList.length})
                    </p>
                    <div className="max-h-[88px] overflow-y-auto p-2 space-y-1.5">
                      {pendingDeleteCotizacionesList.map((c) => (
                        <div key={c.id} className="flex items-baseline gap-2 text-xs">
                          <span className="text-zinc-300 truncate shrink-0 max-w-[45%]">{c.contact_name ?? '—'}</span>
                          <span className="text-zinc-500 shrink-0">—</span>
                          <span className="text-zinc-500 truncate">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        }
        confirmText="Migrar y eliminar"
        cancelText={migracionExitosaView ? 'Entendido' : 'Cancelar'}
        hideConfirmButton={!!migracionExitosaView}
        variant={migracionExitosaView ? 'default' : 'destructive'}
        zIndex={10300}
        disabled={!migracionExitosaView && (!condicionDestinoId || opcionesCondicionDestino.length === 0)}
        loading={loadingMigrar}
        contentClassName="sm:max-w-xl"
      />

      <ZenConfirmModal
        isOpen={showDesvincularConfirm}
        onClose={() => setShowDesvincularConfirm(false)}
        onConfirm={async () => {
          if (!editingId) return;
          const result = await desvincularOfertaCondicionComercial(studioSlug, editingId);
          setShowDesvincularConfirm(false);
          if (result.success) {
            toast.success('Oferta desvinculada. La condición pasó a tipo estándar.');
            setCondiciones(prev =>
              prev.map(c => (c.id === editingId ? { ...c, type: 'standard', offer_id: null, exclusive_offer: null } : c))
            );
            setFormData(prev => ({ ...prev, offer_id: null, is_offer: false }));
            setInitialFormData(prev => ({ ...prev, offer_id: null, is_offer: false }));
            loadOfertasParaVincular();
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

      {/* Modal de Configuración de Utilidad */}
      <ZenDialog
        isOpen={showUtilidadModal}
        onClose={() => setShowUtilidadModal(false)}
        title="Configuración de Márgenes de Utilidad"
        description="Gestiona los márgenes de utilidad, comisiones y sobreprecios para tus servicios y productos"
        maxWidth="2xl"
        closeOnClickOutside={false}
        zIndex={10090}
      >
        <RentabilidadForm
          studioSlug={studioSlug}
          onClose={() => {
            setShowUtilidadModal(false);
            // El hook useConfiguracionPreciosUpdateListener se encarga de sincronizar automáticamente
          }}
        />
      </ZenDialog>
    </>
  );
}

