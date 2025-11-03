'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Package, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { ConfiguracionTab, PaquetesTipoEventoList } from '../tabs';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { obtenerPaquetes } from '@/lib/actions/studio/builder/paquetes/paquetes.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

type TabType = 'paquetes' | 'configuracion';

interface PaquetesWrapperProps {
    studioSlug: string;
}

export function PaquetesWrapper({ studioSlug }: PaquetesWrapperProps) {
    // Estado de pestañas
    const [activeTab, setActiveTab] = useState<TabType>('paquetes');

    // Datos
    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>([]);
    const [paquetes, setPaquetes] = useState<PaqueteFromDB[]>([]);
    const [loading, setLoading] = useState(true);

    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);

            // Cargar tipos de evento y paquetes en paralelo
            const [tiposResult, paquetesResult] = await Promise.all([
                obtenerTiposEvento(studioSlug),
                obtenerPaquetes(studioSlug)
            ]);

            if (tiposResult.success && tiposResult.data) {
                setTiposEvento(tiposResult.data);
            } else {
                toast.error(tiposResult.error || 'Error al cargar tipos de evento');
            }

            if (paquetesResult.success && paquetesResult.data) {
                setPaquetes(paquetesResult.data);
            } else {
                toast.error(paquetesResult.error || 'Error al cargar paquetes');
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);



    // Handlers para actualizar datos
    const handlePaquetesChange = (newPaquetes: PaqueteFromDB[]) => {
        setPaquetes(newPaquetes);
    };

    const handleTipoEventoChange = (newTiposEvento: TipoEventoData[]) => {
        setTiposEvento(newTiposEvento);
    };

    if (loading) {
        return (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-800/50 p-1 rounded-lg">
                    <div className="h-10 bg-zinc-700 rounded animate-pulse"></div>
                    <div className="h-10 bg-zinc-700 rounded animate-pulse"></div>
                </TabsList>

                <TabsContent value="paquetes">
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="border border-zinc-700 rounded-lg overflow-hidden animate-pulse">
                                {/* Header del tipo de evento skeleton */}
                                <div className="flex items-center justify-between p-4 bg-zinc-800/30">
                                    <div className="flex items-center gap-3 flex-1">
                                        {/* GripVertical skeleton */}
                                        <div className="w-4 h-4 bg-zinc-700 rounded mr-2"></div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {/* Chevron skeleton */}
                                                <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                                                {/* Nombre skeleton */}
                                                <div className="h-5 bg-zinc-700 rounded w-40"></div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {/* Badge skeleton */}
                                                <div className="h-5 bg-zinc-700 rounded w-20"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* Botones de acción skeleton */}
                                        <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                                        <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                                    </div>
                                </div>
                                {/* Contenido expandido skeleton (opcional) */}
                                {i === 1 && (
                                    <div className="bg-zinc-900/50 p-2 space-y-1">
                                        {[1, 2].map((j) => (
                                            <div key={j} className="flex items-center justify-between p-2 pl-6 border-t border-zinc-700/30">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-4 h-4 bg-zinc-700 rounded mr-2"></div>
                                                    <div className="flex-1">
                                                        <div className="h-4 bg-zinc-700 rounded w-32 mb-1"></div>
                                                        <div className="h-3 bg-zinc-700 rounded w-16"></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-4 bg-zinc-700 rounded w-16"></div>
                                                    <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="configuracion">
                    <div className="space-y-4 animate-pulse">
                        <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6 space-y-4">
                            <div className="h-5 bg-zinc-700 rounded w-48"></div>
                            <div className="h-20 bg-zinc-700 rounded"></div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        );
    }

    return (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-800/50 p-1 rounded-lg">
                <TabsTrigger
                    value="paquetes"
                    className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200"
                >
                    <Package className="h-4 w-4" />
                    <span>Paquetes</span>
                </TabsTrigger>
                <TabsTrigger
                    value="configuracion"
                    className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200"
                >
                    <Settings className="h-4 w-4" />
                    <span>Configuración</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="paquetes">
                <PaquetesTipoEventoList
                    studioSlug={studioSlug}
                    tiposEvento={tiposEvento}
                    paquetes={paquetes}
                    onTiposEventoChange={handleTipoEventoChange}
                    onPaquetesChange={handlePaquetesChange}
                />
            </TabsContent>

            <TabsContent value="configuracion">
                <ConfiguracionTab studioSlug={studioSlug} />
            </TabsContent>
        </Tabs>
    );
}
