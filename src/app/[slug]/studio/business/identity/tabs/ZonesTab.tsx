'use client';

import React from 'react';
import { ZonasTrabajoSection } from '../components/ZonasTrabajoSection';
import { BuilderProfileData } from '@/types/builder-profile';

interface ZonesTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate: (data: BuilderProfileData | null) => void;
    onDataChange?: () => Promise<void>;
}

export function ZonesTab({ builderData, loading, studioSlug, onDataChange }: ZonesTabProps) {
    
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    return (
        <ZonasTrabajoSection
            studioSlug={studioSlug}
            zonasCobertura={builderData?.coverage_zones || []}
            onDataChange={onDataChange}
        />
    );
}
