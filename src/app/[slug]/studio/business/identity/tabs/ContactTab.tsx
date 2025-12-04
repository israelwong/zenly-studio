'use client';

import React from 'react';
import { TelefonosSection } from '../components/TelefonosSection';
import { HorariosSection } from '../components/HorariosSection';
import { UbicacionSection } from '../components/UbicacionSection';
import { BuilderProfileData } from '@/types/builder-profile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';

interface ContactTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate: (data: BuilderProfileData | null) => void;
}

export function ContactTab({ builderData, loading, studioSlug }: ContactTabProps) {
    
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="phones">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="phones">Teléfonos</TabsTrigger>
                    <TabsTrigger value="schedule">Horarios</TabsTrigger>
                    <TabsTrigger value="location">Ubicación</TabsTrigger>
                </TabsList>

                <TabsContent value="phones" className="mt-6">
                    <TelefonosSection
                        studioSlug={studioSlug}
                        telefonos={builderData?.phones || []}
                    />
                </TabsContent>

                <TabsContent value="schedule" className="mt-6">
                    <HorariosSection
                        studioSlug={studioSlug}
                        horarios={builderData?.schedules || []}
                    />
                </TabsContent>

                <TabsContent value="location" className="mt-6">
                    <UbicacionSection
                        studioSlug={studioSlug}
                        ubicacion={builderData?.addresses?.[0] || null}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
