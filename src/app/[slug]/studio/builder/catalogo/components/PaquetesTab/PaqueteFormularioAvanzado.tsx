'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea, ZenCard, ZenBadge } from '@/components/ui/zen';
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

export function PaqueteFormularioAvanzado({
    studioSlug,
    paquete,
    onSave,
    onCancel
}: PaqueteFormularioAvanzadoProps) {
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

                    // // Log para debug - ver estructura de datos
                    // console.log('=== CATÁLOGO DATA DEBUG ===');
                    // catalogoResult.data.forEach(seccion => {
                    //     console.log(`Sección: ${seccion.nombre}`);
                    //     seccion.categorias.forEach(categoria => {
                    //         console.log(`  Categoría: ${categoria.nombre}`);
                    //         categoria.servicios.forEach(servicio => {
                    //             console.log(`    Servicio: ${servicio.nombre}`);
                    //             console.log(`    tipo_utilidad: "${servicio.tipo_utilidad}"`);
                    //             console.log(`    type: "${servicio.type}"`);
                    //             console.log(`    costo: ${servicio.costo}, gasto: ${servicio.gasto}`);
                    //             console.log('    ---');
                    //         });
                    //     });
                    // });
                    // console.log('=== END DEBUG ===');
                    console.log('=== CATÁLOGO DATA DEBUG ===', catalogoResult.data);

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
                        ).precio_final
                    });
                });
            });
        });
        return map;
    }, [catalogo, configuracionPrecios]);

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
                nombre,
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Columna 1: Servicios Disponibles */}
            <div className="lg:col-span-2">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        Servicios Disponibles
                        <ZenBadge variant="secondary">
                            {catalogo.reduce((acc, seccion) =>
                                acc + seccion.categorias.reduce((catAcc, categoria) =>
                                    catAcc + categoria.servicios.length, 0), 0
                            )} servicios
                        </ZenBadge>
                    </h2>

                    {/* Filtro de servicios */}
                    <div className="mt-3">
                        <div className="relative w-full">
                            <ZenInput
                                placeholder="Buscar servicios..."
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

                <div className="space-y-4">
                    {catalogo.map((seccion) => (
                        <ZenCard key={seccion.id} className="border-l-2 border-blue-500">
                            <div className="p-4">
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    {seccion.nombre}
                                </h4>

                                {seccion.categorias.map((categoria) => (
                                    <div key={categoria.id} className="mb-4 last:mb-0 bg-zinc-800/50 rounded-lg p-3">
                                        <h5 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                            {categoria.nombre}
                                        </h5>

                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-zinc-600/50">
                                                        <th className="text-left py-2 px-3 text-sm font-medium text-zinc-400">Servicio</th>
                                                        <th className="text-right py-2 px-3 text-sm font-medium text-zinc-400">Precio</th>
                                                        <th className="text-center py-2 px-3 text-sm font-medium text-zinc-400">Cantidad</th>
                                                        <th className="text-right py-2 px-3 text-sm font-medium text-zinc-400">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {categoria.servicios
                                                        .filter(servicio =>
                                                            filtroServicio === '' ||
                                                            servicio.nombre.toLowerCase().includes(filtroServicio.toLowerCase())
                                                        )
                                                        .map((servicio) => {
                                                            // Mapear tipo_utilidad de la BD a formato esperado por calcularPrecio
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
                                                                <tr
                                                                    key={servicio.id}
                                                                    className={`border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors ${cantidad > 0 ? 'bg-emerald-900/20 border-emerald-800/30' : ''
                                                                        }`}
                                                                >
                                                                    <td className="py-3 px-3">
                                                                        <div className="font-medium text-white">
                                                                            {servicio.nombre}
                                                                        </div>
                                                                        <div className="text-xs text-zinc-500 flex items-center gap-1">
                                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${servicio.tipo_utilidad === 'service'
                                                                                ? 'bg-blue-900/50 text-blue-300'
                                                                                : 'bg-green-900/50 text-green-300'
                                                                                }`}>
                                                                                {servicio.tipo_utilidad === 'service' ? 'Servicio' : 'Producto'}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right">
                                                                        <div className="font-medium text-white">
                                                                            {formatearMoneda(precios.precio_final)}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-center">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateQuantity(servicio.id, Math.max(0, cantidad - 1))}
                                                                                className="w-6 h-6 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <span className={`w-8 text-center font-medium ${cantidad > 0 ? 'text-emerald-400' : 'text-white'
                                                                                }`}>
                                                                                {cantidad}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateQuantity(servicio.id, cantidad + 1)}
                                                                                className="w-6 h-6 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right">
                                                                        <div className={`font-medium ${cantidad > 0 ? 'text-emerald-400' : 'text-zinc-500'
                                                                            }`}>
                                                                            {formatearMoneda(subtotal)}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ZenCard>
                    ))}
                </div>
            </div>

            {/* Columna 2: Configuración del Paquete */}
            <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Configuración</h3>

                        <ZenInput
                            label="Nombre del Paquete *"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Paquete Fotógrafo Boda"
                            required
                        />

                        <ZenTextarea
                            label="Descripción (opcional)"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Describe los servicios incluidos..."
                        />
                    </div>

                    {/* Columna 3: Resumen Financiero */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Resumen Financiero</h3>
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
                        </div>

                        <ZenInput
                            label="Precio personalizado (opcional)"
                            type="number"
                            value={precioPersonalizado}
                            onChange={(e) => setPrecioPersonalizado(Number(e.target.value))}
                            placeholder="0"
                            hint="Deja en 0 para usar el precio calculado automáticamente"
                        />

                        {/* Botones */}
                        <div className="flex gap-2 pt-4">
                            <ZenButton
                                type="button"
                                variant="secondary"
                                onClick={onCancel}
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
                </form>
            </div>
        </div>
    );
}
