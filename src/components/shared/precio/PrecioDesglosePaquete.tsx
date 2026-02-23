"use client";

import { ZenCard } from "@/components/ui/zen";
import { Separator } from "@/components/ui/shadcn/separator";
import { formatearMoneda, calcularPrecio, type ResultadoPrecio, type ConfiguracionPrecios } from "@/lib/actions/studio/catalogo/calcular-precio";
import { cn } from "@/lib/utils";

interface ItemPaquete {
    id: string;
    nombre: string;
    costo: number;
    gasto: number;
    tipo_utilidad: 'service' | 'product';
    cantidad: number;
    /** Si se provee, se usa en lugar de cantidad para costos, gastos y precios (ej. horas efectivas en billing HOUR). */
    cantidadEfectiva?: number;
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
    // Cantidad a usar: cantidadEfectiva (ej. horas) si existe, sino cantidad (retrocompatible)
    const qty = (item: ItemPaquete) => item.cantidadEfectiva ?? item.cantidad;

    // Calcular cada item individualmente (costos/gastos/precios × cantidad efectiva)
    const itemsCalculados = items.map(item => {
        const tipoUtilidad = item.tipo_utilidad === 'service' ? 'servicio' : 'producto';
        const resultado = calcularPrecio(
            item.costo,
            item.gasto,
            tipoUtilidad,
            configuracion
        );
        const mult = qty(item);
        return {
            ...item,
            resultado,
            tipoUtilidad,
            totalCosto: item.costo * mult,
            totalGasto: item.gasto * mult,
            totalPrecioFinal: resultado.precio_final * mult,
            totalPrecioBase: resultado.precio_base * mult,
            totalComision: resultado.monto_comision * mult,
            totalSobreprecio: resultado.monto_sobreprecio * mult,
            totalSubtotal: resultado.subtotal * mult,
        };
    });

    // Separar por tipo de utilidad
    const servicios = itemsCalculados.filter(item => item.tipoUtilidad === 'servicio');
    const productos = itemsCalculados.filter(item => item.tipoUtilidad === 'producto');

    const multItem = (item: typeof itemsCalculados[0]) => item.cantidadEfectiva ?? item.cantidad;

    // Calcular totales por tipo (utilidad_base × cantidad efectiva)
    const totalServicios = servicios.reduce((acc, item) => ({
        costo: acc.costo + item.totalCosto,
        gasto: acc.gasto + item.totalGasto,
        utilidad: acc.utilidad + (item.resultado.utilidad_base * multItem(item)),
        precioFinal: acc.precioFinal + item.totalPrecioFinal,
        precioBase: acc.precioBase + item.totalPrecioBase,
        comision: acc.comision + item.totalComision,
        sobreprecio: acc.sobreprecio + item.totalSobreprecio,
        subtotal: acc.subtotal + item.totalSubtotal,
    }), { costo: 0, gasto: 0, utilidad: 0, precioFinal: 0, precioBase: 0, comision: 0, sobreprecio: 0, subtotal: 0 });

    const totalProductos = productos.reduce((acc, item) => ({
        costo: acc.costo + item.totalCosto,
        gasto: acc.gasto + item.totalGasto,
        utilidad: acc.utilidad + (item.resultado.utilidad_base * multItem(item)),
        precioFinal: acc.precioFinal + item.totalPrecioFinal,
        precioBase: acc.precioBase + item.totalPrecioBase,
        comision: acc.comision + item.totalComision,
        sobreprecio: acc.sobreprecio + item.totalSobreprecio,
        subtotal: acc.subtotal + item.totalSubtotal,
    }), { costo: 0, gasto: 0, utilidad: 0, precioFinal: 0, precioBase: 0, comision: 0, sobreprecio: 0, subtotal: 0 });

