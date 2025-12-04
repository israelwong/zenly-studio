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
    onDataChange: () => Promise<void>;
}

export function ContactTab({ builderData, loading, studioSlug, onDataChange }: ContactTabProps) {
    
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
                <TabsList className="grid w-full grid-cols-3 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    <TabsTrigger 
                        value="phones"
                        className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                    >
                        Teléfonos
                    </TabsTrigger>
                    <TabsTrigger 
                        value="schedule"
                        className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                    >
                        Horarios
                    </TabsTrigger>
                    <TabsTrigger 
                        value="location"
                        className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
                    >
                        Ubicación
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="phones" className="mt-6">
                    <TelefonosSection
                        studioSlug={studioSlug}
                        telefonos={builderData?.phones || []}
                        onDataChange={onDataChange}
                    />
                </TabsContent>

                <TabsContent value="schedule" className="mt-6">
                    <HorariosSection
                        studioSlug={studioSlug}
                        horarios={builderData?.schedules || []}
                        onDataChange={onDataChange}
                    />
                </TabsContent>

                <TabsContent value="location" className="mt-6">
                    <UbicacionSection
                        studioSlug={studioSlug}
                        ubicacion={builderData?.addresses?.[0] || null}
                        onDataChange={onDataChange}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
