'use client';

import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/utilidad.actions';
import { crearPaquete } from '@/lib/actions/studio/builder/catalogo/paquetes.actions';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';

interface PaqueteFormularioAvanzadoProps {
    studioSlug: string;
    paquete?: PaqueteFromDB | null;
    onSave: (paquete: PaqueteFromDB) => void;
    onCancel: () => void;
}

export interface PaqueteFormularioRef {
    hasSelectedItems: () => boolean;
}

export const PaqueteFormularioAvanzado = forwardRef<PaqueteFormularioRef, PaqueteFormularioAvanzadoProps>(({
    studioSlug,
    paquete,
    onSave,
    onCancel
}, ref) => {
    // Estado del formulario
    const [nombre, setNombre] = useState(paquete?.name || '');
    const [descripcion, setDescripcion] = useState('');
    const [precioPersonalizado, setPrecioPersonalizado] = useState(0);
    const [items, setItems] = useState<{ [servicioId: string]: number }>({});
    const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
    const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(null);
    const [loading, setLoading] = useState(false);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
    const [filtroServicio, setFiltroServicio] = useState('');
    const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
    const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const summaryRef = useRef<HTMLDivElement>(null);

    // Cargar catálogo y configuración al montar
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
                    // Inicializar items con cantidad 0
                    const initialItems: { [id: string]: number } = {};
                    catalogoResult.data.forEach(seccion => {
                        seccion.categorias.forEach(categoria => {
                            categoria.servicios.forEach(servicio => {
                                initialItems[servicio.id] = 0;
                            });
                        });
                    });
                    setItems(initialItems);

                    // Expandir la primera sección por defecto
                    if (catalogoResult.data.length > 0) {
                        setSeccionesExpandidas(new Set([catalogoResult.data[0].id]));
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
    }, [studioSlug]);


    // Crear mapa de servicios para acceso rápido
    const servicioMap = useMemo(() => {
        if (!configuracionPrecios) return new Map();

        const map = new Map();
        catalogo.forEach(seccion => {
            seccion.categorias.forEach(categoria => {
                categoria.servicios.forEach(servicio => {
                    // Mapear tipo_utilidad de la BD a formato esperado por calcularPrecio
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

    // Auto-expandir secciones y categorías cuando hay filtros
    useEffect(() => {
        if (filtroServicio.trim() && catalogoFiltrado.length > 0) {
            // Expandir todas las secciones que tengan resultados
            const seccionesConResultados = new Set(catalogoFiltrado.map(seccion => seccion.id));
            setSeccionesExpandidas(seccionesConResultados);

            // Expandir todas las categorías que tengan resultados
            const categoriasConResultados = new Set<string>();
            catalogoFiltrado.forEach(seccion => {
                seccion.categorias.forEach(categoria => {
                    if (categoria.servicios.length > 0) {
                        categoriasConResultados.add(categoria.id);
                    }
                });
            });
            setCategoriasExpandidas(categoriasConResultados);
        } else if (!filtroServicio.trim()) {
            // Cuando se limpia el filtro, colapsar todo
            setSeccionesExpandidas(new Set());
            setCategoriasExpandidas(new Set());
        }
    }, [filtroServicio, catalogoFiltrado]);

    // Verificar si hay items seleccionados
    const hasSelectedItems = useMemo(() => {
        return Object.values(items).some(cantidad => cantidad > 0);
    }, [items]);

    // Exponer función al componente padre
    useImperativeHandle(ref, () => ({
        hasSelectedItems: () => hasSelectedItems
    }), [hasSelectedItems]);

    // Manejar intento de cierre
    const handleCancelClick = () => {
        if (hasSelectedItems) {
            setShowConfirmDialog(true);
        } else {
            onCancel();
        }
    };

    // Confirmar cierre
    const handleConfirmClose = () => {
        setShowConfirmDialog(false);
        onCancel();
    };

    // Cancelar cierre
    const handleCancelClose = () => {
        setShowConfirmDialog(false);
    };

    // Cálculo dinámico del precio
    const calculoPrecio = useMemo(() => {
        if (!configuracionPrecios) {
            return {
                subtotal: 0,
                totalCosto: 0,
                totalGasto: 0,
                total: 0,
                utilidadNeta: 0
            };
        }

        const serviciosSeleccionados = Object.entries(items)
            .filter(([, cantidad]) => cantidad > 0)
            .map(([id, cantidad]) => {
                const servicio = servicioMap.get(id);
                if (!servicio) return null;

                // Calcular precio en tiempo real
                // Mapear tipo_utilidad de la BD a formato esperado por calcularPrecio
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
                    cantidad
                };
            })
            .filter(Boolean);

        if (serviciosSeleccionados.length === 0) {
            return {
                subtotal: 0,
                totalCosto: 0,
                totalGasto: 0,
                total: 0,
                utilidadNeta: 0
            };
        }

        let subtotal = 0;
        let totalCosto = 0;
        let totalGasto = 0;

        serviciosSeleccionados.forEach(s => {
            subtotal += (s.precioUnitario || 0) * s.cantidad;
            totalCosto += (s.costo || 0) * s.cantidad;
            totalGasto += (s.gasto || 0) * s.cantidad;
        });

        const total = precioPersonalizado > 0 ? precioPersonalizado : subtotal;
        const utilidadNeta = total - (totalCosto + totalGasto);

        return {
            subtotal: Number(subtotal.toFixed(2)) || 0,
            totalCosto: Number(totalCosto.toFixed(2)) || 0,
            totalGasto: Number(totalGasto.toFixed(2)) || 0,
            total: Number(total.toFixed(2)) || 0,
            utilidadNeta: Number(utilidadNeta.toFixed(2)) || 0
        };
    }, [items, servicioMap, precioPersonalizado, configuracionPrecios]);

    // Handlers para toggles (accordion behavior)
    const toggleSeccion = (seccionId: string) => {
        setSeccionesExpandidas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(seccionId)) {
                newSet.delete(seccionId);
                // También cerrar todas las categorías de esta sección
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

        // Mostrar toast al agregar/quitar items
        if (cantidad > prevCantidad && servicio) {
            toast.success(`${servicio.nombre} agregado al paquete`);
        } else if (cantidad === 0 && prevCantidad > 0 && servicio) {
            toast.info(`${servicio.nombre} removido del paquete`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombre.trim()) {
            toast.error('El nombre del paquete es requerido');
            return;
        }

        console.log('Datos del paquete:', { nombre, descripcion, precio: calculoPrecio.total });

        if (Object.keys(items).length === 0) {
            toast.error('Agrega al menos un servicio');
            return;
        }

        setLoading(true);
        try {
            const serviciosData = Object.entries(items)
                .filter(([, cantidad]) => cantidad > 0)
                .map(([servicioId, cantidad]) => ({
                    servicioId,
                    cantidad,
                    servicioCategoriaId: servicioMap.get(servicioId)?.servicio_categoria_id || ''
                }));

            const data = {
                name: nombre,
                descripcion,
                event_type_id: 'temp', // TODO: Obtener del contexto
                precio: calculoPrecio.total,
                servicios: serviciosData
            };

            const result = await crearPaquete(studioSlug, data);
            if (result.success && result.data) {
                toast.success('Paquete creado exitosamente');
                onSave(result.data);
            } else {
                toast.error(result.error || 'Error al crear el paquete');
            }
        } catch (error) {
            console.error('Error creando paquete:', error);
            toast.error('Error al crear el paquete');
        } finally {
            setLoading(false);
        }
    };

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full">
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
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <h4 className="font-semibold text-white">{seccion.nombre}</h4>
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
                                            {isSeccionExpandida ? (
                                                <ChevronDown className="w-4 h-4 text-zinc-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                                            )}
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
                                                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                                                        <h5 className="text-sm font-medium text-zinc-300">{categoria.nombre}</h5>
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
                                                                    {isCategoriaExpandida ? (
                                                                        <ChevronDown className="w-3 h-3 text-zinc-400" />
                                                                    ) : (
                                                                        <ChevronRight className="w-3 h-3 text-zinc-400" />
                                                                    )}
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
                                                                                        className={`flex items-center justify-between p-2 pl-6 ${servicioIndex > 0 ? 'border-t border-zinc-700/30' : ''} hover:bg-zinc-700/20 transition-colors ${cantidad > 0 ? 'bg-emerald-900/10 border-l-2 border-emerald-500/50' : ''}`}
                                                                                    >
                                                                                        {/* Nivel 3: Servicio */}
                                                                                        <div className="flex-1">
                                                                                            <div className="text-sm font-medium text-white leading-tight">{servicio.nombre}</div>
                                                                                            <div className="text-xs text-zinc-500 mt-1">
                                                                                                {servicio.tipo_utilidad === 'service' ? 'Servicio' : 'Producto'}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="text-right w-20">
                                                                                                <div className="text-sm font-medium text-white">{formatearMoneda(precios.precio_final)}</div>
                                                                                            </div>

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

            {/* Columna 2: Configuración del Paquete */}
            <div className="space-y-6 h-full">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Configuración</h3>

                        <ZenInput
                            label="Nombre del Paquete *"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Paquete Fotógrafo Boda"
                            required
                            className="mb-4"
                        />

                        <ZenTextarea
                            label="Descripción (opcional)"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Describe los servicios incluidos..."
                        />
                    </div>

                    {/* Resumen Financiero */}
                    <div ref={summaryRef} className=" self-start">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            Resumen Financiero
                        </h3>
                        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Subtotal:</span>
                                <span className="text-white">{formatearMoneda(calculoPrecio.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Costo total:</span>
                                <span className="text-zinc-400">{formatearMoneda(calculoPrecio.totalCosto)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Gasto total:</span>
                                <span className="text-zinc-400">{formatearMoneda(calculoPrecio.totalGasto)}</span>
                            </div>
                            <div className="border-t border-zinc-700 pt-3">
                                <div className="flex justify-between">
                                    <span className="text-white font-semibold">Total:</span>
                                    <span className="text-emerald-400 font-semibold text-lg">
                                        {formatearMoneda(calculoPrecio.total)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Utilidad neta:</span>
                                <span className={`font-medium ${calculoPrecio.utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                    {formatearMoneda(calculoPrecio.utilidadNeta)}
                                </span>
                            </div>

                            {/* Precio personalizado dentro del resumen */}
                            <div className="border-t border-zinc-700 pt-3">
                                <ZenInput
                                    label="Precio personalizado (opcional)"
                                    type="number"
                                    value={precioPersonalizado}
                                    onChange={(e) => setPrecioPersonalizado(Number(e.target.value))}
                                    placeholder="0"
                                    hint="Deja en 0 para usar el precio calculado automáticamente"
                                />
                            </div>

                            {/* Botones dentro del resumen */}
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
                                        {paquete?.id ? 'Actualizar' : 'Crear'} Paquete
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
                            Se perderán todos los cambios realizados. Los items seleccionados y la configuración del paquete no se guardarán.
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
});

PaqueteFormularioAvanzado.displayName = 'PaqueteFormularioAvanzado';