    // Totales generales
    const totalCosto = totalServicios.costo + totalProductos.costo;
    const totalGasto = totalServicios.gasto + totalProductos.gasto;
    const totalUtilidad = totalServicios.utilidad + totalProductos.utilidad;
    const subtotalCostos = totalCosto + totalGasto;
    const subtotal = totalServicios.subtotal + totalProductos.subtotal;
    const precioBaseTotal = totalServicios.precioBase + totalProductos.precioBase;
    const totalComision = totalServicios.comision + totalProductos.comision;
    const totalSobreprecio = totalServicios.sobreprecio + totalProductos.sobreprecio;

    // Precio calculado = Precio base + Sobreprecio (para que cuadre con las filas del desglose)
    const precioCalculado = precioBaseTotal + totalSobreprecio;

    // Porcentajes de comisión y sobreprecio (usar el primero como referencia, todos deberían ser iguales)
    const porcentajeComision = itemsCalculados.length > 0 ? itemsCalculados[0].resultado.porcentaje_comision : 0;
    const porcentajeSobreprecio = itemsCalculados.length > 0 ? itemsCalculados[0].resultado.porcentaje_sobreprecio : 0;

    // Usar precio personalizado si existe, sino usar el calculado (base + sobreprecio)
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

    // --- Salud financiera híbrida (mix-based) ---
    const metaServicio = configuracion.utilidad_servicio > 1 ? configuracion.utilidad_servicio / 100 : configuracion.utilidad_servicio;
    const metaProducto = configuracion.utilidad_producto > 1 ? configuracion.utilidad_producto / 100 : configuracion.utilidad_producto;
    const totalVentaServicios = totalServicios.precioFinal;
    const totalVentaProductos = totalProductos.precioFinal;
    const precioParaMix = precioFinal > 0 ? precioFinal : precioCalculado;
    const margenObjetivoPct = precioParaMix > 0
        ? ((totalVentaServicios * metaServicio) + (totalVentaProductos * metaProducto)) / precioParaMix * 100
        : 0;
    const comisionRatio = porcentajeComision / 100;
    const montoComisionSobreFinal = precioFinal * comisionRatio;
    const utilidadNeta = precioFinal - subtotalCostos - montoComisionSobreFinal;
    const margenRealPct = precioFinal > 0 ? (utilidadNeta / precioFinal) * 100 : 0;
    const ratioAlObjetivo = margenObjetivoPct > 0 ? margenRealPct / margenObjetivoPct : 1;
    const saludColor =
        ratioAlObjetivo >= 0.9 ? 'verde' as const
        : ratioAlObjetivo >= 0.7 ? 'ambar' as const
        : 'rojo' as const;

    const cardClass = "rounded-lg border border-zinc-700/50 bg-zinc-800/10 p-4";
    const rowClass = "flex justify-between items-center gap-3";
    const labelClass = "text-sm text-zinc-400 font-normal";
    const valueClass = "text-sm font-semibold text-zinc-100 tabular-nums";

