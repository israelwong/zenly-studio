'use client';

import { useState } from 'react';
import { Calendar, Clock, Settings, AlertCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenInput } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { toast } from 'sonner';

interface AgendamientoWrapperProps {
    studioSlug: string;
}

export function AgendamientoWrapper({ studioSlug }: AgendamientoWrapperProps) {
    const [habilitado, setHabilitado] = useState(false);
    const [validarDisponibilidad, setValidarDisponibilidad] = useState(false);
    const [recurrenciaServicios, setRecurrenciaServicios] = useState('');

    const handleSave = () => {
        toast.success('Configuración de agendamiento guardada');
    };

    return (
        <div className="space-y-6">
            {/* Configuración Principal */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-400" />
                        Agendamiento
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Configura el sistema de agendamiento para tus servicios
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-white">Habilitar agendamiento</p>
                            <p className="text-xs text-zinc-400">
                                Los clientes podrán agendar servicios directamente
                            </p>
                        </div>
                        <Switch
                            checked={habilitado}
                            onCheckedChange={setHabilitado}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Configuración Avanzada */}
            {habilitado && (
                <>
                    {/* Validación de Disponibilidad */}
                    <ZenCard>
                        <ZenCardHeader>
                            <ZenCardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-green-400" />
                                Validación de Disponibilidad
                            </ZenCardTitle>
                            <ZenCardDescription>
                                Configura cómo se valida la disponibilidad según la base de datos
                            </ZenCardDescription>
                        </ZenCardHeader>
                        <ZenCardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-white">Validar disponibilidad</p>
                                    <p className="text-xs text-zinc-400">
                                        Verificar disponibilidad en tiempo real según base de datos
                                    </p>
                                </div>
                                <Switch
                                    checked={validarDisponibilidad}
                                    onCheckedChange={setValidarDisponibilidad}
                                />
                            </div>
                        </ZenCardContent>
                    </ZenCard>

                    {/* Recurrencia de Servicios */}
                    <ZenCard>
                        <ZenCardHeader>
                            <ZenCardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-purple-400" />
                                Recurrencia de Servicios
                            </ZenCardTitle>
                            <ZenCardDescription>
                                Configura la recurrencia de servicios soportados simultáneamente
                            </ZenCardDescription>
                        </ZenCardHeader>
                        <ZenCardContent className="space-y-4">
                            <ZenInput
                                label="Servicios Soportados Simultáneamente"
                                placeholder="Ej: 3 servicios máximo por día"
                                value={recurrenciaServicios}
                                onChange={(e) => setRecurrenciaServicios(e.target.value)}
                            />
                            <ZenButton onClick={handleSave} className="w-full">
                                Guardar Configuración
                            </ZenButton>
                        </ZenCardContent>
                    </ZenCard>
                </>
            )}

            {/* Información Adicional */}
            <ZenCard variant="outline">
                <ZenCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Ficha pendiente de implementar</h4>
                            <p className="text-xs text-zinc-400">
                                Esta funcionalidad está en desarrollo. El sistema de agendamiento
                                se implementará en futuras versiones.
                            </p>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
