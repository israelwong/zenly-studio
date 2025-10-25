'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Package, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { PaquetesConfiguracion } from './PaquetesConfiguracion';
import { PaquetesAcordeonNavigation } from './PaquetesAcordeonNavigation';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { obtenerPaquetes } from '@/lib/actions/studio/builder/catalogo/paquetes.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

type TabType = 'paquetes' | 'configuracion';

interface PaquetesTabProps {
    studioSlug: string;
}

export function PaquetesTab({ studioSlug }: PaquetesTabProps) {
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
            <div className="space-y-6">
                {/* Tabs skeleton */}
                <div className="grid w-full grid-cols-2 bg-zinc-800/50 p-1 rounded-lg">
                    <div className="h-10 bg-zinc-700 rounded animate-pulse"></div>
                    <div className="h-10 bg-zinc-700 rounded animate-pulse"></div>
                </div>

                {/* Content skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
                                <div className="h-5 bg-zinc-700 rounded w-3/4"></div>
                                <div className="h-8 bg-zinc-700 rounded w-1/2"></div>
                                <div className="flex gap-2 pt-2">
                                    <div className="h-8 bg-zinc-700 rounded flex-1"></div>
                                    <div className="h-8 bg-zinc-700 rounded w-8"></div>
                                    <div className="h-8 bg-zinc-700 rounded w-8"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
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
                <PaquetesAcordeonNavigation
                    studioSlug={studioSlug}
                    tiposEvento={tiposEvento}
                    paquetes={paquetes}
                    onTiposEventoChange={handleTipoEventoChange}
                    onPaquetesChange={handlePaquetesChange}
                />
            </TabsContent>

            <TabsContent value="configuracion">
                <PaquetesConfiguracion studioSlug={studioSlug} />
            </TabsContent>
        </Tabs>
    );
}
