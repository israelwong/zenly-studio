'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle, Plus, Pencil, Trash2, ListChecks, Gift, Info, Settings } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge, ZenCard, ZenCardContent, ZenSwitch, ZenConfirmModal } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/shadcn/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible';
import { Separator } from '@/components/ui/shadcn/separator';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios, type ResultadoPrecio } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { obtenerPaquetePorId } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { createCotizacion, updateCotizacion, getCotizacionById, getPromiseDurationHours, upsertCondicionNegociacionCotizacion, deleteCondicionNegociacionCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getServiceLinks, type ServiceLinksMap } from '@/lib/actions/studio/config/item-links.actions';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';
import { logAuditoriaCotizacion } from '@/lib/utils/audit-precios-logger';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import { CatalogoServiciosTree } from '@/components/shared/catalogo';
import { ItemEditorModal, type ItemFormData, type ItemEditorContext } from '@/components/shared/catalogo/ItemEditorModal';
import { crearItem, actualizarItem } from '@/lib/actions/studio/catalogo';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { CustomItemData } from '@/lib/actions/schemas/cotizaciones-schemas';
import { cn } from '@/lib/utils';
import { usePromiseFocusMode } from '../[promiseId]/context/PromiseFocusModeContext';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';

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
  onCreateAsRevision,
  revisionOriginalId,
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
  const [ajustesNegociacionOpen, setAjustesNegociacionOpen] = useState(true);
  const [condicionesCierreOpen, setCondicionesCierreOpen] = useState(true);
  const [confirmClearCortesiasOpen, setConfirmClearCortesiasOpen] = useState(false);
  const [confirmClearDiscountMode, setConfirmClearDiscountMode] = useState<'cortesias' | 'all'>('cortesias');
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
  const isFirstMountAjustesSyncRef = useRef(true);
  const triggerShake = useCallback(() => {
    setFlashSugerido(true);
    const t = setTimeout(() => setFlashSugerido(false), 500);
    return () => clearTimeout(t);
  }, []);
  const bonoOnFocusRef = useRef<number>(0);

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
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [serviceLinksMap, setServiceLinksMap] = useState<ServiceLinksMap>({});
  
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
          setPrecioPersonalizado(cotizacionData.price);
          setVisibleToClient((cotizacionData as { visible_to_client?: boolean }).visible_to_client ?? false);
          setItemsCortesia(new Set(cotizacionData.items_cortesia ?? []));
          setBonoEspecial(Number(cotizacionData.bono_especial) || 0);
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

          // Cargar event_duration de la cotización si existe
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
              item_id: string | null; 
              quantity: number;
              name?: string | null;
              description?: string | null;
              unit_price?: number;
              cost?: number | null;
              expense?: number | null;
              billing_type?: string | null;
              categoria_id?: string | null;
              original_item_id?: string | null; // ID del item original que reemplaza
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
                  tipoUtilidad: 'servicio', // Default, se puede inferir de otros campos si es necesario
                  categoriaId: categoriaId,
                  originalItemId: item.original_item_id || null, // Cargar originalItemId desde DB
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
        // Asegurar que el estado de carga se actualice incluso en caso de error
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

  // Fase 7.2: sincronizar Precio Final de Cierre con Precio Sugerido cuando cambian cortesías o bono
  useEffect(() => {
    if (isFirstMountAjustesSyncRef.current) {
      isFirstMountAjustesSyncRef.current = false;
      return;
    }
    setPendingSyncFromAjustes(true);
    setShowPrecioSincronizadoBadge(true);
    const tBadge = setTimeout(() => setShowPrecioSincronizadoBadge(false), 4000);
    const tPending = setTimeout(() => setPendingSyncFromAjustes(false), 200);
    return () => {
      clearTimeout(tBadge);
      clearTimeout(tPending);
    };
  }, [itemsCortesia.size, Array.from(itemsCortesia).sort().join(','), bonoEspecial]);

  useEffect(() => {
    if (!pendingSyncFromAjustes) return;
    const sugerido = calculoPrecio.subtotalProyectado ?? 0;
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
        toast.success('🔗 Smart Link: Servicios asociados agregados con éxito.', { id: 'cotizacion-smart-link' });
      }
    }
  };

  // Handlers
  const updateQuantity = (servicioId: string, cantidad: number) => {
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
          // Actualizar item existente en catálogo global
          const updateResult = await actualizarItem({
            id: data.id,
            name: data.name,
            cost: data.cost ?? 0,
            tipoUtilidad: data.tipoUtilidad,
            billing_type: data.billing_type,
            gastos: data.gastos || [],
            status: data.status,
          });
        
          if (!updateResult.success) {
            toast.error(updateResult.error || 'Error al actualizar en catálogo');
            return;
          }

          // Recargar catálogo para reflejar cambios
          const catalogoResult = await obtenerCatalogo(studioSlug);
          if (catalogoResult.success && catalogoResult.data) {
            setCatalogo(catalogoResult.data);
            toast.success('Item actualizado en catálogo. Los cambios se reflejarán en el cálculo.');
          }

          // Eliminar override si existía (ya está en catálogo global)
          if (data.id) {
            setItemOverrides(prev => {
              const updated = new Map(prev);
              updated.delete(data.id!);
              return updated;
            });
          }
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

    // Convertir a ItemFormData
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
    
    setCustomItems(prev => prev.filter((_, i) => i !== index));
  };

  // Manejar actualización de cantidad de item personalizado
  const handleUpdateCustomItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setCustomItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: quantity,
      };
      return updated;
    });
  };

  // Manejar intento de cierre
  const handleCancelClick = () => {
    if (hasSelectedItems) {
      setShowConfirmDialog(true);
    } else {
      router.back();
    }
  };

  // Confirmar cierre
  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    router.back();
  };

  // Cancelar cierre
  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir doble submit: deshabilitar desde el primer clic
    if (isSubmittingRef.current || loading) {
      return;
    }

    if (!nombre.trim()) {
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

    // Validar que haya promiseId para crear la cotización
    if (!promiseId && !isEditMode) {
      toast.error('Se requiere una promise para crear la cotización');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      // Calcular precio final (usar precio personalizado si existe, sino el calculado)
      const precioFinal = precioPersonalizado === '' || precioPersonalizado === 0
        ? calculoPrecio.total
        : Number(precioPersonalizado);

      if (isEditMode) {
        // Convertir Map de overrides a objeto plano
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

        // Actualizar cotización
        const result = await updateCotizacion({
          studio_slug: studioSlug,
          cotizacion_id: cotizacionId!,
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          precio: precioFinal,
          visible_to_client: visibleToClient,
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

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar cotización');
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

        toast.success('Cotización actualizada exitosamente');

        // Ejecutar callback si existe
        if (onAfterSave) {
          isSubmittingRef.current = false;
          setLoading(false);
          onAfterSave();
          return;
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
              router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/cotizacion/${result.data.id}/negociacion`);
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

      // Crear cotización normal
      const result = await createCotizacion({
        studio_slug: studioSlug,
        promise_id: promiseId || null,
        contact_id: contactId || null,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: precioFinal,
        visible_to_client: visibleToClient,
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
        toast.error(result.error || 'Error al crear cotización');
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

      toast.success('Cotización creada exitosamente');

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
            router.push(`/${studioSlug}/studio/commercial/promises/${result.data.promise_id}/cotizacion/${result.data.id}/negociacion`);
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
      // No resetear loading si ya iniciamos redirección (evita re-render que bloquea router.push)
      if (redirectingRef.current) return;
      if (isSubmittingRef.current) {
        isSubmittingRef.current = false;
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
          serviciosSeleccionados={serviciosSeleccionados}
          configuracionPrecios={configuracionPrecios}
          baseHours={durationHours}
          isCourtesyMode={isCourtesyMode}
          itemsCortesia={itemsCortesia}
          onToggleCortesia={toggleCortesia}
        />
      </div>

      {/* Columna 2: Configuración de la Cotización */}
      <div
        className={
          focusMode
            ? 'lg:col-span-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pl-3 pr-6 py-6'
            : 'lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Configuración</h3>

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
              label="Duración del Evento (Horas)"
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
                    className="cursor-pointer rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2.5 transition-colors hover:border-emerald-700/50 hover:bg-emerald-950/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 w-full flex items-center gap-3"
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

            {/* 2. Ajustes de Negociación — fondo sutilmente más claro, sin borde de color; acentos violetas */}
            <Collapsible
              open={ajustesNegociacionOpen}
              onOpenChange={(open) => {
                setAjustesNegociacionOpen(open);
                if (!open) setIsCourtesyMode(false);
              }}
              className="mb-4"
            >
              <CollapsibleTrigger
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-400 transition-colors border border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/40',
                  ajustesNegociacionOpen ? 'rounded-t-lg border-b border-zinc-700/50' : 'rounded-lg'
                )}
              >
                {ajustesNegociacionOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                <span>Ajustes de Negociación</span>
                {(calculoPrecio.montoCortesias > 0 || bonoEspecial > 0) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0 ml-auto" aria-hidden />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-b-lg border border-t-0 border-zinc-700/50 bg-zinc-800/30 p-3">
                  <div className="grid grid-cols-[auto_1fr] gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-1 block">Cortesías</label>
                      <ZenButton
                        type="button"
                        variant={isCourtesyMode ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setIsCourtesyMode(prev => !prev)}
                        className={cn(
                          'w-full justify-center gap-1.5 rounded-lg border backdrop-blur-sm h-9 text-xs',
                          isCourtesyMode
                            ? 'bg-purple-800 border-purple-700/80 text-white hover:bg-purple-700'
                            : 'bg-zinc-800/30 border-zinc-600/80 text-zinc-300 hover:bg-zinc-800/50'
                        )}
                      >
                        {isCourtesyMode ? (<><Gift className="w-3.5 h-3.5 shrink-0" /> Finalizar modo cortesía</>) : (<><Gift className="w-3.5 h-3.5 shrink-0" /> Habilitar modo cortesía</>)}
                      </ZenButton>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-1 block">Bono Especial</label>
                      <ZenInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={bonoEspecial === 0 ? '' : bonoEspecial}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') { setBonoEspecial(0); return; }
                          const n = parseFloat(v);
                          if (!Number.isNaN(n) && n >= 0) setBonoEspecial(n);
                        }}
                        onFocus={() => { bonoOnFocusRef.current = bonoEspecial; }}
                        onBlur={(e) => {
                          if (e.target.value === '') setBonoEspecial(0);
                          const tieneAjustes = itemsCortesia.size > 0 || bonoEspecial > 0 || bonoOnFocusRef.current > 0;
                          if (tieneAjustes && bonoEspecial !== bonoOnFocusRef.current) triggerShake();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        placeholder="0"
                        className="mt-0 h-9 text-sm rounded-lg border-zinc-700/50 bg-zinc-800/20 focus:bg-zinc-800/40"
                      />
                    </div>
                  </div>
                  <Separator className="my-3 bg-zinc-700/50" />
                  {(() => {
                    const hasCortesias = itemsCortesia.size > 0;
                    const hasBono = bonoEspecial > 0;
                    const showTotal = hasCortesias && hasBono;
                    if (!hasCortesias && !hasBono) {
                      return <p className="text-[10px] text-zinc-600">Sin ajustes. Precio sugerido = Precio calculado.</p>;
                    }
                    return (
                      <>
                        {hasCortesias && (
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-zinc-400">Cortesías ({itemsCortesia.size})</span>
                            <div className="flex items-center gap-1">
                              <span className="tabular-nums text-purple-400">-{formatearMoneda(calculoPrecio.montoCortesias)}</span>
                              <ZenButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setConfirmClearDiscountMode('cortesias');
                                  setConfirmClearCortesiasOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/10"
                                title="Eliminar todas las cortesías"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </ZenButton>
                            </div>
                          </div>
                        )}
                        {hasBono && (
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-zinc-400">Bono Especial</span>
                            <div className="flex items-center gap-1">
                              <span className="tabular-nums text-emerald-400/90">-{formatearMoneda(bonoEspecial)}</span>
                              <ZenButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setBonoEspecial(0)}
                                className="h-8 w-8 p-0 text-zinc-500 hover:text-destructive hover:bg-destructive/10"
                                title="Eliminar bono especial"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </ZenButton>
                            </div>
                          </div>
                        )}
                        {showTotal && (
                          <>
                            <Separator className="my-3 bg-zinc-700/50" />
                            <div className="flex items-center justify-between gap-2 text-sm font-medium">
                              <span className="text-zinc-300">Descuento total</span>
                              <div className="flex items-center gap-1">
                                <span className="tabular-nums font-semibold text-red-400">
                                  -{formatearMoneda(calculoPrecio.montoCortesias + bonoEspecial)}
                                </span>
                                <ZenButton
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setConfirmClearDiscountMode('all');
                                    setConfirmClearCortesiasOpen(true);
                                  }}
                                  className="h-8 w-8 p-0 text-zinc-500 hover:text-destructive hover:bg-destructive/10"
                                  title="Eliminar todos los descuentos"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </ZenButton>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <ZenConfirmModal
              isOpen={confirmClearCortesiasOpen}
              onClose={() => setConfirmClearCortesiasOpen(false)}
              onConfirm={() => {
                setItemsCortesia(new Set());
                if (confirmClearDiscountMode === 'all') setBonoEspecial(0);
                setConfirmClearCortesiasOpen(false);
              }}
              title={confirmClearDiscountMode === 'all' ? 'Eliminar todos los descuentos' : 'Eliminar cortesías'}
              description={confirmClearDiscountMode === 'all'
                ? '¿Deseas eliminar todos los descuentos (cortesías y bono especial)? Los ítems seguirán en la cotización pero dejarán de ser regalo y el bono se pondrá en cero.'
                : '¿Deseas eliminar todas las cortesías seleccionadas? Los ítems seguirán en la cotización pero dejarán de ser regalo.'}
              confirmText={confirmClearDiscountMode === 'all' ? 'Eliminar todos' : 'Eliminar todas'}
              cancelText="Cancelar"
              variant="destructive"
            />

            {/* Precio Final de Cierre — Fase 7.2: se sincroniza con sugerido al cambiar cortesías/bono */}
            <div className="mb-4">
              <label className="text-xs text-zinc-500 mb-1 block">Precio Final de Cierre</label>
              <ZenInput
                type="number"
                min="0"
                step="0.01"
                value={precioPersonalizado}
                onChange={(e) => {
                  const value = e.target.value;
                  setRingPrecioSincronizadoVisible(false);
                  if (value === '') { setPrecioPersonalizado(''); return; }
                  const numValue = parseFloat(value);
                  if (isNaN(numValue) || numValue < 0) return;
                  setPrecioPersonalizado(value);
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '') return;
                  const numValue = parseFloat(value);
                  if (isNaN(numValue) || numValue < 0) setPrecioPersonalizado('');
                }}
                placeholder="0"
                className={cn(
                  'mt-0 rounded-lg border-zinc-700/50 bg-zinc-800/20 focus:bg-zinc-800/40',
                  ringPrecioSincronizadoVisible && 'ring-1 ring-amber-500 animate-sugerido-shake'
                )}
              />
              {(showPrecioSincronizadoBadge || ringPrecioSincronizadoVisible) && (
                <p className="text-[11px] text-amber-500 mt-1.5 mb-0.5">Precio actualizado por ajustes de negociación</p>
              )}
              <p className="text-[11px] text-zinc-500">Este es el monto real que se le cobrará al prospecto.</p>
            </div>

            {/* 3. Condiciones de cierre — mismo diseño que Ajustes de Negociación */}
            <Collapsible
              open={condicionesCierreOpen}
              onOpenChange={setCondicionesCierreOpen}
              className="mb-4"
            >
              <div
                className={cn(
                  'flex w-full items-center gap-2 border border-zinc-700/50 bg-zinc-800/20',
                  condicionesCierreOpen ? 'rounded-t-lg border-b border-zinc-700/50' : 'rounded-lg'
                )}
              >
                <CollapsibleTrigger
                  className={cn(
                    'flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-400 hover:bg-zinc-800/30 transition-colors min-w-0'
                  )}
                >
                  {condicionesCierreOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <span>Condiciones de cierre</span>
                </CollapsibleTrigger>
                <ZenButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCondicionId(null);
                    setCreateCondicionEspecialMode(false);
                    setShowCondicionesManager(true);
                  }}
                  className="gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-6 min-h-6 px-1.5 text-[11px] shrink-0 mr-2"
                >
                  <Settings className="h-3 w-3" />
                  Gestionar
                </ZenButton>
              </div>
              <CollapsibleContent>
                <div className="rounded-b-lg border border-t-0 border-zinc-700/50 bg-zinc-800/10 p-3">
                  <p className="text-[11px] text-zinc-500 mb-3">
                    Puedes habilitar u ocultar las condiciones de contratación que el prospecto podrá elegir para esta cotización.
                  </p>
                  {tieneAjustesNegociacion && (
                    <p className="text-[11px] text-amber-600 mt-1 mb-3">
                      Se ocultaron condiciones con descuento por los ajustes de negociación (cortesías/bono). Puedes activarlas si lo deseas.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                  {condicionesComerciales.map((cond) => {
                    const isVisible = condicionIdsVisibles.has(cond.id);
                    const isSimulacion = condicionSimulacionId === cond.id;
                    const descuentoPct = cond.discount_percentage ?? 0;
                    const dobleBeneficio = tieneAjustesNegociacion && descuentoPct > 0 && (isSimulacion || isVisible);
                    const totalCosto = calculoPrecio.totalCosto ?? 0;
                    const totalGasto = calculoPrecio.totalGasto ?? 0;
                    const comisionRatio = configuracionPrecios ? (configuracionPrecios.comision_venta > 1 ? configuracionPrecios.comision_venta / 100 : configuracionPrecios.comision_venta) : 0.05;
                    const precioCierreBase = precioPersonalizado !== '' && Number(precioPersonalizado) >= 0 ? Number(precioPersonalizado) : (calculoPrecio.subtotalProyectado ?? 0) - (calculoPrecio.montoDescuentoCondicion ?? 0);
                    const totalRecibirCond = Math.max(0, precioCierreBase - (precioCierreBase * descuentoPct) / 100);
                    const utilidadCond = totalRecibirCond - totalCosto - totalGasto - totalRecibirCond * comisionRatio;
                    const margenCond = totalRecibirCond > 0 ? (utilidadCond / totalRecibirCond) * 100 : 0;
                    const saludCond = margenCond < 15 ? 'destructive' : margenCond < 25 ? 'amber' : 'emerald';
                    return (
                      <div
                        key={cond.id}
                        className={cn(
                          'rounded-lg border transition-all duration-300 ease-out relative',
                          isSimulacion && 'ring-2 ring-emerald-500/80 border-emerald-500/60 bg-emerald-950/20',
                          !isSimulacion && 'border-zinc-700 bg-zinc-800/30',
                          dobleBeneficio && 'ring-amber-500/50 border-amber-500/80 bg-amber-950/30'
                        )}
                      >
                        {/* Cabecera: nombre + etiqueta Visible/Oculto + lápiz */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700/50">
                          <span className={cn('font-medium text-sm min-w-0 truncate', isSimulacion ? 'text-white' : 'text-zinc-300')}>{cond.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCondicionIdsVisibles((prev) => {
                                const next = new Set(prev);
                                if (isVisible) next.delete(cond.id); else next.add(cond.id);
                                return next;
                              });
                            }}
                            className={cn(
                              'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors',
                              isVisible ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40' : 'text-zinc-500 bg-zinc-700/50 border border-zinc-600/50'
                            )}
                            aria-label={isVisible ? 'Ocultar para el prospecto' : 'Visible para el prospecto'}
                          >
                            {isVisible ? 'Visible' : 'Oculto'}
                          </button>
                          {isSimulacion && <span className="text-[10px] text-emerald-400 shrink-0">[Simulando]</span>}
                          {cond.type === 'offer' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full shrink-0">OFERTA</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateCondicionEspecialMode(false);
                              setEditingCondicionId(cond.id);
                              setShowCondicionesManager(true);
                            }}
                            className="ml-auto shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/80"
                            title="Editar condición"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Cuerpo: clic = simulación */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setCondicionSimulacionId((prev) => (prev === cond.id ? null : cond.id))}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCondicionSimulacionId((prev) => (prev === cond.id ? null : cond.id)); } }}
                          className={cn(
                            'px-3 py-2.5 cursor-pointer transition-colors text-left',
                            isSimulacion ? 'bg-emerald-500/5' : 'hover:bg-zinc-800/50'
                          )}
                        >
                          {cond.description && <p className="text-xs text-zinc-500">{cond.description}</p>}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1 text-zinc-400">
                            <span>Anticipo: {cond.advance_type === 'fixed_amount' && cond.advance_amount != null ? formatearMoneda(cond.advance_amount) : `${cond.advance_percentage ?? 0}%`}</span>
                            <span>Descuento: {descuentoPct}%</span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-zinc-700/40">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-500">Utilidad real</span>
                              <span className={cn('tabular-nums font-medium', utilidadCond >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90')}>{formatearMoneda(utilidadCond)}</span>
                            </div>
                            <div className="mt-1 h-1 rounded-full bg-zinc-700/60 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-300', saludCond === 'destructive' && 'bg-destructive', saludCond === 'amber' && 'bg-amber-500', saludCond === 'emerald' && 'bg-emerald-500')}
                                style={{ width: `${Math.min(100, Math.max(0, margenCond))}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{margenCond.toFixed(1)}% margen</div>
                          </div>
                          {dobleBeneficio && (
                            <div className="mt-2 text-[10px] text-amber-400/90 flex items-center gap-1">
                              <span aria-hidden>⚠️</span> {isSimulacion ? 'Doble beneficio detectado en esta simulación' : 'Doble beneficio: ajustes de negociación y descuento de esta condición'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {condicionNegociacion && (() => {
                    const isVisible = condicionIdsVisibles.has(condicionNegociacion.id);
                    const isSimulacion = condicionSimulacionId === condicionNegociacion.id;
                    const descuentoPct = condicionNegociacion.discount_percentage ?? 0;
                    const dobleBeneficio = tieneAjustesNegociacion && descuentoPct > 0 && (isSimulacion || isVisible);
                    const totalCosto = calculoPrecio.totalCosto ?? 0;
                    const totalGasto = calculoPrecio.totalGasto ?? 0;
                    const comisionRatio = configuracionPrecios ? (configuracionPrecios.comision_venta > 1 ? configuracionPrecios.comision_venta / 100 : configuracionPrecios.comision_venta) : 0.05;
                    const precioCierreBase = precioPersonalizado !== '' && Number(precioPersonalizado) >= 0 ? Number(precioPersonalizado) : (calculoPrecio.subtotalProyectado ?? 0) - (calculoPrecio.montoDescuentoCondicion ?? 0);
                    const totalRecibirCond = Math.max(0, precioCierreBase - (precioCierreBase * descuentoPct) / 100);
                    const utilidadCond = totalRecibirCond - totalCosto - totalGasto - totalRecibirCond * comisionRatio;
                    const margenCond = totalRecibirCond > 0 ? (utilidadCond / totalRecibirCond) * 100 : 0;
                    const saludCond = margenCond < 15 ? 'destructive' : margenCond < 25 ? 'amber' : 'emerald';
                    return (
                      <div
                        className={cn(
                          'rounded-lg border border-emerald-500/50 bg-emerald-500/10 transition-all duration-300 ease-out relative',
                          isSimulacion && 'ring-2 ring-emerald-500/80',
                          dobleBeneficio && 'ring-amber-500/50 border-amber-500/80 bg-amber-950/30'
                        )}
                      >
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-500/20">
                          <div className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <span className="font-medium text-sm text-white min-w-0 truncate">{condicionNegociacion.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCondicionIdsVisibles((prev) => {
                                const next = new Set(prev);
                                if (isVisible) next.delete(condicionNegociacion.id); else next.add(condicionNegociacion.id);
                                return next;
                              });
                            }}
                            className={cn(
                              'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors',
                              isVisible ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40' : 'text-zinc-500 bg-zinc-700/50 border border-zinc-600/50'
                            )}
                            aria-label={isVisible ? 'Ocultar para el prospecto' : 'Visible para el prospecto'}
                          >
                            {isVisible ? 'Visible' : 'Oculto'}
                          </button>
                          {isSimulacion && <span className="text-[10px] text-emerald-400 shrink-0">[Simulando]</span>}
                          <span className="text-[10px] text-emerald-400/80 shrink-0">Condición especial</span>
                          <span className="ml-auto" />
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setCondicionSimulacionId((prev) => (prev === condicionNegociacion.id ? null : condicionNegociacion.id))}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCondicionSimulacionId((prev) => (prev === condicionNegociacion.id ? null : condicionNegociacion.id)); } }}
                          className={cn('px-3 py-2.5 cursor-pointer transition-colors text-left', isSimulacion && 'bg-emerald-500/5')}
                        >
                          <div className="text-xs text-zinc-400">Descuento: {condicionNegociacion.discount_percentage ?? 0}%</div>
                          <div className="mt-2 pt-2 border-t border-emerald-500/20">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-500">Utilidad real</span>
                              <span className={cn('tabular-nums font-medium', utilidadCond >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90')}>{formatearMoneda(utilidadCond)}</span>
                            </div>
                            <div className="mt-1 h-1 rounded-full bg-zinc-700/60 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-300', saludCond === 'destructive' && 'bg-destructive', saludCond === 'amber' && 'bg-amber-500', saludCond === 'emerald' && 'bg-emerald-500')}
                                style={{ width: `${Math.min(100, Math.max(0, margenCond))}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{margenCond.toFixed(1)}% margen</div>
                          </div>
                          {dobleBeneficio && (
                            <div className="mt-2 text-[10px] text-amber-400/90 flex items-center gap-1">
                              <span aria-hidden>⚠️</span> {isSimulacion ? 'Doble beneficio detectado en esta simulación' : 'Doble beneficio: ajustes de negociación y descuento de esta condición'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-3 flex flex-col gap-2 w-full">
                  <ZenButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreateCondicionEspecialMode(true);
                      setEditingCondicionId(null);
                      setShowCondicionesManager(true);
                    }}
                    className="w-full gap-2 py-3.5 border-zinc-700/50 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800/50"
                  >
                    <Plus className="h-4 w-4" />
                    Crear condición comercial especial
                  </ZenButton>
                  <ZenButton
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={condicionIdsVisibles.size === 0}
                    onClick={() => setAuditoriaRentabilidadOpen(true)}
                    className="w-full gap-2 py-2.5 border-zinc-600/50 bg-zinc-800/20 text-zinc-300 hover:bg-zinc-800/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={condicionIdsVisibles.size === 0 ? 'Selecciona al menos una condición visible para comparar rentabilidades' : undefined}
                  >
                    <Info className="h-4 w-4" />
                    Abrir Análisis de Rentabilidad
                  </ZenButton>
                </div>

                {/* Resumen de Pago Simulado — animación entrada/salida y scroll suave */}
                {condicionSimulacionId && (() => {
                  const condSim = condicionesComerciales.find(c => c.id === condicionSimulacionId)
                    ?? (condicionNegociacion?.id === condicionSimulacionId ? condicionNegociacion : null);
                  const precioCierre = precioPersonalizado !== '' && Number(precioPersonalizado) >= 0 ? Number(precioPersonalizado) : (calculoPrecio.subtotalProyectado ?? 0) - (calculoPrecio.montoDescuentoCondicion ?? 0);
                  const pct = (condSim as { discount_percentage?: number | null } | null)?.discount_percentage ?? 0;
                  const descuentoMonto = (precioCierre * pct) / 100;
                  const totalRecibir = Math.max(0, precioCierre - descuentoMonto);
                  return (
                    <div
                      ref={simulacionBlockRef}
                      className={cn(
                        'overflow-hidden transition-all duration-300 ease-out',
                        simulacionBlockExpanded ? 'mt-3 max-h-[400px] opacity-100' : 'max-h-0 opacity-0 mt-0'
                      )}
                    >
                      <div className="rounded-lg border border-amber-500/40 bg-zinc-800/20 p-3 ring-1 ring-amber-500/30">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Simulación: El cliente pagará</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-zinc-300">
                            <span>Precio de Cierre</span>
                            <span className="tabular-nums">{formatearMoneda(precioCierre)}</span>
                          </div>
                          <div className="flex justify-between text-amber-400/90">
                            <span>Descuento aplicado ({pct}%)</span>
                            <span className="tabular-nums">-{formatearMoneda(descuentoMonto)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-white pt-1 border-t border-zinc-700/50">
                            <span>Total real a recibir</span>
                            <span className="tabular-nums">{formatearMoneda(totalRecibir)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>
              </CollapsibleContent>
            </Collapsible>

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
                <Sheet open={auditoriaRentabilidadOpen} onOpenChange={setAuditoriaRentabilidadOpen}>
                  <SheetContent side="right" className="flex flex-col w-full max-w-md bg-zinc-900 border-zinc-800 overflow-y-auto">
                    <SheetHeader className="border-b border-zinc-800/50 pb-4">
                      <SheetTitle className="text-left text-white">Auditoría de Rentabilidad</SheetTitle>
                    </SheetHeader>
                    <div className="px-6 py-4 space-y-6">
                      {/* Bloque 1: Escenario del Sistema */}
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
                            <span className="text-zinc-500">(−) Comisión sugerida ({pctComision}%)</span>
                            <span className="tabular-nums text-zinc-400">-{formatearMoneda(comisionSugerido)}</span>
                          </div>
                          <Separator className="bg-zinc-700/50 my-1.5" />
                          <div className="flex justify-between font-medium">
                            <span className="text-zinc-300">Utilidad sugerida</span>
                            <span className="tabular-nums text-emerald-500/90">{formatearMoneda(calculoPrecio.utilidadSinDescuento)}</span>
                          </div>
                        </div>
                      </div>

                      {/* COMPARATIVA DE CIERRE: un bloque por cada condición visible */}
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
                                    {esSimulando && <span className="ml-1.5 text-amber-400/90">(simulando)</span>}
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

                      {/* Salud Financiera — usa margen de la simulación activa si hay condición simulada */}
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
                    </div>
                  </SheetContent>
                </Sheet>
              );
            })()}
          </div>

          {/* Switch de visibilidad */}
          {!hideVisibilityToggle && (
            <div className="mt-4 p-4 border border-zinc-700 rounded-lg bg-zinc-800/30">
              <ZenSwitch
                checked={visibleToClient}
                onCheckedChange={setVisibleToClient}
                label="Visible para el cliente"
                description="Si está activado, el prospecto podrá ver esta cotización en el portal público"
                variant="green"
              />
            </div>
          )}

          {/* Ficha de Condición Comercial Pre-Autorizada */}
          {isPreAutorizada && condicionComercialPreAutorizada && (
            <div className="mt-4">
              <ZenCard variant="outlined" className="bg-blue-500/5 border-blue-500/20">
                <ZenCardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-400">
                            Condición Comercial
                          </h3>
                          <ZenBadge
                            size="sm"
                            className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-1.5 py-0.5 rounded-full">
                            Pre autorizada
                          </ZenBadge>
                        </div>
                      </div>
                      <h4 className="text-base font-semibold text-white">
                        {condicionComercialPreAutorizada.name}
                      </h4>
                      {condicionComercialPreAutorizada.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {condicionComercialPreAutorizada.description}
                        </p>
                      )}
                    </div>

                    {/* Detalles de la condición */}
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
                              <span className="font-semibold text-emerald-400">
                                {condicionComercialPreAutorizada.advance_percentage}%
                              </span>
                            </div>
                          ) : null}
                          {condicionComercialPreAutorizada.discount_percentage ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">Descuento:</span>
                              <span className="font-semibold text-blue-400">
                                {condicionComercialPreAutorizada.discount_percentage}%
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Botón de autorizar */}
                    {onAutorizar && !isAlreadyAuthorized && (
                      <div className="pt-2">
                        <ZenButton
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={onAutorizar}
                          disabled={isAutorizando || loading}
                          loading={isAutorizando}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Autorizar ahora
                        </ZenButton>
                      </div>
                    )}
                  </div>
                </ZenCardContent>
              </ZenCard>
            </div>
          )}

          {/* Botones fuera del card de Cálculo Financiero */}
          {customActionButtons ? (
            customActionButtons
          ) : !hideActionButtons ? (
            <div className="border-t border-zinc-700 pt-3 mt-4">
              <div className="flex gap-2">
                <ZenButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancelClick}
                  disabled={loading || isDisabled}
                  className="flex-1"
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  type="submit"
                  variant="primary"
                  loading={loading}
                  loadingText="Guardando..."
                  disabled={loading || isDisabled || condicionIdsVisibles.size === 0}
                  title={condicionIdsVisibles.size === 0 ? 'Selecciona al menos una condición visible para el cliente' : undefined}
                  className="flex-1"
                >
                  {isEditMode ? 'Actualizar' : 'Crear'} Cotización
                </ZenButton>
              </div>
            </div>
          ) : null}
        </form>
      </div>

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
  );
}
