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

    // Cargar configuración inicial
    useEffect(() => {
        cargarConfiguracion();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studioSlug]);

    const cargarConfiguracion = async () => {
        try {
            setLoading(true);

            const configResult = await obtenerConfiguracionPrecios(studioSlug);

            if (configResult) {
                // Convertir valores de decimal (0.10) a porcentaje entero (10) para mostrar en UI
                const loadedConfig = {
                    utilidad_servicio: configResult.utilidad_servicio
                        ? String(Math.round(parseFloat(configResult.utilidad_servicio) * 100))
                        : undefined,
                    utilidad_producto: configResult.utilidad_producto
                        ? String(Math.round(parseFloat(configResult.utilidad_producto) * 100))
                        : undefined,
                    comision_venta: configResult.comision_venta
                        ? String(Math.round(parseFloat(configResult.comision_venta) * 100))
                        : undefined,
                    sobreprecio: configResult.sobreprecio
                        ? String(Math.round(parseFloat(configResult.sobreprecio) * 100))
                        : undefined,
                };
                setConfig(loadedConfig);
                setInitialConfig(loadedConfig);
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSubmitting(true);

            // Convertir valores de porcentaje (10) a decimal (0.10) para enviar al schema
            // Los valores en el formulario están en porcentaje, pero el schema espera decimales
            const configToSend: ConfiguracionPreciosForm = {
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

            const result = await actualizarConfiguracionPrecios(studioSlug, configToSend);

            if (result.success) {
                toast.success('Configuración actualizada exitosamente');
                // Actualizar valores iniciales después de guardar
                setInitialConfig(config);
                // Disparar evento para notificar a otros componentes con configuración completa
                // Convertir de porcentaje (35) a decimal (0.35) para el evento
                const configDecimal = {
                    utilidad_servicio: parseFloat(config.utilidad_servicio || '0') / 100,
                    utilidad_producto: parseFloat(config.utilidad_producto || '0') / 100,
                    comision_venta: parseFloat(config.comision_venta || '0') / 100,
                    sobreprecio: parseFloat(config.sobreprecio || '0') / 100,
                };
                triggerUpdate(studioSlug, configDecimal);
                // Cerrar modal si se proporciona callback
                if (onClose) {
                    onClose();
                }
            } else {
                toast.error(result.error || 'Error al actualizar la configuración');
            }
        } catch (error) {
            console.error('Error actualizando configuración:', error);
            toast.error('Error al actualizar la configuración');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (field: 'utilidad_servicio' | 'utilidad_producto' | 'comision_venta' | 'sobreprecio', value: string) => {
        // Solo permitir números enteros (sin punto decimal)
        const onlyNumbers = value.replace(/[^0-9]/g, '');

        // Validaciones específicas por campo
        const numValue = parseInt(onlyNumbers, 10);

        if (onlyNumbers && !isNaN(numValue)) {
            // Utilidad servicio y producto: máximo 3 dígitos (999)
            if ((field === 'utilidad_servicio' || field === 'utilidad_producto')) {
                if (onlyNumbers.length > 3) {
                    return; // No actualizar si excede 3 dígitos
                }
            }

            // Comisión de venta y sobreprecio: máximo 100
            if ((field === 'comision_venta' || field === 'sobreprecio') && numValue > 100) {
                return; // No actualizar si excede 100
            }
        }

        setConfig(prev => ({ ...prev, [field]: onlyNumbers || undefined }));
    };

    const handleRestore = () => {
        setConfig(initialConfig);
        toast.success('Valores restaurados');
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-zinc-800/50 rounded animate-pulse"></div>
                <div className="h-64 bg-zinc-800/50 rounded animate-pulse"></div>
                <div className="h-32 bg-zinc-800/50 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header informativo */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-blue-400 font-medium mb-1">
                        Configuración de Márgenes de Utilidad
                    </h3>
                    <p className="text-sm text-zinc-400">
                        Estos valores en porcentaje se aplican automáticamente a todos los servicios y productos
                        del catálogo. Los cambios recalculan los precios en tiempo real y afectan
                        nuevas cotizaciones (las existentes mantienen sus precios originales).
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <ZenCard variant="outlined">
                    <ZenCardHeader className="border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-400" />
                            <ZenCardTitle>Configuración de Utilidad</ZenCardTitle>
                        </div>
                    </ZenCardHeader>

                    <ZenCardContent className="p-6 space-y-6">
                        {/* Fila 1: Utilidades (2 columnas) */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Utilidad de Servicios */}
                            <ZenInput
                                label="Utilidad Servicios"
                                type="text"
                                inputMode="numeric"
                                value={config.utilidad_servicio || ''}
                                onChange={(e) => handleInputChange('utilidad_servicio', e.target.value)}
                                placeholder="0"
                                hint="Margen de utilidad para servicios"
                            />

                            {/* Utilidad de Productos */}
                            <ZenInput
                                label="Utilidad Productos"
                                type="text"
                                inputMode="numeric"
                                value={config.utilidad_producto || ''}
                                onChange={(e) => handleInputChange('utilidad_producto', e.target.value)}
                                placeholder="0"
                                hint="Margen de utilidad para productos"
                            />
                        </div>

                        {/* Fila 2: Comisión y Sobreprecio (2 columnas) */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Comisión de Venta */}
                            <ZenInput
                                label="Comisión de Venta"
                                type="text"
                                inputMode="numeric"
                                value={config.comision_venta || ''}
                                onChange={(e) => handleInputChange('comision_venta', e.target.value)}
                                placeholder="0"
                                hint="Comisión deducida del precio"
                            />

                            {/* Sobreprecio */}
                            <ZenInput
                                label="Sobreprecio / Descuento"
                                type="text"
                                inputMode="numeric"
                                value={config.sobreprecio || ''}
                                onChange={(e) => handleInputChange('sobreprecio', e.target.value)}
                                placeholder="0"
                                hint="Margen para descuentos"
                            />
                        </div>
                    </ZenCardContent>
                </ZenCard>

                {/* Botones de acción */}
                <div className="flex gap-3">
                    <ZenButton
                        type="button"
                        variant="outline"
                        onClick={handleRestore}
                        disabled={submitting}
                        className="flex-1"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar Valores
                    </ZenButton>
                    <ZenButton
                        type="submit"
                        variant="primary"
                        loading={submitting}
                        loadingText="Actualizando configuración..."
                        className="flex-1"
                        disabled={submitting}
                    >
                        Guardar Configuración
                    </ZenButton>
                </div>
            </form>

            {/* Nota adicional */}
            <div className="text-xs text-zinc-500 text-center">
                Los precios se recalculan automáticamente. Las cotizaciones existentes
                mantienen sus precios originales.
            </div>
        </div>
    );
}