    const contenido = (
        <div className="space-y-4">
            {/* Card 1: Costos */}
            <div className={cardClass}>
                <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Costos</div>
                <div className="space-y-2">
                    <div className={rowClass}>
                        <span className={labelClass}>Costo Base</span>
                        <span className={valueClass}>{formatearMoneda(totalCosto)}</span>
                    </div>
                    <div className={rowClass}>
                        <span className={labelClass}>+ Gastos</span>
                        <span className={valueClass}>{formatearMoneda(totalGasto)}</span>
                    </div>
                    <Separator className="bg-zinc-700/60 my-2" />
                    <div className={rowClass}>
                        <span className="text-sm font-medium text-zinc-300">Subtotal Costos</span>
                        <span className="text-sm font-semibold text-zinc-100 tabular-nums">{formatearMoneda(subtotalCostos)}</span>
                    </div>
                </div>
            </div>

            <Separator className="bg-zinc-700/50" />

            {/* Card 2: Utilidad */}
            <div className={cardClass}>
                <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Utilidad</div>
                <div className="space-y-2">
                    {servicios.length > 0 && (
                        <div className={rowClass}>
                            <span className={labelClass}>Utilidad Servicios ({porcentajeUtilidadServicios.toFixed(1)}%)</span>
                            <span className="text-sm font-semibold text-emerald-400 tabular-nums">{formatearMoneda(totalServicios.utilidad)}</span>
                        </div>
                    )}
                    {productos.length > 0 && (
                        <div className={rowClass}>
                            <span className={labelClass}>Utilidad Productos ({porcentajeUtilidadProductos.toFixed(1)}%)</span>
                            <span className="text-sm font-semibold text-emerald-400 tabular-nums">{formatearMoneda(totalProductos.utilidad)}</span>
                        </div>
                    )}
                    <Separator className="bg-zinc-700/60 my-2" />
                    <div className={rowClass}>
                        <span className="text-sm font-medium text-zinc-300">Utilidad Total ({porcentajeUtilidadTotal.toFixed(1)}%)</span>
                        <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                            {formatearMoneda(precioPersonalizado && precioPersonalizado > 0 ? utilidadFinal : totalUtilidad)}
                        </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2 leading-snug">
                        Promedio ponderado basado en la mezcla de servicios y productos seleccionados. (Utilidad $ ÷ Costo Base $)
                    </p>
                </div>
            </div>

            <Separator className="bg-zinc-700/50" />

            {/* Card 3: Precio Base (absorción comisión) */}
            <div className={cardClass}>
                <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Precio Base</div>
                <div className="space-y-2">
                    <div className={rowClass}>
                        <span className={labelClass}>Subtotal (Costo + Utilidad)</span>
                        <span className={valueClass}>{formatearMoneda(subtotal)}</span>
                    </div>
                    <div className={rowClass}>
                        <span className={labelClass}>+ Comisión ({porcentajeComision.toFixed(1)}%)</span>
                        <span className="text-sm font-semibold text-blue-400 tabular-nums">+{formatearMoneda(totalComision)}</span>
                    </div>
                    <Separator className="bg-zinc-700/60 my-2" />
                    <div className={rowClass}>
                        <span className="text-sm font-medium text-zinc-300">Precio Base (absorción)</span>
                        <span className={valueClass}>{formatearMoneda(precioBaseTotal)}</span>
                    </div>
                </div>
            </div>

            <Separator className="bg-zinc-700/50" />

            {/* Card 4: Precio Final */}
            <div className={cardClass}>
                <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Precio Final</div>
                <div className="space-y-2">
                    <div className={rowClass}>
                        <span className={labelClass}>Precio Base</span>
                        <span className={valueClass}>{formatearMoneda(precioBaseTotal)}</span>
                    </div>
                    <div className={rowClass}>
                        <span className={labelClass}>+ Sobreprecio ({porcentajeSobreprecio.toFixed(1)}%)</span>
                        <span className="text-sm font-semibold text-purple-400 tabular-nums">+{formatearMoneda(totalSobreprecio)}</span>
                    </div>
                    <Separator className="bg-zinc-700/60 my-2" />
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-base font-semibold text-zinc-200">Precio calculado (comprobación)</span>
                        <span className="text-2xl font-bold text-emerald-400 tabular-nums" title="Debe coincidir con el input Precio calculado">
                            {formatearMoneda(precioCalculado)}
                        </span>
                    </div>
                </div>
            </div>

            <Separator className="bg-zinc-700/50" />

            {/* Salud de la Operación (mix-based) */}
            <div className={cardClass}>
                <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Salud de la Operación</div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className={labelClass}>Margen real</span>
                        <span className="font-semibold tabular-nums">{margenRealPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-zinc-700/60 overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-300",
                                saludColor === 'verde' && "bg-emerald-500",
                                saludColor === 'ambar' && "bg-amber-500",
                                saludColor === 'rojo' && "bg-rose-500"
                            )}
                            style={{ width: `${Math.min(100, (margenRealPct / (margenObjetivoPct || 1)) * 100)}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                        Meta de rentabilidad calculada según el mix de ítems: <span className="font-medium text-zinc-400">{margenObjetivoPct.toFixed(1)}%</span>
                    </p>
                </div>
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

