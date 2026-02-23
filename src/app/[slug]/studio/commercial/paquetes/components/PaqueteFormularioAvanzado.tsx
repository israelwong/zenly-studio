'use client';

import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import { X, ChevronDown, ChevronRight, AlertTriangle, ImageIcon, Eye, EyeOff, Save, Globe, FileText, Plus, Edit2 } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenBadge, ZenDialog } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { PrecioDesglosePaquete } from '@/components/shared/precio';
import { CatalogoServiciosTree } from '@/components/shared/catalogo';
import { ItemEditorModal, type ItemFormData } from '@/components/shared/catalogo/ItemEditorModal';
import { crearPaquete, actualizarPaquete } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { crearItem, actualizarItem } from '@/lib/actions/studio/catalogo';
import { getServiceLinks, type ServiceLinksMap } from '@/lib/actions/studio/config/item-links.actions';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import type { SeccionData, ServicioData } from '@/lib/actions/schemas/catalogo-schemas';
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
    initialCatalogo?: SeccionData[];
    initialPreciosConfig?: ConfiguracionPrecios | null;
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
    initialEventTypeId,
    initialCatalogo,
    initialPreciosConfig
}, ref) => {
    // Estado del formulario
    const [nombre, setNombre] = useState(paquete?.name || '');
    const [descripcion, setDescripcion] = useState('');
    const [baseHours, setBaseHours] = useState<number | ''>((paquete as { base_hours?: number | null })?.base_hours || '');
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
    // Inicializar catálogo y configuración desde props si están disponibles
    const [catalogo, setCatalogo] = useState<SeccionData[]>(initialCatalogo || []);
    const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(initialPreciosConfig || null);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(!initialCatalogo);

    // Inicializar items vacíos desde catálogo usando useMemo
    const initialItems = useMemo(() => {
        const items: { [id: string]: number } = {};
        if (catalogo.length > 0) {
            catalogo.forEach(seccion => {
                seccion.categorias.forEach(categoria => {
                    categoria.servicios.forEach(servicio => {
                        items[servicio.id] = 0;
                    });
                });
            });
        }
        return items;
    }, [catalogo]);

    const [items, setItems] = useState<{ [servicioId: string]: number }>(initialItems);
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [filtroServicio, setFiltroServicio] = useState('');
    const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
    const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [serviceLinksMap, setServiceLinksMap] = useState<ServiceLinksMap>({});
    const summaryRef = useRef<HTMLDivElement>(null);

    // Estados para edición/creación de ítems
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<ItemFormData | null>(null);
    const [selectedCategoriaForItem, setSelectedCategoriaForItem] = useState<string | null>(null);


    // Inicializar datos del paquete y expandir secciones
    useEffect(() => {
        // Si hay catálogo inicial, expandir todas las secciones y categorías
        if (catalogo.length > 0) {
            const todasLasSecciones = new Set(catalogo.map(seccion => seccion.id));
            setSeccionesExpandidas(todasLasSecciones);
            const todasLasCategorias = new Set(catalogo.flatMap(seccion => seccion.categorias.map(c => c.id)));
            setCategoriasExpandidas(todasLasCategorias);
        }

        // Si estamos editando un paquete, cargar sus datos
        if (paquete?.id) {
            setNombre(paquete.name || '');
            setDescripcion((paquete as { description?: string }).description || '');
            setBaseHours((paquete as { base_hours?: number | null })?.base_hours || '');
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
                const paqueteItems: { [id: string]: number } = {};
                const serviciosSeleccionados = new Set<string>();
                paquete.paquete_items.forEach(item => {
                    if (item.item_id) {
                        paqueteItems[item.item_id] = item.quantity;
                        serviciosSeleccionados.add(item.item_id);
                    }
                });
                setItems(paqueteItems);
                setSelectedServices(serviciosSeleccionados);
            } else {
                setItems(initialItems);
                setSelectedServices(new Set());
            }
        } else {
            // Si no hay paquete, usar items vacíos
            setItems(initialItems);
            setNombre('');
            setDescripcion('');
            setPrecioPersonalizado('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paquete?.id]); // Solo usar paquete.id para evitar re-renders

    // Cargar mapa de vínculos (padre → hijos) para inserción en cascada
    useEffect(() => {
        if (!studioSlug) return;
        getServiceLinks(studioSlug).then(result => {
            if (result.success && result.data) setServiceLinksMap(result.data);
        });
    }, [studioSlug]);

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
        billing_type?: 'HOUR' | 'SERVICE' | 'UNIT';
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

        // Obtener base_hours para cálculo dinámico
        const durationHours = baseHours !== '' && baseHours !== null ? Number(baseHours) : null;

        // Solo considerar servicios seleccionados
        const serviciosSeleccionados = Array.from(selectedServices)
            .map(id => {
                const servicio = servicioMap.get(id);
                if (!servicio) return null;

                const cantidad = items[id] || 0;
                if (cantidad <= 0) return null;

                // Obtener billing_type del servicio (default: SERVICE para compatibilidad)
                const billingType = (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';

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
                    billingType,
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
            // Para HOUR: precio_hora × base_hours (sin multiplicar por cantidad)
            // Para SERVICE/UNIT: cantidad × precio_unitario
            if (s.billingType === 'HOUR' && durationHours !== null && durationHours > 0) {
                // Precio por hora × horas base
                subtotal += (s.precioUnitario || 0) * durationHours;
                totalCosto += (s.costo || 0) * durationHours;
                totalGasto += (s.gasto || 0) * durationHours;
            } else {
                // Precio fijo × cantidad
                subtotal += (s.precioUnitario || 0) * s.cantidad;
                totalCosto += (s.costo || 0) * s.cantidad;
                totalGasto += (s.gasto || 0) * s.cantidad;
            }
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
                // Para el desglose, usar cantidad base (no efectiva)
                // El componente PrecioDesglosePaquete calculará correctamente según billing_type
                return {
                    id: s.id,
                    nombre: s.nombre,
                    costo: s.costo || 0,
                    gasto: s.gasto || 0,
                    tipo_utilidad: tipoUtilidad,
                    cantidad: s.cantidad, // Cantidad base
                    billing_type: s.billingType,
                };
            });

        setItemsParaDesglose(itemsDesglose as Array<{
            id: string;
            nombre: string;
            costo: number;
            gasto: number;
            tipo_utilidad: 'service' | 'product';
            cantidad: number;
            billing_type?: 'HOUR' | 'SERVICE' | 'UNIT';
        }>);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, precioPersonalizado, baseHours, configKey, catalogo, selectedServices]); // Incluir catalogo y selectedServices para recalcular cuando cambien

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

    // Handlers para edición/creación de ítems
    const handleCreateItem = () => {
        // Si hay filtro activo, usar la primera categoría de los resultados
        // Si no, usar la primera categoría disponible
        let categoriaId: string | null = null;
        
        if (catalogoFiltrado.length > 0) {
            const primeraSeccion = catalogoFiltrado[0];
            if (primeraSeccion.categorias.length > 0) {
                categoriaId = primeraSeccion.categorias[0].id;
            }
        } else if (catalogo.length > 0) {
            const primeraSeccion = catalogo[0];
            if (primeraSeccion.categorias.length > 0) {
                categoriaId = primeraSeccion.categorias[0].id;
            }
        }

        if (!categoriaId) {
            toast.error('No hay categorías disponibles. Crea una categoría primero en el catálogo.');
            return;
        }

        setSelectedCategoriaForItem(categoriaId);
        setItemToEdit(null);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (servicioId: string) => {
        // Buscar el servicio en el catálogo
        let servicioEncontrado: ServicioData | null = null;
        let categoriaId: string | null = null;

        for (const seccion of catalogo) {
            for (const categoria of seccion.categorias) {
                const servicio = categoria.servicios.find(s => s.id === servicioId);
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

        // Convertir ServicioData a ItemFormData
        const tipoUtilidad = servicioEncontrado.tipo_utilidad === 'service' ? 'servicio' : 'producto';
        const itemData: ItemFormData = {
            id: servicioEncontrado.id,
            name: servicioEncontrado.nombre,
            cost: servicioEncontrado.costo,
            description: servicioEncontrado.descripcion || '',
            categoriaeId: categoriaId,
            tipoUtilidad,
            billing_type: (servicioEncontrado.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
            gastos: servicioEncontrado.gastos?.map(g => ({ nombre: g.nombre, costo: g.costo })) || [],
            status: servicioEncontrado.status || 'active',
        };

        setItemToEdit(itemData);
        setSelectedCategoriaForItem(categoriaId);
        setIsItemModalOpen(true);
    };

    const handleSaveItem = async (data: ItemFormData) => {
        try {
            if (data.id) {
                // Editar ítem existente
                const response = await actualizarItem(data);
                if (!response.success) {
                    toast.error(response.error || 'Error al actualizar el item');
                    return;
                }

                // Actualizar catálogo local
                setCatalogo(prev => prev.map(seccion => ({
                    ...seccion,
                    categorias: seccion.categorias.map(categoria => ({
                        ...categoria,
                        servicios: categoria.servicios.map(servicio => {
                            if (servicio.id === data.id) {
                                return {
                                    ...servicio,
                                    nombre: data.name,
                                    costo: data.cost,
                                    tipo_utilidad: data.tipoUtilidad === 'servicio' ? 'service' : 'product',
                                    billing_type: data.billing_type || 'SERVICE',
                                    gasto: data.gastos?.reduce((acc, g) => acc + g.costo, 0) || 0,
                                    gastos: data.gastos?.map(g => ({ nombre: g.nombre, costo: g.costo })) || [],
                                    status: data.status || 'active',
                                };
                            }
                            return servicio;
                        })
                    }))
                })));

                // El recálculo de precios se disparará automáticamente por el useEffect
                // que depende de catalogo, items, selectedServices, etc.
                toast.success('Item actualizado. Precios recalculados automáticamente.');
            } else {
                // Crear nuevo ítem
                const response = await crearItem({
                    ...data,
                    categoriaeId: selectedCategoriaForItem!,
                    studioSlug: studioSlug,
                });
                if (!response.success) {
                    toast.error(response.error || 'Error al crear el item');
                    return;
                }

                if (response.data) {
                    // Agregar nuevo ítem al catálogo local
                    const nuevoServicio: ServicioData = {
                        id: response.data.id,
                        studioId: response.data.studioId || '',
                        servicioCategoriaId: selectedCategoriaForItem!,
                        nombre: response.data.name,
                        costo: response.data.cost,
                        gasto: response.data.gastos?.reduce((acc, g) => acc + g.costo, 0) || 0,
                        tipo_utilidad: response.data.tipoUtilidad === 'servicio' ? 'service' : 'product',
                        billing_type: (response.data.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                        orden: response.data.order || 0,
                        status: response.data.status || 'active',
                        descripcion: response.data.description || null,
                        gastos: response.data.gastos?.map(g => ({ nombre: g.nombre, costo: g.costo })) || [],
                    };

                    setCatalogo(prev => prev.map(seccion => ({
                        ...seccion,
                        categorias: seccion.categorias.map(categoria => {
                            if (categoria.id === selectedCategoriaForItem) {
                                return {
                                    ...categoria,
                                    servicios: [...categoria.servicios, nuevoServicio]
                                };
                            }
                            return categoria;
                        })
                    })));

                    // Seleccionar automáticamente el nuevo ítem
                    setSelectedServices(prev => new Set([...prev, nuevoServicio.id]));
                    setItems(prev => ({ ...prev, [nuevoServicio.id]: 1 }));

                    toast.success('Item creado y agregado al paquete');
                }
            }

            setIsItemModalOpen(false);
            setItemToEdit(null);
            setSelectedCategoriaForItem(null);

            // El recálculo de precios se disparará automáticamente por el useEffect
            // que depende de items, catalogo y configuracionPrecios
        } catch (error) {
            console.error('Error guardando item:', error);
            toast.error('Error al guardar el item');
        }
    };

    // Handlers (inserción en cascada: al agregar un Padre se agregan sus Hijos — soft-linking)
    const toggleServiceSelection = (servicioId: string) => {
        const servicio = servicioMap.get(servicioId);
        const linkedIds = serviceLinksMap[servicioId] ?? [];
        setSelectedServices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(servicioId)) {
                newSet.delete(servicioId);
                setItems(prevItems => {
                    const newItems = { ...prevItems };
                    delete newItems[servicioId];
                    return newItems;
                });
                if (servicio) {
                    toast.info(`${servicio.nombre} removido del paquete`, { id: 'paquete-remove' });
                }
            } else {
                newSet.add(servicioId);
                const toAdd = linkedIds.filter(id => !prev.has(id));
                toAdd.forEach(id => newSet.add(id));
                setItems(prevItems => {
                    const newItems = { ...prevItems, [servicioId]: 1 };
                    toAdd.forEach(id => { newItems[id] = 1; });
                    return newItems;
                });
                if (toAdd.length > 0) {
                    toast.success('Servicios asociados agregados con éxito.', { id: 'paquete-servicios-asociados' });
                } else if (servicio) {
                    toast.success(`${servicio.nombre} agregado al paquete`, { id: 'paquete-add' });
                }
            }
            return newSet;
        });
    };

    const updateQuantity = (servicioId: string, cantidad: number) => {
        const servicio = servicioMap.get(servicioId);
        const prevCantidad = items[servicioId] || 0;

        // Solo permitir actualizar cantidad si el servicio está seleccionado
        if (!selectedServices.has(servicioId)) {
            return;
        }

        setItems(prev => {
            const newItems = { ...prev };
            if (cantidad > 0) {
                newItems[servicioId] = cantidad;
            } else {
                // Si cantidad llega a 0, deseleccionar el servicio
                delete newItems[servicioId];
                setSelectedServices(prevSet => {
                    const newSet = new Set(prevSet);
                    newSet.delete(servicioId);
                    return newSet;
                });
                if (servicio) {
                    toast.info(`${servicio.nombre} removido del paquete`, { id: 'paquete-remove' });
                }
            }
            return newItems;
        });

        // Mostrar toast solo si cambió la cantidad (no al seleccionar)
        if (cantidad !== prevCantidad && prevCantidad > 0 && servicio) {
            toast.success(`Cantidad de ${servicio.nombre} actualizada`, { id: 'paquete-cantidad' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombre.trim()) {
            toast.error('El nombre del paquete es requerido');
            return;
        }

        // Validar que haya servicios seleccionados
        if (selectedServices.size === 0) {
            toast.error('Debes seleccionar al menos un servicio al paquete');
            return;
        }

        // Si es creación, siempre mostrar modal
        if (!paquete?.id) {
            setShowPublishDialog(true);
            return;
        }

        // Si es actualización
        const wasOriginallyPublished = paquete?.status === 'active';

        // Si estaba publicado Y sigue publicado, guardar directamente sin modal
        if (wasOriginallyPublished && isPublished) {
            await savePaquete(true);
            return;
        }

        // En cualquier otro caso (cambió de estado o no estaba publicado), mostrar modal
        setShowPublishDialog(true);
    };

    const savePaquete = async (shouldPublish: boolean) => {
        setLoading(true);
        try {
            // Solo guardar servicios seleccionados
            const serviciosData = Array.from(selectedServices)
                .map(servicioId => {
                    const servicio = servicioMap.get(servicioId);
                    const cantidad = items[servicioId] || 0;
                    const billingType = (servicio?.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';

                    if (!servicio?.servicioCategoriaId) {
                        console.error('❌ Servicio sin servicioCategoriaId:', servicio);
                        throw new Error(`Servicio ${servicioId} no tiene categoría asociada`);
                    }

                    // Para servicios HOUR, cantidad siempre es 1 (representa "incluido")
                    // Para servicios SERVICE/UNIT, usar la cantidad del estado
                    const cantidadAGuardar = billingType === 'HOUR'
                        ? 1
                        : (cantidad > 0 ? cantidad : 1);

                    return {
                        servicioId,
                        cantidad: cantidadAGuardar,
                        servicioCategoriaId: servicio.servicioCategoriaId
                    };
                })
                .filter(item => item.cantidad > 0);

            // Validar que base_hours sea un número válido si se proporciona
            const baseHoursValue = baseHours !== '' && baseHours !== null && !isNaN(Number(baseHours))
                ? Number(baseHours)
                : null;

            const data = {
                name: nombre,
                description: descripcion,
                base_hours: baseHoursValue,
                cover_url: coverMedia[0]?.file_url || null,
                cover_storage_bytes: coverMedia[0]?.file_size ? BigInt(coverMedia[0].file_size) : null,
                event_type_id: initialEventTypeId || paquete?.event_type_id || 'temp',
                precio: calculoPrecio.total,
                status: shouldPublish ? 'active' : 'inactive',
                is_featured: isFeatured,
                servicios: serviciosData
            };

            console.log('💾 Guardando paquete con datos:', {
                base_hours: data.base_hours,
                servicios: serviciosData.map(s => ({
                    servicioId: s.servicioId,
                    cantidad: s.cantidad,
                    billingType: servicioMap.get(s.servicioId)?.billing_type
                }))
            });

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
                    if (coverChanged) {
                        triggerRefresh();
                    }
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
                    if (newCoverUrl) {
                        triggerRefresh();
                    }
                    setOriginalCoverUrl(newCoverUrl);
                    onSave(result.data);
                } else {
                    const errorMsg = result.error || 'Error al crear el paquete';
                    console.error('[PaqueteFormularioAvanzado] Error creando:', errorMsg, result);
                    toast.error(errorMsg);
                }
            }
        } catch (error) {
            console.error('[PaqueteFormularioAvanzado] Error en savePaquete:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al guardar el paquete';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            setShowPublishDialog(false);
        }
    };

    const handlePublishAndSave = () => {
        savePaquete(true);
    };

    const handleSaveAsDraft = () => {
        savePaquete(false);
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
                    selectedServices={selectedServices}
                    onToggleSeccion={toggleSeccion}
                    onToggleCategoria={toggleCategoria}
                    onToggleSelection={toggleServiceSelection}
                    onUpdateQuantity={updateQuantity}
                    onEditItem={handleEditItem}
                    serviciosSeleccionados={serviciosSeleccionados}
                    configuracionPrecios={configuracionPrecios}
                    baseHours={baseHours !== '' && baseHours !== null ? Number(baseHours) : null}
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

                        <ZenInput
                            label="Horas Base"
                            type="number"
                            value={baseHours}
                            onChange={(e) => setBaseHours(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ej: 8"
                            min="0"
                            step="0.5"
                            hint="Duración base del paquete en horas. Los servicios tipo 'Por Hora' se multiplicarán por este valor."
                        />

                        {/* Cover */}
                        <div className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
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
                                    <div className="text-xs mt-2">
                                        <span className={calculoPrecio.diferenciaPrecio > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                            {calculoPrecio.diferenciaPrecio > 0 ? '+' : ''}{formatearMoneda(calculoPrecio.diferenciaPrecio)}
                                        </span>
                                        <span className="text-zinc-400">{' '}sobre la ganancia calculada</span>
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

            {/* Modal de confirmación de publicación */}
            <ZenDialog
                isOpen={showPublishDialog}
                onClose={() => !loading && setShowPublishDialog(false)}
                title={paquete?.id ? 'Actualizar Paquete' : 'Crear Paquete'}
                description={
                    paquete?.id
                        ? 'Elige cómo deseas actualizar este paquete'
                        : 'Elige cómo deseas crear este paquete'
                }
                maxWidth="lg"
            >
                <div className="space-y-4">
                    {/* Opción: Publicar */}
                    <button
                        type="button"
                        onClick={handlePublishAndSave}
                        disabled={loading}
                        className="w-full text-left p-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 mt-0.5">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                    <Globe className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-white text-base">
                                        {paquete?.id ? 'Actualizar y publicar' : 'Crear y publicar'}
                                    </h3>
                                    <ZenBadge variant="success" size="sm" className="text-xs">
                                        Visible
                                    </ZenBadge>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    El paquete estará visible y disponible para tus clientes. Podrán verlo y agregarlo a sus cotizaciones.
                                </p>
                            </div>
                            {loading ? (
                                <div className="shrink-0">
                                    <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-emerald-400 transition-colors" />
                            )}
                        </div>
                    </button>

                    {/* Opción: Guardar como borrador */}
                    <button
                        type="button"
                        onClick={handleSaveAsDraft}
                        disabled={loading}
                        className="w-full text-left p-4 rounded-lg border-2 border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 mt-0.5">
                                <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                    <FileText className="w-5 h-5 text-zinc-400" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-white text-base">
                                        {paquete?.id ? 'Actualizar y mantener como borrador' : 'Crear y guardar como borrador'}
                                    </h3>
                                    <ZenBadge variant="outline" size="sm" className="text-xs border-zinc-600 text-zinc-400">
                                        Borrador
                                    </ZenBadge>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    El paquete se guardará pero no estará visible públicamente. Podrás editarlo y publicarlo más tarde.
                                </p>
                            </div>
                            {loading ? (
                                <div className="shrink-0">
                                    <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-zinc-400 transition-colors" />
                            )}
                        </div>
                    </button>

                    {/* Botón cancelar */}
                    <div className="pt-2 border-t border-zinc-800">
                        <ZenButton
                            variant="ghost"
                            onClick={() => setShowPublishDialog(false)}
                            disabled={loading}
                            className="w-full"
                        >
                            Cancelar
                        </ZenButton>
                    </div>
                </div>
            </ZenDialog>

            {/* Modal de edición/creación de ítem */}
            {selectedCategoriaForItem && (
                <ItemEditorModal
                    isOpen={isItemModalOpen}
                    onClose={() => {
                        setIsItemModalOpen(false);
                        setItemToEdit(null);
                        setSelectedCategoriaForItem(null);
                    }}
                    onSave={handleSaveItem}
                    item={itemToEdit || undefined}
                    studioSlug={studioSlug}
                    categoriaId={selectedCategoriaForItem}
                    preciosConfig={configuracionPrecios}
                    showOverlay={true}
                    context="paquetes"
                />
            )}
        </div>
    );
});

PaqueteFormularioAvanzado.displayName = 'PaqueteFormularioAvanzado';
