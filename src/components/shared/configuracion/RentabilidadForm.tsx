'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DollarSign, Info, Users, Coins, Building2 } from 'lucide-react';
import {
    ZenButton,
    ZenInput,
    ZenCard,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardContent,
    ZenSwitch,
    SeparadorZen
} from '@/components/ui/zen';
import {
    obtenerConfiguracionPrecios,
    actualizarConfiguracionPrecios
} from '@/lib/actions/studio/config/configuracion-precios.actions';
import type {
    ConfiguracionPreciosForm,
} from '@/lib/actions/schemas/configuracion-precios-schemas';
import { useConfiguracionPreciosRefresh } from '@/hooks/useConfiguracionPreciosRefresh';

interface RentabilidadFormProps {
    studioSlug: string;
    onClose?: () => void;
}

export function RentabilidadForm({ studioSlug, onClose }: RentabilidadFormProps) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { triggerUpdate } = useConfiguracionPreciosRefresh();

    // Estado del formulario (valores en porcentaje para mostrar en UI: 10, 30, etc.)
    const [config, setConfig] = useState<{
        utilidad_servicio?: string;
        utilidad_producto?: string;
        comision_plataforma?: string;
        comision_venta?: string;
        sobreprecio?: string;
        referral_reward_type?: 'PERCENTAGE' | 'FIXED';
        referral_reward_value?: string;
        is_referral_active?: boolean;
    }>({
        utilidad_servicio: undefined,
        utilidad_producto: undefined,
        comision_plataforma: undefined,
        comision_venta: undefined,
        sobreprecio: undefined,
        referral_reward_type: 'PERCENTAGE',
        referral_reward_value: undefined,
        is_referral_active: false
    });

    // Valores iniciales para restaurar (en porcentaje)
    const [initialConfig, setInitialConfig] = useState<{
        utilidad_servicio?: string;
        utilidad_producto?: string;
        comision_plataforma?: string;
        comision_venta?: string;
        sobreprecio?: string;
        referral_reward_type?: 'PERCENTAGE' | 'FIXED';
        referral_reward_value?: string;
        is_referral_active?: boolean;
    }>({
        utilidad_servicio: undefined,
        utilidad_producto: undefined,
        comision_plataforma: undefined,
        comision_venta: undefined,
        sobreprecio: undefined,
        referral_reward_type: 'PERCENTAGE',
        referral_reward_value: undefined,
        is_referral_active: false
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
            const rewardType = (result?.referral_reward_type as 'PERCENTAGE' | 'FIXED') || 'PERCENTAGE';
            const rewardValue = result?.referral_reward_value || '';
            // Si hay valor de recompensa, asumir que está activo
            const isReferralActive = !!rewardValue && rewardValue.trim() !== '';
            
            const configData = {
                utilidad_servicio: result?.utilidad_servicio
                    ? String(Math.round(parseFloat(result.utilidad_servicio)))
                    : '',
                utilidad_producto: result?.utilidad_producto
                    ? String(Math.round(parseFloat(result.utilidad_producto)))
                    : '',
                comision_plataforma: result?.comision_plataforma
                    ? String(Math.round(parseFloat(result.comision_plataforma)))
                    : '',
                comision_venta: result?.comision_venta
                    ? String(Math.round(parseFloat(result.comision_venta)))
                    : '',
                sobreprecio: result?.sobreprecio
                    ? String(Math.round(parseFloat(result.sobreprecio)))
                    : '',
                referral_reward_type: rewardType,
                referral_reward_value: rewardValue ? String(Math.round(parseFloat(rewardValue))) : '',
                is_referral_active: isReferralActive
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
                comision_plataforma: '',
                comision_venta: '',
                sobreprecio: '',
                referral_reward_type: 'PERCENTAGE' as const,
                referral_reward_value: '',
                is_referral_active: false
            };
            setConfig(emptyConfig);
            setInitialConfig(emptyConfig);
        } finally {
            setLoading(false);
        }
    }

    type ConfigField = 'utilidad_servicio' | 'utilidad_producto' | 'comision_plataforma' | 'comision_venta' | 'sobreprecio' | 'referral_reward_value';

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

            // Comisión de plataforma, comisión de venta y sobreprecio: máximo 100
            if ((field === 'comision_plataforma' || field === 'comision_venta' || field === 'sobreprecio') && numValue > 100) {
                return; // No actualizar si excede 100
            }

            // referral_reward_value: validación según tipo
            if (field === 'referral_reward_value') {
                if (config.referral_reward_type === 'PERCENTAGE' && numValue > 100) {
                    return; // Porcentaje máximo 100%
                }
                if (config.referral_reward_type === 'FIXED' && onlyNumbers.length > 10) {
                    return; // Monto fijo máximo 10 dígitos
                }
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
            config.comision_plataforma !== initialConfig.comision_plataforma ||
            config.comision_venta !== initialConfig.comision_venta ||
            config.sobreprecio !== initialConfig.sobreprecio ||
            config.referral_reward_type !== initialConfig.referral_reward_type ||
            config.referral_reward_value !== initialConfig.referral_reward_value ||
            config.is_referral_active !== initialConfig.is_referral_active
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
                comision_plataforma: parseAndValidate(config.comision_plataforma),
                comision_venta: parseAndValidate(config.comision_venta),
                sobreprecio: parseAndValidate(config.sobreprecio),
                // Solo enviar datos de referral si está activo
                referral_reward_type: config.is_referral_active 
                    ? (config.referral_reward_type || 'PERCENTAGE')
                    : undefined,
                referral_reward_value: config.is_referral_active && config.referral_reward_value && config.referral_reward_value.trim() !== ''
                    ? config.referral_reward_value
                    : undefined,
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
                    comision_plataforma: parseFloat(dataToSend.comision_plataforma || '0'),
                    comision_venta: parseFloat(dataToSend.comision_venta || '0'),
                    sobreprecio: parseFloat(dataToSend.sobreprecio || '0'),
                });

                // Cerrar modal si existe onClose
                if (onClose) {
                    onClose();
                }
            } else {
                let errorMessage = 'Error al actualizar configuración';
                if ('error' in result) {
                    const error = result.error;
                    if (typeof error === 'string') {
                        errorMessage = error;
                    } else if (error && typeof error === 'object') {
                        // Si es un objeto con fieldErrors, convertir a string
                        const fieldErrors = Object.values(error).flat();
                        if (Array.isArray(fieldErrors) && fieldErrors.length > 0 && typeof fieldErrors[0] === 'string') {
                            errorMessage = fieldErrors[0];
                        }
                    }
                }
                toast.error(errorMessage);
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
            <div className="space-y-10 max-w-3xl mx-auto">
                {/* Sección: Márgenes de Ganancia Skeleton */}
                <div className="space-y-4">
                    <div className="h-7 w-48 bg-zinc-700 rounded animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <ZenCard key={i}>
                                <ZenCardHeader className="pb-1 mt-1">
                                    <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse mb-1" />
                                </ZenCardHeader>
                                <ZenCardContent className="pt-0 pb-3">
                                    <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                                    <div className="h-3 w-40 bg-zinc-700 rounded animate-pulse mt-2" />
                                </ZenCardContent>
                            </ZenCard>
                        ))}
                    </div>
                </div>

                {/* Separador Skeleton */}
                <div className="border-t border-zinc-800"></div>

                {/* Sección: Estructura de Comisiones Skeleton */}
                <div className="space-y-6">
                    <div className="h-7 w-64 bg-zinc-700 rounded animate-pulse" />
                    
                    {/* Comisión Plataforma Skeleton */}
                    <div className="bg-zinc-800/40 rounded-lg p-6 border border-zinc-700/50">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 bg-zinc-700 rounded animate-pulse" />
                                <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse" />
                            </div>
                            <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                            <div className="h-3 w-64 bg-zinc-700 rounded animate-pulse" />
                        </div>
                    </div>

                    {/* Comisión Venta Skeleton */}
                    <div className="bg-zinc-800/40 rounded-lg p-6 border border-zinc-700/50">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 bg-zinc-700 rounded animate-pulse" />
                                <div className="h-4 w-48 bg-zinc-700 rounded animate-pulse" />
                            </div>
                            <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                            <div className="h-3 w-64 bg-zinc-700 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Separador Skeleton */}
                <div className="border-t border-zinc-800"></div>

                {/* Sección: Distribución por Referencia Skeleton */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 bg-zinc-700 rounded animate-pulse" />
                                <div>
                                    <div className="h-4 w-48 bg-zinc-700 rounded animate-pulse mb-1" />
                                    <div className="h-3 w-64 bg-zinc-700 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="h-6 w-11 bg-zinc-700 rounded-full animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Actions Skeleton */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-800">
                    <div className="h-9 w-20 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-9 w-32 bg-zinc-700 rounded animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl mx-auto">
            {/* Sección: Márgenes de Ganancia */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-zinc-100">Márgenes de Ganancia</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Utilidad Servicios */}
                    <ZenCard>
                        <ZenCardHeader className="pb-1 mt-1">
                            <ZenCardTitle className="text-sm font-medium text-zinc-400 mb-1">
                                Utilidad Servicios
                            </ZenCardTitle>
                        </ZenCardHeader>
                        <ZenCardContent className="pt-0 pb-3">
                            <ZenInput
                                type="text"
                                inputMode="decimal"
                                value={config.utilidad_servicio || ''}
                                onChange={(e) => handleInputChange('utilidad_servicio', e.target.value)}
                                placeholder="0"
                                hint="% de ganancia sobre el costo del servicio"
                            />
                            <p className="text-xs text-zinc-500 mt-2">
                                Ejemplo: 30% = $1,000 → $1,300
                            </p>
                        </ZenCardContent>
                    </ZenCard>

                    {/* Utilidad Productos */}
                    <ZenCard>
                        <ZenCardHeader className="pb-1 mt-1">
                            <ZenCardTitle className="text-sm font-medium text-zinc-400 mb-1">
                                Utilidad Productos
                            </ZenCardTitle>
                        </ZenCardHeader>
                        <ZenCardContent className="pt-0 pb-3">
                            <ZenInput
                                type="text"
                                inputMode="decimal"
                                value={config.utilidad_producto || ''}
                                onChange={(e) => handleInputChange('utilidad_producto', e.target.value)}
                                placeholder="0"
                                hint="% de ganancia sobre el costo del producto"
                            />
                            <p className="text-xs text-zinc-500 mt-2">
                                Ejemplo: 50% = $500 → $750
                            </p>
                        </ZenCardContent>
                    </ZenCard>

                    {/* Sobreprecio */}
                    <ZenCard>
                        <ZenCardHeader className="pb-1 mt-1">
                            <ZenCardTitle className="text-sm font-medium text-zinc-400 mb-1">
                                Sobreprecio
                            </ZenCardTitle>
                        </ZenCardHeader>
                        <ZenCardContent className="pt-0 pb-3">
                            <ZenInput
                                type="text"
                                inputMode="decimal"
                                value={config.sobreprecio || ''}
                                onChange={(e) => handleInputChange('sobreprecio', e.target.value)}
                                placeholder="0"
                                hint="% de margen de seguridad adicional"
                            />
                            <p className="text-xs text-zinc-500 mt-2">
                                <strong className="text-amber-400">Límite de descuento:</strong> Máximo descuento permitido
                            </p>
                        </ZenCardContent>
                    </ZenCard>
                </div>
            </div>

            {/* Separador */}
            <SeparadorZen spacing="lg" variant="subtle" />

            {/* Sección: Estructura de Comisiones */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-zinc-100">Estructura de Comisiones</h2>
                </div>

                {/* A. Comisión de Plataforma (ZENLY Fee) */}
                <div className="bg-zinc-800/40 rounded-lg p-6 border border-zinc-700/50">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-5 w-5 text-emerald-400" />
                            <label className="text-sm font-medium text-zinc-300">Comisión de Plataforma</label>
                        </div>
                        <ZenInput
                            type="text"
                            inputMode="decimal"
                            value={config.comision_plataforma || ''}
                            onChange={(e) => handleInputChange('comision_plataforma', e.target.value)}
                            placeholder="0"
                            hint="% de comisión para la plataforma"
                            className="bg-zinc-900/50"
                        />
                        <p className="text-xs text-zinc-400 mt-2">
                            Porcentaje que la plataforma retiene por el uso del servicio.
                        </p>
                    </div>
                </div>

                {/* B. Comisión de Venta (Agente) */}
                <div className="bg-zinc-800/40 rounded-lg p-6 border border-zinc-700/50">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-5 w-5 text-blue-400" />
                            <label className="text-sm font-medium text-zinc-300">Comisión de Venta (Bolsa Global)</label>
                        </div>
                        <ZenInput
                            type="text"
                            inputMode="decimal"
                            value={config.comision_venta || ''}
                            onChange={(e) => handleInputChange('comision_venta', e.target.value)}
                            placeholder="0"
                            hint="% de comisión para el agente"
                            className="bg-zinc-900/50"
                        />
                        <p className="text-xs text-zinc-400 mt-2">
                            Porcentaje reservado para pagar al agente que cierra la venta.
                        </p>
                    </div>
                </div>
            </div>

            {/* Separador */}
            <SeparadorZen spacing="lg" variant="subtle" />

            {/* Sección: Distribución por Referencia (Staff) */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-purple-400" />
                            <div>
                                <label className="text-sm font-medium text-zinc-300 block">
                                    Distribución por Referencia (Staff)
                                </label>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    Activa la distribución de comisiones entre agente y referidor staff
                                </p>
                            </div>
                        </div>
                        <ZenSwitch
                            checked={config.is_referral_active || false}
                            onCheckedChange={(checked) => {
                                setConfig(prev => ({
                                    ...prev,
                                    is_referral_active: checked,
                                    referral_reward_value: checked ? prev.referral_reward_value : undefined
                                }));
                            }}
                            variant="default"
                        />
                    </div>

                    {/* Contenido condicional cuando está activo */}
                    {config.is_referral_active && (
                        <div className="pl-8 space-y-4 pt-4 border-l-2 border-purple-500/30">
                            {/* Toggle PERCENTAGE / FIXED */}
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="referral_reward_type"
                                        checked={config.referral_reward_type === 'PERCENTAGE'}
                                        onChange={() => {
                                            setConfig(prev => ({
                                                ...prev,
                                                referral_reward_type: 'PERCENTAGE',
                                                referral_reward_value: prev.referral_reward_value || '50'
                                            }));
                                        }}
                                        className="w-4 h-4 text-purple-500 bg-zinc-900 border-zinc-600 focus:ring-purple-500"
                                    />
                                    <Users className="h-4 w-4 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                                    <span className="text-sm text-zinc-300">Porcentaje (%)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="referral_reward_type"
                                        checked={config.referral_reward_type === 'FIXED'}
                                        onChange={() => {
                                            setConfig(prev => ({
                                                ...prev,
                                                referral_reward_type: 'FIXED',
                                                referral_reward_value: prev.referral_reward_value || '1000'
                                            }));
                                        }}
                                        className="w-4 h-4 text-purple-500 bg-zinc-900 border-zinc-600 focus:ring-purple-500"
                                    />
                                    <Coins className="h-4 w-4 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                                    <span className="text-sm text-zinc-300">Monto Fijo ($)</span>
                                </label>
                            </div>

                            {/* Input según tipo */}
                            <div className="space-y-2">
                                <ZenInput
                                    type="text"
                                    inputMode={config.referral_reward_type === 'PERCENTAGE' ? 'decimal' : 'numeric'}
                                    value={config.referral_reward_value || ''}
                                    onChange={(e) => handleInputChange('referral_reward_value', e.target.value)}
                                    placeholder={config.referral_reward_type === 'PERCENTAGE' ? '50' : '1000'}
                                    hint={config.referral_reward_type === 'PERCENTAGE' 
                                        ? '% de comisión para el referente staff'
                                        : 'Monto fijo en MXN para el referente staff'}
                                />
                                
                                {/* Ejemplos según tipo */}
                                {config.referral_reward_type === 'PERCENTAGE' ? (
                                    <p className="text-xs text-zinc-500">
                                        Ejemplo: Si eliges 50%, el staff recibe la mitad de la comisión. El agente de ventas recibe el resto.
                                    </p>
                                ) : (
                                    <p className="text-xs text-zinc-500">
                                        Ejemplo: Si eliges $1,000 MXN, el staff recibe ese monto fijo. El agente de ventas recibe el resto del pool de comisión.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-800">
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
