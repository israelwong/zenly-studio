'use client';

import React from 'react';
import { SocialSection } from '../components/SocialSection';
import { BuilderProfileData } from '@/types/builder-profile';

interface SocialTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate: (data: BuilderProfileData | null) => void;
}

export function SocialTab({ builderData, loading, studioSlug }: SocialTabProps) {
    
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    return (
        <SocialSection
            studioSlug={studioSlug}
            redesSociales={builderData?.social_media || []}
        />
    );
}
