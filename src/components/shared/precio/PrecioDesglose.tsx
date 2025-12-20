"use client";

import { ZenCard } from "@/components/ui/zen";
import { formatearMoneda, type ResultadoPrecio } from "@/lib/actions/studio/catalogo/calcular-precio";

interface PrecioDesgloseProps {
    resultado: ResultadoPrecio;
    tipoUtilidad?: 'servicio' | 'producto' | 'paquete';
    showCard?: boolean;
}

/**
 * Componente compartido para mostrar el desglose de precios
 * Reutilizable en items, paquetes y cotizaciones
 */
export function PrecioDesglose({ 
    resultado, 
    tipoUtilidad = 'servicio',
    showCard = true 
}: PrecioDesgloseProps) {
    const contenido = (
        <div className="space-y-4">
            {/* Subtotal de Costos */}
            <div className="space-y-2 py-3 border-b border-zinc-700">
                <div className="text-xs text-zinc-500 mb-2 font-medium">Subtotal de Costos</div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Costo Base</span>
                    <span className="text-sm font-medium text-zinc-200">
                        {formatearMoneda(resultado.costo)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">+ Gastos</span>
                    <span className="text-sm font-medium text-zinc-200">
                        {formatearMoneda(resultado.gasto)}
                    </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-600">
                    <span className="text-sm font-medium text-zinc-300">Subtotal Costos</span>
                    <span className="text-sm font-semibold text-zinc-100">
                        {formatearMoneda(resultado.costo + resultado.gasto)}
                    </span>
                </div>
            </div>

            {/* Desglose detallado */}
            <div className="space-y-3">
                <div className="text-xs text-zinc-500 mb-2 font-medium">Utilidad Base</div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">
                        {tipoUtilidad === 'paquete' 
                            ? `Utilidad Agregada (${resultado.porcentaje_utilidad}% sobre subtotal costos)`
                            : `Utilidad ${tipoUtilidad === 'servicio' ? 'Servicio' : 'Producto'} (${resultado.porcentaje_utilidad}% sobre subtotal costos)`
                        }
                    </span>
                    <span className="text-sm font-medium text-emerald-400">{formatearMoneda(resultado.utilidad_base)}</span>
                </div>

                <div className="text-xs text-zinc-500 mb-2 font-medium mt-3">Subtotal (Costos + Utilidad)</div>
                <div className="flex justify-between items-center py-2 border-t border-zinc-700">
                    <span className="text-sm font-medium text-zinc-300">Subtotal</span>
                    <span className="text-sm font-semibold text-zinc-200">{formatearMoneda(resultado.subtotal)}</span>
                </div>

                {/* Precio Base y Comisión */}
                <div className="text-xs text-zinc-500 mb-2 font-medium mt-3">Precio Base (absorbe comisión)</div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Precio Base</span>
                    <span className="text-sm font-medium text-zinc-200">{formatearMoneda(resultado.precio_base)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">- Comisión ({resultado.porcentaje_comision}%)</span>
                    <span className="text-sm font-medium text-blue-400">-{formatearMoneda(resultado.monto_comision)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-600">
                    <span className="text-xs text-zinc-500 italic">= Subtotal (verificación)</span>
                    <span className="text-xs text-zinc-500 italic">{formatearMoneda(resultado.subtotal)}</span>
                </div>

                {/* Precio Final y Sobreprecio */}
                <div className="text-xs text-zinc-500 mb-2 font-medium mt-3">Precio Final (con sobreprecio)</div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Precio Base</span>
                    <span className="text-sm font-medium text-zinc-200">{formatearMoneda(resultado.precio_base)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">+ Sobreprecio ({resultado.porcentaje_sobreprecio}%)</span>
                    <span className="text-sm font-medium text-purple-400">+{formatearMoneda(resultado.monto_sobreprecio)}</span>
                </div>

                <div className="border-t border-zinc-600 pt-3">
                    <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-zinc-200">Precio Final</span>
                        <span className="text-xl font-bold text-emerald-400">{formatearMoneda(resultado.precio_final)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-700">
                        <span className="text-xs text-zinc-500">Utilidad Real (después de comisión)</span>
                        <span className="text-xs font-medium text-emerald-300">{resultado.porcentaje_utilidad_real}%</span>
                    </div>
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

