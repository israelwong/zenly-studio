'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, UserCheck, UserX, List, Grid } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { obtenerConfiguracionPaquetes, actualizarConfiguracionPaquetes } from '@/lib/actions/studio/builder/catalogo/configuracion.actions';
import { toast } from 'sonner';

interface ConfiguracionPaquetes {
    visibleEnMenu: boolean;
    requiereRegistro: boolean;
    vistaEnPantalla: 'lista' | 'reticula';
}

interface ConfiguracionTabProps {
    studioSlug: string;
}

export function ConfiguracionTab({ studioSlug }: ConfiguracionTabProps) {
    // Estados para la configuración
    const [configuracion, setConfiguracion] = useState<ConfiguracionPaquetes>({
        visibleEnMenu: true,
        requiereRegistro: false,
        vistaEnPantalla: 'lista'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Cargar configuración inicial
    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                setLoading(true);
                const result = await obtenerConfiguracionPaquetes(studioSlug);

                if (result.success && result.data) {
                    setConfiguracion(result.data);
                } else {
                    console.error('Error cargando configuración:', result.error);
                    toast.error('Error al cargar configuración');
                }
            } catch (error) {
                console.error('Error en cargarConfiguracion:', error);
                toast.error('Error al cargar configuración');
            } finally {
                setLoading(false);
            }
        };

        cargarConfiguracion();
    }, [studioSlug]);

    // Función para actualizar configuración
    const actualizarConfiguracion = async (nuevaConfiguracion: Partial<ConfiguracionPaquetes>) => {
        try {
            setSaving(true);
            const configuracionActualizada = { ...configuracion, ...nuevaConfiguracion };

            const result = await actualizarConfiguracionPaquetes(studioSlug, configuracionActualizada);

            if (result.success) {
                setConfiguracion(configuracionActualizada);
                toast.success('Configuración actualizada');
            } else {
                toast.error(result.error || 'Error al actualizar configuración');
            }
        } catch (error) {
            console.error('Error actualizando configuración:', error);
            toast.error('Error al actualizar configuración');
        } finally {
            setSaving(false);
        }
    };

    // Handlers para cambios
    const handleVisibleEnMenuChange = (checked: boolean) => {
        actualizarConfiguracion({ visibleEnMenu: checked });
    };

    const handleRequiereRegistroChange = (checked: boolean) => {
        actualizarConfiguracion({ requiereRegistro: checked });
    };

    const handleVistaEnPantallaChange = (vista: 'lista' | 'reticula') => {
        actualizarConfiguracion({ vistaEnPantalla: vista });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
                            <div className="h-6 bg-zinc-700 rounded w-1/3"></div>
                            <div className="h-4 bg-zinc-700 rounded w-2/3"></div>
                            <div className="h-10 bg-zinc-700 rounded w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Configuración de Visibilidad */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-400" />
                        Visibilidad en Menú
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Controla si los paquetes son visibles en el menú de navegación del sitio
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-white">Visible en menú de navegación</p>
                            <p className="text-xs text-zinc-400">
                                Los paquetes aparecerán en el menú principal del sitio
                            </p>
                        </div>
                        <Switch
                            checked={configuracion.visibleEnMenu}
                            onCheckedChange={handleVisibleEnMenuChange}
                            disabled={saving}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Configuración de Registro */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        {configuracion.requiereRegistro ? (
                            <UserCheck className="h-5 w-5 text-green-400" />
                        ) : (
                            <UserX className="h-5 w-5 text-zinc-400" />
                        )}
                        Requisitos de Acceso
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Define si los visitantes necesitan registrarse para ver los paquetes
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-white">Requiere registro</p>
                            <p className="text-xs text-zinc-400">
                                Solo las personas que llenen un lead form podrán ver los paquetes
                            </p>
                        </div>
                        <Switch
                            checked={configuracion.requiereRegistro}
                            onCheckedChange={handleRequiereRegistroChange}
                            disabled={saving}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Configuración de Vista */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        {configuracion.vistaEnPantalla === 'lista' ? (
                            <List className="h-5 w-5 text-blue-400" />
                        ) : (
                            <Grid className="h-5 w-5 text-blue-400" />
                        )}
                        Vista en Pantalla
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Selecciona cómo se mostrarán los paquetes en el sitio
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-white">Vista en lista</p>
                                <p className="text-xs text-zinc-400">
                                    Los paquetes se muestran en formato de lista vertical
                                </p>
                            </div>
                            <Switch
                                checked={configuracion.vistaEnPantalla === 'lista'}
                                onCheckedChange={(checked) => checked && handleVistaEnPantallaChange('lista')}
                                disabled={saving}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-white">Vista en retícula</p>
                                <p className="text-xs text-zinc-400">
                                    Los paquetes se muestran en formato de cuadrícula
                                </p>
                            </div>
                            <Switch
                                checked={configuracion.vistaEnPantalla === 'reticula'}
                                onCheckedChange={(checked) => checked && handleVistaEnPantallaChange('reticula')}
                                disabled={saving}
                            />
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Información Adicional */}
            <ZenCard variant="outlined">
                <ZenCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Eye className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Configuración de Presentación</h4>
                            <p className="text-xs text-zinc-400">
                                Esta configuración afecta cómo se muestran los paquetes en el sitio web público.
                                Los cambios se aplicarán inmediatamente.
                            </p>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
