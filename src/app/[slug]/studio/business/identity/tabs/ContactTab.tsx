'use client';

import React from 'react';
import { ContactInfoCard } from '../components/ContactInfoCard';
import { ScheduleAndZonesCard } from '../components/ScheduleAndZonesCard';
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
                <div className="h-[400px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-[400px] bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    // Map phones data to Telefono type
    const telefonosData = builderData?.contactInfo?.phones?.map(phone => ({
        id: phone.id,
        numero: phone.number,
        tipo: (phone.type === 'WHATSAPP' ? 'whatsapp' :
            phone.type === 'LLAMADAS' ? 'llamadas' : 'ambos') as 'llamadas' | 'whatsapp' | 'ambos',
        is_active: phone.is_active
    })) || [];

    return (
        <div className="space-y-6">
            <ContactInfoCard
                studioSlug={studioSlug}
                telefonos={telefonosData}
                email={builderData?.contactInfo?.email || null}
                website={builderData?.studio?.website || null}
                direccion={builderData?.studio?.address || null}
                google_maps_url={builderData?.studio?.maps_url || null}
                onDataChange={onDataChange}
                loading={loading}
            />

            <ScheduleAndZonesCard
                studioSlug={studioSlug}
                horarios={builderData?.contactInfo?.horarios || []}
                zonasCobertura={builderData?.studio?.zonas_trabajo || []}
                onDataChange={onDataChange}
                loading={loading}
            />
        </div>
    );
}
