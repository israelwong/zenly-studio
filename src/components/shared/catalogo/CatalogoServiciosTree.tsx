'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Clock, Hash, DollarSign, Edit2, Plus, Trash2, Gift } from 'lucide-react';
import { ZenBadge, ZenButton } from '@/components/ui/zen';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { CustomItemData } from '@/lib/actions/schemas/cotizaciones-schemas';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';
import { cn } from '@/lib/utils';

interface ServiciosSeleccionados {
    secciones: {
        [seccionId: string]: {
            total: number;
            categorias: { [categoriaId: string]: number };
        };
    };
}

interface CatalogoServiciosTreeProps {
    // Datos
    catalogoFiltrado: SeccionData[];
    filtroServicio: string;

    // Estados controlados
    seccionesExpandidas: Set<string>;
    categoriasExpandidas: Set<string>;
    items: { [servicioId: string]: number };
    selectedServices: Set<string>;

    // Callbacks
    onToggleSeccion: (seccionId: string) => void;
    onToggleCategoria: (categoriaId: string) => void;
    onToggleSelection: (servicioId: string) => void;
    onUpdateQuantity: (servicioId: string, cantidad: number) => void;
    onEditItem?: (servicioId: string) => void;
    onCreateCustomItem?: (categoriaId: string) => void;
    customItems?: CustomItemData[];
    onEditCustomItem?: (index: number) => void;
    onDeleteCustomItem?: (index: number) => void;
    onUpdateCustomItemQuantity?: (index: number, quantity: number) => void;

    // Datos calculados
    serviciosSeleccionados: ServiciosSeleccionados;

    // Para cálculos de precio
    configuracionPrecios: ConfiguracionPrecios | null;
    
    // Para cálculo dinámico
    baseHours?: number | null;

    // Modo cortesía (La Bolsita)
    isCourtesyMode?: boolean;
    itemsCortesia?: Set<string>;
    onToggleCortesia?: (itemId: string) => void;
}

