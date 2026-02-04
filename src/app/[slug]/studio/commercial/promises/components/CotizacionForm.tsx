'use client';

import React, { useState, useMemo, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge, ZenCard, ZenCardContent, ZenSwitch } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios, type ResultadoPrecio } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { obtenerPaquetePorId } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { createCotizacion, updateCotizacion, getCotizacionById, getPromiseDurationHours } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getServiceLinks, type ServiceLinksMap } from '@/lib/actions/studio/config/item-links.actions';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import { CatalogoServiciosTree } from '@/components/shared/catalogo';
import { ItemEditorModal, type ItemFormData, type ItemEditorContext } from '@/components/shared/catalogo/ItemEditorModal';
import { crearItem, actualizarItem } from '@/lib/actions/studio/catalogo';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { CustomItemData } from '@/lib/actions/schemas/cotizaciones-schemas';

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
        const [catalogoResult, configResult, linksResult, cotizacionResult, originalResult] = await Promise.all([
          obtenerCatalogo(studioSlug),
          obtenerConfiguracionPrecios(studioSlug),
          getServiceLinks(studioSlug),
          cotizacionId ? getCotizacionById(cotizacionId, studioSlug) : Promise.resolve({ success: true as const, data: null }),
          revisionOriginalId && !cotizacionId ? getCotizacionById(revisionOriginalId, studioSlug) : Promise.resolve({ success: true as const, data: null })
        ]);

        if (linksResult.success && linksResult.data) {
          setServiceLinksMap(linksResult.data);
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
            originalData.items.forEach((item: { item_id: string; quantity: number }) => {
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

  // Estado para el cálculo de precios
  const [calculoPrecio, setCalculoPrecio] = useState({
    subtotal: 0,
    totalCosto: 0,
    totalGasto: 0,
    total: 0,
    utilidadNeta: 0,
    utilidadNetaCalculada: 0,
    diferenciaPrecio: 0
  });

  // Items de la cotización para el desglose
  const [itemsParaDesglose, setItemsParaDesglose] = useState<Array<{
    id: string;
    nombre: string;
    costo: number;
    gasto: number;
    tipo_utilidad: 'service' | 'product';
    cantidad: number;
  }>>([]);

  // Cálculo dinámico del precio usando useEffect
  useEffect(() => {
    if (!configuracionPrecios) {
      setCalculoPrecio({
        subtotal: 0,
        totalCosto: 0,
        totalGasto: 0,
        total: 0,
        utilidadNeta: 0,
        utilidadNetaCalculada: 0,
        diferenciaPrecio: 0
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
        totalCosto: 0,
        totalGasto: 0,
        total: 0,
        utilidadNeta: 0,
        utilidadNetaCalculada: 0,
        diferenciaPrecio: 0
      });
      setItemsParaDesglose([]);
      return;
    }

    let subtotal = 0;
    let totalCosto = 0;
    let totalGasto = 0;

    serviciosSeleccionados.forEach(s => {
      // Obtener billing_type del servicio (default: SERVICE para compatibilidad)
      const billingType = (s.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';

      // Calcular cantidad efectiva usando calcularCantidadEfectiva
      // Usar mínimo 1 hora si durationHours es null o 0 para evitar precios en cero
      const safeDurationHours = durationHours && durationHours > 0 ? durationHours : 1;
      const cantidadEfectiva = calcularCantidadEfectiva(
        billingType,
        s.cantidad,
        safeDurationHours
      );

      subtotal += (s.precioUnitario || 0) * cantidadEfectiva;
      totalCosto += (s.costo || 0) * cantidadEfectiva;
      totalGasto += (s.gasto || 0) * cantidadEfectiva;
    });

    // Agregar items personalizados al cálculo
    const safeDurationHours = durationHours && durationHours > 0 ? durationHours : 1;
    customItems.forEach(customItem => {
      const cantidadEfectiva = calcularCantidadEfectiva(
        customItem.billing_type,
        customItem.quantity,
        safeDurationHours
      );
      subtotal += customItem.unit_price * cantidadEfectiva;
      totalCosto += (customItem.cost || 0) * cantidadEfectiva;
      totalGasto += (customItem.expense || 0) * cantidadEfectiva;
    });

    const precioPersonalizadoNum = precioPersonalizado === '' ? 0 : Number(precioPersonalizado) || 0;
    const utilidadNetaCalculada = subtotal - (totalCosto + totalGasto);
    const diferenciaPrecio = precioPersonalizadoNum > 0 ? precioPersonalizadoNum - subtotal : 0;
    const total = precioPersonalizadoNum > 0 ? precioPersonalizadoNum : subtotal;
    const utilidadNeta = total - (totalCosto + totalGasto);

    setCalculoPrecio({
      subtotal: Number(subtotal.toFixed(2)) || 0,
      totalCosto: Number(totalCosto.toFixed(2)) || 0,
      totalGasto: Number(totalGasto.toFixed(2)) || 0,
      total: Number(total.toFixed(2)) || 0,
      utilidadNeta: Number(utilidadNeta.toFixed(2)) || 0,
      utilidadNetaCalculada: Number(utilidadNetaCalculada.toFixed(2)) || 0,
      diferenciaPrecio: Number(diferenciaPrecio.toFixed(2)) || 0
    });

    // Preparar items para el desglose de la cotización (incluyendo personalizados)
    const itemsDesglose = [
      ...serviciosSeleccionados
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map(s => {
          const tipoUtilidad: 'service' | 'product' = s.tipo_utilidad === 'service' ? 'service' : 'product';
          return {
            id: s.id,
            nombre: s.nombre,
            costo: s.costo || 0,
            gasto: s.gasto || 0,
            tipo_utilidad: tipoUtilidad,
            cantidad: s.cantidad,
          };
        }),
      // Agregar items personalizados al desglose
      ...customItems.map(customItem => ({
        id: `custom-${customItem.name}`,
        nombre: customItem.name,
        costo: customItem.cost || 0,
        gasto: customItem.expense || 0,
        tipo_utilidad: customItem.tipoUtilidad === 'servicio' ? 'service' : 'product',
        cantidad: customItem.quantity,
      })),
    ];

    setItemsParaDesglose(itemsDesglose as Array<{
      id: string;
      nombre: string;
      costo: number;
      gasto: number;
      tipo_utilidad: 'service' | 'product';
      cantidad: number;
    }>);
  }, [items, precioPersonalizado, configKey, servicioMap, configuracionPrecios, durationHours, customItems]);

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

  // Handler para toggle de selección (click en el servicio). Inserción en cascada: al agregar un Padre se agregan sus Hijos (soft-linking).
  const onToggleSelection = (servicioId: string) => {
    const servicio = servicioMap.get(servicioId);
    if (!servicio) return;

    const currentQuantity = items[servicioId] || 0;

    if (currentQuantity > 0) {
      setItems(prev => {
        const newItems = { ...prev };
        delete newItems[servicioId];
        return newItems;
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
          setItemOverrides(prev => {
            const updated = new Map(prev);
            updated.delete(data.id);
            return updated;
          });
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
          setItems(prev => {
            const updated = { ...prev };
            delete updated[data.id];
            return updated;
          });

          // 6. Agregar como custom item
          setCustomItems(prev => [...prev, customItemData]);

          // 7. Eliminar override si existía (ya no es necesario)
          setItemOverrides(prev => {
            const updated = new Map(prev);
            updated.delete(data.id);
            return updated;
          });

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
          // Crear nuevo item en catálogo
          const createResult = await crearItem({
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
          items: Object.fromEntries(
            itemsSeleccionados.map(([itemId, cantidad]) => [itemId, cantidad])
          ),
          customItems: customItems,
          itemOverrides: Object.keys(overridesObj).length > 0 ? overridesObj : undefined,
          event_duration: durationHours && durationHours > 0 ? durationHours : null,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar cotización');
          return;
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
          if (redirectOnSuccess) {
            router.push(redirectOnSuccess);
          } else if (result.data?.promise_id) {
            // Redirigir según el estado de la cotización
            const status = result.data.status || cotizacionData?.status || 'pendiente';
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
      });

      if (!result.success) {
        toast.error(result.error || 'Error al crear cotización');
        return;
      }

      toast.success('Cotización creada exitosamente');

      window.dispatchEvent(new CustomEvent('close-overlays'));
      redirectingRef.current = true;
      router.refresh();
      startTransition(() => {
        if (redirectOnSuccess) {
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        {/* Columna 1: Servicios Disponibles - Skeleton */}
        <div className="lg:col-span-2">
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
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
      {/* Columna 1: Servicios Disponibles */}
      <div className="lg:col-span-2">
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
        />
      </div>

      {/* Columna 2: Configuración de la Cotización */}
      <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
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

          {/* Resumen Financiero */}
          <div className="z-10">
            <h3 className="text-lg font-semibold text-white mb-4">
              Cálculo Financiero
            </h3>
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
              {/* Precio calculado y Precio personalizado en 2 columnas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Precio calculado */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Precio calculado</label>
                  <ZenInput
                    type="text"
                    value={formatearMoneda(calculoPrecio.subtotal)}
                    readOnly
                    className="mt-0"
                  />
                </div>

                {/* Precio personalizado */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Precio personalizado</label>
                  <ZenInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioPersonalizado}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir vacío para borrar
                      if (value === '') {
                        setPrecioPersonalizado('');
                        return;
                      }
                      // Convertir a número y validar que sea no negativo
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setPrecioPersonalizado(value);
                      }
                    }}
                    onBlur={(e) => {
                      // Asegurar que el valor final sea válido
                      const value = e.target.value;
                      if (value !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
                        setPrecioPersonalizado('');
                      }
                    }}
                    placeholder="0"
                    className="mt-0"
                  />
                </div>
              </div>

              {/* Ganarás */}
              <div>
                <label className="text-sm font-semibold text-amber-500 mb-2 block">Ganancia bruta</label>
                <div className={`text-2xl font-bold ${calculoPrecio.utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatearMoneda(calculoPrecio.utilidadNeta)}
                </div>
                {calculoPrecio.diferenciaPrecio !== 0 && (
                  <div className="text-xs mt-2 text-zinc-400">
                    <span className={calculoPrecio.diferenciaPrecio > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {calculoPrecio.diferenciaPrecio > 0 ? '+' : ''}{formatearMoneda(calculoPrecio.diferenciaPrecio)}
                    </span>
                    {' '}sobre la ganancia calculada
                  </div>
                )}
              </div>

              {/* Desglose colapsable */}
              <div className="border-t border-zinc-700 pt-3">
                <button
                  type="button"
                  onClick={() => setSeccionesExpandidas(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has('desglose-financiero')) {
                      newSet.delete('desglose-financiero');
                    } else {
                      newSet.add('desglose-financiero');
                    }
                    return newSet;
                  })}
                  className="w-full flex items-center justify-between text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <span>Desglose de precio</span>
                  {seccionesExpandidas.has('desglose-financiero') ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {seccionesExpandidas.has('desglose-financiero') && itemsParaDesglose.length > 0 && configuracionPrecios && (
                  <div className="mt-3">
                    <PrecioDesglosePaquete
                      items={itemsParaDesglose}
                      configuracion={configuracionPrecios}
                      precioPersonalizado={precioPersonalizado === '' ? undefined : Number(precioPersonalizado) || undefined}
                      showCard={false}
                    />
                  </div>
                )}
              </div>
            </div>
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
                  disabled={loading || isDisabled}
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
          categoriaId={selectedCategoriaForItem || undefined}
          preciosConfig={configuracionPrecios || undefined}
          showOverlay={true}
          context="cotizaciones"
        />
      )}
    </div>
  );
}
