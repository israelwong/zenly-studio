'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { obtenerPaquetePorId } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { createCotizacion, updateCotizacion, getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import { CatalogoServiciosTree } from '@/components/shared/catalogo';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';

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
  const isEditMode = !!cotizacionId;

  // Estado del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioPersonalizado, setPrecioPersonalizado] = useState<string | number>('');
  const [items, setItems] = useState<{ [servicioId: string]: number }>({});
  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(null);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [filtroServicio, setFiltroServicio] = useState('');
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Cargar catálogo, configuración y datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargandoCatalogo(true);

        // Si está en modo edición, cargar y validar la cotización en paralelo con catálogo
        // Si está creando revisión, también cargar datos de la original para pre-poblar
        const [catalogoResult, configResult, cotizacionResult, originalResult] = await Promise.all([
          obtenerCatalogo(studioSlug),
          obtenerConfiguracionPrecios(studioSlug),
          cotizacionId ? getCotizacionById(cotizacionId, studioSlug) : Promise.resolve({ success: true as const, data: null }),
          revisionOriginalId && !cotizacionId ? getCotizacionById(revisionOriginalId, studioSlug) : Promise.resolve({ success: true as const, data: null })
        ]);

        // Validar cotización si está en modo edición
        let cotizacionData: { name: string; description: string | null; price: number; promise_id: string | null; contact_id: string | null; items: Array<{ item_id: string; quantity: number }> } | null = null;

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
          if (!promiseId && !cotizacionData.promise_id && !contactId) {
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

          // Cargar items de la cotización (filtrar items sin item_id válido)
          const cotizacionItems: { [id: string]: number } = {};
          if (cotizacionData.items && Array.isArray(cotizacionData.items)) {
            cotizacionData.items.forEach((item: { item_id: string | null; quantity: number }) => {
              if (item.item_id && item.quantity > 0) {
                cotizacionItems[item.item_id] = item.quantity;
              }
            });
          }

          // Combinar con initialItems para asegurar que todos los servicios estén inicializados
          const combinedItems = { ...initialItems, ...cotizacionItems };
          setItems(combinedItems);
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
          setNombre('');
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
  }, [studioSlug, packageId, cotizacionId, promiseId, contactId, revisionOriginalId, router]);

  // Notificar cambios en el estado de carga
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(cargandoCatalogo);
    }
  }, [cargandoCatalogo, onLoadingChange]);

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

  // Calcular servicios seleccionados por sección y categoría
  const serviciosSeleccionados = useMemo(() => {
    const resumen: {
      secciones: { [seccionId: string]: { total: number; categorias: { [categoriaId: string]: number } } }
    } = { secciones: {} };

    catalogoFiltrado.forEach(seccion => {
      let totalSeccion = 0;
      const categorias: { [categoriaId: string]: number } = {};

      seccion.categorias.forEach(categoria => {
        let totalCategoria = 0;
        categoria.servicios.forEach(servicio => {
          const cantidad = items[servicio.id] || 0;
          if (cantidad > 0) {
            totalCategoria += cantidad;
            totalSeccion += cantidad;
          }
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
  }, [catalogoFiltrado, items]);

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
      .filter(Boolean);

    if (serviciosSeleccionados.length === 0) {
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
      subtotal += (s.precioUnitario || 0) * s.cantidad;
      totalCosto += (s.costo || 0) * s.cantidad;
      totalGasto += (s.gasto || 0) * s.cantidad;
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

    // Preparar items para el desglose de la cotización
    const itemsDesglose = serviciosSeleccionados
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
      });

    setItemsParaDesglose(itemsDesglose as Array<{
      id: string;
      nombre: string;
      costo: number;
      gasto: number;
      tipo_utilidad: 'service' | 'product';
      cantidad: number;
    }>);
  }, [items, precioPersonalizado, configKey, servicioMap, configuracionPrecios]);

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
      toast.success(`${servicio.nombre} agregado a la cotización`);
    } else if (cantidad === 0 && prevCantidad > 0 && servicio) {
      toast.info(`${servicio.nombre} removido de la cotización`);
    }
  };

  // Verificar si hay items seleccionados
  const hasSelectedItems = useMemo(() => {
    return Object.values(items).some(cantidad => cantidad > 0);
  }, [items]);

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

    if (!nombre.trim()) {
      toast.error('El nombre de la cotización es requerido');
      return;
    }

    const itemsSeleccionados = Object.entries(items).filter(([, cantidad]) => cantidad > 0);
    if (itemsSeleccionados.length === 0) {
      toast.error('Agrega al menos un servicio');
      return;
    }

    // Validar que haya promiseId para crear la cotización
    if (!promiseId && !isEditMode) {
      toast.error('Se requiere una promise para crear la cotización');
      return;
    }

    setLoading(true);
    try {
      // Calcular precio final (usar precio personalizado si existe, sino el calculado)
      const precioFinal = precioPersonalizado === '' || precioPersonalizado === 0
        ? calculoPrecio.total
        : Number(precioPersonalizado);

      if (isEditMode) {
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
        });

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar cotización');
          setLoading(false);
          return;
        }

        toast.success('Cotización actualizada exitosamente');
        setLoading(false);

        // Ejecutar callback si existe
        if (onAfterSave) {
          onAfterSave();
          return;
        }

        if (redirectOnSuccess) {
          router.push(redirectOnSuccess);
          router.refresh(); // Forzar recarga de datos del servidor
        } else if (promiseId) {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
          router.refresh();
        } else {
          router.back();
          router.refresh();
        }
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

        // Si se creó la revisión y hay revisionId, el callback ya manejó la redirección
        // Solo retornar, no hacer nada más aquí
        if (revisionResult.revisionId) {
          return;
        }

        // Si no se obtuvo revisionId, redirigir normalmente
        if (redirectOnSuccess) {
          router.push(redirectOnSuccess);
        } else if (promiseId) {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
        } else {
          router.back();
        }
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
        items: Object.fromEntries(
          itemsSeleccionados.map(([itemId, cantidad]) => [itemId, cantidad])
        ),
      });

      if (!result.success) {
        toast.error(result.error || 'Error al crear cotización');
        return;
      }

      toast.success('Cotización creada exitosamente');

      if (redirectOnSuccess) {
        router.push(redirectOnSuccess);
      } else if (promiseId) {
        router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error(`Error al ${isEditMode ? 'actualizar' : 'crear'} cotización`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-expandir secciones y categorías cuando hay filtros
  useEffect(() => {
    if (filtroServicio.trim() && catalogoFiltrado.length > 0) {
      const seccionesConResultados = new Set(catalogoFiltrado.map(seccion => seccion.id));
      setSeccionesExpandidas(seccionesConResultados);

      const categoriasConResultados = new Set<string>();
      catalogoFiltrado.forEach(seccion => {
        seccion.categorias.forEach(categoria => {
          if (categoria.servicios.length > 0) {
            categoriasConResultados.add(categoria.id);
          }
        });
      });
      setCategoriasExpandidas(categoriasConResultados);
    }
  }, [filtroServicio, catalogoFiltrado]);

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
              {filtroServicio.trim() ?
                catalogoFiltrado.reduce((acc, seccion) =>
                  acc + seccion.categorias.reduce((catAcc, categoria) =>
                    catAcc + categoria.servicios.length, 0), 0
                ) :
                catalogo.reduce((acc, seccion) =>
                  acc + seccion.categorias.reduce((catAcc, categoria) =>
                    catAcc + categoria.servicios.length, 0), 0
                )
              } items
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
          onToggleSeccion={toggleSeccion}
          onToggleCategoria={toggleCategoria}
          onUpdateQuantity={updateQuantity}
          serviciosSeleccionados={serviciosSeleccionados}
          configuracionPrecios={configuracionPrecios}
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
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  type="submit"
                  variant="primary"
                  loading={loading}
                  loadingText="Guardando..."
                  disabled={loading}
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

    </div>
  );
}