export function CatalogoServiciosTree({
    catalogoFiltrado,
    filtroServicio,
    seccionesExpandidas,
    categoriasExpandidas,
    items,
    selectedServices,
    onToggleSeccion,
    onToggleCategoria,
    onToggleSelection,
    onUpdateQuantity,
    onEditItem,
    onCreateCustomItem,
    customItems = [],
    onEditCustomItem,
    onDeleteCustomItem,
    onUpdateCustomItemQuantity,
    serviciosSeleccionados,
    configuracionPrecios,
    baseHours,
    isCourtesyMode = false,
    itemsCortesia,
    onToggleCortesia,
}: CatalogoServiciosTreeProps) {
    return (
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
                                    onClick={() => onToggleSeccion(seccion.id)}
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
                                                {serviciosSeleccionados.secciones[seccion.id].total}{' '}
                                                {serviciosSeleccionados.secciones[seccion.id].total === 1 ? 'item' : 'items'} seleccionado
                                                {serviciosSeleccionados.secciones[seccion.id].total === 1 ? '' : 's'}
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                                {seccion.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0)}{' '}
                                                {seccion.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0) === 1 ? 'item' : 'items'}{' '}
                                                disponible{seccion.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0) === 1 ? '' : 's'}
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
                                                            onClick={() => onToggleCategoria(categoria.id)}
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
                                                                        {serviciosSeleccionados.secciones[seccion.id].categorias[categoria.id]}{' '}
                                                                        {serviciosSeleccionados.secciones[seccion.id].categorias[categoria.id] === 1
                                                                            ? 'item'
                                                                            : 'items'}{' '}
                                                                        seleccionado
                                                                        {serviciosSeleccionados.secciones[seccion.id].categorias[categoria.id] === 1 ? '' : 's'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                                                                        {categoria.servicios.length + (customItems?.filter(ci => ci.categoriaId === categoria.id).length || 0)} {(categoria.servicios.length + (customItems?.filter(ci => ci.categoriaId === categoria.id).length || 0)) === 1 ? 'item' : 'items'} disponible
                                                                        {(categoria.servicios.length + (customItems?.filter(ci => ci.categoriaId === categoria.id).length || 0)) === 1 ? '' : 's'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>

                                                        {isCategoriaExpandida && (
                                                            <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                                                                {/* 1. Items del catálogo (con reemplazo por custom items si aplica) */}
                                                                {categoria.servicios
                                                                    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                                                                    .map((servicio, servicioIndex) => {
                                                                        // Verificar si hay un custom item que reemplace este item del catálogo
                                                                        const replacementCustomItem = customItems.find(
                                                                            ci => ci.originalItemId === servicio.id && ci.categoriaId === categoria.id
                                                                        );

                                                                        // Si hay reemplazo, renderizar el custom item en lugar del catálogo
                                                                        if (replacementCustomItem) {
                                                                            const globalIndex = customItems.findIndex(ci => ci === replacementCustomItem);
                                                                            const customItemId = `custom-replace-${globalIndex}`;
                                                                            const safeDurationHours = baseHours !== null && baseHours !== undefined ? Number(baseHours) : null;
                                                                            const cantidadEfectiva = calcularCantidadEfectiva(
                                                                                replacementCustomItem.billing_type,
                                                                                replacementCustomItem.quantity,
                                                                                safeDurationHours && safeDurationHours > 0 ? safeDurationHours : 1
                                                                            );
                                                                            const subtotal = replacementCustomItem.unit_price * cantidadEfectiva;

                                                                            return (
                                                                                <div
                                                                                    key={customItemId}
                                                                                    className={cn(
                                                                                        'group flex items-center justify-between py-3 px-2 pl-6 hover:bg-zinc-700/20 transition-colors',
                                                                                        'border-t border-b border-zinc-700/30',
                                                                                        servicioIndex === 0 && 'border-t-0',
                                                                                        'bg-purple-900/10 border-l-2 border-l-purple-500/50'
                                                                                    )}
                                                                                >
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="text-sm text-zinc-300 leading-tight font-light">
                                                                                            <span className="wrap-break-word">{replacementCustomItem.name}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <ZenBadge
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="px-1 py-0 text-[10px] font-light rounded-sm border-purple-600 text-purple-400"
                                                                                            >
                                                                                                Personalizado
                                                                                            </ZenBadge>
                                                                                            {replacementCustomItem.billing_type === 'HOUR' && (
                                                                                                <ZenBadge
                                                                                                    variant="outline"
                                                                                                    size="sm"
                                                                                                    className="px-1 py-0 text-[10px] font-light rounded-sm flex items-center gap-0.5 border-amber-600 text-amber-400"
                                                                                                >
                                                                                                    <Clock className="w-2.5 h-2.5" />
                                                                                                    Por Hora
                                                                                                </ZenBadge>
                                                                                            )}
                                                                                            {replacementCustomItem.billing_type === 'UNIT' && (
                                                                                                <ZenBadge
                                                                                                    variant="outline"
                                                                                                    size="sm"
                                                                                                    className="px-1 py-0 text-[10px] font-light rounded-sm flex items-center gap-0.5 border-purple-600 text-purple-400"
                                                                                                >
                                                                                                    <Hash className="w-2.5 h-2.5" />
                                                                                                    Por Unidad
                                                                                                </ZenBadge>
                                                                                            )}
                                                                                            <span className="text-xs text-green-400">
                                                                                                {replacementCustomItem.billing_type === 'HOUR' 
                                                                                                    ? formatearMoneda(replacementCustomItem.unit_price) + '/h'
                                                                                                    : formatearMoneda(replacementCustomItem.unit_price)
                                                                                                }
                                                                                            </span>
                                                                                            {onEditCustomItem && (
                                                                                                <ZenButton
                                                                                                    type="button"
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        onEditCustomItem(globalIndex);
                                                                                                    }}
                                                                                                    className="w-5 h-5 p-0 opacity-40 hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-200 ml-1"
                                                                                                    title="Editar ítem"
                                                                                                >
                                                                                                    <Edit2 className="w-3 h-3" />
                                                                                                </ZenButton>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                                                        <div className="flex items-center gap-1 w-16 justify-center">
                                                                                            {replacementCustomItem.billing_type === 'HOUR' && safeDurationHours !== null && safeDurationHours > 0 ? (
                                                                                                <span
                                                                                                    className="w-6 text-center text-sm font-medium text-emerald-400"
                                                                                                    title={`${replacementCustomItem.quantity} × ${safeDurationHours}h = ${formatearMoneda(subtotal)}`}
                                                                                                >
                                                                                                    {safeDurationHours}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <>
                                                                                                    {onUpdateCustomItemQuantity && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                onUpdateCustomItemQuantity(globalIndex, Math.max(1, replacementCustomItem.quantity - 1));
                                                                                                            }}
                                                                                                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                                        >
                                                                                                            -
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <span
                                                                                                        className="w-6 text-center text-sm font-medium text-emerald-400"
                                                                                                        title={replacementCustomItem.billing_type === 'HOUR' && safeDurationHours !== null && safeDurationHours > 0 
                                                                                                            ? `${replacementCustomItem.quantity} × ${safeDurationHours}h = ${formatearMoneda(subtotal)}`
                                                                                                            : `${replacementCustomItem.quantity} × ${formatearMoneda(replacementCustomItem.unit_price)} = ${formatearMoneda(subtotal)}`
                                                                                                        }
                                                                                                    >
                                                                                                        {replacementCustomItem.quantity}
                                                                                                    </span>
                                                                                                    {onUpdateCustomItemQuantity && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                onUpdateCustomItemQuantity(globalIndex, replacementCustomItem.quantity + 1);
                                                                                                            }}
                                                                                                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                                        >
                                                                                                            +
                                                                                                        </button>
                                                                                                    )}
                                                                                                </>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="text-right w-20">
                                                                                            <div className="text-sm font-medium text-emerald-400">
                                                                                                {formatearMoneda(subtotal)}
                                                                                            </div>
                                                                                        </div>
                                                                                        {onDeleteCustomItem && (
                                                                                            <ZenButton
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    onDeleteCustomItem(globalIndex);
                                                                                                }}
                                                                                                className="w-5 h-5 p-0 opacity-60 hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                                                                                                title="Eliminar ítem"
                                                                                            >
                                                                                                <Trash2 className="w-3 h-3" />
                                                                                            </ZenButton>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        // Renderizar item del catálogo normalmente si no hay reemplazo
                                                                        const tipoUtilidad = servicio.tipo_utilidad === 'service' ? 'servicio' : 'producto';
                                                                        const precios = configuracionPrecios
                                                                            ? calcularPrecio(servicio.costo, servicio.gasto, tipoUtilidad, configuracionPrecios)
                                                                            : { precio_final: 0 };
                                                                        const cantidad = items[servicio.id] || 0;
                                                                        const isSelected = selectedServices.has(servicio.id);
                                                                        const isInCortesiaSet = itemsCortesia?.has(servicio.id) ?? false;
                                                                        const showCortesiaBadge = isInCortesiaSet && isSelected;
                                                                        const showCourtesyHighlight = isCourtesyMode && showCortesiaBadge;
                                                                        
                                                                        const billingType = (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
                                                                        const durationHours = baseHours !== null && baseHours !== undefined ? Number(baseHours) : null;
                                                                        
                                                                        // Calcular subtotal según billing_type (solo si está seleccionado)
                                                                        let subtotal: number = 0;
                                                                        if (isSelected) {
                                                                            if (billingType === 'HOUR' && durationHours !== null && durationHours > 0) {
                                                                                // Para HOUR: precio_hora × horas_base
                                                                                subtotal = precios.precio_final * durationHours;
                                                                            } else {
                                                                                // Para SERVICE/UNIT: precio_unitario × cantidad
                                                                                subtotal = precios.precio_final * cantidad;
                                                                            }
                                                                        }

                                                                        const inCourtesyModeNotSelected = isCourtesyMode && !isSelected;
                                                                        return (
                                                                            <div
                                                                                key={servicio.id}
                                                                                onClick={() => {
                                                                                    if (isCourtesyMode) {
                                                                                        if (!isSelected) return;
                                                                                        onToggleCortesia?.(servicio.id);
                                                                                    } else {
                                                                                        onToggleSelection(servicio.id);
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    'group flex items-center justify-between py-3 px-2 pl-6 transition-colors',
                                                                                    'border-t border-b border-zinc-700/30',
                                                                                    servicioIndex === 0 && 'border-t-0',
                                                                                    isSelected && !showCourtesyHighlight && 'bg-emerald-900/10 border-l-2 border-l-emerald-500/50',
                                                                                    showCourtesyHighlight && 'bg-purple-900/20 border-l-2 border-l-purple-500/70',
                                                                                    !isSelected && !showCourtesyHighlight && 'border-l-2 border-l-transparent',
                                                                                    inCourtesyModeNotSelected && 'opacity-40 cursor-not-allowed',
                                                                                    !inCourtesyModeNotSelected && 'hover:bg-zinc-700/20 cursor-pointer'
                                                                                )}
                                                                            >
                                                                                {/* Nivel 3: Servicio */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm text-zinc-300 leading-tight font-light flex items-center gap-1.5">
                                                                                        <span className="wrap-break-word">{servicio.nombre}</span>
                                                                                        {showCortesiaBadge && (
                                                                                            <ZenBadge variant="outline" size="sm" className="px-1 py-0 text-[10px] border-purple-500/70 text-purple-400 shrink-0">
                                                                                                <Gift className="w-2.5 h-2.5 inline mr-0.5" /> Cortesía
                                                                                            </ZenBadge>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        {/* Badge de tipo (Servicio/Producto) */}
                                                                                        <ZenBadge
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className={`px-1 py-0 text-[10px] font-light rounded-sm ${
                                                                                                tipoUtilidad === 'servicio'
                                                                                                    ? 'border-blue-600 text-blue-400'
                                                                                                    : 'border-purple-600 text-purple-400'
                                                                                            }`}
                                                                                        >
                                                                                            {tipoUtilidad === 'servicio' ? 'Servicio' : 'Producto'}
                                                                                        </ZenBadge>
                                                                                        {/* Badge de tipo de facturación (solo para servicios) */}
                                                                                        {billingType && tipoUtilidad === 'servicio' && (
                                                                                            <ZenBadge
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className={`px-1 py-0 text-[10px] font-light rounded-sm flex items-center gap-0.5 ${
                                                                                                    billingType === 'HOUR'
                                                                                                        ? 'border-amber-600 text-amber-400'
                                                                                                        : billingType === 'UNIT'
                                                                                                            ? 'border-purple-600 text-purple-400'
                                                                                                            : 'border-emerald-600 text-emerald-400'
                                                                                                }`}
                                                                                            >
                                                                                                {billingType === 'HOUR' ? (
                                                                                                    <>
                                                                                                        <Clock className="w-2.5 h-2.5" />
                                                                                                        Por Hora
                                                                                                    </>
                                                                                                ) : billingType === 'UNIT' ? (
                                                                                                    <>
                                                                                                        <Hash className="w-2.5 h-2.5" />
                                                                                                        Por Unidad
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <DollarSign className="w-2.5 h-2.5" />
                                                                                                        Fijo
                                                                                                    </>
                                                                                                )}
                                                                                            </ZenBadge>
                                                                                        )}
                                                                                        <span className="text-xs text-green-400">
                                                                                            {billingType === 'HOUR' 
                                                                                                ? formatearMoneda(precios.precio_final) + '/h'
                                                                                                : formatearMoneda(precios.precio_final)
                                                                                            }
                                                                                        </span>
                                                                                        {onEditItem && (
                                                                                            <ZenButton
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    onEditItem(servicio.id);
                                                                                                }}
                                                                                                className="w-5 h-5 p-0 opacity-40 hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-200 ml-1"
                                                                                                title="Editar ítem"
                                                                                            >
                                                                                                <Edit2 className="w-3 h-3" />
                                                                                            </ZenButton>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Selector de cantidad/horas (solo si está seleccionado) */}
                                                                                {isSelected && (
                                                                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                                                        <div className="flex items-center gap-1 w-16 justify-center">
                                                                                            {billingType === 'HOUR' && durationHours !== null && durationHours > 0 ? (
                                                                                                // Para servicios HOUR, mostrar horas base (no editable)
                                                                                                <span
                                                                                                    className="w-6 text-center text-sm font-medium text-emerald-400"
                                                                                                    title={`${cantidad} × ${durationHours}h = ${formatearMoneda(subtotal)}`}
                                                                                                >
                                                                                                    {durationHours}
                                                                                                </span>
                                                                                            ) : (
                                                                                                // Para servicios SERVICE/UNIT, mostrar selector de cantidad
                                                                                                <>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            onUpdateQuantity(servicio.id, Math.max(1, cantidad - 1));
                                                                                                        }}
                                                                                                        className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                                    >
                                                                                                        -
                                                                                                    </button>
                                                                                        <span
                                                                                            className="w-6 text-center text-sm font-medium text-emerald-400"
                                                                                            title={billingType === 'HOUR' && durationHours !== null && durationHours > 0 
                                                                                                ? `${cantidad} × ${durationHours}h = ${formatearMoneda(subtotal)}`
                                                                                                : `${cantidad} × ${formatearMoneda(precios.precio_final)} = ${formatearMoneda(subtotal)}`
                                                                                            }
                                                                                        >
                                                                                            {cantidad}
                                                                                        </span>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            onUpdateQuantity(servicio.id, cantidad + 1);
                                                                                                        }}
                                                                                                        className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                                    >
                                                                                                        +
                                                                                                    </button>
                                                                                                </>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="text-right w-20">
                                                                                            <div className="text-sm font-medium text-emerald-400">
                                                                                                {formatearMoneda(subtotal)}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                {/* 2. Items personalizados "puros" de esta categoría (sin originalItemId, aparecen al final) */}
                                                                {customItems
                                                                    .map((customItem, globalIndex) => ({ customItem, globalIndex }))
                                                                    .filter(({ customItem }) => 
                                                                        customItem.categoriaId === categoria.id && 
                                                                        !customItem.originalItemId // Solo items "puros" sin reemplazo
                                                                    )
                                                                    .map(({ customItem, globalIndex }, customIndex) => {
                                                                        const customItemId = `custom-${globalIndex}`;
                                                                        const isInCortesiaSet = itemsCortesia?.has(customItemId) ?? false;
                                                                        const showCortesiaBadge = isInCortesiaSet;
                                                                        const showCourtesyHighlight = isCourtesyMode && showCortesiaBadge;
                                                                        const safeDurationHours = baseHours !== null && baseHours !== undefined ? Number(baseHours) : null;
                                                                        const cantidadEfectiva = calcularCantidadEfectiva(
                                                                            customItem.billing_type,
                                                                            customItem.quantity,
                                                                            safeDurationHours && safeDurationHours > 0 ? safeDurationHours : 1
                                                                        );
                                                                        const subtotal = customItem.unit_price * cantidadEfectiva;
                                                                        // Determinar si es el primer item personalizado para ajustar el borde superior
                                                                        const isFirstCustomItem = customIndex === 0;
                                                                        const hasCatalogItems = categoria.servicios.length > 0;

                                                                        return (
                                                                            <div
                                                                                key={customItemId}
                                                                                role={isCourtesyMode ? 'button' : undefined}
                                                                                tabIndex={isCourtesyMode ? 0 : undefined}
                                                                                onClick={isCourtesyMode && onToggleCortesia ? () => onToggleCortesia(customItemId) : undefined}
                                                                                onKeyDown={isCourtesyMode && onToggleCortesia ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCortesia(customItemId); } } : undefined}
                                                                                className={cn(
                                                                                    'group flex items-center justify-between py-3 px-2 pl-6 hover:bg-zinc-700/20 transition-colors',
                                                                                    'border-t border-b border-zinc-700/30',
                                                                                    isFirstCustomItem && hasCatalogItems && 'border-t-0',
                                                                                    'bg-purple-900/10 border-l-2 border-l-purple-500/50',
                                                                                    isCourtesyMode && onToggleCortesia && 'cursor-pointer',
                                                                                    showCourtesyHighlight && 'bg-purple-900/25 border-l-purple-500/80'
                                                                                )}
                                                                            >
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm text-zinc-300 leading-tight font-light flex items-center gap-1.5">
                                                                                        <span className="wrap-break-word">{customItem.name}</span>
                                                                                        {showCortesiaBadge && (
                                                                                            <ZenBadge variant="outline" size="sm" className="px-1 py-0 text-[10px] border-purple-500/70 text-purple-400 shrink-0">
                                                                                                <Gift className="w-2.5 h-2.5 inline mr-0.5" /> Cortesía
                                                                                            </ZenBadge>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <ZenBadge
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="px-1 py-0 text-[10px] font-light rounded-sm border-purple-600 text-purple-400"
                                                                                        >
                                                                                            Personalizado
                                                                                        </ZenBadge>
                                                                                        {customItem.billing_type === 'HOUR' && (
                                                                                            <ZenBadge
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="px-1 py-0 text-[10px] font-light rounded-sm flex items-center gap-0.5 border-amber-600 text-amber-400"
                                                                                            >
                                                                                                <Clock className="w-2.5 h-2.5" />
                                                                                                Por Hora
                                                                                            </ZenBadge>
                                                                                        )}
                                                                                        {customItem.billing_type === 'UNIT' && (
                                                                                            <ZenBadge
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="px-1 py-0 text-[10px] font-light rounded-sm flex items-center gap-0.5 border-purple-600 text-purple-400"
                                                                                            >
                                                                                                <Hash className="w-2.5 h-2.5" />
                                                                                                Por Unidad
                                                                                            </ZenBadge>
                                                                                        )}
                                                                                        <span className="text-xs text-green-400">
                                                                                            {customItem.billing_type === 'HOUR' 
                                                                                                ? formatearMoneda(customItem.unit_price) + '/h'
                                                                                                : formatearMoneda(customItem.unit_price)
                                                                                            }
                                                                                        </span>
                                                                                        {onEditCustomItem && (
                                                                                            <ZenButton
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    onEditCustomItem(globalIndex);
                                                                                                }}
                                                                                                className="w-5 h-5 p-0 opacity-40 hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-200 ml-1"
                                                                                                title="Editar ítem"
                                                                                            >
                                                                                                <Edit2 className="w-3 h-3" />
                                                                                            </ZenButton>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                                                    <div className="flex items-center gap-1 w-16 justify-center">
                                                                                        {/* Botones -/+ para todos los ítems al vuelo (HOUR, SERVICE, UNIT) */}
                                                                                        {onUpdateCustomItemQuantity && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    onUpdateCustomItemQuantity(globalIndex, Math.max(1, customItem.quantity - 1));
                                                                                                }}
                                                                                                className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                            >
                                                                                                -
                                                                                            </button>
                                                                                        )}
                                                                                        <span
                                                                                            className="w-6 text-center text-sm font-medium text-emerald-400"
                                                                                            title={customItem.billing_type === 'HOUR' && safeDurationHours !== null && safeDurationHours > 0
                                                                                                ? `${customItem.quantity} × ${safeDurationHours}h = ${formatearMoneda(subtotal)}`
                                                                                                : `${customItem.quantity} × ${formatearMoneda(customItem.unit_price)} = ${formatearMoneda(subtotal)}`
                                                                                            }
                                                                                        >
                                                                                            {customItem.quantity}
                                                                                        </span>
                                                                                        {onUpdateCustomItemQuantity && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    onUpdateCustomItemQuantity(globalIndex, customItem.quantity + 1);
                                                                                                }}
                                                                                                className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                            >
                                                                                                +
                                                                                            </button>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="text-right w-20">
                                                                                        <div className="text-sm font-medium text-emerald-400">
                                                                                            {formatearMoneda(subtotal)}
                                                                                        </div>
                                                                                    </div>
                                                                                    {onDeleteCustomItem && (
                                                                                        <ZenButton
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                onDeleteCustomItem(globalIndex);
                                                                                            }}
                                                                                            className="w-5 h-5 p-0 opacity-60 hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                                                                                            title="Eliminar ítem"
                                                                                        >
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </ZenButton>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                {/* 3. Botón + Personalizado al final de cada categoría expandida */}
                                                                {onCreateCustomItem && (
                                                                    <div
                                                                        className={cn(
                                                                            'px-6 py-2 border-t border-zinc-700/30',
                                                                            isCourtesyMode && 'opacity-40 pointer-events-none'
                                                                        )}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onPointerDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ZenButton
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                if (isCourtesyMode) return;
                                                                                onCreateCustomItem(categoria.id);
                                                                            }}
                                                                            className="w-full justify-start gap-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/20"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                            Personalizado
                                                                        </ZenButton>
                                                                    </div>
                                                                )}
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
    );
}

