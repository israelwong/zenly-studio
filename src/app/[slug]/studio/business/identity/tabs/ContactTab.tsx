'use client';

import React from 'react';
import { TelefonosSection } from '../components/TelefonosSection';
import { HorariosSection } from '../components/HorariosSection';
import { UbicacionSection } from '../components/UbicacionSection';
import { ZonasTrabajoSection } from '../components/ZonasTrabajoSection';
import { BuilderProfileData } from '@/types/builder-profile';

interface ContactTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onDataChange: () => Promise<void>;
}

export function ContactTab({ builderData, loading, studioSlug, onDataChange }: ContactTabProps) {

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-[300px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-[300px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-[300px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-[300px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    // Map phones data to Telefono type
    const telefonosData = builderData?.contactInfo?.phones?.map(phone => ({
        id: phone.id,
        numero: phone.number,
        tipo: (phone.type === 'WHATSAPP' ? 'whatsapp' :
            phone.type === 'LLAMADAS' ? 'llamadas' : 'ambos') as 'llamadas' | 'whatsapp' | 'ambos',
        etiqueta: phone.label || undefined,
        is_active: phone.is_active
    })) || [];

    return (
        <div className="space-y-6">
            <TelefonosSection
                studioSlug={studioSlug}
                telefonos={telefonosData}
                onDataChange={onDataChange}
            />

            <HorariosSection
                studioSlug={studioSlug}
                horarios={builderData?.contactInfo?.horarios || []}
                onDataChange={onDataChange}
            />

            <UbicacionSection
                studioSlug={studioSlug}
                ubicacion={{
                    direccion: builderData?.studio?.address || null,
                    google_maps_url: builderData?.studio?.maps_url || null,
                }}
                onDataChange={onDataChange}
            />

            <ZonasTrabajoSection
                studioSlug={studioSlug}
                zonasCobertura={builderData?.studio?.zonas_trabajo || []}
                onDataChange={onDataChange}
            />
        </div>
    );
}
