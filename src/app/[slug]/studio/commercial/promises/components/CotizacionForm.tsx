'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle, Plus, Pencil, Trash2, ListChecks, Gift, Info, Settings, Eye, BarChart3, MoreHorizontal, RotateCcw, Clock, Globe, PackagePlus } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge, ZenCard, ZenCardContent, ZenConfirmModal, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenSwitch, ZenLabel } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/shadcn/sheet';
import { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from '@/components/ui/shadcn/accordion';
import { Separator } from '@/components/ui/shadcn/separator';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios, type ResultadoPrecio } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { obtenerPaquetePorId } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { createCotizacion, updateCotizacion, getCotizacionById, getPromiseDurationHours, updatePromiseDurationHours, upsertCondicionNegociacionCotizacion, deleteCondicionNegociacionCotizacion, promocionarItemAlCatalogo, guardarCotizacionComoPaquete, actualizarItemYSnapshotCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getServiceLinks, type ServiceLinksMap } from '@/lib/actions/studio/config/item-links.actions';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';
import { logAuditoriaCotizacion } from '@/lib/utils/audit-precios-logger';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import { CommercialConfigSidebar, CommercialConfigActionButtons } from '@/components/shared/commercial/CommercialConfigSidebar';
import { AuditoriaRentabilidadSheet } from '@/components/shared/commercial/AuditoriaRentabilidadSheet';
import { AjustesNegociacionAccordion } from '@/components/shared/commercial/AjustesNegociacionAccordion';
import { CondicionesCierreAccordion } from '@/components/shared/commercial/CondicionesCierreAccordion';
import { CatalogoServiciosTree } from '@/components/shared/catalogo';
import { ItemEditorModal, type ItemFormData, type ItemEditorContext } from '@/components/shared/catalogo/ItemEditorModal';
import { crearItem, actualizarItem } from '@/lib/actions/studio/catalogo';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { CustomItemData } from '@/lib/actions/schemas/cotizaciones-schemas';
import type { PublicCotizacion, PublicSeccionData } from '@/types/public-promise';
import { cn } from '@/lib/utils';
import { usePromiseFocusMode } from '../[promiseId]/context/PromiseFocusModeContext';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';
import type { FormSectionId } from './FormSection';
import { PaqueteCoverDropzone } from '../../paquetes/components/PaqueteCoverDropzone';
import { useMediaUpload } from '@/hooks/useMediaUpload';

const DUPLICATE_NAME_ERROR = 'Ya existe una cotización con ese nombre en esta promesa';

interface CotizacionFormProps {
  studioSlug: string;
  promiseId?: string | null;
  packageId?: string | null;
  cotizacionId?: string;
  contactId?: string | null;
  redirectOnSuccess?: string;
  onLoadingChange?: (loading: boolean) => void;
  hideActionButtons?: boolean;
  onAfterSave?: () => void;
  customActionButtons?: React.ReactNode;
  hideVisibilityToggle?: boolean;
  condicionComercialPreAutorizada?: {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    discount_percentage: number | null;
  } | null;
  isPreAutorizada?: boolean;
  onAutorizar?: () => void | Promise<void>;
  isAutorizando?: boolean;
  isAlreadyAuthorized?: boolean;
  isDisabled?: boolean;
  /** Ref para que el padre obtenga datos actuales de vista previa (mismo formato que vista pública). */
  getPreviewDataRef?: React.MutableRefObject<(() => PublicCotizacion | null) | null>;
  /** Si se define, se muestra botón "Vista previa" en el sidebar (arriba de Guardar/Cambiar a borrador). */
  onRequestPreview?: () => void;
  /** Si true, oculta el botón "Guardar como paquete" del sidebar (ej. cuando se muestra en el header). */
  hideGuardarComoPaqueteInSidebar?: boolean;
  /** Ref para exponer el handler de "Guardar como paquete" al componente padre. */
  getGuardarComoPaqueteHandlerRef?: React.MutableRefObject<(() => void) | null>;
  /** Callback para notificar al padre cuando cambia el estado de guardado del paquete. */
  onSavingAsPaqueteChange?: (isSaving: boolean) => void;
}

