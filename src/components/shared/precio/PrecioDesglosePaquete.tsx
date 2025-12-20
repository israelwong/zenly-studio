"use client";

import { ZenCard } from "@/components/ui/zen";
import { formatearMoneda, calcularPrecio, type ResultadoPrecio, type ConfiguracionPrecios } from "@/lib/actions/studio/catalogo/calcular-precio";

interface ItemPaquete {
    id: string;
    nombre: string;
    costo: number;
    gasto: number;
    tipo_utilidad: 'service' | 'product';
    cantidad: number;
}

interface PrecioDesglosePaqueteProps {
    items: ItemPaquete[];
    configuracion: ConfiguracionPrecios;
    precioPersonalizado?: number; // Si existe, se usa este precio en lugar del calculado
    showCard?: boolean;
}

/**
 * Componente específico para mostrar el desglose de precios de un paquete
 * Calcula cada item individualmente según su tipo de utilidad y muestra el total agregado
 */
export function PrecioDesglosePaquete({ 
    items, 
    configuracion,
    precioPersonalizado,
    showCard = true 
}: PrecioDesglosePaqueteProps) {
    // Calcular cada item individualmente
    const itemsCalculados = items.map(item => {
        const tipoUtilidad = item.tipo_utilidad === 'service' ? 'servicio' : 'producto';
        const resultado = calcularPrecio(
            item.costo,
            item.gasto,
            tipoUtilidad,
            configuracion
        );
        
        return {
            ...item,
            resultado,
            tipoUtilidad,
            totalCosto: item.costo * item.cantidad,
            totalGasto: item.gasto * item.cantidad,
            totalPrecioFinal: resultado.precio_final * item.cantidad,
        };
    });

    // Separar por tipo de utilidad
    const servicios = itemsCalculados.filter(item => item.tipoUtilidad === 'servicio');
    const productos = itemsCalculados.filter(item => item.tipoUtilidad === 'producto');

    // Calcular totales por tipo
    const totalServicios = servicios.reduce((acc, item) => ({
        costo: acc.costo + item.totalCosto,
        gasto: acc.gasto + item.totalGasto,
        utilidad: acc.utilidad + (item.resultado.utilidad_base * item.cantidad),
        precioFinal: acc.precioFinal + item.totalPrecioFinal,
    }), { costo: 0, gasto: 0, utilidad: 0, precioFinal: 0 });

    const totalProductos = productos.reduce((acc, item) => ({
        costo: acc.costo + item.totalCosto,
        gasto: acc.gasto + item.totalGasto,
        utilidad: acc.utilidad + (item.resultado.utilidad_base * item.cantidad),
        precioFinal: acc.precioFinal + item.totalPrecioFinal,
    }), { costo: 0, gasto: 0, utilidad: 0, precioFinal: 0 });

    // Totales generales
    const totalCosto = totalServicios.costo + totalProductos.costo;
    const totalGasto = totalServicios.gasto + totalProductos.gasto;
    const totalUtilidad = totalServicios.utilidad + totalProductos.utilidad;
    const precioCalculado = totalServicios.precioFinal + totalProductos.precioFinal;
    const subtotalCostos = totalCosto + totalGasto;
    
    // Usar precio personalizado si existe, sino usar el calculado
    const precioFinal = precioPersonalizado && precioPersonalizado > 0 ? precioPersonalizado : precioCalculado;
    
    // Si hay precio personalizado, recalcular la utilidad basada en ese precio
    const utilidadFinal = precioFinal - subtotalCostos;

    // Porcentajes
    const porcentajeUtilidadServicios = totalServicios.costo + totalServicios.gasto > 0
        ? ((totalServicios.utilidad / (totalServicios.costo + totalServicios.gasto)) * 100)
        : 0;
    
    const porcentajeUtilidadProductos = totalProductos.costo + totalProductos.gasto > 0
        ? ((totalProductos.utilidad / (totalProductos.costo + totalProductos.gasto)) * 100)
        : 0;

    // Porcentaje de utilidad: si hay precio personalizado, usar utilidad final, sino usar utilidad calculada
    const porcentajeUtilidadTotal = subtotalCostos > 0
        ? ((precioPersonalizado && precioPersonalizado > 0 ? utilidadFinal : totalUtilidad) / subtotalCostos) * 100
        : 0;

    const contenido = (
        <div className="space-y-4">
            {/* Subtotal de Costos */}
            <div className="space-y-2 py-3 border-b border-zinc-700">
                <div className="text-xs text-zinc-500 mb-2 font-medium">Subtotal de Costos</div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Costo Base</span>
                    <span className="text-sm font-medium text-zinc-200">
                        {formatearMoneda(totalCosto)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">+ Gastos</span>
                    <span className="text-sm font-medium text-zinc-200">
                        {formatearMoneda(totalGasto)}
                    </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-600">
                    <span className="text-sm font-medium text-zinc-300">Subtotal Costos</span>
                    <span className="text-sm font-semibold text-zinc-100">
                        {formatearMoneda(subtotalCostos)}
                    </span>
                </div>
            </div>

            {/* Utilidad por tipo */}
            <div className="space-y-3">
                <div className="text-xs text-zinc-500 mb-2 font-medium">Utilidad por Tipo</div>
                
                {servicios.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">
                                Utilidad Servicios ({porcentajeUtilidadServicios.toFixed(1)}%)
                            </span>
                            <span className="text-sm font-medium text-emerald-400">
                                {formatearMoneda(totalServicios.utilidad)}
                            </span>
                        </div>
                    </div>
                )}

                {productos.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">
                                Utilidad Productos ({porcentajeUtilidadProductos.toFixed(1)}%)
                            </span>
                            <span className="text-sm font-medium text-emerald-400">
                                {formatearMoneda(totalProductos.utilidad)}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                    <span className="text-sm font-medium text-zinc-300">
                        Utilidad Total ({porcentajeUtilidadTotal.toFixed(1)}%)
                    </span>
                    <span className="text-sm font-semibold text-emerald-400">
                        {formatearMoneda(precioPersonalizado && precioPersonalizado > 0 ? utilidadFinal : totalUtilidad)}
                    </span>
                </div>
            </div>

            {/* Precio Final */}
            <div className="border-t border-zinc-600 pt-3">
                <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-zinc-200">Precio Final del Paquete</span>
                    <span className="text-xl font-bold text-emerald-400">
                        {formatearMoneda(precioFinal)}
                    </span>
                </div>
                {precioPersonalizado && precioPersonalizado > 0 && precioPersonalizado !== precioCalculado && (
                    <div className="text-xs text-zinc-500 mt-1">
                        Precio calculado: {formatearMoneda(precioCalculado)} 
                        {' '}({precioPersonalizado > precioCalculado ? '+' : ''}{formatearMoneda(precioPersonalizado - precioCalculado)})
                    </div>
                )}
            </div>
        </div>
    );

    if (showCard) {
        return (
            <ZenCard className="p-4 bg-zinc-800/50 border-zinc-700">
                {contenido}
            </ZenCard>
        );
    }

    return contenido;
}

