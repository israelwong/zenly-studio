'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/utilidad.actions';
import { obtenerPaquetePorId } from '@/lib/actions/studio/builder/paquetes/paquetes.actions';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';

interface CotizacionFormProps {
  studioSlug: string;
  promiseId?: string | null;
  packageId?: string | null;
  cotizacionId?: string;
  redirectOnSuccess?: string;
}

export function CotizacionForm({
  studioSlug,
  promiseId,
  packageId,
  cotizacionId,
  redirectOnSuccess,
}: CotizacionFormProps) {
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
        const [catalogoResult, configResult] = await Promise.all([
          obtenerCatalogo(studioSlug),
          obtenerConfiguracionPrecios(studioSlug)
        ]);

        if (catalogoResult.success && catalogoResult.data) {
          setCatalogo(catalogoResult.data);

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
          } else if (cotizacionId) {
            // TODO: Cargar datos de la cotización existente
            // Por ahora, dejar vacío
            setItems(initialItems);
          } else {
            // Nueva cotización personalizada - campos vacíos
            setItems(initialItems);
            setNombre('');
            setDescripcion('');
            setPrecioPersonalizado('');
          }
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
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setCargandoCatalogo(false);
      }
    };

    cargarDatos();
  }, [studioSlug, packageId, cotizacionId]);

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

    if (Object.keys(items).filter(key => items[key] > 0).length === 0) {
      toast.error('Agrega al menos un servicio');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implementar lógica de creación/actualización de cotización
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(isEditMode ? 'Cotización actualizada exitosamente' : 'Cotización creada exitosamente');

      if (redirectOnSuccess) {
        router.push(redirectOnSuccess);
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Cargando catálogo...</p>
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

        <div className="space-y-2">
          {catalogoFiltrado.length === 0 && filtroServicio.trim() ? (
            <div className="text-center py-8 text-zinc-400">
              <p>No se encontraron servicios que coincidan con &quot;{filtroServicio}&quot;</p>
            </div>
          ) : (
            catalogoFiltrado
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((seccion) => {
                const isSeccionExpandida = seccionesExpandidas.has(seccion.id);

                return (
                  <div key={seccion.id} className="border border-zinc-700 rounded-lg overflow-hidden">
                    {/* Nivel 1: Sección */}
                    <button
                      onClick={() => toggleSeccion(seccion.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {isSeccionExpandida ? (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          )}
                          <h4 className="font-semibold text-white">{seccion.nombre}</h4>
                        </div>
                        {serviciosSeleccionados.secciones[seccion.id] ? (
                          <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">
                            {serviciosSeleccionados.secciones[seccion.id].total} {serviciosSeleccionados.secciones[seccion.id].total === 1 ? 'item' : 'items'} seleccionado{serviciosSeleccionados.secciones[seccion.id].total === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                            {seccion.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0)} {seccion.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0) === 1 ? 'item' : 'items'} disponible{seccion.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0) === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </button>

                    {isSeccionExpandida && (
                      <div className="bg-zinc-900/50">
                        {seccion.categorias
                          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                          .map((categoria, categoriaIndex) => {
                            const isCategoriaExpandida = categoriasExpandidas.has(categoria.id);

                            return (
                              <div key={categoria.id} className={`${categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}`}>
                                {/* Nivel 2: Categoría */}
                                <button
                                  onClick={() => toggleCategoria(categoria.id)}
                                  className="w-full flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      {isCategoriaExpandida ? (
                                        <ChevronDown className="w-3 h-3 text-zinc-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-zinc-400" />
                                      )}
                                      <h5 className="text-sm font-medium text-zinc-300">{categoria.nombre}</h5>
                                    </div>
                                    {serviciosSeleccionados.secciones[seccion.id]?.categorias[categoria.id] ? (
                                      <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">
                                        {serviciosSeleccionados.secciones[seccion.id].categorias[categoria.id]} {serviciosSeleccionados.secciones[seccion.id].categorias[categoria.id] === 1 ? 'item' : 'items'} seleccionado{serviciosSeleccionados.secciones[seccion.id].categorias[categoria.id] === 1 ? '' : 's'}
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                                        {categoria.servicios.length} {categoria.servicios.length === 1 ? 'item' : 'items'} disponible{categoria.servicios.length === 1 ? '' : 's'}
                                      </span>
                                    )}
                                  </div>
                                </button>

                                {isCategoriaExpandida && (
                                  <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                                    {categoria.servicios
                                      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                                      .map((servicio, servicioIndex) => {
                                        const tipoUtilidad = servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto';
                                        const precios = configuracionPrecios ? calcularPrecio(
                                          servicio.costo,
                                          servicio.gasto,
                                          tipoUtilidad,
                                          configuracionPrecios
                                        ) : { precio_final: 0 };
                                        const cantidad = items[servicio.id] || 0;
                                        const subtotal = precios.precio_final * cantidad;

                                        return (
                                          <div
                                            key={servicio.id}
                                            className={`flex items-center justify-between py-3 px-2 pl-6 ${servicioIndex > 0 ? 'border-t border-zinc-700/30' : ''} hover:bg-zinc-700/20 transition-colors ${cantidad > 0 ? 'bg-emerald-900/10 border-l-2 border-emerald-500/50' : ''}`}
                                          >
                                            {/* Nivel 3: Servicio */}
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm text-zinc-300 leading-tight font-light">
                                                <span className="break-words">{servicio.nombre}</span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1">
                                                <ZenBadge
                                                  variant="outline"
                                                  size="sm"
                                                  className={`px-1 py-0 text-[10px] font-light rounded-sm ${servicio.tipo_utilidad === 'service'
                                                    ? 'border-blue-600 text-blue-400'
                                                    : 'border-purple-600 text-purple-400'
                                                    }`}
                                                >
                                                  {servicio.tipo_utilidad === 'service' ? 'Servicio' : 'Producto'}
                                                </ZenBadge>
                                                <span className="text-xs text-green-400">
                                                  {formatearMoneda(precios.precio_final)}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center gap-1 w-16 justify-center">
                                                <button
                                                  type="button"
                                                  onClick={() => updateQuantity(servicio.id, Math.max(0, cantidad - 1))}
                                                  className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                >
                                                  -
                                                </button>
                                                <span className={`w-6 text-center text-sm font-medium ${cantidad > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                                  {cantidad}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => updateQuantity(servicio.id, cantidad + 1)}
                                                  className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                >
                                                  +
                                                </button>
                                              </div>

                                              <div className="text-right w-20">
                                                <div className={`text-sm font-medium ${cantidad > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                  {formatearMoneda(subtotal)}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
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

              {/* Botones */}
              <div className="border-t border-zinc-700 pt-3">
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
            </div>
          </div>
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