export function CotizacionForm({
  studioSlug,
  promiseId,
  packageId,
  cotizacionId,
  contactId,
  redirectOnSuccess,
  onLoadingChange,
  hideActionButtons = false,
  onAfterSave,
  customActionButtons,
  hideVisibilityToggle = false,
  condicionComercialPreAutorizada,
  isPreAutorizada = false,
  onAutorizar,
  isAutorizando = false,
  isAlreadyAuthorized = false,
  isDisabled = false,
  getPreviewDataRef,
  onRequestPreview,
  onCreateAsRevision,
  revisionOriginalId,
  hideGuardarComoPaqueteInSidebar = false,
  getGuardarComoPaqueteHandlerRef,
  onSavingAsPaqueteChange,
}: CotizacionFormProps & {
  onCreateAsRevision?: (data: {
    nombre: string;
    descripcion?: string;
    precio: number;
    items: { [key: string]: number };
  }) => Promise<{ success: boolean; revisionId?: string; error?: string }>;
  revisionOriginalId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingIntent, setSavingIntent] = useState<'draft' | 'publish' | null>(null);
  const isSubmittingRef = useRef(false);
  const redirectingRef = useRef(false);
  const isEditMode = !!cotizacionId;
  const focusMode = usePromiseFocusMode();
  const onLoadingChangeRef = useRef(onLoadingChange);

  // Mantener referencia actualizada sin causar re-renders
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);

  // Resetear estado de submit si el componente se desmonta (navegación exitosa)
  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
    };
  }, []);

  // Timeout de seguridad: resetear estado si la navegación no ocurre en 5 segundos
  useEffect(() => {
    if (loading && isSubmittingRef.current) {
      const timeout = setTimeout(() => {
        isSubmittingRef.current = false;
        setLoading(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Estado del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioPersonalizado, setPrecioPersonalizado] = useState<string | number>('');
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [items, setItems] = useState<{ [servicioId: string]: number }>({});
  const [customItems, setCustomItems] = useState<CustomItemData[]>([]);
  const [isCourtesyMode, setIsCourtesyMode] = useState(false);
  const [itemsCortesia, setItemsCortesia] = useState<Set<string>>(new Set());
  const [bonoEspecial, setBonoEspecial] = useState<number>(0);
  const [accordionValue, setAccordionValue] = useState<string[]>(['base']);
  const handleAccordionChange = useCallback((newValue: string[]) => {
    setAccordionValue((prev) => {
      if (newValue.includes('negociacion') && !prev.includes('negociacion')) {
        return ['negociacion', 'condiciones'];
      }
      return newValue;
    });
    if (!newValue.includes('negociacion')) setIsCourtesyMode(false);
  }, []);
  const sectionBaseRef = useRef<HTMLDivElement>(null);
  const sectionNegociacionRef = useRef<HTMLDivElement>(null);
  const sectionCondicionesRef = useRef<HTMLDivElement>(null);
  const [condicionesComerciales, setCondicionesComerciales] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    discount_percentage: number | null;
    advance_percentage?: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    type?: string;
  }>>([]);
  const [selectedCondicionComercialId, setSelectedCondicionComercialId] = useState<string | null>(null);
  const [condicionNegociacion, setCondicionNegociacion] = useState<{ id: string; name: string; discount_percentage: number | null } | null>(null);
  const [condicionIdsVisibles, setCondicionIdsVisibles] = useState<Set<string>>(new Set());
  const [condicionSimulacionId, setCondicionSimulacionId] = useState<string | null>(null);
  const [simulacionBlockExpanded, setSimulacionBlockExpanded] = useState(false);
  const simulacionBlockRef = useRef<HTMLDivElement>(null);
  const [auditoriaRentabilidadOpen, setAuditoriaRentabilidadOpen] = useState(false);
  const [showCondicionesManager, setShowCondicionesManager] = useState(false);
  const [editingCondicionId, setEditingCondicionId] = useState<string | null>(null);
  const [createCondicionEspecialMode, setCreateCondicionEspecialMode] = useState(false);
  const [flashSugerido, setFlashSugerido] = useState(false);
  const [showPrecioSincronizadoBadge, setShowPrecioSincronizadoBadge] = useState(false);
  const [ringPrecioSincronizadoVisible, setRingPrecioSincronizadoVisible] = useState(false);
  const [pendingSyncFromAjustes, setPendingSyncFromAjustes] = useState(false);
  const [isInitializing, setIsInitializing] = useState(() => !!cotizacionId);
  const isFirstMountAjustesSyncRef = useRef(true);
  const userHasChangedServicesOrAjustesRef = useRef(false);
  // Destino de retorno según status de la cotización (evita fallos con router.back() en nueva pestaña)
  const [returnPath, setReturnPath] = useState<string | null>(() =>
    promiseId && studioSlug ? `/${studioSlug}/studio/commercial/promises/${promiseId}` : null
  );
  const triggerShake = useCallback(() => {
    setFlashSugerido(true);
    const t = setTimeout(() => setFlashSugerido(false), 500);
    return () => clearTimeout(t);
  }, []);
  const bonoOnFocusRef = useRef<number>(0);
  /** Valores originales de negociación desde la DB (solo en edición); null en cotización nueva. */
  const negociacionInicialRef = useRef<{ bono: number; itemsCortesia: string[] } | null>(null);

  // Animación entrada y scroll suave del bloque "Simulación: El cliente pagará"
  useEffect(() => {
    if (condicionSimulacionId) {
      setSimulacionBlockExpanded(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSimulacionBlockExpanded(true));
      });
      const scrollTimer = setTimeout(() => {
        simulacionBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(scrollTimer);
      };
    } else {
      setSimulacionBlockExpanded(false);
    }
  }, [condicionSimulacionId]);

  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  // Estado para almacenar overrides de items del catálogo (snapshots locales cuando saveToCatalog = false)
  const [itemOverrides, setItemOverrides] = useState<Map<string, {
    name?: string;
    description?: string | null;
    cost?: number;
    expense?: number;
    gastos?: Array<{ nombre: string; costo: number }>;
  }>>(new Map());
  const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [filtroServicio, setFiltroServicio] = useState('');
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNameConflictModal, setShowNameConflictModal] = useState(false);
  const [showPaqueteModal, setShowPaqueteModal] = useState(false);
  const [showDurationScopeModal, setShowDurationScopeModal] = useState(false);
  const [isSavingAsPaquete, setIsSavingAsPaquete] = useState(false);
  const [pendingSavePublish, setPendingSavePublish] = useState<boolean>(false);
  const [pendingSaveNombreOverride, setPendingSaveNombreOverride] = useState<string | undefined>(undefined);
  /** Duración de la promesa al abrir el modal (para copy explícito). */
  const [promiseDurationForModal, setPromiseDurationForModal] = useState<number | null>(null);
  /** Alcance elegido en el modal de duración; al elegir se muestra el botón Guardar. */
  const [selectedDurationScope, setSelectedDurationScope] = useState<'local' | 'global' | null>(null);
  const [conflictSuggestedName, setConflictSuggestedName] = useState('');
  const [conflictPublish, setConflictPublish] = useState(false);
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [serviceLinksMap, setServiceLinksMap] = useState<ServiceLinksMap>({});
  
  // Estados para modal de paquete (Fase 8.2)
  const [paqueteNombre, setPaqueteNombre] = useState('');
  const [paqueteDescripcion, setPaqueteDescripcion] = useState('');
  const [paqueteHoras, setPaqueteHoras] = useState<number | null>(null);
  const [paqueteVisibility, setPaqueteVisibility] = useState<'public' | 'private'>('private');
  const [paqueteCoverMedia, setPaqueteCoverMedia] = useState<Array<{ file_url: string; file_type: string; filename: string; file_size?: number }>>([]);
  const [isPaqueteCoverUploading, setIsPaqueteCoverUploading] = useState(false);
  const [paqueteEventTypeName, setPaqueteEventTypeName] = useState<string | null>(null);
  const [paqueteNombreError, setPaqueteNombreError] = useState<string | null>(null);
  const { uploadFiles } = useMediaUpload();
  
  // Estados para ItemEditorModal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemFormData | null>(null);
  const [selectedCategoriaForItem, setSelectedCategoriaForItem] = useState<string | null>(null);

  // Cargar catálogo, configuración, vínculos y datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargandoCatalogo(true);

        // Si está en modo edición, cargar y validar la cotización en paralelo con catálogo
        // Si está creando revisión, también cargar datos de la original para pre-poblar
        const [catalogoResult, configResult, linksResult, cotizacionResult, originalResult, condicionesResult] = await Promise.all([
          obtenerCatalogo(studioSlug),
          obtenerConfiguracionPrecios(studioSlug),
          getServiceLinks(studioSlug),
          cotizacionId ? getCotizacionById(cotizacionId, studioSlug) : Promise.resolve({ success: true as const, data: null }),
          revisionOriginalId && !cotizacionId ? getCotizacionById(revisionOriginalId, studioSlug) : Promise.resolve({ success: true as const, data: null }),
          obtenerCondicionesComerciales(studioSlug),
        ]);

        if (linksResult.success && linksResult.data) {
          setServiceLinksMap(linksResult.data);
        }
        if (condicionesResult.success && condicionesResult.data) {
          setCondicionesComerciales(condicionesResult.data.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description ?? null,
            discount_percentage: c.discount_percentage ?? null,
            advance_percentage: c.advance_percentage ?? null,
            advance_type: c.advance_type ?? null,
            advance_amount: c.advance_amount != null ? Number(c.advance_amount) : null,
            type: c.type ?? undefined,
          })));
        }

        // Validar cotización si está en modo edición
        let cotizacionData: NonNullable<typeof cotizacionResult.data> | null = null;

        if (cotizacionId) {
          if (!cotizacionResult.success || !cotizacionResult.data) {
            toast.error('error' in cotizacionResult ? cotizacionResult.error : 'Cotización no encontrada');
            setCargandoCatalogo(false);
            if (promiseId) {
              router.replace(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            } else {
              router.replace(`/${studioSlug}/studio/commercial/promises`);
            }
            return;
          }

          cotizacionData = cotizacionResult.data;

          // Validar que tiene promiseId (de props o de datos) o contactId
          // Si promiseId viene como prop, es válido aunque cotizacionData.promise_id sea null
          if (!promiseId && cotizacionData && !cotizacionData.promise_id && !contactId) {
            toast.error('La cotización no tiene los datos necesarios para editar');
            setCargandoCatalogo(false);
            if (promiseId) {
              router.replace(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            } else {
              router.replace(`/${studioSlug}/studio/commercial/promises`);
            }
            return;
          }
        }

        if (!catalogoResult.success || !catalogoResult.data) {
          toast.error('Error al cargar el catálogo');
          setCargandoCatalogo(false);
          return;
        }

        setCatalogo(catalogoResult.data);

        // Expandir todas las secciones al iniciar
        const todasLasSecciones = new Set(catalogoResult.data.map(seccion => seccion.id));
        setSeccionesExpandidas(todasLasSecciones);
        // Las categorías permanecen colapsadas (Set vacío)

        // Inicializar items vacíos
        const initialItems: { [id: string]: number } = {};
        catalogoResult.data.forEach(seccion => {
          seccion.categorias.forEach(categoria => {
            categoria.servicios.forEach(servicio => {
              initialItems[servicio.id] = 0;
            });
          });
        });

        // Si hay packageId, cargar datos del paquete
        if (packageId) {
          const paqueteResult = await obtenerPaquetePorId(packageId);
          if (paqueteResult.success && paqueteResult.data) {
            const paquete = paqueteResult.data;
            setNombre(paquete.name || '');
            setDescripcion((paquete as { description?: string }).description || '');
            setPrecioPersonalizado(paquete.precio || '');

            // Cargar items del paquete
            if (paquete.paquete_items && paquete.paquete_items.length > 0) {
              const paqueteItems: { [id: string]: number } = {};
              paquete.paquete_items.forEach(item => {
                if (item.item_id) {
                  paqueteItems[item.item_id] = item.quantity;
                }
              });
              setItems(paqueteItems);
            } else {
              setItems(initialItems);
            }
          } else {
            toast.error('Error al cargar el paquete');
            setItems(initialItems);
          }
        } else if (cotizacionId && cotizacionData) {
          // Cargar datos de la cotización existente (ya validada y cargada arriba)
          setNombre(cotizacionData.name);
          setDescripcion(cotizacionData.description || '');
          const precioCierreInicial = (cotizacionData as { negociacion_precio_personalizado?: number | null }).negociacion_precio_personalizado;
          const precioInicial = precioCierreInicial != null && Number(precioCierreInicial) > 0 ? Number(precioCierreInicial) : cotizacionData.price;
          setPrecioPersonalizado(precioInicial);
          setVisibleToClient((cotizacionData as { visible_to_client?: boolean }).visible_to_client ?? false);
          // Guardar event_type_name para el modal de paquete (Fase 8.6)
          setPaqueteEventTypeName((cotizacionData as { event_type_name?: string | null }).event_type_name ?? null);
          const itemsCortesiaInicial = cotizacionData.items_cortesia ?? [];
          const bonoInicial = Number(cotizacionData.bono_especial) || 0;
          setItemsCortesia(new Set(itemsCortesiaInicial));
          setBonoEspecial(bonoInicial);
          negociacionInicialRef.current = { bono: bonoInicial, itemsCortesia: [...itemsCortesiaInicial] };
          const neg = (cotizacionData as { condicion_comercial_negociacion?: { id: string; name: string; discount_percentage: number | null } | null }).condicion_comercial_negociacion;
          const visibles = (cotizacionData as { condiciones_visibles?: string[] | null }).condiciones_visibles;
          if (neg) {
            setCondicionNegociacion({ id: neg.id, name: neg.name, discount_percentage: neg.discount_percentage ?? null });
            setSelectedCondicionComercialId(null);
          } else {
            setCondicionNegociacion(null);
            setSelectedCondicionComercialId(cotizacionData.condiciones_comerciales_id ?? null);
          }
          if (Array.isArray(visibles) && visibles.length > 0) {
            setCondicionIdsVisibles(new Set(visibles));
          } else if (condicionesResult.success && condicionesResult.data) {
            // Sin visibles guardados: por defecto todas las públicas visibles (igual que cotización nueva)
            const publicIds = (condicionesResult.data as Array<{ id: string; is_public?: boolean }>)
              .filter((c) => c.is_public !== false)
              .map((c) => c.id);
            setCondicionIdsVisibles(new Set(publicIds));
          } else if (cotizacionData.condiciones_comerciales_id || neg?.id) {
            setCondicionIdsVisibles(new Set([cotizacionData.condiciones_comerciales_id ?? neg!.id].filter(Boolean)));
          }

          // Cargar horas de cobertura de la cotización si existe
          const cotizacionEventDuration = (cotizacionData as { event_duration?: number | null }).event_duration;
          if (cotizacionEventDuration) {
            setDurationHours(cotizacionEventDuration);
          } else if (promiseId) {
            // Si no hay event_duration en la cotización, intentar cargar desde promise como fallback
            try {
              const durationResult = await getPromiseDurationHours(promiseId);
              if (durationResult.success && durationResult.duration_hours) {
                setDurationHours(durationResult.duration_hours);
              }
            } catch (error) {
              console.error('[CotizacionForm] Error cargando duration_hours desde promise:', error);
            }
          }

          // Cargar items de la cotización (separar items del catálogo y personalizados)
          const cotizacionItems: { [id: string]: number } = {};
          const customItemsFromDB: CustomItemData[] = [];
          
          // Obtener primera categoría disponible como fallback para items personalizados sin categoriaId
          const primeraCategoriaId = catalogoResult.data.length > 0 && catalogoResult.data[0].categorias.length > 0
            ? catalogoResult.data[0].categorias[0].id
            : null;
          
          if (cotizacionData.items && Array.isArray(cotizacionData.items)) {
            cotizacionData.items.forEach((item: { 
              id: string;
              item_id: string | null; 
              quantity: number;
              name?: string | null;
              description?: string | null;
              unit_price?: number;
              cost?: number | null;
              expense?: number | null;
              billing_type?: string | null;
              categoria_id?: string | null;
              original_item_id?: string | null;
            }) => {
              if (item.item_id && item.quantity > 0) {
                // Item del catálogo - verificar si hay un custom item que lo reemplace
                const hasReplacement = cotizacionData.items.some(
                  (ci: typeof item) => !ci.item_id && ci.original_item_id === item.item_id
                );
                
                // Solo agregar al estado si NO tiene reemplazo
                if (!hasReplacement) {
                  cotizacionItems[item.item_id] = item.quantity;
                }
              } else if (!item.item_id && item.name && item.unit_price !== undefined) {
                // Item personalizado - usar categoriaId del item o fallback a primera categoría
                const categoriaId = item.categoria_id || primeraCategoriaId;
                if (!categoriaId) {
                  console.warn('[CotizacionForm] Item personalizado sin categoriaId y sin categorías disponibles');
                  return;
                }
                customItemsFromDB.push({
                  name: item.name,
                  description: item.description || null,
                  unit_price: item.unit_price,
                  cost: item.cost || 0,
                  expense: item.expense || 0,
                  quantity: item.quantity,
                  billing_type: (item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                  tipoUtilidad: 'servicio',
                  categoriaId: categoriaId,
                  originalItemId: item.original_item_id || null,
                  cotizacionItemId: item.id,
                });
              }
            });
          }
          
          setCustomItems(customItemsFromDB);

          // Combinar con initialItems para asegurar que todos los servicios estén inicializados
          const combinedItems = { ...initialItems, ...cotizacionItems };
          setItems(combinedItems);

          // Expandir secciones y categorías que contienen items incluidos
          const seccionesConItems = new Set<string>();
          const categoriasConItems = new Set<string>();
          
          catalogoResult.data.forEach(seccion => {
            let seccionTieneItems = false;
            seccion.categorias.forEach(categoria => {
              let categoriaTieneItems = false;
              categoria.servicios.forEach(servicio => {
                if (cotizacionItems[servicio.id] && cotizacionItems[servicio.id] > 0) {
                  categoriaTieneItems = true;
                  seccionTieneItems = true;
                }
              });
              if (categoriaTieneItems) {
                categoriasConItems.add(categoria.id);
              }
            });
            if (seccionTieneItems) {
              seccionesConItems.add(seccion.id);
            }
          });

          // Expandir secciones y categorías con items
          setSeccionesExpandidas(prev => {
            const newSet = new Set(prev);
            seccionesConItems.forEach(seccionId => newSet.add(seccionId));
            return newSet;
          });
          setCategoriasExpandidas(prev => {
            const newSet = new Set(prev);
            categoriasConItems.forEach(categoriaId => newSet.add(categoriaId));
            return newSet;
          });
          if (promiseId && studioSlug) {
            setReturnPath((cotizacionData.status === 'en_cierre' || cotizacionData.status === 'cierre')
              ? `/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`
              : `/${studioSlug}/studio/commercial/promises/${promiseId}`);
          }
          setIsInitializing(false);
        } else if (revisionOriginalId && originalResult.success && originalResult.data) {
          // Si estamos creando una revisión, pre-poblar con datos de la original
          const originalData = originalResult.data;
          setNombre(`${originalData.name} - Revisión`);
          setDescripcion(originalData.description || '');
          setPrecioPersonalizado(originalData.price);

          // Pre-poblar items desde la original, combinando con initialItems
          const revisionItems: { [id: string]: number } = {};
          if (originalData.items) {
            originalData.items.forEach((item: { item_id: string | null; quantity: number }) => {
              if (item.item_id) {
                revisionItems[item.item_id] = item.quantity;
              }
            });
          }
          // Combinar con initialItems para asegurar que todos los servicios estén inicializados
          const combinedItems = { ...initialItems, ...revisionItems };
          setItems(combinedItems);
        } else {
          // Nueva cotización personalizada - campos vacíos
          setItems(initialItems);
          setNombre('Personalizada');
          setDescripcion('');
          setPrecioPersonalizado('');
        }

        // Visibilidad por defecto: en cotización nueva, marcar como visibles todas las condiciones públicas
        if (!cotizacionId && condicionesResult.success && condicionesResult.data) {
          const publicIds = (condicionesResult.data as Array<{ id: string; is_public?: boolean }>)
            .filter((c) => c.is_public !== false)
            .map((c) => c.id);
          setCondicionIdsVisibles(new Set(publicIds));
        }

        if (configResult) {
          setConfiguracionPrecios({
            utilidad_servicio: Number(configResult.utilidad_servicio),
            utilidad_producto: Number(configResult.utilidad_producto),
            comision_venta: Number(configResult.comision_venta),
            sobreprecio: Number(configResult.sobreprecio)
          });
        }

        // Cargar duration_hours desde promise si no se cargó desde cotización
        if (promiseId && !cotizacionData) {
          try {
            const durationResult = await getPromiseDurationHours(promiseId);
            if (durationResult.success && durationResult.duration_hours) {
              setDurationHours(durationResult.duration_hours);
            }
          } catch (error) {
            console.error('[CotizacionForm] Error cargando duration_hours:', error);
          }
        }
      } catch (error) {
        console.error('[CotizacionForm] Error cargando datos:', error);
        toast.error('Error al cargar los datos');
        if (cotizacionId) setIsInitializing(false);
        setCargandoCatalogo(false);
      } finally {
        setCargandoCatalogo(false);
      }
    };

    if (studioSlug) {
      cargarDatos();
    } else {
      console.warn('[CotizacionForm] studioSlug no disponible, no se pueden cargar datos');
      setCargandoCatalogo(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSlug, packageId, cotizacionId, promiseId, contactId, revisionOriginalId]);

  // Notificar cambios en el estado de carga
  useEffect(() => {
    if (onLoadingChangeRef.current) {
      onLoadingChangeRef.current(cargandoCatalogo);
    }
  }, [cargandoCatalogo]);

  // Exponer handler de "Guardar como paquete" al componente padre
  useEffect(() => {
    if (getGuardarComoPaqueteHandlerRef) {
      getGuardarComoPaqueteHandlerRef.current = () => {
        if (!cotizacionId) {
          toast.info('Guarda primero la cotización como borrador para poder convertirla en paquete.');
          return;
        }
        setPaqueteNombre(nombre ? `${nombre} (Paquete)` : '');
        setPaqueteDescripcion(descripcion || '');
        setPaqueteHoras(durationHours);
        setPaqueteVisibility('private');
        setPaqueteCoverMedia([]);
        setPaqueteNombreError(null);
        setShowPaqueteModal(true);
      };
    }
  }, [getGuardarComoPaqueteHandlerRef, cotizacionId, nombre, descripcion, durationHours]);

  // Notificar cambios en el estado de guardado del paquete
  useEffect(() => {
    if (onSavingAsPaqueteChange) {
      onSavingAsPaqueteChange(isSavingAsPaquete);
    }
  }, [isSavingAsPaquete, onSavingAsPaqueteChange]);

  // Crear mapa de servicios para acceso rápido
  const configKey = useMemo(() => {
    if (!configuracionPrecios) return 'no-config';
    return `${configuracionPrecios.utilidad_servicio}-${configuracionPrecios.utilidad_producto}-${configuracionPrecios.comision_venta}-${configuracionPrecios.sobreprecio}`;
  }, [configuracionPrecios]);

  const servicioMap = useMemo(() => {
    if (!configuracionPrecios) return new Map();

    const map = new Map();
    catalogo.forEach(seccion => {
      seccion.categorias.forEach(categoria => {
        categoria.servicios.forEach(servicio => {
          const tipoUtilidad = servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto';
          map.set(servicio.id, {
            ...servicio,
            precioUnitario: calcularPrecio(
              servicio.costo,
              servicio.gasto,
              tipoUtilidad,
              configuracionPrecios
            ).precio_final,
            seccionNombre: seccion.nombre,
            categoriaNombre: categoria.nombre
          });
        });
      });
    });
    return map;
  }, [catalogo, configuracionPrecios]);

  // Filtrar catálogo basado en el filtro de texto
  const catalogoFiltrado = useMemo(() => {
    if (!filtroServicio.trim()) return catalogo;

    const filtro = filtroServicio.toLowerCase();

    return catalogo.map(seccion => {
      const categoriasFiltradas = seccion.categorias.map(categoria => {
        const serviciosFiltrados = categoria.servicios.filter(servicio => {
          const servicioData = servicioMap.get(servicio.id);
          if (!servicioData) return false;

          return (
            servicio.nombre.toLowerCase().includes(filtro) ||
            categoria.nombre.toLowerCase().includes(filtro) ||
            seccion.nombre.toLowerCase().includes(filtro) ||
            (servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto').toLowerCase().includes(filtro)
          );
        });

        return {
          ...categoria,
          servicios: serviciosFiltrados
        };
      }).filter(categoria => categoria.servicios.length > 0);

      return {
        ...seccion,
        categorias: categoriasFiltradas
      };
    }).filter(seccion => seccion.categorias.length > 0);
  }, [catalogo, filtroServicio, servicioMap]);

  // Derivar selectedServices desde items (servicios con cantidad > 0)
  const selectedServices = useMemo(() => {
    const selected = new Set<string>();
    Object.entries(items).forEach(([servicioId, cantidad]) => {
      if (cantidad > 0) {
        selected.add(servicioId);
      }
    });
    return selected;
  }, [items]);

  // Calcular servicios seleccionados por sección y categoría (incluyendo items personalizados)
  const serviciosSeleccionados = useMemo(() => {
    const resumen: {
      secciones: { [seccionId: string]: { total: number; categorias: { [categoriaId: string]: number } } }
    } = { secciones: {} };

    catalogoFiltrado.forEach(seccion => {
      let totalSeccion = 0;
      const categorias: { [categoriaId: string]: number } = {};

      seccion.categorias.forEach(categoria => {
        let totalCategoria = 0;
        
        // Items del catálogo
        categoria.servicios.forEach(servicio => {
          const cantidad = items[servicio.id] || 0;
          if (cantidad > 0) {
            totalCategoria += cantidad;
            totalSeccion += cantidad;
          }
        });
        
        // Items personalizados de esta categoría
        const customItemsEnCategoria = customItems.filter(ci => ci.categoriaId === categoria.id);
        customItemsEnCategoria.forEach(customItem => {
          totalCategoria += customItem.quantity;
          totalSeccion += customItem.quantity;
        });
        
        if (totalCategoria > 0) {
          categorias[categoria.id] = totalCategoria;
        }
      });

      if (totalSeccion > 0) {
        resumen.secciones[seccion.id] = {
          total: totalSeccion,
          categorias
        };
      }
    });

    return resumen;
  }, [catalogoFiltrado, items, customItems]);

  // Estado para el cálculo de precios (driver: Precio Personalizado cuando existe)
  const [calculoPrecio, setCalculoPrecio] = useState({
    subtotal: 0,
    montoCortesias: 0,
    subtotalProyectado: 0,
    montoDescuentoCondicion: 0,
    totalCosto: 0,
    totalGasto: 0,
    total: 0,
    utilidadNeta: 0,
    utilidadSinDescuento: 0,
    montoComision: 0,
    margenPorcentaje: 0,
    diferenciaPrecio: 0,
    descuentoPorcentaje: 0,
  });

  // Ajustes de negociación = solo cortesías y bono especial (no el precio final de cierre).
  // Si hay ajustes: condiciones con descuento se ocultan por defecto; el usuario puede activarlas si lo desea.
  const tieneAjustesNegociacion = itemsCortesia.size > 0 || (Number(bonoEspecial) || 0) > 0;

  /** True si los ajustes actuales difieren de lo guardado en la DB (solo tiene sentido si hay valores iniciales). */
  const esNegociacionModificada = useMemo(() => {
    const ini = negociacionInicialRef.current;
    if (!ini) return false;
    if (bonoEspecial !== ini.bono) return true;
    if (itemsCortesia.size !== ini.itemsCortesia.length) return true;
    return !ini.itemsCortesia.every((id) => itemsCortesia.has(id));
  }, [bonoEspecial, itemsCortesia]);

  useEffect(() => {
    if (!tieneAjustesNegociacion) return;
    setCondicionIdsVisibles((prev) => {
      const next = new Set(prev);
      condicionesComerciales.forEach((c) => {
        if ((c.discount_percentage ?? 0) > 0) next.delete(c.id);
      });
      if (condicionNegociacion && (condicionNegociacion.discount_percentage ?? 0) > 0) {
        next.delete(condicionNegociacion.id);
      }
      return next;
    });
  }, [tieneAjustesNegociacion, condicionesComerciales, condicionNegociacion]);

  // Items de la cotización para el desglose (cantidadEfectiva = ej. horas para billing HOUR)
  const [itemsParaDesglose, setItemsParaDesglose] = useState<Array<{
    id: string;
    nombre: string;
    costo: number;
    gasto: number;
    tipo_utilidad: 'service' | 'product';
    cantidad: number;
    cantidadEfectiva?: number;
  }>>([]);

  // Cálculo dinámico del precio usando useEffect
  useEffect(() => {
    if (!configuracionPrecios) {
      setCalculoPrecio({
        subtotal: 0,
        montoCortesias: 0,
        subtotalProyectado: 0,
        montoDescuentoCondicion: 0,
        totalCosto: 0,
        totalGasto: 0,
        total: 0,
        utilidadNeta: 0,
        utilidadSinDescuento: 0,
        montoComision: 0,
        margenPorcentaje: 0,
        diferenciaPrecio: 0,
        descuentoPorcentaje: 0,
      });
      return;
    }

    const serviciosSeleccionados = Object.entries(items)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([id, cantidad]) => {
        const servicio = servicioMap.get(id);
        if (!servicio) return null;

        const tipoUtilidad = servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto';
        const precios = calcularPrecio(
          servicio.costo || 0,
          servicio.gasto || 0,
          tipoUtilidad,
          configuracionPrecios
        );

        return {
          ...servicio,
          precioUnitario: precios.precio_final,
          cantidad,
          resultadoPrecio: precios, // Guardar el resultado completo para el desglose
          tipoUtilidad
        };
      })
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof servicioMap.get>> & {
        precioUnitario: number;
        cantidad: number;
        resultadoPrecio: ReturnType<typeof calcularPrecio>;
        tipoUtilidad: string;
      }>;

    if (serviciosSeleccionados.length === 0 && customItems.length === 0) {
      setCalculoPrecio({
        subtotal: 0,
        montoCortesias: 0,
        subtotalProyectado: 0,
        montoDescuentoCondicion: 0,
        totalCosto: 0,
        totalGasto: 0,
        total: 0,
        utilidadNeta: 0,
        utilidadSinDescuento: 0,
        montoComision: 0,
        margenPorcentaje: 0,
        diferenciaPrecio: 0,
        descuentoPorcentaje: 0,
      });
      setItemsParaDesglose([]);
      return;
    }

    let subtotal = 0;
    let totalCosto = 0;
    let totalGasto = 0;

    const safeDurationHours = durationHours && durationHours > 0 ? durationHours : 1;

    serviciosSeleccionados.forEach(s => {
      const billingType = (s.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
      const cantidadEfectiva = calcularCantidadEfectiva(billingType, s.cantidad, safeDurationHours);
      subtotal += (s.precioUnitario || 0) * cantidadEfectiva;
      totalCosto += (s.costo || 0) * cantidadEfectiva;
      totalGasto += (s.gasto || 0) * cantidadEfectiva;
    });

    customItems.forEach(customItem => {
      const cantidadEfectiva = calcularCantidadEfectiva(customItem.billing_type, customItem.quantity, safeDurationHours);
      subtotal += customItem.unit_price * cantidadEfectiva;
      totalCosto += (customItem.cost || 0) * cantidadEfectiva;
      totalGasto += (customItem.expense || 0) * cantidadEfectiva;
    });

    let montoCortesias = 0;
    serviciosSeleccionados.forEach(s => {
      if (!itemsCortesia.has(s.id)) return;
      const billingType = (s.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
      const cantidadEfectiva = calcularCantidadEfectiva(billingType, s.cantidad, safeDurationHours);
      montoCortesias += (s.precioUnitario || 0) * cantidadEfectiva;
    });
    customItems.forEach((customItem, idx) => {
      if (!itemsCortesia.has(`custom-${idx}`)) return;
      const cantidadEfectiva = calcularCantidadEfectiva(customItem.billing_type, customItem.quantity, safeDurationHours);
      montoCortesias += customItem.unit_price * cantidadEfectiva;
    });
    const bonoNum = Number(bonoEspecial) || 0;
    const subtotalProyectado = Math.max(0, subtotal - montoCortesias - bonoNum);

    const condicionActiva = condicionNegociacion ?? (selectedCondicionComercialId ? condicionesComerciales.find(c => c.id === selectedCondicionComercialId) ?? null : null);
    const pctDescuentoCondicion = condicionActiva?.discount_percentage ?? 0;
    const montoDescuentoCondicion = subtotalProyectado > 0 && pctDescuentoCondicion > 0
      ? (subtotalProyectado * pctDescuentoCondicion) / 100
      : 0;
    const precioSugeridoConCondicion = Math.max(0, subtotalProyectado - montoDescuentoCondicion);

    const precioPersonalizadoNum = precioPersonalizado === '' ? 0 : Number(precioPersonalizado) || 0;
    const precioCobrar = precioPersonalizadoNum > 0 ? precioPersonalizadoNum : precioSugeridoConCondicion;
    const comisionRatio = configuracionPrecios.comision_venta > 1
      ? configuracionPrecios.comision_venta / 100
      : configuracionPrecios.comision_venta;
    const montoComision = precioCobrar * comisionRatio;
    const utilidadNeta = precioCobrar - totalCosto - totalGasto - montoComision;
    const montoComisionSinDescuento = precioSugeridoConCondicion * comisionRatio;
    const utilidadSinDescuento = precioSugeridoConCondicion - totalCosto - totalGasto - montoComisionSinDescuento;
    const margenPorcentaje = precioCobrar > 0 ? (utilidadNeta / precioCobrar) * 100 : 0;
    const diferenciaPrecio = precioPersonalizadoNum > 0 ? precioPersonalizadoNum - subtotalProyectado : 0;
    const descuentoPorcentaje = subtotalProyectado > 0 && precioPersonalizadoNum > 0
      ? ((precioPersonalizadoNum - subtotalProyectado) / subtotalProyectado) * 100
      : 0;

    // Auditoría financiera: log detallado en consola (solo dev, activar con sessionStorage.setItem('zen_audit_precios','1'))
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && window.sessionStorage?.getItem('zen_audit_precios') === '1') {
      const auditItems = [
        ...serviciosSeleccionados.map(s => {
          const billingType = (s.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
          const cantidadEfectiva = calcularCantidadEfectiva(billingType, s.cantidad, safeDurationHours);
          return {
            id: s.id,
            nombre: s.nombre,
            costo: s.costo || 0,
            gasto: s.gasto || 0,
            cantidadEfectiva,
            precioUnitario: s.precioUnitario || 0,
            esCortesia: itemsCortesia.has(s.id),
          };
        }),
        ...customItems.map((customItem, idx) => {
          const cantidadEfectiva = calcularCantidadEfectiva(customItem.billing_type, customItem.quantity, safeDurationHours);
          return {
            id: `custom-${idx}`,
            nombre: customItem.name,
            costo: customItem.cost || 0,
            gasto: customItem.expense || 0,
            cantidadEfectiva,
            precioUnitario: customItem.unit_price,
            esCortesia: itemsCortesia.has(`custom-${idx}`),
          };
        }),
      ];
      logAuditoriaCotizacion({
        config: {
          utilidad_servicio: configuracionPrecios.utilidad_servicio,
          utilidad_producto: configuracionPrecios.utilidad_producto,
          comision_venta: configuracionPrecios.comision_venta,
          sobreprecio: configuracionPrecios.sobreprecio,
        },
        items: auditItems,
        subtotal,
        montoCortesias,
        bono: bonoNum,
        subtotalProyectado,
        precioCobrar,
        totalCosto,
        totalGasto,
        comisionRatio,
        montoComision,
        utilidadNeta,
      });
    }

    setCalculoPrecio({
      subtotal: Number(subtotal.toFixed(2)) || 0,
      montoCortesias: Number(montoCortesias.toFixed(2)) || 0,
      subtotalProyectado: Number(subtotalProyectado.toFixed(2)) || 0,
      montoDescuentoCondicion: Number(montoDescuentoCondicion.toFixed(2)) || 0,
      totalCosto: Number(totalCosto.toFixed(2)) || 0,
      totalGasto: Number(totalGasto.toFixed(2)) || 0,
      total: Number(precioCobrar.toFixed(2)) || 0,
      utilidadNeta: Number(utilidadNeta.toFixed(2)) || 0,
      utilidadSinDescuento: Number(utilidadSinDescuento.toFixed(2)) || 0,
      montoComision: Number(montoComision.toFixed(2)) || 0,
      margenPorcentaje: Number(margenPorcentaje.toFixed(1)) || 0,
      diferenciaPrecio: Number(diferenciaPrecio.toFixed(2)) || 0,
      descuentoPorcentaje: Number(descuentoPorcentaje.toFixed(1)) || 0,
    });

    // Preparar items para el desglose con cantidad efectiva (misma lógica que acumuladores)
    const itemsDesglose = [
      ...serviciosSeleccionados
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map(s => {
          const billingType = (s.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
          const cantidadEfectiva = calcularCantidadEfectiva(billingType, s.cantidad, safeDurationHours);
          const tipoUtilidad: 'service' | 'product' = s.tipo_utilidad === 'service' ? 'service' : 'product';
          return {
            id: s.id,
            nombre: s.nombre,
            costo: s.costo || 0,
            gasto: s.gasto || 0,
            tipo_utilidad: tipoUtilidad,
            cantidad: s.cantidad,
            cantidadEfectiva,
          };
        }),
      ...customItems.map(customItem => {
        const cantidadEfectiva = calcularCantidadEfectiva(customItem.billing_type, customItem.quantity, safeDurationHours);
        return {
          id: `custom-${customItem.name}`,
          nombre: customItem.name,
          costo: customItem.cost || 0,
          gasto: customItem.expense || 0,
          tipo_utilidad: (customItem.tipoUtilidad === 'servicio' ? 'service' : 'product') as 'service' | 'product',
          cantidad: customItem.quantity,
          cantidadEfectiva,
        };
      }),
    ];

    setItemsParaDesglose(itemsDesglose as Array<{
      id: string;
      nombre: string;
      costo: number;
      gasto: number;
      tipo_utilidad: 'service' | 'product';
      cantidad: number;
      cantidadEfectiva?: number;
    }>);
  }, [items, precioPersonalizado, configKey, servicioMap, configuracionPrecios, durationHours, customItems, itemsCortesia, bonoEspecial, selectedCondicionComercialId, condicionNegociacion, condicionesComerciales]);

  // Vista previa lateral: datos en tiempo real para CotizacionDetailSheet (mismo formato que vista pública)
  const getPreviewData = useCallback((): PublicCotizacion | null => {
    if (!catalogo.length || !servicioMap.size) return null;
    const safeDurationHours = (durationHours && durationHours > 0) ? durationHours : 1;
    const secciones: PublicSeccionData[] = catalogo.map((seccion, sIdx) => {
      const categorias = seccion.categorias.map((categoria, cIdx) => {
        const serviciosCatalog = (categoria.servicios ?? [])
          .filter((s) => (items[s.id] ?? 0) > 0)
          .map((s) => {
            const data = servicioMap.get(s.id);
            const cantidad = items[s.id] ?? 0;
            const precioUnit = data?.precioUnitario ?? 0;
            const billingType = (s.billing_type || data?.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
            const cantidadEfectiva = calcularCantidadEfectiva(billingType, cantidad, safeDurationHours);
            return {
              id: s.id,
              name: s.nombre,
              name_snapshot: s.nombre,
              description: null,
              description_snapshot: null,
              price: precioUnit,
              quantity: cantidadEfectiva,
              is_courtesy: itemsCortesia.has(s.id),
              billing_type: billingType,
            };
          });
        const customEnCategoria = customItems
          .map((ci, globalIdx) => ({ ...ci, globalIdx }))
          .filter((ci) => ci.categoriaId === categoria.id)
          .map((ci) => ({
            id: `custom-${ci.globalIdx}-${ci.name}`,
            name: ci.name,
            name_snapshot: ci.name,
            description: ci.description ?? null,
            description_snapshot: ci.description ?? null,
            price: ci.unit_price,
            quantity: ci.quantity,
            is_courtesy: itemsCortesia.has(`custom-${ci.globalIdx}`),
            billing_type: (ci.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
          }));
        return {
          id: categoria.id,
          nombre: categoria.nombre,
          orden: (categoria as { order?: number }).order ?? cIdx,
          servicios: [...serviciosCatalog, ...customEnCategoria],
        };
      }).filter((c) => c.servicios.length > 0);
      return {
        id: seccion.id,
        nombre: seccion.nombre,
        orden: (seccion as { order?: number }).order ?? sIdx,
        categorias,
      };
    }).filter((s) => s.categorias.length > 0);

    const precioCalculado = calculoPrecio.subtotal ?? 0;
    const total = precioPersonalizado !== '' && Number(precioPersonalizado) > 0
      ? Number(precioPersonalizado)
      : (calculoPrecio.total ?? 0);
    const precioCierreRedondo = Math.round(total);
    const condicionActiva = condicionNegociacion ?? (selectedCondicionComercialId ? condicionesComerciales.find((c) => c.id === selectedCondicionComercialId) ?? null : null);
    return {
      id: cotizacionId ?? 'preview',
      name: nombre,
      description: descripcion || null,
      price: precioCierreRedondo,
      precio_calculado: Math.round(precioCalculado),
      /** Precio Final de Cierre del editor: usado por el sheet para Ajuste = PrecioCierre - (PrecioLista - Cortesías - Bono). */
      negociacion_precio_personalizado: precioCierreRedondo,
      discount: condicionActiva?.discount_percentage ?? null,
      status: undefined,
      servicios: secciones,
      condiciones_comerciales: condicionActiva
        ? {
            metodo_pago: null,
            condiciones: condicionActiva.name,
            id: condicionActiva.id,
            name: condicionActiva.name,
            description: condicionActiva.description ?? null,
            advance_percentage: condicionActiva.advance_percentage ?? null,
            advance_type: condicionActiva.advance_type ?? null,
            advance_amount: condicionActiva.advance_amount ?? null,
            discount_percentage: condicionActiva.discount_percentage ?? null,
          }
        : null,
      paquete_origen: null,
      condiciones_visibles: selectedCondicionComercialId ? [selectedCondicionComercialId] : null,
      bono_especial: Number(bonoEspecial) || 0,
    };
  }, [
    catalogo,
    items,
    customItems,
    itemsCortesia,
    bonoEspecial,
    nombre,
    descripcion,
    calculoPrecio.subtotal,
    calculoPrecio.total,
    precioPersonalizado,
    selectedCondicionComercialId,
    condicionesComerciales,
    condicionNegociacion,
    cotizacionId,
    servicioMap,
    durationHours,
  ]);

  useEffect(() => {
    if (getPreviewDataRef) getPreviewDataRef.current = getPreviewData;
    return () => {
      if (getPreviewDataRef) getPreviewDataRef.current = null;
    };
  }, [getPreviewDataRef, getPreviewData]);

  // Fase 7.8: sincronización global — Precio Final de Cierre reacciona a catálogo (ítems/precio calculado) y ajustes (cortesías, bono)
  // Si cambian cortesías O bono, verificar si el precio final debe actualizarse al nuevo subtotal proyectado.
  const montoBono = Number(bonoEspecial) || 0;
  useEffect(() => {
    if (isFirstMountAjustesSyncRef.current) {
      isFirstMountAjustesSyncRef.current = false;
      return;
    }
    if (!userHasChangedServicesOrAjustesRef.current) return;
    setPendingSyncFromAjustes(true);
    setShowPrecioSincronizadoBadge(true);
    const tBadge = setTimeout(() => setShowPrecioSincronizadoBadge(false), 4000);
    const tPending = setTimeout(() => setPendingSyncFromAjustes(false), 200);
    return () => {
      clearTimeout(tBadge);
      clearTimeout(tPending);
    };
  }, [calculoPrecio.subtotalProyectado, montoBono]);

  // Aplicar sync: Precio Final de Cierre = subtotalProyectado. No zeros: si queda 0 o vacío, se usa subtotalProyectado (o subtotal como fallback).
  useEffect(() => {
    if (!pendingSyncFromAjustes) return;
    const base = calculoPrecio.subtotalProyectado ?? calculoPrecio.subtotal ?? 0;
    const sugerido = Math.max(0, base);
    setPrecioPersonalizado(sugerido);
    setRingPrecioSincronizadoVisible(true);
  }, [pendingSyncFromAjustes, calculoPrecio.subtotalProyectado]);

  const loadCondicionesComerciales = useCallback(async () => {
    const result = await obtenerCondicionesComerciales(studioSlug);
    if (result.success && result.data) {
      setCondicionesComerciales(result.data.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        discount_percentage: c.discount_percentage ?? null,
        advance_percentage: c.advance_percentage ?? null,
        advance_type: c.advance_type ?? null,
        advance_amount: c.advance_amount != null ? Number(c.advance_amount) : null,
        type: c.type ?? undefined,
      })));
    }
  }, [studioSlug]);

  // Handlers para toggles (accordion behavior)
  const toggleSeccion = (seccionId: string) => {
    setSeccionesExpandidas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seccionId)) {
        newSet.delete(seccionId);
        setCategoriasExpandidas(prevCats => {
          const newCats = new Set(prevCats);
          catalogo.find(s => s.id === seccionId)?.categorias.forEach(cat => {
            newCats.delete(cat.id);
          });
          return newCats;
        });
      } else {
        newSet.add(seccionId);
      }
      return newSet;
    });
  };

  const toggleCategoria = (categoriaId: string) => {
    setCategoriasExpandidas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoriaId)) {
        newSet.delete(categoriaId);
      } else {
        newSet.add(categoriaId);
      }
      return newSet;
    });
  };

  const toggleCortesia = (itemId: string) => {
    userHasChangedServicesOrAjustesRef.current = true;
    setItemsCortesia(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Handler para toggle de selección (click en el servicio). Inserción en cascada: al agregar un Padre se agregan sus Hijos (soft-linking).
  // En modo cortesía, si el ítem ya está seleccionado, el clic solo alterna cortesía (no deselecciona).
  const onToggleSelection = (servicioId: string) => {
    const servicio = servicioMap.get(servicioId);
    if (!servicio) return;
    userHasChangedServicesOrAjustesRef.current = true;
    const currentQuantity = items[servicioId] || 0;

    if (isCourtesyMode && currentQuantity > 0) {
      toggleCortesia(servicioId);
      return;
    }

    if (currentQuantity > 0) {
      setItems(prev => {
        const newItems = { ...prev };
        delete newItems[servicioId];
        return newItems;
      });
      setItemsCortesia(prev => {
        const next = new Set(prev);
        next.delete(servicioId);
        return next;
      });
    } else {
      const initialQuantity = 1;
      const linkedIds = serviceLinksMap[servicioId] ?? [];
      const toAdd = linkedIds.filter(id => !(items[id] && items[id] > 0));

      setItems(prev => {
        const next = { ...prev, [servicioId]: initialQuantity };
        toAdd.forEach(id => { next[id] = 1; });
        return next;
      });
      if (toAdd.length > 0) {
        toast.success('Servicios asociados agregados con éxito.', { id: 'cotizacion-servicios-asociados' });
      }
    }
  };

  // Handlers
  const updateQuantity = (servicioId: string, cantidad: number) => {
    userHasChangedServicesOrAjustesRef.current = true;
    const servicio = servicioMap.get(servicioId);
    const prevCantidad = items[servicioId] || 0;

    setItems(prev => {
      const newItems = { ...prev };
      if (cantidad > 0) {
        newItems[servicioId] = cantidad;
      } else {
        delete newItems[servicioId];
      }
      return newItems;
    });
    if (cantidad === 0) {
      setItemsCortesia(prev => {
        const next = new Set(prev);
        next.delete(servicioId);
        return next;
      });
    }

    if (cantidad > prevCantidad && servicio) {
      toast.success(`${servicio.nombre} agregado a la cotización`, { id: 'cotizacion-add' });
    } else if (cantidad === 0 && prevCantidad > 0 && servicio) {
      toast.info(`${servicio.nombre} removido de la cotización`, { id: 'cotizacion-remove' });
    }
  };

  // Verificar si hay items seleccionados
  const hasSelectedItems = useMemo(() => {
    const hasCatalogItems = Object.values(items).some(cantidad => cantidad > 0);
    const hasCustomItems = customItems.length > 0;
    return hasCatalogItems || hasCustomItems;
  }, [items, customItems]);

  // Cantidad de ítems en cortesía que siguen en la cotización (para label del sidebar)
  const cortesiaCount = useMemo(() => {
    let n = 0;
    itemsCortesia.forEach(id => {
      if (id.startsWith('custom-')) {
        const idx = parseInt(id.replace('custom-', ''), 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < customItems.length) n += 1;
      } else if (items[id] && items[id] > 0) {
        n += 1;
      }
    });
    return n;
  }, [itemsCortesia, items, customItems.length]);

  // Manejar guardado de item desde ItemEditorModal (personalizado o del catálogo)
  const handleSaveCustomItem = async (
    data: ItemFormData,
    options?: { saveToCatalog?: boolean }
  ) => {
    try {
      // Si es un item del catálogo (tiene id y no es custom-)
      if (data.id && !data.id.startsWith('custom-')) {
        // Verificar si debe guardarse en catálogo global
        if (options?.saveToCatalog) {
          const payload = {
            id: data.id,
            name: data.name,
            cost: data.cost ?? 0,
            tipoUtilidad: data.tipoUtilidad,
            billing_type: data.billing_type,
            gastos: data.gastos || [],
            status: data.status,
            operational_category: data.operational_category ?? undefined,
            defaultDurationDays: data.defaultDurationDays ?? 1,
          };
          // Fase 5.3: con cotizacionId se actualiza global + snapshot (recalculo unit_price, subtotal, public_price_snapshot)
          if (cotizacionId) {
            const updateResult = await actualizarItemYSnapshotCotizacion(studioSlug, cotizacionId, payload);
            if (!updateResult.success) {
              toast.error(updateResult.error || 'Error al actualizar ítem y cotización');
              return;
            }
          } else {
            const updateResult = await actualizarItem(payload);
            if (!updateResult.success) {
              toast.error(updateResult.error || 'Error al actualizar en catálogo');
              return;
            }
          }

          const catalogoResult = await obtenerCatalogo(studioSlug);
          if (catalogoResult.success && catalogoResult.data) {
            setCatalogo(catalogoResult.data);
          }
          if (data.id) {
            setItemOverrides(prev => {
              const updated = new Map(prev);
              updated.delete(data.id!);
              return updated;
            });
          }
          startTransition(() => router.refresh());
          toast.success(cotizacionId ? 'Item y cotización actualizados. El precio se ha actualizado.' : 'Item actualizado en catálogo.');
        } else {
          // Modo snapshot: convertir item del catálogo a custom item
          // 1. Obtener cantidad actual antes de remover
          const cantidadActual = items[data.id] || 1;
          
          // 2. Calcular precio final desde costo y gastos
          const totalGastos = (data.gastos || []).reduce((acc, g) => acc + g.costo, 0);
          if (!configuracionPrecios) {
            toast.error('No hay configuración de precios disponible');
            return;
          }
          const tipoUtilidad = data.tipoUtilidad === 'servicio' ? 'servicio' : 'producto';
          const precios = calcularPrecio(
            data.cost || 0,
            totalGastos,
            tipoUtilidad,
            configuracionPrecios
          );
          const finalPrice = precios.precio_final;

          // 3. Asegurar que hay categoriaId (debe estar en selectedCategoriaForItem)
          if (!selectedCategoriaForItem) {
            toast.error('Debe seleccionar una categoría para el item personalizado');
            return;
          }

          // 4. Crear custom item con los datos modificados
          const customItemData: CustomItemData = {
            name: data.name,
            description: data.description || null,
            unit_price: finalPrice,
            cost: data.cost || 0,
            expense: totalGastos,
            quantity: cantidadActual, // Preservar cantidad actual
            billing_type: (data.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
            tipoUtilidad: tipoUtilidad as 'servicio' | 'producto',
            categoriaId: selectedCategoriaForItem, // Preservar categoriaId
            originalItemId: data.id, // Guardar ID del item original para reemplazo en el árbol
          };

          // 5. Remover item del catálogo de la selección
          if (data.id) {
            setItems(prev => {
              const updated = { ...prev };
              delete updated[data.id!];
              return updated;
            });
            setItemsCortesia(prev => {
              const next = new Set(prev);
              next.delete(data.id!);
              return next;
            });
          }

          // 6. Agregar como custom item
          userHasChangedServicesOrAjustesRef.current = true;
          setCustomItems(prev => [...prev, customItemData]);

          // 7. Eliminar override si existía (ya no es necesario)
          if (data.id) {
            setItemOverrides(prev => {
              const updated = new Map(prev);
              updated.delete(data.id!);
              return updated;
            });
          }

          toast.success('Item convertido a personalizado. Los cambios solo afectan esta cotización.');
        }

        setIsItemModalOpen(false);
        setItemToEdit(null);
        setSelectedCategoriaForItem(null);
        return;
      }

      // Si saveToCatalog es true, guardar/actualizar en catálogo primero
      if (options?.saveToCatalog && selectedCategoriaForItem) {
        if (data.id && data.id.startsWith('custom-')) {
          // Crear nuevo item en catálogo desde personalizado
          const createResult = await crearItem({
            studioSlug,
            categoriaeId: selectedCategoriaForItem,
            name: data.name,
            cost: data.cost ?? 0,
            tipoUtilidad: data.tipoUtilidad,
            billing_type: data.billing_type || (data.tipoUtilidad === 'producto' ? 'UNIT' : 'SERVICE'),
            gastos: data.gastos || [],
            status: data.status || 'active',
          });
          if (!createResult.success) {
            toast.error(createResult.error || 'Error al crear en catálogo');
            return;
          }
          // Si se creó en catálogo, agregarlo también a items del catálogo en la cotización
          if (createResult.data?.id) {
            setItems(prev => ({ ...prev, [createResult.data!.id]: 1 }));
            setIsItemModalOpen(false);
            setItemToEdit(null);
            setSelectedCategoriaForItem(null);
            toast.success('Item creado en catálogo y agregado a la cotización');
            return;
          }
        } else if (!data.id) {
          // Crear nuevo item en catálogo (ítem al vuelo + "Agregar al catálogo")
          const createResult = await crearItem({
            studioSlug,
            categoriaeId: selectedCategoriaForItem,
            name: data.name,
            cost: data.cost ?? 0,
            tipoUtilidad: data.tipoUtilidad,
            billing_type: data.billing_type || (data.tipoUtilidad === 'producto' ? 'UNIT' : 'SERVICE'),
            gastos: data.gastos || [],
            status: data.status || 'active',
          });
          if (!createResult.success) {
            toast.error(createResult.error || 'Error al crear en catálogo');
            return;
          }
          // Si se creó en catálogo, agregarlo también a items del catálogo en la cotización
          if (createResult.data?.id) {
            setItems(prev => ({ ...prev, [createResult.data!.id]: 1 }));
            setIsItemModalOpen(false);
            setItemToEdit(null);
            setSelectedCategoriaForItem(null);
            toast.success('Item creado en catálogo y agregado a la cotización');
            return;
          }
        }
      }

      // Calcular precio final desde costo y gastos (siempre usar precio calculado del sistema)
      const totalGastos = (data.gastos || []).reduce((acc, g) => acc + g.costo, 0);
      if (!configuracionPrecios) {
        toast.error('No hay configuración de precios disponible');
        return;
      }
      const tipoUtilidad = data.tipoUtilidad === 'servicio' ? 'servicio' : 'producto';
      const precios = calcularPrecio(
        data.cost || 0,
        totalGastos,
        tipoUtilidad,
        configuracionPrecios
      );
      const finalPrice = precios.precio_final;

      // Asegurar que hay categoriaId
      if (!selectedCategoriaForItem) {
        toast.error('Debe seleccionar una categoría para el item personalizado');
        return;
      }

      // Crear o actualizar item personalizado en la lista
      const customItemData: CustomItemData = {
        name: data.name,
        description: data.description || null,
        unit_price: finalPrice,
        cost: data.cost || 0,
        expense: (data.gastos || []).reduce((acc, g) => acc + g.costo, 0),
        quantity: 1, // Cantidad inicial, se puede editar después
        billing_type: (data.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
        tipoUtilidad: (data.tipoUtilidad || 'servicio') as 'servicio' | 'producto',
        categoriaId: selectedCategoriaForItem,
        originalItemId: null, // Item "puro" creado desde cero, no es reemplazo
      };

      if (itemToEdit && itemToEdit.id && itemToEdit.id.startsWith('custom-')) {
        // Actualizar item existente usando el índice guardado en el id
        const index = parseInt(itemToEdit.id.replace('custom-', ''), 10);
        if (!isNaN(index) && index >= 0 && index < customItems.length) {
          userHasChangedServicesOrAjustesRef.current = true;
          setCustomItems(prev => {
            const updated = [...prev];
            // Mantener la categoriaId y originalItemId originales del item existente
            updated[index] = {
              ...customItemData,
              categoriaId: prev[index].categoriaId,
              originalItemId: prev[index].originalItemId ?? null, // Preservar originalItemId si existe
            };
            return updated;
          });
          toast.success('Item personalizado actualizado');
        } else {
          toast.error('Error: Índice de item inválido');
        }
      } else {
        // Agregar nuevo item
        userHasChangedServicesOrAjustesRef.current = true;
        setCustomItems(prev => [...prev, customItemData]);
        toast.success('Item personalizado agregado');
      }

      setIsItemModalOpen(false);
      setItemToEdit(null);
      setSelectedCategoriaForItem(null);
    } catch (error) {
      console.error('Error guardando item:', error);
      toast.error('Error al guardar item');
    }
  };

  // Manejar creación de item personalizado
  const handleCreateCustomItem = (categoriaId?: string) => {
    // Usar la categoría proporcionada o la primera disponible
    let finalCategoriaId: string | null = categoriaId || selectedCategoriaForItem;
    
    if (!finalCategoriaId && catalogo.length > 0) {
      const primeraSeccion = catalogo[0];
      if (primeraSeccion.categorias.length > 0) {
        finalCategoriaId = primeraSeccion.categorias[0].id;
      }
    }

    if (!finalCategoriaId) {
      toast.error('No hay categorías disponibles. Crea una categoría primero en el catálogo.');
      return;
    }

    setSelectedCategoriaForItem(finalCategoriaId);
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  // Manejar edición de item del catálogo desde el árbol
  const handleEditCatalogItem = (servicioId: string) => {
    // Buscar el servicio en el catálogo
    let servicioEncontrado: any = null;
    let categoriaId: string | null = null;

    for (const seccion of catalogo) {
      for (const categoria of seccion.categorias) {
        const servicio = categoria.servicios.find((s: any) => s.id === servicioId);
        if (servicio) {
          servicioEncontrado = servicio;
          categoriaId = categoria.id;
          break;
        }
      }
      if (servicioEncontrado) break;
    }

    if (!servicioEncontrado || !categoriaId) {
      toast.error('Servicio no encontrado');
      return;
    }

    // Convertir a ItemFormData (Fase 5.4: incluir operational_category y defaultDurationDays)
    const tipoUtilidad = servicioEncontrado.tipo_utilidad === 'service' ? 'servicio' : 'producto';
    const itemData: ItemFormData = {
      id: servicioEncontrado.id,
      name: servicioEncontrado.nombre,
      cost: servicioEncontrado.costo,
      description: servicioEncontrado.descripcion || undefined,
      categoriaeId: categoriaId,
      tipoUtilidad,
      billing_type: (servicioEncontrado.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
      gastos: servicioEncontrado.gastos?.map((g: any) => ({ nombre: g.nombre, costo: g.costo })) || [],
      status: servicioEncontrado.status || 'active',
      operational_category: (servicioEncontrado.operational_category as ItemFormData['operational_category']) ?? null,
      defaultDurationDays: servicioEncontrado.default_duration_days ?? 1,
    };

    setItemToEdit(itemData);
    setSelectedCategoriaForItem(categoriaId);
    setIsItemModalOpen(true);
  };

  // Manejar edición de item personalizado
  const handleEditCustomItem = (index: number) => {
    const customItem = customItems[index];
    // Convertir CustomItemData a ItemFormData para el modal
    const gastos = customItem.expense > 0 ? [{ nombre: 'Gastos', costo: customItem.expense }] : [];
    setItemToEdit({
      name: customItem.name,
      cost: customItem.cost,
      description: customItem.description || undefined,
      tipoUtilidad: customItem.tipoUtilidad,
      billing_type: customItem.billing_type,
      gastos: gastos,
    });
    // Guardar el índice para actualizar el item correcto
    setItemToEdit((prev) => prev ? { ...prev, id: `custom-${index}` } : null);
    setSelectedCategoriaForItem(customItem.categoriaId); // Usar la categoriaId del item
    setIsItemModalOpen(true);
  };

  // Manejar eliminación de item personalizado
  const handleDeleteCustomItem = (index: number) => {
    const itemToDelete = customItems[index];
    
    // Si es un item de reemplazo (tiene originalItemId), restaurar el item original del catálogo
    if (itemToDelete?.originalItemId) {
      setItems(prev => ({
        ...prev,
        [itemToDelete.originalItemId!]: itemToDelete.quantity, // Restaurar cantidad
      }));
      toast.success('Item personalizado eliminado. Se restauró el item original del catálogo.');
    } else {
      toast.success('Item personalizado eliminado');
    }
    userHasChangedServicesOrAjustesRef.current = true;
    setCustomItems(prev => prev.filter((_, i) => i !== index));
  };

  // Manejar actualización de cantidad de item personalizado
  const handleUpdateCustomItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    userHasChangedServicesOrAjustesRef.current = true;
    setCustomItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: quantity,
      };
      return updated;
    });
  };

  // Promocionar ítem personalizado al catálogo (Fase 2.1)
  const handleGuardarEnCatalogo = async (index: number) => {
    const custom = customItems[index];
    if (!custom) return;
    const ci = custom;
    if (cotizacionId && ci.cotizacionItemId) {
      const result = await promocionarItemAlCatalogo(studioSlug, { cotizacion_item_id: ci.cotizacionItemId });
      if (!result.success) {
        toast.error(result.error ?? 'Error al guardar en catálogo');
        return;
      }
      toast.success('Ítem guardado en el catálogo');
      const res = await getCotizacionById(cotizacionId, studioSlug);
      if (!res.success || !res.data?.items) return;
      const cotizacionItems: { [id: string]: number } = {};
      const customFromApi: typeof customItems = [];
      const primeraCategoriaId = catalogoFiltrado.length > 0 && catalogoFiltrado[0].categorias?.length
        ? catalogoFiltrado[0].categorias[0].id
        : null;
      res.data.items.forEach((item: { id: string; item_id: string | null; quantity: number; name?: string | null; description?: string | null; unit_price?: number; cost?: number | null; expense?: number | null; billing_type?: string | null; categoria_id?: string | null; original_item_id?: string | null }) => {
        if (item.item_id && item.quantity > 0) {
          cotizacionItems[item.item_id] = item.quantity;
        } else if (!item.item_id && item.name && item.unit_price !== undefined) {
          const catId = item.categoria_id || primeraCategoriaId;
          if (catId) {
            customFromApi.push({
              name: item.name,
              description: item.description ?? null,
              unit_price: item.unit_price,
              cost: item.cost ?? 0,
              expense: item.expense ?? 0,
              quantity: item.quantity,
              billing_type: (item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
              tipoUtilidad: 'servicio',
              categoriaId: catId,
              originalItemId: item.original_item_id ?? null,
              cotizacionItemId: item.id,
            });
          }
        }
      });
      setItems(prev => ({ ...prev, ...cotizacionItems }));
      setCustomItems(customFromApi);
    } else {
      const result = await promocionarItemAlCatalogo(studioSlug, {
        name: ci.name,
        description: ci.description ?? null,
        cost: ci.cost ?? 0,
        expense: ci.expense ?? 0,
        billing_type: ci.billing_type ?? 'SERVICE',
        categoria_id: ci.categoriaId,
      });
      if (!result.success) {
        toast.error(result.error ?? 'Error al guardar en catálogo');
        return;
      }
      toast.success('Ítem guardado en el catálogo');
      setItems(prev => ({ ...prev, [result.data!.item_id]: ci.quantity }));
      setCustomItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const runGuardarComoPaquete = async () => {
    if (!cotizacionId) return;
    
    // Limpiar errores previos (Fase 8.6)
    setPaqueteNombreError(null);
    
    setIsSavingAsPaquete(true);
    try {
      const coverUrl = paqueteCoverMedia.length > 0 ? paqueteCoverMedia[0].file_url : null;
      const result = await guardarCotizacionComoPaquete(studioSlug, cotizacionId, {
        name: paqueteNombre || undefined,
        description: paqueteDescripcion || null,
        baseHours: paqueteHoras !== null ? paqueteHoras : undefined,
        visibility: paqueteVisibility,
        coverPhotoUrl: coverUrl,
      });
      if (result.success && result.data?.paqueteId) {
        setShowPaqueteModal(false);
        const customCount = result.data.customItemsCount ?? 0;
        const visibilityText = paqueteVisibility === 'public' ? 'público' : 'privado';
        toast.success('Paquete creado', {
          description: customCount > 0
            ? `${customCount} ítem(s) personalizado(s) guardados en tu catálogo. Paquete ${visibilityText}.`
            : `Paquete ${visibilityText} creado. Puedes configurarlo cuando quieras.`,
          action: {
            label: 'Configurar paquete',
            onClick: () => router.push(`/${studioSlug}/studio/commercial/paquetes/${result.data!.paqueteId}/editar`),
          },
        });
      } else {
        // Error: verificar si es nombre duplicado (Fase 8.6)
        const errorMessage = result.error ?? 'Error al crear el paquete';
        if (errorMessage.includes('Ya existe un paquete con este nombre')) {
          setPaqueteNombreError(errorMessage);
          // NO cerrar el modal, dejar que el usuario corrija el nombre
        } else {
          setShowPaqueteModal(false);
          toast.error(errorMessage);
        }
      }
    } finally {
      setIsSavingAsPaquete(false);
    }
  };

  const handleGuardarComoPaqueteClick = () => {
    if (!cotizacionId) {
      toast.info('Guarda primero la cotización como borrador para poder convertirla en paquete.');
      return;
    }
    // Pre-llenar datos del modal (Fase 8.2)
    setPaqueteNombre(nombre ? `${nombre} (Paquete)` : '');
    setPaqueteDescripcion(descripcion || '');
    setPaqueteHoras(durationHours);
    setPaqueteVisibility('private');
    setPaqueteCoverMedia([]);
    setPaqueteNombreError(null);
    setShowPaqueteModal(true);
  };

  const handlePaqueteCoverUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setIsPaqueteCoverUploading(true);
    try {
      const uploaded = await uploadFiles(files, studioSlug, 'paquetes', undefined);
      if (uploaded.length > 0) {
        const file = uploaded[0];
        const isVideo = /\.(mp4|mov|webm|avi)$/i.test(file.fileName);
        setPaqueteCoverMedia([{
          file_url: file.url,
          file_type: isVideo ? 'video' : 'image',
          filename: file.fileName,
          file_size: file.size,
        }]);
        toast.success('Portada cargada correctamente');
      }
    } catch (error) {
      toast.error('Error al subir la portada');
      console.error('Error uploading paquete cover:', error);
    } finally {
      setIsPaqueteCoverUploading(false);
    }
  };

  const handlePaqueteCoverRemove = () => {
    setPaqueteCoverMedia([]);
  };

  // Redirigir a returnPath (cierre o detalle de promesa) para evitar fallos con historial vacío en nueva pestaña
  const goToPromiseDetailOrBack = () => {
    if (returnPath) {
      router.push(returnPath);
    } else if (promiseId && studioSlug) {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    } else {
      router.back();
    }
  };

  // Manejar intento de cierre
  const handleCancelClick = () => {
    if (hasSelectedItems) {
      setShowConfirmDialog(true);
    } else {
      goToPromiseDetailOrBack();
    }
  };

  // Confirmar cierre
  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    goToPromiseDetailOrBack();
  };

  // Cancelar cierre
  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const handleSave = async (
    publish: boolean,
    nombreOverride?: string,
    options?: { skipDurationScopeCheck?: boolean; scope?: 'local' | 'global' }
  ) => {
    if (isSubmittingRef.current || loading) {
      return;
    }

    const nombreToUse = (nombreOverride ?? nombre.trim()).trim();
    if (!nombreToUse) {
      toast.error('El nombre de la cotización es requerido');
      return;
    }

    const itemsSeleccionados = Object.entries(items).filter(([, cantidad]) => cantidad > 0);
    const hasCatalogItems = itemsSeleccionados.length > 0;
    const hasCustomItems = customItems.length > 0;

    if (!hasCatalogItems && !hasCustomItems) {
      toast.error('Agrega al menos un servicio o item personalizado');
      return;
    }

    if (!promiseId && !isEditMode) {
      toast.error('Se requiere una promise para crear la cotización');
      return;
    }

    // Sincronización duración: si la cotización tiene distinta duración que la promesa, preguntar alcance
    if (isEditMode && promiseId && !options?.skipDurationScopeCheck) {
      const durationResult = await getPromiseDurationHours(promiseId);
      const horasPromesa = durationResult.success ? (durationResult.duration_hours ?? null) : null;
      const horasCotizacion = durationHours != null && durationHours > 0 ? durationHours : null;
      if (
        (horasCotizacion !== horasPromesa) &&
        (horasCotizacion != null || horasPromesa != null)
      ) {
        setPendingSavePublish(publish);
        setPendingSaveNombreOverride(nombreOverride);
        setPromiseDurationForModal(horasPromesa);
        setShowDurationScopeModal(true);
        return;
      }
    }

    const intent = publish ? 'publish' : 'draft';
    isSubmittingRef.current = true;
    setSavingIntent(intent);
    setLoading(true);
    try {
      const precioFinal = precioPersonalizado === '' || precioPersonalizado === 0
        ? calculoPrecio.total
        : Number(precioPersonalizado);

      if (isEditMode) {
        const overridesObj: Record<string, {
          name?: string;
          description?: string | null;
          cost?: number;
          expense?: number;
        }> = {};
        itemOverrides.forEach((override, itemId) => {
          overridesObj[itemId] = {
            name: override.name,
            description: override.description,
            cost: override.cost,
            expense: override.expense,
          };
        });

        const result = await updateCotizacion({
          studio_slug: studioSlug,
          cotizacion_id: cotizacionId!,
          nombre: nombreToUse,
          descripcion: descripcion.trim() || undefined,
          precio: precioFinal,
          precio_calculado: (calculoPrecio.subtotal ?? 0) > 0 ? calculoPrecio.subtotal : undefined,
          visible_to_client: publish,
          items: Object.fromEntries(
            itemsSeleccionados.map(([itemId, cantidad]) => [itemId, cantidad])
          ),
          customItems: customItems,
          itemOverrides: Object.keys(overridesObj).length > 0 ? overridesObj : {},
          event_duration: durationHours && durationHours > 0 ? durationHours : null,
          items_cortesia: Array.from(itemsCortesia),
          bono_especial: Number(bonoEspecial) || 0,
          condiciones_comerciales_id: condicionNegociacion ? null : (selectedCondicionComercialId ?? null),
          condiciones_visibles: Array.from(condicionIdsVisibles),
        });

        if (result.success && options?.scope === 'global' && promiseId) {
          const updatePromiseRes = await updatePromiseDurationHours(
            studioSlug,
            promiseId,
            durationHours && durationHours > 0 ? durationHours : null
          );
          if (!updatePromiseRes.success) {
            toast.error(updatePromiseRes.error ?? 'No se pudo actualizar la duración del evento');
          }
        }

        if (!result.success) {
          if (result.error === DUPLICATE_NAME_ERROR) {
            isSubmittingRef.current = false;
            setSavingIntent(null);
            setLoading(false);
            setConflictSuggestedName(`${nombreToUse} (V2)`);
            setConflictPublish(publish);
            setShowNameConflictModal(true);
          } else {
            toast.error(result.error || 'Error al actualizar cotización');
          }
          return;
        }

        if (condicionNegociacion && promiseId) {
          const upsertResult = await upsertCondicionNegociacionCotizacion(
            studioSlug,
            cotizacionId!,
            promiseId,
            { name: condicionNegociacion.name, discount_percentage: condicionNegociacion.discount_percentage }
          );
          if (!upsertResult.success) {
            toast.error(upsertResult.error || 'Error al guardar condición especial');
          }
        } else if (cotizacionId) {
          await deleteCondicionNegociacionCotizacion(studioSlug, cotizacionId);
        }

        if (publish) {
          toast.success(visibleToClient ? 'Publicación actualizada' : 'Cotización publicada exitosamente');
          setVisibleToClient(true);
        } else {
          toast.success(visibleToClient ? 'La cotización ahora es privada (borrador)' : 'Cotización guardada como borrador');
          setVisibleToClient(false);
        }

        // Guardar cambios (sin publicar): permanecer en la página de edición
        if (!publish) {
          isSubmittingRef.current = false;
          setSavingIntent(null);
          setLoading(false);
          return;
        }

        if (onAfterSave) {
          isSubmittingRef.current = false;
          setSavingIntent(null);
          setLoading(false);
          onAfterSave();
          return;
        }

        window.dispatchEvent(new CustomEvent('close-overlays'));
        redirectingRef.current = true;
        router.refresh();
        startTransition(() => {
          if (returnPath) {
            router.push(returnPath);
          } else if (redirectOnSuccess && !result.data?.promise_id) {
            router.push(redirectOnSuccess);
          } else if (result.data?.promise_id) {
            const status = result.data.status || 'pendiente';
            if (status === 'negociacion' || status === 'en_cierre' || status === 'contract_generated' || status === 'contract_signed') {
              router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/cierre`);
            } else if (status === 'autorizada' || status === 'aprobada' || status === 'approved') {
              router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/autorizada`);
            } else {
              router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/pendiente`);
            }
          } else if (promiseId) {
            router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
          } else {
            router.back();
          }
        });
        return;
      }

      // Si se especifica crear como revisión, usar esa función
      if (onCreateAsRevision && revisionOriginalId) {
        const revisionResult = await onCreateAsRevision({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          precio: precioFinal,
          items: Object.fromEntries(
            itemsSeleccionados.map(([itemId, cantidad]) => [itemId, cantidad])
          ),
        });

        if (!revisionResult.success) {
          toast.error(revisionResult.error || 'Error al crear revisión');
          return;
        }

        toast.success('Revisión creada exitosamente');

        if (revisionResult.revisionId) {
          return;
        }

        window.dispatchEvent(new CustomEvent('close-overlays'));
        redirectingRef.current = true;
        router.refresh();
        startTransition(() => {
          if (redirectOnSuccess) {
            router.push(redirectOnSuccess);
          } else if (promiseId) {
            router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
          } else {
            router.back();
          }
        });
        return;
      }

      const result = await createCotizacion({
        studio_slug: studioSlug,
        promise_id: promiseId || null,
        contact_id: contactId || null,
        nombre: nombreToUse,
        descripcion: descripcion.trim() || undefined,
        precio: precioFinal,
        precio_calculado: (calculoPrecio.subtotal ?? 0) > 0 ? calculoPrecio.subtotal : undefined,
        visible_to_client: publish,
        items: Object.fromEntries(
          itemsSeleccionados.map(([itemId, cantidad]) => [itemId, cantidad])
        ),
        customItems: customItems,
        event_duration: durationHours && durationHours > 0 ? durationHours : null,
        items_cortesia: Array.from(itemsCortesia),
        bono_especial: Number(bonoEspecial) || 0,
        condiciones_comerciales_id: condicionNegociacion ? null : (selectedCondicionComercialId ?? null),
        condiciones_visibles: Array.from(condicionIdsVisibles),
      });

      if (!result.success) {
        if (result.error === DUPLICATE_NAME_ERROR) {
          isSubmittingRef.current = false;
          setSavingIntent(null);
          setLoading(false);
          setConflictSuggestedName(`${nombreToUse} (V2)`);
          setConflictPublish(publish);
          setShowNameConflictModal(true);
        } else {
          toast.error(result.error || 'Error al crear cotización');
        }
        return;
      }

      if (condicionNegociacion && result.data?.id && result.data?.promise_id) {
        await upsertCondicionNegociacionCotizacion(
          studioSlug,
          result.data.id,
          result.data.promise_id,
          { name: condicionNegociacion.name, discount_percentage: condicionNegociacion.discount_percentage }
        );
      }

      if (publish) {
        toast.success('Cotización publicada exitosamente');
      } else {
        toast.success('Cotización guardada como borrador');
      }

      window.dispatchEvent(new CustomEvent('close-overlays'));
      redirectingRef.current = true;
      router.refresh();
      startTransition(() => {
        // Priorizar redirectOnSuccess solo si no hay promise_id en el resultado
        // Si hay promise_id, usar lógica de estado para redirección
        if (redirectOnSuccess && !result.data?.promise_id) {
          router.push(redirectOnSuccess);
        } else if (result.data?.promise_id) {
          // Redirigir según el estado de la cotización
          const status = result.data.status || 'pendiente';
          if (status === 'negociacion') {
            router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/cierre`);
          } else if (status === 'en_cierre' || status === 'contract_generated' || status === 'contract_signed') {
            router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/cierre`);
          } else if (status === 'autorizada' || status === 'aprobada' || status === 'approved') {
            router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/autorizada`);
          } else {
            // Estado pendiente por defecto
            router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/pendiente`);
          }
        } else if (promiseId) {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
        } else {
          router.back();
        }
      });
      return;
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error(`Error al ${isEditMode ? 'actualizar' : 'crear'} cotización`);
    } finally {
      if (redirectingRef.current) return;
      if (isSubmittingRef.current) {
        isSubmittingRef.current = false;
        setSavingIntent(null);
        setLoading(false);
      }
    }
  };

  // Expandir todas las secciones y categorías al cargar el catálogo (o al filtrar)
  useEffect(() => {
    if (catalogoFiltrado.length > 0) {
      const seccionesConResultados = new Set(catalogoFiltrado.map(seccion => seccion.id));
      setSeccionesExpandidas(seccionesConResultados);

      const categoriasConResultados = new Set<string>();
      catalogoFiltrado.forEach(seccion => {
        seccion.categorias.forEach(categoria => {
          categoriasConResultados.add(categoria.id);
        });
      });
      setCategoriasExpandidas(categoriasConResultados);
    }
  }, [catalogoFiltrado]);

  if (cargandoCatalogo) {
    return (
      <div
        className={
          focusMode
            ? 'grid grid-cols-1 lg:grid-cols-3 gap-2'
            : 'grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6'
        }
      >
        {/* Columna 1: Servicios Disponibles - Skeleton */}
        <div className={focusMode ? 'lg:col-span-2 pl-6 pr-3 py-6' : 'lg:col-span-2'}>
          <div className="mb-4">
            {/* Header skeleton */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-16 bg-zinc-800 rounded-full animate-pulse" />
            </div>
            {/* Input skeleton */}
            <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
          </div>

          {/* Secciones skeleton */}
          <div className="space-y-2">
            {[...Array(3)].map((_, seccionIndex) => (
              <div key={`skeleton-seccion-${seccionIndex}`} className="border border-zinc-700 rounded-lg overflow-hidden">
                {/* Sección header skeleton */}
                <div className="p-4 bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-zinc-700 rounded-full animate-pulse ml-auto" />
                  </div>
                </div>
                {/* Categorías skeleton */}
                <div className="bg-zinc-900/50">
                  {[...Array(2)].map((_, categoriaIndex) => (
                    <div key={`skeleton-categoria-${categoriaIndex}`} className={categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}>
                      <div className="p-3 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 bg-zinc-700 rounded animate-pulse" />
                          <div className="h-4 w-28 bg-zinc-700 rounded animate-pulse" />
                          <div className="h-4 w-20 bg-zinc-700 rounded-full animate-pulse ml-auto" />
                        </div>
                      </div>
                      {/* Servicios skeleton */}
                      <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                        {[...Array(2)].map((_, servicioIndex) => (
                          <div
                            key={`skeleton-servicio-${servicioIndex}`}
                            className={`flex items-center justify-between py-3 px-2 pl-6 ${servicioIndex > 0 ? 'border-t border-zinc-700/30' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse mb-2" />
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
                                <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse" />
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <div className="h-5 w-5 bg-zinc-700 rounded animate-pulse" />
                                <div className="h-5 w-6 bg-zinc-700 rounded animate-pulse" />
                                <div className="h-5 w-5 bg-zinc-700 rounded animate-pulse" />
                              </div>
                              <div className="h-5 w-20 bg-zinc-700 rounded animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 2: Configuración - Skeleton */}
        <div
          className={
            focusMode
              ? 'lg:col-span-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pl-3 pr-6 py-6'
              : 'lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2'
          }
        >
          <div className="space-y-4">
            <div>
              <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse mb-4" />
              {/* Inputs skeleton */}
              <div className="space-y-4">
                <div>
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-20 w-full bg-zinc-800 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>

            {/* Resumen financiero skeleton */}
            <div>
              <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse mb-2" />
                    <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse mb-2" />
                    <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse mb-2" />
                  <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="border-t border-zinc-700 pt-3">
                  <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse mb-3" />
                  <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="border-t border-zinc-700 pt-3">
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-10 flex-1 bg-zinc-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div
      className={
        focusMode
          ? 'grid grid-cols-1 lg:grid-cols-3 gap-2'
          : 'grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6'
      }
    >
      {/* Columna 1: Servicios Disponibles */}
      <div className={focusMode ? 'lg:col-span-2 pl-6 pr-3 py-6' : 'lg:col-span-2'}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Servicios Disponibles
            <ZenBadge variant="secondary">
              {(filtroServicio.trim() ?
                catalogoFiltrado.reduce((acc, seccion) =>
                  acc + seccion.categorias.reduce((catAcc, categoria) =>
                    catAcc + categoria.servicios.length, 0), 0
                ) :
                catalogo.reduce((acc, seccion) =>
                  acc + seccion.categorias.reduce((catAcc, categoria) =>
                    catAcc + categoria.servicios.length, 0), 0
                )
              ) + customItems.length} items
              {filtroServicio.trim() && (
                <span className="ml-1 text-xs text-zinc-400">
                  (filtrados)
                </span>
              )}
            </ZenBadge>
          </h2>

          {/* Filtro de servicios */}
          <div className="mt-3">
            <div className="relative w-full">
              <ZenInput
                placeholder="Buscar por nombre, categoría, sección o tipo..."
                value={filtroServicio}
                onChange={(e) => setFiltroServicio(e.target.value)}
                className="w-full pr-10"
              />
              {filtroServicio && (
                <button
                  type="button"
                  onClick={() => setFiltroServicio('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <CatalogoServiciosTree
          catalogoFiltrado={catalogoFiltrado}
          filtroServicio={filtroServicio}
          seccionesExpandidas={seccionesExpandidas}
          categoriasExpandidas={categoriasExpandidas}
          items={items}
          selectedServices={selectedServices}
          onToggleSeccion={toggleSeccion}
          onToggleCategoria={toggleCategoria}
          onToggleSelection={onToggleSelection}
          onUpdateQuantity={updateQuantity}
          onEditItem={handleEditCatalogItem}
          onCreateCustomItem={handleCreateCustomItem}
          customItems={customItems}
          onEditCustomItem={handleEditCustomItem}
          onDeleteCustomItem={handleDeleteCustomItem}
          onUpdateCustomItemQuantity={handleUpdateCustomItemQuantity}
          onGuardarEnCatalogo={handleGuardarEnCatalogo}
          serviciosSeleccionados={serviciosSeleccionados}
          configuracionPrecios={configuracionPrecios}
          baseHours={durationHours}
          isCourtesyMode={isCourtesyMode}
          itemsCortesia={itemsCortesia}
          onToggleCortesia={toggleCortesia}
        />
      </div>

      {/* Columna 2: Configuración — CommercialConfigSidebar (Fase 3) */}
      <CommercialConfigSidebar
        context="cotizacion"
        title="Configuración"
        accordionValue={accordionValue}
        onAccordionChange={handleAccordionChange}
        focusMode={focusMode}
        onSubmit={(e) => { e.preventDefault(); handleSave(false); }}
        hideActionButtons={hideActionButtons}
        actionButtons={
          customActionButtons ??
          (hideActionButtons ? null : (
            <CommercialConfigActionButtons
              onGuardarComoPaquete={handleGuardarComoPaqueteClick}
              isSavingAsPaquete={isSavingAsPaquete}
              loading={loading}
              isDisabled={isDisabled}
              onRequestPreview={onRequestPreview}
              isEditMode={isEditMode}
              visibleToClient={visibleToClient}
              condicionIdsVisiblesSize={condicionIdsVisibles.size}
              onSaveDraft={() => handleSave(false)}
              onSavePublish={() => handleSave(true)}
              onCancel={handleCancelClick}
              savingIntent={savingIntent}
              saveDisabledTitle={condicionIdsVisibles.size === 0 ? 'Selecciona al menos una condición visible para el cliente' : undefined}
              hideGuardarComoPaquete={hideGuardarComoPaqueteInSidebar}
            />
          ))
        }
        extraContent={isPreAutorizada && condicionComercialPreAutorizada ? (
          <div className="mt-4">
            <ZenCard variant="outlined" className="bg-blue-500/5 border-blue-500/20">
              <ZenCardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-zinc-400">Condición Comercial</h3>
                      <ZenBadge size="sm" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-1.5 py-0.5 rounded-full">Pre autorizada</ZenBadge>
                    </div>
                    <h4 className="text-base font-semibold text-white">{condicionComercialPreAutorizada.name}</h4>
                    {condicionComercialPreAutorizada.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{condicionComercialPreAutorizada.description}</p>
                    )}
                  </div>
                  {(condicionComercialPreAutorizada.advance_type || condicionComercialPreAutorizada.discount_percentage) && (
                    <div className="pt-2 border-t border-zinc-700/50">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {condicionComercialPreAutorizada.advance_type === 'fixed_amount' && condicionComercialPreAutorizada.advance_amount ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500">Anticipo:</span>
                            <span className="font-semibold text-emerald-400">
                              ${condicionComercialPreAutorizada.advance_amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : condicionComercialPreAutorizada.advance_percentage ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500">Anticipo:</span>
                            <span className="font-semibold text-emerald-400">{condicionComercialPreAutorizada.advance_percentage}%</span>
                          </div>
                        ) : null}
                        {condicionComercialPreAutorizada.discount_percentage ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500">Descuento:</span>
                            <span className="font-semibold text-blue-400">{condicionComercialPreAutorizada.discount_percentage}%</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {onAutorizar && !isAlreadyAuthorized && (
                    <div className="pt-2">
                      <ZenButton type="button" variant="primary" size="sm" onClick={onAutorizar} disabled={isAutorizando || loading} loading={isAutorizando} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        Autorizar ahora
                      </ZenButton>
                    </div>
                  )}
                </div>
              </ZenCardContent>
            </ZenCard>
          </div>
        ) : null}
      >
              <AccordionItem value="base" id="cotizacion-form-section-base">
                <AccordionHeader
                  ref={sectionBaseRef}
                  className={cn(
                    'w-full items-center gap-2 border border-zinc-700/50 bg-zinc-800/20',
                    accordionValue.includes('base') ? 'rounded-t-lg border-b border-zinc-700/50' : 'rounded-lg'
                  )}
                >
                  <AccordionTrigger
                    className="min-w-0 data-[state=open]:rounded-t-lg data-[state=closed]:flex-col data-[state=closed]:items-stretch data-[state=closed]:gap-0.5"
                    onClick={() => accordionValue.includes('base') && requestAnimationFrame(() => sectionBaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))}
                  >
                    <div className="flex items-center gap-2 min-w-0 w-full">
                      {accordionValue.includes('base') ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <span>Información base</span>
                    </div>
                    {!accordionValue.includes('base') && (
                      <span className="text-sm text-emerald-400 normal-case font-medium pl-5 truncate w-full block leading-tight text-left">
                        {[nombre?.trim() || 'Sin nombre', durationHours != null ? ` · ${durationHours} h` : ''].filter(Boolean).join('') || 'Nombre y duración'}
                      </span>
                    )}
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <div className="rounded-b-lg border border-t-0 border-zinc-700/50 overflow-hidden transition-all duration-200 ease-out bg-zinc-900/30 p-3">
                    <ZenInput
                      label="Nombre de la Cotización"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Cotización Boda Premium"
                      required
                      className="mb-4"
                    />
                    <ZenTextarea
                      label="Descripción (opcional)"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Describe los servicios incluidos..."
                      className="min-h-[80px]"
                    />
                    <ZenInput
                      label="Horas de servicio"
                      type="number"
                      min="0"
                      step="0.5"
                      value={durationHours !== null ? durationHours.toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setDurationHours(null);
                        } else {
                          const numValue = Number(value);
                          setDurationHours(numValue > 0 ? numValue : null);
                        }
                      }}
                      placeholder="Ej: 8"
                      hint="Estas horas corresponden a la duración definida en la promesa. Puedes modificarlas para esta cotización sin afectar la duración original del evento."
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

          {/* Cálculo Financiero — 3 columnas (homologado con Negociación) */}
          <div className="z-10">

            {/* 1. Precio calculado — compacto, abre Sheet de construcción de precio */}
            <div className="mb-3">
              <Sheet>
                <SheetTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).click();
                      }
                    }}
                    className="cursor-pointer rounded-lg border-2 border-emerald-500/70 bg-emerald-950/50 px-3 py-2.5 transition-colors hover:border-emerald-400/80 hover:bg-emerald-950/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 w-full flex items-center gap-3"
                  >
                    <ListChecks className="h-4 w-4 shrink-0 text-emerald-400/80" />
                    <span className="text-sm text-zinc-500 shrink-0">Precio calculado</span>
                    <span className="text-base font-semibold text-white tabular-nums truncate text-right min-w-0 flex-1">{formatearMoneda(calculoPrecio.subtotal)}</span>
                  </div>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex flex-col w-full max-w-md bg-zinc-900 border-zinc-800 shadow-xl"
                >
                  <SheetHeader className="border-b border-zinc-800/50 pb-4">
                    <SheetTitle className="text-left text-white">
                      Construcción de precio
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    <p className="text-xs text-zinc-500">
                      <span className="font-medium text-zinc-400">¿Cómo se calcula?</span>
                      <br />
                      <span className="mt-1 inline-block">
                        Utilidad neta = Precio a cobrar − (Costos + Gastos + Comisión). La comisión se calcula sobre el precio que se va a cobrar (personalizado o calculado).
                      </span>
                    </p>
                    {configuracionPrecios && itemsParaDesglose.length > 0 && (
                      <PrecioDesglosePaquete
                        items={itemsParaDesglose}
                        configuracion={configuracionPrecios}
                        precioPersonalizado={precioPersonalizado === '' ? undefined : Number(precioPersonalizado) || undefined}
                        showCard={false}
                      />
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <AjustesNegociacionAccordion
              accordionValue={accordionValue}
              isCourtesyMode={isCourtesyMode}
              setIsCourtesyMode={setIsCourtesyMode}
              bonoEspecial={bonoEspecial}
              setBonoEspecial={setBonoEspecial}
              itemsCortesiaSize={itemsCortesia.size}
              montoCortesias={calculoPrecio.montoCortesias ?? 0}
              subtotalProyectado={calculoPrecio.subtotalProyectado ?? calculoPrecio.subtotal ?? 0}
              setPrecioPersonalizado={(v) => setPrecioPersonalizado(v === '' ? '' : v)}
              setAccordionValue={setAccordionValue}
              onConfirmClearCortesias={(mode) => {
                userHasChangedServicesOrAjustesRef.current = true;
                setItemsCortesia(new Set());
                if (mode === 'all') setBonoEspecial(0);
              }}
              showRestaurar={esNegociacionModificada}
              onRestaurar={() => {
                const ini = negociacionInicialRef.current;
                if (!ini) return;
                setBonoEspecial(ini.bono);
                setItemsCortesia(new Set(ini.itemsCortesia));
                userHasChangedServicesOrAjustesRef.current = true;
                setPendingSyncFromAjustes(true);
                toast.success('Ajustes restaurados a la versión guardada');
              }}
              sectionRef={sectionNegociacionRef}
              onScrollIntoView={() => accordionValue.includes('negociacion') && requestAnimationFrame(() => sectionNegociacionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))}
              onBonoFocus={() => { bonoOnFocusRef.current = bonoEspecial; }}
              onBonoBlur={() => {
                const tieneAjustes = itemsCortesia.size > 0 || bonoEspecial > 0 || bonoOnFocusRef.current > 0;
                if (tieneAjustes && bonoEspecial !== bonoOnFocusRef.current) triggerShake();
              }}
            />

            {/* Precio Final de Cierre — editable libre; placeholder = sugerido; onBlur formatea a 2 decimales */}
            <div className="mb-4">
              <label className="text-xs text-zinc-500 mb-1 block">Precio Final de Cierre</label>
              {isInitializing ? (
                <div className="h-10 rounded-lg bg-zinc-800/40 animate-pulse flex items-center justify-center">
                  <span className="text-xs text-zinc-500">Cargando...</span>
                </div>
              ) : (
                <ZenInput
                  type="number"
                  step="0.01"
                  value={precioPersonalizado}
                  onChange={(e) => {
                    setRingPrecioSincronizadoVisible(false);
                    const value = e.target.value;
                    if (value === '') {
                      setPrecioPersonalizado('');
                      return;
                    }
                    const numValue = parseFloat(value);
                    if (!Number.isNaN(numValue) && numValue < 0) return;
                    setPrecioPersonalizado(value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value === '') return;
                    const numValue = parseFloat(value);
                    if (Number.isNaN(numValue) || numValue < 0) {
                      setPrecioPersonalizado('');
                      return;
                    }
                    setPrecioPersonalizado(Number(numValue.toFixed(2)));
                  }}
                  placeholder={String(calculoPrecio.subtotalProyectado ?? calculoPrecio.subtotal ?? 0)}
                  className={cn(
                    'mt-0 rounded-lg border-zinc-700/50 bg-zinc-800/20 focus:bg-zinc-800/40',
                    ringPrecioSincronizadoVisible && 'ring-2 ring-amber-500 animate-sugerido-shake'
                  )}
                />
              )}
              {!isInitializing && (showPrecioSincronizadoBadge || ringPrecioSincronizadoVisible) && (
                <p className="text-[11px] text-amber-500 mt-1.5 mb-0.5">Precio actualizado por cambios en servicios o negociación.</p>
              )}
              <p className="text-[11px] text-zinc-500">Este es el monto real que se le cobrará al prospecto.</p>
            </div>

            <CondicionesCierreAccordion
              context="cotizacion"
              accordionValue={accordionValue}
              condicionesComerciales={condicionesComerciales}
              condicionIdsVisibles={condicionIdsVisibles}
              setCondicionIdsVisibles={setCondicionIdsVisibles}
              condicionSimulacionId={condicionSimulacionId}
              setCondicionSimulacionId={setCondicionSimulacionId}
              condicionNegociacion={condicionNegociacion}
              calculoPrecio={{
                totalCosto: calculoPrecio.totalCosto ?? 0,
                totalGasto: calculoPrecio.totalGasto ?? 0,
                subtotalProyectado: calculoPrecio.subtotalProyectado ?? 0,
                montoDescuentoCondicion: calculoPrecio.montoDescuentoCondicion ?? 0,
              }}
              configuracionPrecios={configuracionPrecios}
              precioPersonalizado={precioPersonalizado}
              tieneAjustesNegociacion={tieneAjustesNegociacion}
              onAuditoriaClick={() => setAuditoriaRentabilidadOpen(true)}
              onGestionarCondiciones={() => { setEditingCondicionId(null); setCreateCondicionEspecialMode(false); setShowCondicionesManager(true); }}
              onCreateCondicionEspecial={() => { setCreateCondicionEspecialMode(true); setEditingCondicionId(null); setShowCondicionesManager(true); }}
              onEditCondicion={(condId) => { setCreateCondicionEspecialMode(false); setEditingCondicionId(condId); setShowCondicionesManager(true); }}
              sectionRef={sectionCondicionesRef}
              onScrollIntoView={() => accordionValue.includes('condiciones') && requestAnimationFrame(() => sectionCondicionesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))}
              selectedCondicionComercialId={selectedCondicionComercialId}
            />
            </div>
      </CommercialConfigSidebar>

            {/* Modal compartido: crear o editar condiciones comerciales (igual que en negociación) */}
            <CondicionesComercialesManager
              studioSlug={studioSlug}
              isOpen={showCondicionesManager || !!editingCondicionId}
              onClose={() => {
                setShowCondicionesManager(false);
                setEditingCondicionId(null);
                setCreateCondicionEspecialMode(false);
              }}
              onRefresh={loadCondicionesComerciales}
              onSelect={createCondicionEspecialMode ? (id) => {
                setSelectedCondicionComercialId(id);
                setCondicionNegociacion(null);
                setShowCondicionesManager(false);
                setCreateCondicionEspecialMode(false);
                loadCondicionesComerciales();
                toast.success('Condición especial creada y seleccionada');
              } : undefined}
              initialMode={createCondicionEspecialMode ? 'create' : undefined}
              initialEditingId={editingCondicionId ?? undefined}
              defaultIsPublic={createCondicionEspecialMode ? false : true}
              customTitle={createCondicionEspecialMode ? 'Condición comercial especial' : undefined}
              originContext={createCondicionEspecialMode ? 'negotiation' : undefined}
            />

            {/* 6. Utilidad proyectada — tarjeta minimalista + Sheet; CFO: con simulación usa TotalRecibir */}
            {(() => {
              const comisionRatio = configuracionPrecios
                ? (configuracionPrecios.comision_venta > 1 ? configuracionPrecios.comision_venta / 100 : configuracionPrecios.comision_venta)
                : 0.05;
              const totalCosto = calculoPrecio.totalCosto ?? 0;
              const totalGasto = calculoPrecio.totalGasto ?? 0;
              const precioCierreBase = precioPersonalizado !== '' && Number(precioPersonalizado) >= 0 ? Number(precioPersonalizado) : (calculoPrecio.subtotalProyectado ?? 0) - (calculoPrecio.montoDescuentoCondicion ?? 0);
              const condSim = condicionSimulacionId
                ? (condicionesComerciales.find(c => c.id === condicionSimulacionId) ?? (condicionNegociacion?.id === condicionSimulacionId ? condicionNegociacion : null))
                : null;
              const totalRecibirSim = condSim
                ? Math.max(0, precioCierreBase - (precioCierreBase * ((condSim as { discount_percentage?: number | null }).discount_percentage ?? 0)) / 100)
                : null;
              const utilidadProyectada = totalRecibirSim != null
                ? totalRecibirSim - totalCosto - totalGasto - totalRecibirSim * comisionRatio
                : calculoPrecio.utilidadNeta;
              const utilidadOriginal = calculoPrecio.utilidadSinDescuento;
              const perdidaMonto = utilidadOriginal - utilidadProyectada;
              const ingresoParaMargen = totalRecibirSim ?? (calculoPrecio.total ?? 0);
              const margenCierre = ingresoParaMargen > 0 ? (utilidadProyectada / ingresoParaMargen) * 100 : calculoPrecio.margenPorcentaje;
              const pctComision = (comisionRatio * 100).toFixed(0);
              const saludColor = margenCierre < 15 ? 'destructive' : margenCierre < 25 ? 'amber' : 'emerald';
              const barWidth = Math.min(100, Math.max(0, margenCierre));
              const tieneAjusteManual = Math.abs((calculoPrecio.total ?? 0) - (calculoPrecio.subtotalProyectado ?? 0)) > 0.005;
              const diferenciaCierre = (calculoPrecio.total ?? 0) - (calculoPrecio.subtotalProyectado ?? 0);
              const ingresoSugeridoConCondicion = (calculoPrecio.subtotalProyectado ?? 0) - (calculoPrecio.montoDescuentoCondicion ?? 0);
              const comisionSugerido = ingresoSugeridoConCondicion * comisionRatio;
              const comisionActual = (calculoPrecio.total ?? 0) * comisionRatio;
              const ahorroGastoComision = comisionActual - comisionSugerido;
              const metaServicio = configuracionPrecios
                ? (configuracionPrecios.utilidad_servicio > 1 ? configuracionPrecios.utilidad_servicio / 100 : configuracionPrecios.utilidad_servicio)
                : 0.4;
              const metaProducto = configuracionPrecios
                ? (configuracionPrecios.utilidad_producto > 1 ? configuracionPrecios.utilidad_producto / 100 : configuracionPrecios.utilidad_producto)
                : 0.15;
              const totalVentaServicios = configuracionPrecios && itemsParaDesglose.length > 0
                ? itemsParaDesglose
                    .filter((i) => (i.tipo_utilidad ?? 'service') === 'service')
                    .reduce((sum, i) => {
                      const q = i.cantidadEfectiva ?? i.cantidad;
                      const r = calcularPrecio(i.costo || 0, i.gasto || 0, 'servicio', configuracionPrecios);
                      return sum + r.precio_final * q;
                    }, 0)
                : 0;
              const totalVentaProductos = configuracionPrecios && itemsParaDesglose.length > 0
                ? itemsParaDesglose
                    .filter((i) => (i.tipo_utilidad ?? 'service') === 'product')
                    .reduce((sum, i) => {
                      const q = i.cantidadEfectiva ?? i.cantidad;
                      const r = calcularPrecio(i.costo || 0, i.gasto || 0, 'producto', configuracionPrecios);
                      return sum + r.precio_final * q;
                    }, 0)
                : 0;
              const precioParaMix = calculoPrecio.total && calculoPrecio.total > 0 ? calculoPrecio.total : calculoPrecio.subtotalProyectado ?? 0;
              const margenObjetivoPct = precioParaMix > 0
                ? ((totalVentaServicios * metaServicio) + (totalVentaProductos * metaProducto)) / precioParaMix * 100
                : 0;
              const ratioAlObjetivo = margenObjetivoPct > 0 ? margenCierre / margenObjetivoPct : 1;
              const explicacionSalud = ratioAlObjetivo >= 0.9 ? 'Estás al 90% o más de tu meta de margen para este mix.' : ratioAlObjetivo >= 0.7 ? 'Estás entre 70% y 89% de tu meta; margen aceptable pero mejorable.' : 'El margen está por debajo del 70% de la meta para este mix de ítems.';

              return (
                <AuditoriaRentabilidadSheet
                  open={auditoriaRentabilidadOpen}
                  onOpenChange={setAuditoriaRentabilidadOpen}
                  title="Auditoría de Rentabilidad"
                  total={calculoPrecio.total ?? 0}
                  totalCosto={totalCosto}
                  totalGasto={totalGasto}
                  utilidadNeta={utilidadProyectada}
                >
                  {/* Escenario del sistema */}
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Escenario del sistema</h3>
                    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/10 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Ingreso sugerido</span>
                        <span className="tabular-nums text-zinc-200">{formatearMoneda(calculoPrecio.subtotalProyectado ?? 0)}</span>
                      </div>
                      {(calculoPrecio.montoDescuentoCondicion ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">(−) Descuento por Condición Comercial</span>
                          <span className="tabular-nums text-zinc-400">-{formatearMoneda(calculoPrecio.montoDescuentoCondicion ?? 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-zinc-500">(−) Costos de producción</span>
                        <span className="tabular-nums text-zinc-400">-{formatearMoneda(calculoPrecio.totalCosto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">(−) Gastos</span>
                        <span className="tabular-nums text-zinc-400">-{formatearMoneda(calculoPrecio.totalGasto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">(−) Comisión ({pctComision}%)</span>
                        <span className="tabular-nums text-zinc-400">-{formatearMoneda(comisionSugerido)}</span>
                      </div>
                      <Separator className="bg-zinc-700/50 my-1.5" />
                      <div className="flex justify-between font-medium">
                        <span className="text-zinc-300">Utilidad sugerida</span>
                        <span className="tabular-nums text-emerald-500/90">
                          {formatearMoneda(
                            (ingresoSugeridoConCondicion > 0 && (calculoPrecio.utilidadSinDescuento ?? 0) === 0)
                              ? Math.max(0, ingresoSugeridoConCondicion - totalCosto - totalGasto - comisionSugerido)
                              : (calculoPrecio.utilidadSinDescuento ?? 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {condicionIdsVisibles.size > 0 && (
                    <div>
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Comparativa de cierre</h3>
                      <div className="space-y-3">
                        {Array.from(condicionIdsVisibles).map((id) => {
                          const c = condicionesComerciales.find((x) => x.id === id) ?? (condicionNegociacion?.id === id ? condicionNegociacion : null);
                          if (!c) return null;
                          const pct = (c as { discount_percentage?: number | null }).discount_percentage ?? 0;
                          const descuentoMonto = (precioCierreBase * pct) / 100;
                          const ingreso = Math.max(0, precioCierreBase - descuentoMonto);
                          const comisionEsc = ingreso * comisionRatio;
                          const utilidadNetaReal = ingreso - totalCosto - totalGasto - comisionEsc;
                          const nombre = (c as { name?: string }).name ?? 'Condición';
                          const esSimulando = id === condicionSimulacionId;
                          return (
                            <div
                              key={id}
                              className={cn(
                                'rounded-lg border p-3 space-y-1.5 text-sm',
                                esSimulando ? 'border-amber-500/40 bg-zinc-800/10 ring-1 ring-amber-500/30' : 'border-zinc-700/50 bg-zinc-800/10'
                              )}
                            >
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Escenario: {nombre}
                                {esSimulando && <span className="ml-1.5 text-amber-400/90">(SIMULANDO)</span>}
                              </h4>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Ingreso (Precio cierre − Descuento)</span>
                                <span className="tabular-nums text-zinc-200">{formatearMoneda(ingreso)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">(−) Costos</span>
                                <span className="tabular-nums text-zinc-400">-{formatearMoneda(totalCosto)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">(−) Gastos</span>
                                <span className="tabular-nums text-zinc-400">-{formatearMoneda(totalGasto)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">(−) Comisión ({pctComision}%)</span>
                                <span className="tabular-nums text-zinc-400">-{formatearMoneda(comisionEsc)}</span>
                              </div>
                              <Separator className="bg-zinc-700/50 my-1.5" />
                              <div className="flex justify-between font-medium">
                                <span className="text-zinc-300">Utilidad neta real</span>
                                <span className={cn(
                                  'tabular-nums',
                                  utilidadNetaReal >= 0 && (utilidadNetaReal / (ingreso || 1)) * 100 >= 25 ? 'text-emerald-400' : utilidadNetaReal >= 0 ? 'text-amber-400' : 'text-destructive'
                                )}>
                                  {formatearMoneda(utilidadNetaReal)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Salud financiera</h3>
                    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/10 p-3 space-y-2 text-sm">
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Meta de margen ponderada según tu mix de productos y servicios: <strong className="text-zinc-300">{margenObjetivoPct.toFixed(1)}%</strong>. (Servicios {(metaServicio * 100).toFixed(0)}%, productos {(metaProducto * 100).toFixed(0)}%.)
                      </p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        {condicionSimulacionId ? (
                          <>Tu margen con la simulación activa es <strong className="text-zinc-200">{margenCierre.toFixed(1)}%</strong>. {explicacionSalud} Por eso el indicador aparece en{' '}</>
                        ) : (
                          <>Tu margen de cierre es <strong className="text-zinc-200">{margenCierre.toFixed(1)}%</strong>. {explicacionSalud} Por eso el indicador aparece en{' '}</>
                        )}
                        <span className={cn(saludColor === 'destructive' && 'text-destructive', saludColor === 'amber' && 'text-amber-400', saludColor === 'emerald' && 'text-emerald-400')}>
                          {saludColor === 'destructive' ? 'rojo' : saludColor === 'amber' ? 'ámbar' : 'verde'}
                        </span>.
                      </p>
                    </div>
                  </div>
                </AuditoriaRentabilidadSheet>
              );
            })()}

      {/* Modal de resolución de nombre duplicado (Fase 11.2) */}
      <Dialog open={showNameConflictModal} onOpenChange={(open) => { setShowNameConflictModal(open); if (!open) setConflictSuggestedName(''); }}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Nombre duplicado</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Ya existe una cotización con este nombre en esta promesa. Elige otro nombre para guardar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <ZenInput
              label="Nombre de la cotización"
              value={conflictSuggestedName}
              onChange={(e) => setConflictSuggestedName(e.target.value)}
              placeholder="Ej. Cotización Boda (V2)"
              className="bg-zinc-800 border-zinc-600"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <ZenButton variant="secondary" onClick={() => { setShowNameConflictModal(false); setConflictSuggestedName(''); }} className="flex-1">
              Cancelar
            </ZenButton>
            <ZenButton
              variant="primary"
              onClick={() => {
                const name = conflictSuggestedName.trim();
                if (!name) {
                  toast.error('El nombre no puede estar vacío');
                  return;
                }
                setShowNameConflictModal(false);
                setNombre(name);
                setConflictSuggestedName('');
                handleSave(conflictPublish, name);
              }}
              disabled={loading}
              className="flex-1"
            >
              Confirmar y Guardar
            </ZenButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: configuración del paquete (Fase 8.5) */}
      <Dialog 
        open={showPaqueteModal}
        modal={true}
      >
        <DialogContent 
          className="sm:max-w-lg bg-zinc-900 border-zinc-700 p-0 gap-0 max-h-[90vh] flex flex-col"
          onEscapeKeyDown={(e) => {
            if (!isSavingAsPaquete) {
              setShowPaqueteModal(false);
            } else {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            // Prevenir cierre al hacer clic fuera del modal
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            // Prevenir cierre al interactuar fuera del modal
            e.preventDefault();
          }}
        >
          {/* Botón de cierre X - fuera del header para evitar conflictos */}
          <button
            type="button"
            onClick={() => {
              if (!isSavingAsPaquete) {
                setShowPaqueteModal(false);
              }
            }}
            disabled={isSavingAsPaquete}
            className="absolute top-4 right-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-30"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>

          {/* Header fijo */}
          <DialogHeader className="shrink-0 bg-zinc-900 border-b border-zinc-800 px-6 pt-6 pb-4">
            <DialogTitle className="text-white flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-emerald-400" />
              Crear paquete desde cotización
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configura los metadatos del paquete antes de crearlo
            </DialogDescription>
          </DialogHeader>

          {/* Contenido scrollable con bloques lógicos */}
          <div className="overflow-y-auto px-6 py-6 space-y-6">
            {/* BLOQUE 1: Información Base */}
            <div className="space-y-4">
              {/* Nombre del paquete */}
              <div className="space-y-1.5">
                <ZenLabel htmlFor="paquete-nombre" className="block text-zinc-300">
                  Nombre del paquete
                  {paqueteEventTypeName && (
                    <span className="ml-2 text-xs text-emerald-400 font-normal">
                      Categoría {paqueteEventTypeName}
                    </span>
                  )}
                </ZenLabel>
                <ZenInput
                  id="paquete-nombre"
                  value={paqueteNombre}
                  onChange={(e) => {
                    setPaqueteNombre(e.target.value);
                    setPaqueteNombreError(null);
                  }}
                  placeholder="Ej: Paquete Boda Premium"
                  className="w-full"
                />
                {paqueteNombreError && (
                  <p className="text-xs text-red-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {paqueteNombreError}
                  </p>
                )}
              </div>

              {/* Descripción del paquete */}
              <div className="space-y-1.5">
                <ZenLabel htmlFor="paquete-descripcion" className="block text-zinc-300">
                  Descripción <span className="text-zinc-500 font-normal">(opcional)</span>
                </ZenLabel>
                <ZenTextarea
                  id="paquete-descripcion"
                  value={paqueteDescripcion}
                  onChange={(e) => setPaqueteDescripcion(e.target.value)}
                  placeholder="Describe el paquete..."
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>

            {/* BLOQUE 2: Carátula */}
            <div className="space-y-1.5">
              <ZenLabel className="block text-zinc-300">
                Carátula <span className="text-zinc-500 font-normal text-xs">(opcional - puedes agregarla ahora o editarla después)</span>
              </ZenLabel>
              <PaqueteCoverDropzone
                media={paqueteCoverMedia}
                onDropFiles={handlePaqueteCoverUpload}
                onRemoveMedia={handlePaqueteCoverRemove}
                isUploading={isPaqueteCoverUploading}
              />
            </div>

            {/* BLOQUE 3: Resumen Financiero */}
            <div className="space-y-1.5">
              <ZenLabel className="block text-zinc-300">
                Precio de tu paquete <span className="text-zinc-500 font-normal text-xs">(precio basado en tu cotización)</span>
              </ZenLabel>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <div className="grid grid-cols-2 gap-4">
                  {/* Columna 1: Precio */}
                  <div className="flex flex-col">
                    <p className="text-xs text-zinc-400 mb-1">Precio</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatearMoneda(
                        Math.round(
                          precioPersonalizado !== '' && Number(precioPersonalizado) > 0
                            ? Number(precioPersonalizado)
                            : calculoPrecio.total
                        )
                      )}
                    </p>
                  </div>
                  
                  {/* Columna 2: Negociaciones */}
                  <div className="flex flex-col space-y-1.5 pl-4 border-l border-zinc-700/50">
                    <p className="text-xs text-zinc-400 mb-0.5">Negociación con</p>
                    {itemsCortesia.size > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs text-zinc-400">
                            {itemsCortesia.size} {itemsCortesia.size === 1 ? 'cortesía' : 'cortesías'}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-emerald-400">
                          -{formatearMoneda(calculoPrecio.montoCortesias)}
                        </span>
                      </div>
                    )}
                    {bonoEspecial > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs text-zinc-400">Bono</span>
                        </div>
                        <span className="text-xs font-medium text-amber-400">
                          -{formatearMoneda(bonoEspecial)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUE 4: Configuración Final */}
            <div className="space-y-4">
              {/* Horas de cobertura */}
              <div className="space-y-1.5">
                <ZenLabel htmlFor="paquete-horas" className="block text-zinc-300">
                  Horas de cobertura
                </ZenLabel>
                <ZenInput
                  id="paquete-horas"
                  type="number"
                  min="0"
                  step="0.5"
                  value={paqueteHoras ?? ''}
                  onChange={(e) => setPaqueteHoras(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Ej: 8"
                  className="w-full"
                />
              </div>

              {/* Visibilidad */}
              <div className="space-y-1.5">
                <ZenLabel className="block text-zinc-300">Visibilidad del paquete</ZenLabel>
                <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                  <div className="flex items-center gap-3">
                    {paqueteVisibility === 'public' ? (
                      <Globe className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-zinc-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">
                        {paqueteVisibility === 'public' ? 'Público' : 'Privado'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {paqueteVisibility === 'public' 
                          ? 'Visible en tu perfil público'
                          : 'Solo visible internamente'
                        }
                      </p>
                    </div>
                  </div>
                  <ZenSwitch
                    checked={paqueteVisibility === 'public'}
                    onCheckedChange={(checked) => setPaqueteVisibility(checked ? 'public' : 'private')}
                  />
                </div>
              </div>
            </div>

            {/* BLOQUE 5: Advertencia de ítems personalizados */}
            {customItems.length > 0 && (
              <div className="space-y-2">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-200 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      💡 Se detectaron <strong>{customItems.length} ítem(s) personalizado(s)</strong> que se guardarán automáticamente en tu catálogo global para poder crear este paquete.
                    </span>
                  </p>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-zinc-800/30 rounded-lg p-2">
                  {customItems.map((ci, idx) => {
                    const seccion = catalogoFiltrado.find(s => s.categorias?.some(c => c.id === ci.categoriaId));
                    const categoria = seccion?.categorias?.find(c => c.id === ci.categoriaId);
                    const seccionNombre = seccion?.nombre ?? '—';
                    const categoriaNombre = categoria?.nombre ?? '—';
                    return (
                      <div key={idx} className="text-xs text-zinc-300 py-1 border-b border-zinc-700/30 last:border-0">
                        <span className="text-zinc-500">{seccionNombre}</span>
                        <span className="text-zinc-500 mx-1">›</span>
                        <span className="text-zinc-400">{categoriaNombre}</span>
                        <span className="text-zinc-500 mx-1">›</span>
                        <span className="text-white">{ci.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer fijo */}
          <DialogFooter className="shrink-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex flex-row gap-2 sm:flex-row">
            <ZenButton 
              variant="secondary" 
              onClick={() => {
                if (!isSavingAsPaquete) {
                  setShowPaqueteModal(false);
                }
              }} 
              disabled={isSavingAsPaquete}
              className="flex-1"
            >
              Cancelar
            </ZenButton>
            <ZenButton 
              variant="primary" 
              onClick={runGuardarComoPaquete} 
              disabled={isSavingAsPaquete || !paqueteNombre.trim()} 
              loading={isSavingAsPaquete} 
              className="flex-1"
            >
              {customItems.length > 0 ? 'Guardar y crear paquete' : 'Crear paquete'}
            </ZenButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Zen: duración distinta a la promesa — selección + botón Guardar */}
      <Dialog open={showDurationScopeModal} onOpenChange={(open) => { if (!open) { setShowDurationScopeModal(false); setPromiseDurationForModal(null); setSelectedDurationScope(null); } }}>
        <DialogContent
          className="sm:max-w-md bg-zinc-950/95 border-zinc-800 shadow-2xl"
          overlayClassName="bg-zinc-950/50 backdrop-blur-sm"
        >
          <DialogHeader>
            <DialogTitle className="text-white font-semibold">¿Cómo aplicar la duración?</DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Has ajustado esta cotización a <span className="text-amber-400 font-medium">{durationHours ?? 0} h</span>, pero el tiempo base del evento es de <span className="text-amber-400 font-medium">{promiseDurationForModal ?? 0} h</span>. ¿Cómo deseas proceder?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <button
              type="button"
              onClick={() => setSelectedDurationScope('local')}
              disabled={loading}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-colors text-left focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 cursor-pointer ${selectedDurationScope === 'local' ? 'border-amber-500/50 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'}`}
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Clock className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-white block">Solo para esta cotización ({durationHours ?? 0} h)</span>
                <span className="text-sm text-zinc-400 mt-0.5 block">Conservar los datos originales del evento ({promiseDurationForModal ?? 0} h) y aplicar el cambio solo a este presupuesto.</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDurationScope('global')}
              disabled={loading}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-colors text-left focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 cursor-pointer ${selectedDurationScope === 'global' ? 'border-amber-500/50 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'}`}
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Globe className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-white block">Actualizar duración global ({promiseDurationForModal ?? 0} h → {durationHours ?? 0} h)</span>
                <span className="text-sm text-zinc-400 mt-0.5 block">Sincronizar el tiempo base del evento. Esto afectará el cálculo automático de otros paquetes y la visualización general.</span>
              </div>
            </button>
          </div>
          {/* Footer de acciones: Cancelar (izq) y Guardar (der) */}
          <div className="mt-8 flex justify-between items-center gap-4">
            <ZenButton
              variant="ghost"
              onClick={() => { setShowDurationScopeModal(false); setPromiseDurationForModal(null); setSelectedDurationScope(null); }}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              Cancelar
            </ZenButton>
            {selectedDurationScope ? (
              <ZenButton
                onClick={() => {
                  if (!selectedDurationScope) return;
                  setShowDurationScopeModal(false);
                  setPromiseDurationForModal(null);
                  setSelectedDurationScope(null);
                  handleSave(pendingSavePublish, pendingSaveNombreOverride, { skipDurationScopeCheck: true, scope: selectedDurationScope });
                }}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </ZenButton>
            ) : (
              <div />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de cierre */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              ¿Estás seguro de cerrar?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Se perderán todos los cambios realizados. Los items seleccionados y la configuración de la cotización no se guardarán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <ZenButton
              variant="secondary"
              onClick={handleCancelClose}
              className="flex-1"
            >
              Continuar editando
            </ZenButton>
            <ZenButton
              variant="destructive"
              onClick={handleConfirmClose}
              className="flex-1"
            >
              Sí, cerrar
            </ZenButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edición/creación de item personalizado */}
      {isItemModalOpen && (
        <ItemEditorModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setItemToEdit(null);
            setSelectedCategoriaForItem(null);
          }}
          onSave={handleSaveCustomItem}
          item={itemToEdit || undefined}
          studioSlug={studioSlug}
          categoriaId={selectedCategoriaForItem ?? ''}
          preciosConfig={configuracionPrecios ?? undefined}
          showOverlay={true}
          context="cotizaciones"
        />
      )}
    </div>
    </>
  );
}
