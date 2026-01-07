'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder-data.actions';
import { BuilderProfileData } from '@/types/builder-profile';
import { SectionLayout } from '@/app/[slug]/studio/components/SectionLayout';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { Briefcase } from 'lucide-react';

// Tabs components
import { BrandTab } from './tabs/BrandTab';
import { SocialTab } from './tabs/SocialTab';
import { ContactTab } from './tabs/ContactTab';

type TabValue = 'brand' | 'social' | 'contact';

export default function IdentityPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Obtener tab inicial de manera segura
    const tabFromUrl = (searchParams.get('tab') as TabValue) || 'brand';
    const [currentTab, setCurrentTab] = useState<TabValue>(tabFromUrl);

    useEffect(() => {
        document.title = 'Zenly Studio - Identidad';
    }, []);

    // Control de hidratación
    useEffect(() => {
        setMounted(true);
    }, []);

    // Sincronizar tab con URL después de montar
    useEffect(() => {
        if (mounted) {
            const newTab = (searchParams.get('tab') as TabValue) || 'brand';
            if (newTab !== currentTab) {
                setCurrentTab(newTab);
            }
        }
    }, [searchParams, mounted, currentTab]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await getBuilderData(studioSlug);
                if (result.success && result.data) {
                    setBuilderData(result.data);
                } else {
                    console.error('Error loading builder data:', result.error);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug]);

    const handleTabChange = (value: string) => {
        router.push(`/${studioSlug}/studio/business/identity?tab=${value}`);
    };

    // Función para refrescar datos después de cambios
    const handleDataRefresh = async () => {
        try {
            console.log('🔄 [IdentityPage] Recargando datos...');
            const result = await getBuilderData(studioSlug);
            if (result.success && result.data) {
                console.log('✅ [IdentityPage] Datos recargados:', {
                    phones: result.data.contactInfo.phones,
                    phonesCount: result.data.contactInfo.phones.length
                });
                setBuilderData(result.data);
            } else {
                console.error('❌ [IdentityPage] Error al recargar:', result.error);
            }
        } catch (error) {
            console.error('❌ [IdentityPage] Error refreshing data:', error);
        }
    };

    // Función para actualización optimista (compatibilidad con tabs)
    const handleUpdate = (updaterOrData: BuilderProfileData | null | ((prev: BuilderProfileData | null) => BuilderProfileData | null)) => {
        if (typeof updaterOrData === 'function') {
            setBuilderData(prev => (updaterOrData as (prev: BuilderProfileData | null) => BuilderProfileData | null)(prev));
        } else {
            setBuilderData(updaterOrData);
        }
    };

    // Preview data para SectionLayout - estructura compatible con ProfileContent y ProfileHeader
    const previewData = builderData ? {
        // Datos para ProfileHeader (nivel superior)
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        // Datos para ProfileContent
        studio: {
            id: builderData.studio.id,
            studio_name: builderData.studio.studio_name,
            presentation: builderData.studio.presentation,
            keywords: builderData.studio.keywords,
            logo_url: builderData.studio.logo_url,
            slogan: builderData.studio.slogan,
            website: builderData.studio.website,
            address: builderData.studio.address,
            plan_id: builderData.studio.plan_id,
            plan: builderData.studio.plan,
            zonas_trabajo: builderData.studio.zonas_trabajo,
        },
        contactInfo: {
            phones: builderData.contactInfo.phones.map(phone => ({
                id: phone.id,
                number: phone.number,
                type: phone.type, // Mantener tipo original: 'LLAMADAS', 'WHATSAPP', 'AMBOS'
                label: phone.label,
                is_active: phone.is_active
            })),
            address: builderData.contactInfo.address,
            website: builderData.contactInfo.website,
            email: builderData.contactInfo.email,
            google_maps_url: builderData.studio.maps_url,
            horarios: builderData.contactInfo.horarios,
        },
        redes_sociales: builderData.socialNetworks.map(network => ({
            id: network.id,
            url: network.url,
            plataforma: network.platform?.name || null,
            platform: network.platform,
            order: network.order,
        })),
    } : null;

    // Evitar hidration mismatch - solo renderizar tabs después de montar
    if (!mounted) {
        return (
            <SectionLayout
                section="identity"
                studioSlug={studioSlug}
                data={previewData as unknown as Record<string, unknown>}
                loading={true}
                activeIdentityTab="contact"
            >
                <ZenCard variant="default" padding="none">
                    <ZenCardHeader className="border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Briefcase className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Identidad del Negocio</ZenCardTitle>
                                <ZenCardDescription>
                                    Configura la información de tu estudio fotográfico
                                </ZenCardDescription>
                            </div>
                        </div>
                    </ZenCardHeader>
                    <ZenCardContent className="p-6">
                        <div className="space-y-4">
                            <div className="h-10 bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-64 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                    </ZenCardContent>
                </ZenCard>
            </SectionLayout>
        );
    }

    return (
        <SectionLayout
            section="identity"
            studioSlug={studioSlug}
            data={previewData as unknown as Record<string, unknown>}
            loading={loading}
            activeIdentityTab="contact"
        >
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Briefcase className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Identidad del Negocio</ZenCardTitle>
                            <ZenCardDescription>
                                Configura la información de tu estudio fotográfico
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <Tabs value={currentTab} onValueChange={handleTabChange}>
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                            <TabsTrigger
                                value="brand"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                            >
                                Brand
                            </TabsTrigger>
                            <TabsTrigger
                                value="social"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                            >
                                Social
                            </TabsTrigger>
                            <TabsTrigger
                                value="contact"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                            >
                                Contact
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="brand">
                            <BrandTab
                                builderData={builderData}
                                loading={loading}
                                studioSlug={studioSlug}
                                onUpdate={handleUpdate}
                                onDataChange={handleDataRefresh}
                            />
                        </TabsContent>

                        <TabsContent value="social">
                            <SocialTab
                                builderData={builderData}
                                loading={loading}
                                studioSlug={studioSlug}
                                onUpdate={handleUpdate}
                                onDataChange={handleDataRefresh}
                            />
                        </TabsContent>

                        <TabsContent value="contact">
                            <ContactTab
                                builderData={builderData}
                                loading={loading}
                                studioSlug={studioSlug}
                                onDataChange={handleDataRefresh}
                            />
                        </TabsContent>
                    </Tabs>
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
