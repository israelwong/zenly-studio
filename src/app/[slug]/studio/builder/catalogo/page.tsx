'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Store, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { SectionLayout, StorageIndicator } from '../components';
import { UtilidadTab } from './components';
import { CatalogoNavigationWrapper, CatalogoTabSkeletonContainer } from './components/CatalogoTab';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { obtenerSeccionesConStats } from '@/lib/actions/studio/builder/catalogo';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/utilidad.actions';
import type { BuilderProfileData } from '@/types/builder-profile';
import type { TabValue } from './types';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import { toast } from 'sonner';

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    mediaSize?: number;
}

export default function CatalogoPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const studioSlug = params.slug as string;

    const [activeTab, setActiveTab] = useState<TabValue>('items');
    const [loading, setLoading] = useState(true);
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [secciones, setSecciones] = useState<Seccion[]>([]);
    const [studioConfig, setStudioConfig] = useState<ConfiguracionPrecios | null>(null);

    // Cargar datos del builder (para preview móvil)
    useEffect(() => {
        const loadBuilderData = async () => {
            try {
                setLoading(true);
                const result = await getBuilderProfileData(studioSlug);

                if (result.success && result.data) {
                    setBuilderData(result.data);
                } else {
                    console.error('Error loading builder data:', result.error);
                }
            } catch (error) {
                console.error('Error in loadBuilderData:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBuilderData();
    }, [studioSlug]);

    // Inicializar tab desde hash después de hidratación
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'utilidad' || hash === 'items') {
            setActiveTab(hash as TabValue);
        }
    }, []);

    // Escuchar cambios en el hash de la URL
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash === 'utilidad' || hash === 'items') {
                setActiveTab(hash as TabValue);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Cargar secciones y configuración de precios
    useEffect(() => {
        const loadCatalogoData = async () => {
            try {
                const [resultSecciones, config] = await Promise.all([
                    obtenerSeccionesConStats(studioSlug),
                    obtenerConfiguracionPrecios(studioSlug),
                ]);

                if (resultSecciones.success && resultSecciones.data) {
                    // Transformar datos de secciones al formato esperado
                    const seccionesTransformadas = resultSecciones.data.map((seccion: {
                        id: string;
                        name: string;
                        order: number;
                        createdAt: Date;
                        totalCategorias?: number;
                        totalItems?: number;
                        mediaSize?: number;
                    }) => ({
                        id: seccion.id,
                        name: seccion.name,
                        order: seccion.order,
                        createdAt: seccion.createdAt,
                        categories: seccion.totalCategorias ? Array(seccion.totalCategorias).fill(null) : [],
                        items: seccion.totalItems ?? 0,
                        mediaSize: seccion.mediaSize ?? 0,
                    }));
                    setSecciones(seccionesTransformadas);
                }

                if (config) {
                    setStudioConfig({
                        utilidad_servicio: Number(config.utilidad_servicio),
                        utilidad_producto: Number(config.utilidad_producto),
                        sobreprecio: Number(config.sobreprecio),
                        comision_venta: Number(config.comision_venta),
                    });
                }
            } catch (error) {
                console.error('Error cargando datos del catálogo:', error);
                toast.error('Error al cargar el catálogo');
            }
        };

        loadCatalogoData();
    }, [studioSlug]);

    // Datos para el preview móvil
    const previewData = builderData ? {
        // Para ProfileIdentity
        studio_name: builderData.studio.studio_name,
        logo_url: builderData.studio.logo_url,
        slogan: builderData.studio.slogan,
        // Para ProfileContent (sección catálogo)
        studio: builderData.studio,
        items: builderData.items,
        // Para ProfileFooter
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        redes_sociales: builderData.socialNetworks.map(network => ({
            plataforma: network.platform?.name || 'Red Social',
            url: network.url
        })),
        email: null, // No hay email en BuilderProfileData
        telefonos: builderData.contactInfo.phones.map(phone => ({
            numero: phone.number,
            tipo: phone.type === 'principal' ? 'ambos' as const :
                phone.type === 'whatsapp' ? 'whatsapp' as const : 'llamadas' as const,
            is_active: true
        })),
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url
    } : null;

    return (
        <SectionLayout
            section="catalogo"
            studioSlug={studioSlug}
            data={previewData as unknown as Record<string, unknown>}
            loading={loading}
        >
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                            <Store className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Catálogo</ZenCardTitle>
                            <ZenCardDescription>
                                Gestiona tus servicios, paquetes y configuración de precios
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="space-y-6">
                        {/* Storage Indicator */}
                        <StorageIndicator studioSlug={studioSlug} />

                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={(v) => {
                            setActiveTab(v as TabValue);
                            // Actualizar URL hash
                            window.location.hash = v;
                        }}>
                            <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-800/50 p-1 rounded-lg">
                                <TabsTrigger
                                    value="items"
                                    className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200"
                                >
                                    <Store className="h-4 w-4" />
                                    <span>Catálogo</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="utilidad"
                                    className="flex items-center gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-purple-400 data-[state=active]:shadow-lg transition-all duration-200"
                                >
                                    <DollarSign className="h-4 w-4" />
                                    <span>Utilidad</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="items">
                                {!studioConfig ? (
                                    <CatalogoTabSkeletonContainer />
                                ) : (
                                    <CatalogoNavigationWrapper
                                        studioSlug={studioSlug}
                                        secciones={secciones}
                                        onNavigateToUtilidad={() => setActiveTab('utilidad')}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="utilidad">
                                <UtilidadTab studioSlug={studioSlug} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
