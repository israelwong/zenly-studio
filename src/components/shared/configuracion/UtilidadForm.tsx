'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DollarSign, Info } from 'lucide-react';
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
} from '@/lib/actions/studio/config/configuracion-precios.actions';
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
            
            // obtenerConfiguracionPrecios devuelve valores como porcentajes (30, 10, 5, etc.)
            // Redondear a enteros para mostrar en los inputs
            const configData = {
                utilidad_servicio: result?.utilidad_servicio 
                    ? String(Math.round(parseFloat(result.utilidad_servicio))) 
                    : '',
                utilidad_producto: result?.utilidad_producto 
                    ? String(Math.round(parseFloat(result.utilidad_producto))) 
                    : '',
                comision_venta: result?.comision_venta 
                    ? String(Math.round(parseFloat(result.comision_venta))) 
                    : '',
                sobreprecio: result?.sobreprecio 
                    ? String(Math.round(parseFloat(result.sobreprecio))) 
                    : ''
            };
            setConfig(configData);
            setInitialConfig(configData); // Guardar valores iniciales
        } catch (error) {
            console.error('Error loading config:', error);
            toast.error('Error al cargar configuración');
            // En caso de error, inicializar con valores vacíos
            const emptyConfig = {
                utilidad_servicio: '',
                utilidad_producto: '',
                comision_venta: '',
                sobreprecio: ''
            };
            setConfig(emptyConfig);
            setInitialConfig(emptyConfig);
        } finally {
            setLoading(false);
        }
    }

    type ConfigField = 'utilidad_servicio' | 'utilidad_producto' | 'comision_venta' | 'sobreprecio';

    const handleInputChange = (field: ConfigField, value: string) => {
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

        setConfig(prev => ({
            ...prev,
            [field]: onlyNumbers || ''
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
            // El usuario ingresa valores enteros (10, 5, etc.) en el formulario
            // El schema espera decimales (0.10, 0.05, etc.) entre 0.0 y 1.0
            // Convertir de entero a decimal: 10 -> 0.10
            const parseAndValidate = (value: string | undefined): string => {
                if (!value || value.trim() === '') return '0';
                const parsed = parseFloat(value);
                if (isNaN(parsed)) return '0';
                // Convertir de porcentaje entero a decimal: 10 -> 0.10
                return String(parsed / 100);
            };

            const dataToSend: ConfiguracionPreciosForm = {
                utilidad_servicio: parseAndValidate(config.utilidad_servicio),
                utilidad_producto: parseAndValidate(config.utilidad_producto),
                comision_venta: parseAndValidate(config.comision_venta),
                sobreprecio: parseAndValidate(config.sobreprecio),
            };

            const result = await actualizarConfiguracionPrecios(studioSlug, dataToSend);

            if (result.success) {
                toast.success('Configuración actualizada correctamente');

                // Actualizar initialConfig con los valores que acabamos de guardar
                // Esto asegura que los botones de restaurar no aparezcan incorrectamente
                setInitialConfig({ ...config });

                // Emitir evento para notificar a otros componentes (valores en decimal)
                // dataToSend ya tiene valores en decimal (0.10, 0.05, etc.)
                triggerUpdate(studioSlug, {
                    utilidad_servicio: parseFloat(dataToSend.utilidad_servicio || '0'),
                    utilidad_producto: parseFloat(dataToSend.utilidad_producto || '0'),
                    comision_venta: parseFloat(dataToSend.comision_venta || '0'),
                    sobreprecio: parseFloat(dataToSend.sobreprecio || '0'),
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
