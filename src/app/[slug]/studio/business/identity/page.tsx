'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder-data.actions';
import { BuilderProfileData } from '@/types/builder-profile';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';

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
        router.push(`/studio/business/identity?tab=${value}`);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">Identidad del Negocio</h1>
                <p className="text-zinc-400">Configura la información de tu estudio fotográfico</p>
            </div>

            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6">
                    <Tabs value={currentTab} onValueChange={handleTabChange}>
                        <TabsList className="grid w-full grid-cols-4 mb-6">
                            <TabsTrigger value="brand">Marca</TabsTrigger>
                            <TabsTrigger value="social">Redes Sociales</TabsTrigger>
                            <TabsTrigger value="contact">Contacto</TabsTrigger>
                            <TabsTrigger value="zones">Zonas de Trabajo</TabsTrigger>
                        </TabsList>

                        <TabsContent value="brand">
                            <BrandTab 
                                builderData={builderData} 
                                loading={loading} 
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                            />
                        </TabsContent>

                        <TabsContent value="social">
                            <SocialTab 
                                builderData={builderData} 
                                loading={loading} 
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                            />
                        </TabsContent>

                        <TabsContent value="contact">
                            <ContactTab 
                                builderData={builderData} 
                                loading={loading} 
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                            />
                        </TabsContent>

                        <TabsContent value="zones">
                            <ZonesTab 
                                builderData={builderData} 
                                loading={loading} 
                                studioSlug={studioSlug}
                                onUpdate={setBuilderData}
                            />
                        </TabsContent>
                    </Tabs>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
