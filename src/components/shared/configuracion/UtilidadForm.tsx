'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DollarSign, Info, RotateCcw } from 'lucide-react';
import {
    ZenButton,
    ZenInput,
    ZenCard,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardContent
} from '@/components/ui/zen';
import {
    obtenerConfiguracionPrecios,
    actualizarConfiguracionPrecios
} from '@/lib/actions/studio/catalogo/utilidad.actions';
import type {
    ConfiguracionPreciosForm,
} from '@/lib/actions/schemas/configuracion-precios-schemas';
import { useConfiguracionPreciosRefresh } from '@/hooks/useConfiguracionPreciosRefresh';

interface UtilidadFormProps {
    studioSlug: string;
    onClose?: () => void;
}

export function UtilidadForm({ studioSlug, onClose }: UtilidadFormProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { triggerUpdate } = useConfiguracionPreciosRefresh();

    // Estado del formulario (valores en porcentaje para mostrar en UI: 10, 30, etc.)
    const [config, setConfig] = useState<{
        utilidad_servicio?: string;
        utilidad_producto?: string;
        comision_venta?: string;
        sobreprecio?: string;
    }>({
        utilidad_servicio: undefined,
        utilidad_producto: undefined,
        comision_venta: undefined,
        sobreprecio: undefined
    });

    // Valores iniciales para restaurar (en porcentaje)
    const [initialConfig, setInitialConfig] = useState<{
        utilidad_servicio?: string;
        utilidad_producto?: string;
        comision_venta?: string;
        sobreprecio?: string;
    }>({
        utilidad_servicio: undefined,
        utilidad_producto: undefined,
        comision_venta: undefined,
        sobreprecio: undefined
    });

    useEffect(() => {
        loadConfig();
    }, [studioSlug]);

    async function loadConfig() {
        setLoading(true);
        try {
            const result = await obtenerConfiguracionPrecios(studioSlug);
            if (result) {
                // Los valores vienen como decimales de BD (0.3, 0.05)
                // Convertir a porcentajes para mostrar en UI (30, 5)
                const configData = {
                    utilidad_servicio: result.utilidad_servicio
                        ? String(parseFloat(result.utilidad_servicio) * 100)
                        : '',
                    utilidad_producto: result.utilidad_producto
                        ? String(parseFloat(result.utilidad_producto) * 100)
                        : '',
                    comision_venta: result.comision_venta
                        ? String(parseFloat(result.comision_venta) * 100)
                        : '',
                    sobreprecio: result.sobreprecio
                        ? String(parseFloat(result.sobreprecio) * 100)
                        : ''
                };
                setConfig(configData);
                setInitialConfig(configData); // Guardar valores iniciales
            }
        } catch (error) {
            console.error('Error loading config:', error);
            toast.error('Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    }

    const handleInputChange = (field: keyof ConfiguracionPreciosForm, value: string) => {
        // Permitir solo números y punto decimal
        const sanitizedValue = value.replace(/[^0-9.]/g, '');

        // Permitir solo un punto decimal
        const parts = sanitizedValue.split('.');
        const formattedValue = parts.length > 2
            ? `${parts[0]}.${parts.slice(1).join('')}`
            : sanitizedValue;

        setConfig(prev => ({
            ...prev,
            [field]: formattedValue
        }));
    };

    const handleReset = (field: keyof ConfiguracionPreciosForm) => {
        setConfig(prev => ({
            ...prev,
            [field]: initialConfig[field] || ''
        }));
    };

    const hasChanges = () => {
        return (
            config.utilidad_servicio !== initialConfig.utilidad_servicio ||
            config.utilidad_producto !== initialConfig.utilidad_producto ||
            config.comision_venta !== initialConfig.comision_venta ||
            config.sobreprecio !== initialConfig.sobreprecio
        );
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!hasChanges()) {
            toast.info('No hay cambios para guardar');
            return;
        }

        setSubmitting(true);
        try {
            // Convertir de porcentaje (20) a decimal (0.20) para el schema
            const dataToSend: ConfiguracionPreciosForm = {
                utilidad_servicio: config.utilidad_servicio
                    ? String(parseFloat(config.utilidad_servicio) / 100)
                    : undefined,
                utilidad_producto: config.utilidad_producto
                    ? String(parseFloat(config.utilidad_producto) / 100)
                    : undefined,
                comision_venta: config.comision_venta
                    ? String(parseFloat(config.comision_venta) / 100)
                    : undefined,
                sobreprecio: config.sobreprecio
                    ? String(parseFloat(config.sobreprecio) / 100)
                    : undefined,
            };

            const result = await actualizarConfiguracionPrecios(studioSlug, dataToSend);

            if (result.success) {
                toast.success('Configuración actualizada correctamente');

                // Actualizar los valores iniciales con los nuevos valores guardados
                setInitialConfig(config);

                // Emitir evento para notificar a otros componentes (ya en porcentaje)
                triggerUpdate({
                    sobreprecio: parseFloat(config.sobreprecio || '0'),
                    utilidad_servicio: parseFloat(config.utilidad_servicio || '0'),
                    utilidad_producto: parseFloat(config.utilidad_producto || '0'),
                    comision_venta: parseFloat(config.comision_venta || '0')
                });

                // Cerrar modal si existe onClose
                if (onClose) {
                    onClose();
                }
            } else {
                toast.error(result.error || 'Error al actualizar configuración');
            }
        } catch (error) {
            console.error('Error updating config:', error);
            toast.error('Error al actualizar configuración');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                        <p className="text-blue-300">
                            <strong>¿Qué son los márgenes de utilidad?</strong>
                        </p>
                        <p className="text-blue-200/80">
                            Los márgenes te ayudan a calcular automáticamente los precios de venta de tus servicios
                            y productos, asegurando que cubras tus costos operativos y obtengas la ganancia deseada.
                        </p>
                        <ul className="list-disc list-inside text-blue-200/80 space-y-1 ml-2">
                            <li><strong>Utilidad:</strong> Ganancia sobre el costo de un servicio/producto</li>
                            <li><strong>Comisión:</strong> Porcentaje que gana el vendedor por cada venta</li>
                            <li><strong>Sobreprecio:</strong> Margen de seguridad adicional sobre el precio final</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Utilidad Servicios */}
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="flex items-center gap-2 text-base">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            Utilidad Servicios
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent>
                        <div className="relative">
                            <ZenInput
                                type="text"
                                inputMode="decimal"
                                value={config.utilidad_servicio || ''}
                                onChange={(e) => handleInputChange('utilidad_servicio', e.target.value)}
                                placeholder="0"
                                hint="% de ganancia sobre el costo del servicio"
                            />
                            {config.utilidad_servicio !== initialConfig.utilidad_servicio && (
                                <button
                                    type="button"
                                    onClick={() => handleReset('utilidad_servicio')}
                                    className="absolute right-2 top-2 p-1 hover:bg-zinc-700 rounded transition-colors"
                                    title="Restaurar valor original"
                                >
                                    <RotateCcw className="h-4 w-4 text-zinc-400" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Ejemplo: Si un servicio cuesta $1,000 y aplicas 30% de utilidad, el precio base será $1,300
                        </p>
                    </ZenCardContent>
                </ZenCard>

                {/* Utilidad Productos */}
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="flex items-center gap-2 text-base">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            Utilidad Productos
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent>
                        <div className="relative">
                            <ZenInput
                                type="text"
                                inputMode="decimal"
                                value={config.utilidad_producto || ''}
                                onChange={(e) => handleInputChange('utilidad_producto', e.target.value)}
                                placeholder="0"
                                hint="% de ganancia sobre el costo del producto"
                            />
                            {config.utilidad_producto !== initialConfig.utilidad_producto && (
                                <button
                                    type="button"
                                    onClick={() => handleReset('utilidad_producto')}
                                    className="absolute right-2 top-2 p-1 hover:bg-zinc-700 rounded transition-colors"
                                    title="Restaurar valor original"
                                >
                                    <RotateCcw className="h-4 w-4 text-zinc-400" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Ejemplo: Si un producto cuesta $500 y aplicas 50% de utilidad, el precio base será $750
                        </p>
                    </ZenCardContent>
                </ZenCard>

                {/* Comisión Venta */}
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="flex items-center gap-2 text-base">
                            <DollarSign className="h-5 w-5 text-blue-500" />
                            Comisión de Venta
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent>
                        <div className="relative">
                            <ZenInput
                                type="text"
                                inputMode="decimal"
                                value={config.comision_venta || ''}
                                onChange={(e) => handleInputChange('comision_venta', e.target.value)}
                                placeholder="0"
                                hint="% de comisión para el vendedor"
                            />
                            {config.comision_venta !== initialConfig.comision_venta && (
                                <button
                                    type="button"
                                    onClick={() => handleReset('comision_venta')}
                                    className="absolute right-2 top-2 p-1 hover:bg-zinc-700 rounded transition-colors"
                                    title="Restaurar valor original"
                                >
                                    <RotateCcw className="h-4 w-4 text-zinc-400" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Ejemplo: Si el precio es $1,000 y hay 10% de comisión, se añaden $100 al precio final
                        </p>
                    </ZenCardContent>
                </ZenCard>

                {/* Sobreprecio */}
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="flex items-center gap-2 text-base">
                            <DollarSign className="h-5 w-5 text-amber-500" />
                            Sobreprecio
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent>
                        <div className="relative">
                            <ZenInput
                                type="text"
                                inputMode="decimal"
                                value={config.sobreprecio || ''}
                                onChange={(e) => handleInputChange('sobreprecio', e.target.value)}
                                placeholder="0"
                                hint="% de margen de seguridad adicional"
                            />
                            {config.sobreprecio !== initialConfig.sobreprecio && (
                                <button
                                    type="button"
                                    onClick={() => handleReset('sobreprecio')}
                                    className="absolute right-2 top-2 p-1 hover:bg-zinc-700 rounded transition-colors"
                                    title="Restaurar valor original"
                                >
                                    <RotateCcw className="h-4 w-4 text-zinc-400" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            <strong className="text-amber-400">Límite de descuento:</strong> Este valor determina el descuento máximo
                            que se puede aplicar en las condiciones comerciales
                        </p>
                    </ZenCardContent>
                </ZenCard>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                {onClose && (
                    <ZenButton
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancelar
                    </ZenButton>
                )}
                <ZenButton
                    type="submit"
                    variant="primary"
                    loading={submitting}
                    disabled={!hasChanges() || submitting}
                >
                    Guardar Cambios
                </ZenButton>
            </div>
        </form>
    );
}
