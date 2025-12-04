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
import { ZonesTab } from './tabs/ZonesTab';

type TabValue = 'brand' | 'social' | 'contact' | 'zones';

export default function IdentityPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    // Get tab from URL or default to 'brand'
    const currentTab = (searchParams.get('tab') as TabValue) || 'brand';

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
            const result = await getBuilderData(studioSlug);
            if (result.success && result.data) {
                setBuilderData(result.data);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    // Preview data para SectionLayout
    const previewData = builderData ? {
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        social_media: builderData.social_media,
        phones: builderData.phones,
        schedules: builderData.schedules,
        addresses: builderData.addresses,
        coverage_zones: builderData.coverage_zones,
    } : null;

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
                        <TabsList className="grid w-full grid-cols-4 mb-6 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                            <TabsTrigger 
                                value="brand"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                            >
                                Marca
                            </TabsTrigger>
                            <TabsTrigger 
                                value="social"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                            >
                                Redes Sociales
                            </TabsTrigger>
                            <TabsTrigger 
                                value="contact"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                            >
                                Contacto
                            </TabsTrigger>
                            <TabsTrigger 
                                value="zones"
                                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                            >
                                Zonas de Trabajo
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="brand">
                            <BrandTab
                                builderData={builderData}
                                loading={loading}
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                                onDataChange={handleDataRefresh}
                            />
                        </TabsContent>

                        <TabsContent value="social">
                            <SocialTab
                                builderData={builderData}
                                loading={loading}
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                                onDataChange={handleDataRefresh}
                            />
                        </TabsContent>

                        <TabsContent value="contact">
                            <ContactTab
                                builderData={builderData}
                                loading={loading}
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                                onDataChange={handleDataRefresh}
                            />
                        </TabsContent>

                        <TabsContent value="zones">
                            <ZonesTab
                                builderData={builderData}
                                loading={loading}
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                                onDataChange={handleDataRefresh}
                            />
                        </TabsContent>
                    </Tabs>
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
