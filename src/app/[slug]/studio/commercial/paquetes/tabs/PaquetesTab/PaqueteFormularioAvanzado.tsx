'use client';

import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle, ImageIcon } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import { CatalogoServiciosTree } from '@/components/shared/catalogo';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { crearPaquete, actualizarPaquete } from '@/lib/actions/studio/paquetes/paquetes.actions';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { PaqueteCoverDropzone } from './PaqueteCoverDropzone';

interface PaqueteFormularioAvanzadoProps {
    studioSlug: string;
    paquete?: PaqueteFromDB | null;
    isPublished?: boolean;
    onPublishedChange?: (published: boolean) => void;
    isFeatured?: boolean;
    onFeaturedChange?: (featured: boolean) => void;
    onSave: (paquete: PaqueteFromDB) => void;
    onCancel: () => void;
    initialEventTypeId?: string;
}

export interface PaqueteFormularioRef {
    hasSelectedItems: () => boolean;
}

export const PaqueteFormularioAvanzado = forwardRef<PaqueteFormularioRef, PaqueteFormularioAvanzadoProps>(({
    studioSlug,
    paquete,
    isPublished: isPublishedProp,
    onPublishedChange,
    isFeatured: isFeaturedProp,
    onFeaturedChange,
    onSave,
    onCancel,
    initialEventTypeId
}, ref) => {
    // Estado del formulario
    const [nombre, setNombre] = useState(paquete?.name || '');
    const [descripcion, setDescripcion] = useState('');
    const [isFeaturedInternal, setIsFeaturedInternal] = useState((paquete as { is_featured?: boolean })?.is_featured || false);
    const [precioPersonalizado, setPrecioPersonalizado] = useState<string | number>('');
    const [isPublishedInternal, setIsPublishedInternal] = useState(paquete?.status === 'active' || false);

    // Estado para cover
    const [coverMedia, setCoverMedia] = useState<Array<{
        file_url: string;
        file_type: string;
        filename: string;
        thumbnail_url?: string;
        file_size?: number;
    }>>([]);

    // Guardar cover original para comparar cambios
    const [originalCoverUrl, setOriginalCoverUrl] = useState<string | null>(null);

    // Hook de upload
    const { uploadFiles, deleteFile, isUploading } = useMediaUpload();

    // Hook para actualizar storage
    const { triggerRefresh } = useStorageRefresh(studioSlug);

    // Usar prop si está disponible, sino usar estado interno
    const isPublished = isPublishedProp !== undefined ? isPublishedProp : isPublishedInternal;
    const isFeatured = isFeaturedProp !== undefined ? isFeaturedProp : isFeaturedInternal;
    const setIsFeatured = onFeaturedChange || setIsFeaturedInternal;
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


    // Cargar catálogo, configuración y datos del paquete en un solo useEffect
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

                    // Si estamos editando un paquete, cargar sus datos
                    if (paquete?.id) {
                        console.log('🔍 Cargando datos del paquete para editar:', paquete);
                        setNombre(paquete.name || '');
                        setDescripcion((paquete as { description?: string }).description || '');
                        if (onFeaturedChange) {
                            onFeaturedChange((paquete as { is_featured?: boolean }).is_featured || false);
                        } else {
                            setIsFeaturedInternal((paquete as { is_featured?: boolean }).is_featured || false);
                        }
                        setPrecioPersonalizado(paquete.precio || '');

                        // Cargar cover si existe
                        const coverUrl = (paquete as { cover_url?: string }).cover_url;
                        setOriginalCoverUrl(coverUrl || null);
                        if (coverUrl) {
                            const filename = coverUrl.split('/').pop() || 'cover.jpg';
                            const isVideo = filename.toLowerCase().includes('.mp4') ||
                                filename.toLowerCase().includes('.mov') ||
                                filename.toLowerCase().includes('.webm') ||
                                filename.toLowerCase().includes('.avi');
                            setCoverMedia([{
                                file_url: coverUrl,
                                file_type: isVideo ? 'video' : 'image',
                                filename: filename
                            }]);
                        } else {
                            setCoverMedia([]);
                        }
                        if (onPublishedChange) {
                            onPublishedChange(paquete.status === 'active');
                        } else {
                            setIsPublishedInternal(paquete.status === 'active');
                        }

                        // Cargar items del paquete si existen
                        if (paquete.paquete_items && paquete.paquete_items.length > 0) {
                            console.log('✅ Cargando items del paquete:', paquete.paquete_items);
                            const paqueteItems: { [id: string]: number } = {};
                            paquete.paquete_items.forEach(item => {
                                if (item.item_id) {
                                    paqueteItems[item.item_id] = item.quantity;
                                }
                            });
                            console.log('✅ Items procesados:', paqueteItems);
                            setItems(paqueteItems);
                        } else {
                            console.log('⚠️ No hay paquete_items o está vacío');
                            setItems(initialItems);
                        }
                    } else {
                        // Si no hay paquete, usar items vacíos
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studioSlug, paquete?.id]); // Solo usar paquete.id para evitar re-renders por cambios en referencia del objeto


    // Crear mapa de servicios para acceso rápido
    // Memoizar valores de configuracionPrecios para evitar re-renders innecesarios
    const configKey = useMemo(() => {
        if (!configuracionPrecios) return 'no-config';
        return `${configuracionPrecios.utilidad_servicio}-${configuracionPrecios.utilidad_producto}-${configuracionPrecios.comision_venta}-${configuracionPrecios.sobreprecio}`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        configuracionPrecios?.utilidad_servicio,
        configuracionPrecios?.utilidad_producto,
        configuracionPrecios?.comision_venta,
        configuracionPrecios?.sobreprecio
    ]); // Solo dependemos de los valores, no del objeto completo

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
    }, [catalogo, configuracionPrecios]); // Mantener configuracionPrecios pero memoizar por valores

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
        }
        // No colapsar automáticamente cuando se limpia el filtro para evitar parpadeo
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroServicio]); // Remover catalogoFiltrado de dependencias para evitar re-renders innecesarios

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

    // Estado para el cálculo de precios
    const [calculoPrecio, setCalculoPrecio] = useState({
        subtotal: 0,
        totalCosto: 0,
        totalGasto: 0,
        total: 0,
        utilidadNeta: 0,
        utilidadNetaCalculada: 0, // Utilidad basada solo en precio calculado
        diferenciaPrecio: 0 // Diferencia entre precio personalizado y calculado
    });

    // Items del paquete para el desglose
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
            setItemsParaDesglose([]);
            return;
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

        // Utilidad basada solo en precio calculado (sin personalizar)
        const utilidadNetaCalculada = subtotal - (totalCosto + totalGasto);

        // Diferencia entre precio personalizado y precio calculado
        const diferenciaPrecio = precioPersonalizadoNum > 0 ? precioPersonalizadoNum - subtotal : 0;

        // Precio final a usar (personalizado o calculado)
        const total = precioPersonalizadoNum > 0 ? precioPersonalizadoNum : subtotal;

        // Utilidad neta final (considera precio personalizado si existe)
        const utilidadNeta = total - (totalCosto + totalGasto);

        const resultado = {
            subtotal: Number(subtotal.toFixed(2)) || 0,
            totalCosto: Number(totalCosto.toFixed(2)) || 0,
            totalGasto: Number(totalGasto.toFixed(2)) || 0,
            total: Number(total.toFixed(2)) || 0,
            utilidadNeta: Number(utilidadNeta.toFixed(2)) || 0,
            utilidadNetaCalculada: Number(utilidadNetaCalculada.toFixed(2)) || 0,
            diferenciaPrecio: Number(diferenciaPrecio.toFixed(2)) || 0
        };

        setCalculoPrecio(resultado);

        // Preparar items para el desglose del paquete
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, precioPersonalizado, configKey]); // servicioMap depende de configKey, evitar dependencias anidadas

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
                .map(([servicioId, cantidad]) => {
                    const servicio = servicioMap.get(servicioId);

                    if (!servicio?.servicioCategoriaId) {
                        console.error('❌ Servicio sin servicioCategoriaId:', servicio);
                        throw new Error(`Servicio ${servicioId} no tiene categoría asociada`);
                    }

                    return {
                        servicioId,
                        cantidad,
                        servicioCategoriaId: servicio.servicioCategoriaId
                    };
                });

            const data = {
                name: nombre,
                description: descripcion,
                cover_url: coverMedia[0]?.file_url || null,
                cover_storage_bytes: coverMedia[0]?.file_size ? BigInt(coverMedia[0].file_size) : null,
                event_type_id: initialEventTypeId || paquete?.event_type_id || 'temp', // Usar initialEventTypeId si está disponible
                precio: calculoPrecio.total,
                status: isPublished ? 'active' : 'inactive',
                is_featured: isFeatured,
                servicios: serviciosData
            };

            const newCoverUrl = coverMedia[0]?.file_url || null;
            const coverChanged = originalCoverUrl !== newCoverUrl;

            let result;
            if (paquete?.id) {
                // Actualizar paquete existente
                console.log('[PaqueteFormularioAvanzado] Actualizando paquete:', paquete.id, data);
                result = await actualizarPaquete(studioSlug, paquete.id, data);
                console.log('[PaqueteFormularioAvanzado] Resultado actualización:', result);
                if (result.success && result.data) {
                    toast.success('Paquete actualizado exitosamente');
                    // Actualizar storage solo si el cover cambió (se subió nueva imagen/video)
                    if (coverChanged) {
                        triggerRefresh();
                    }
                    // Actualizar cover original para futuras comparaciones
                    setOriginalCoverUrl(newCoverUrl);
                    onSave(result.data);
                } else {
                    const errorMsg = result.error || 'Error al actualizar el paquete';
                    console.error('[PaqueteFormularioAvanzado] Error actualizando:', errorMsg);
                    toast.error(errorMsg);
                }
            } else {
                // Crear nuevo paquete
                console.log('[PaqueteFormularioAvanzado] Creando paquete:', data);
                result = await crearPaquete(studioSlug, data);
                console.log('[PaqueteFormularioAvanzado] Resultado creación:', result);
                if (result.success && result.data) {
                    toast.success('Paquete creado exitosamente');
                    // Actualizar storage solo si tiene cover (se subió imagen/video)
                    if (newCoverUrl) {
                        triggerRefresh();
                    }
                    // Actualizar cover original para futuras comparaciones
                    setOriginalCoverUrl(newCoverUrl);
                    onSave(result.data);
                } else {
                    const errorMsg = result.error || 'Error al crear el paquete';
                    console.error('[PaqueteFormularioAvanzado] Error creando:', errorMsg, result);
                    toast.error(errorMsg);
                }
            }
        } catch (error) {
            console.error('[PaqueteFormularioAvanzado] Error en handleSubmit:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al guardar el paquete';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

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
                            <div className="space-y-4 mb-4">
                                <div>
                                    <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
                                    <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                                </div>
                                <div>
                                    <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
                                    <div className="h-20 w-full bg-zinc-800 rounded-lg animate-pulse" />
                                </div>
                            </div>
                            {/* Cover skeleton */}
                            <div className="mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
                                    <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                                </div>
                                <div className="h-32 w-full bg-zinc-800 rounded-lg border border-zinc-700 animate-pulse" />
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

            {/* Columna 2: Configuración del Paquete */}
            <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Configuración</h3>

                        <ZenInput
                            label="Nombre del Paquete"
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
                            className="min-h-[80px]"
                        />

                        {/* Cover */}
                        <div className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span className="font-medium text-white text-sm">
                                    Carátula <span className="text-zinc-400 font-normal">(opcional)</span>
                                </span>
                            </div>
                            <PaqueteCoverDropzone
                                media={coverMedia}
                                onDropFiles={async (files) => {
                                    try {
                                        const uploadedFiles = await uploadFiles(
                                            files,
                                            studioSlug,
                                            'paquetes',
                                            paquete?.id
                                        );

                                        if (uploadedFiles.length > 0) {
                                            const newCover = uploadedFiles[0];
                                            const isVideo = newCover.fileName.toLowerCase().includes('.mp4') ||
                                                newCover.fileName.toLowerCase().includes('.mov') ||
                                                newCover.fileName.toLowerCase().includes('.webm') ||
                                                newCover.fileName.toLowerCase().includes('.avi');
                                            setCoverMedia([{
                                                file_url: newCover.url,
                                                file_type: isVideo ? 'video' : 'image',
                                                filename: newCover.fileName,
                                                thumbnail_url: newCover.url,
                                                file_size: newCover.size
                                            }]);
                                        }
                                    } catch (error) {
                                        console.error('Error uploading cover:', error);
                                        toast.error('Error al subir la carátula');
                                    }
                                }}
                                onRemoveMedia={async () => {
                                    if (coverMedia[0]?.file_url) {
                                        try {
                                            await deleteFile(coverMedia[0].file_url, studioSlug, coverMedia[0].file_size);
                                            setCoverMedia([]);
                                        } catch (error) {
                                            console.error('Error deleting cover:', error);
                                            toast.error('Error al eliminar la carátula');
                                        }
                                    } else {
                                        setCoverMedia([]);
                                    }
                                }}
                                isUploading={isUploading}
                            />
                        </div>

                    </div>


                    {/* Resumen Financiero */}
                    <div ref={summaryRef} className="z-10">
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
                                        value={precioPersonalizado}
                                        onChange={(e) => setPrecioPersonalizado(e.target.value)}
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
