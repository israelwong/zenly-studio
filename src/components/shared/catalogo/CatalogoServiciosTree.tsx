'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ZenBadge } from '@/components/ui/zen';
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
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

    // Callbacks
    onToggleSeccion: (seccionId: string) => void;
    onToggleCategoria: (categoriaId: string) => void;
    onUpdateQuantity: (servicioId: string, cantidad: number) => void;

    // Datos calculados
    serviciosSeleccionados: ServiciosSeleccionados;

    // Para cálculos de precio
    configuracionPrecios: ConfiguracionPrecios | null;
}

export function CatalogoServiciosTree({
    catalogoFiltrado,
    filtroServicio,
    seccionesExpandidas,
    categoriasExpandidas,
    items,
    onToggleSeccion,
    onToggleCategoria,
    onUpdateQuantity,
    serviciosSeleccionados,
    configuracionPrecios,
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
                                                                        {categoria.servicios.length} {categoria.servicios.length === 1 ? 'item' : 'items'} disponible
                                                                        {categoria.servicios.length === 1 ? '' : 's'}
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
                                                                        const precios = configuracionPrecios
                                                                            ? calcularPrecio(servicio.costo, servicio.gasto, tipoUtilidad, configuracionPrecios)
                                                                            : { precio_final: 0 };
                                                                        const cantidad = items[servicio.id] || 0;
                                                                        const subtotal = precios.precio_final * cantidad;

                                                                        return (
                                                                            <div
                                                                                key={servicio.id}
                                                                                className={cn(
                                                                                    'flex items-center justify-between py-3 px-2 pl-6 hover:bg-zinc-700/20 transition-colors',
                                                                                    'border-t border-b border-zinc-700/30',
                                                                                    servicioIndex === 0 && 'border-t-0',
                                                                                    cantidad > 0 && 'bg-emerald-900/10 border-l-2 border-l-emerald-500/50',
                                                                                    cantidad === 0 && 'border-l-2 border-l-transparent'
                                                                                )}
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
                                                                                        <span className="text-xs text-green-400">{formatearMoneda(precios.precio_final)}</span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="flex items-center gap-1 w-16 justify-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => onUpdateQuantity(servicio.id, Math.max(0, cantidad - 1))}
                                                                                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                        >
                                                                                            -
                                                                                        </button>
                                                                                        <span
                                                                                            className={`w-6 text-center text-sm font-medium ${cantidad > 0 ? 'text-emerald-400' : 'text-white'
                                                                                                }`}
                                                                                        >
                                                                                            {cantidad}
                                                                                        </span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => onUpdateQuantity(servicio.id, cantidad + 1)}
                                                                                            className="w-5 h-5 flex items-center justify-center rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 hover:text-white transition-colors text-xs"
                                                                                        >
                                                                                            +
                                                                                        </button>
                                                                                    </div>

                                                                                    <div className="text-right w-20">
                                                                                        <div
                                                                                            className={`text-sm font-medium ${cantidad > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}
                                                                                        >
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
    );
}

