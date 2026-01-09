'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaqSection } from '@/components/profile/sections/FaqSection';
import { BuilderProfileData } from '@/types/builder-profile';
import { useAuth } from '@/contexts/AuthContext';

interface RedesTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate?: (updater: (prev: BuilderProfileData | null) => BuilderProfileData | null) => void;
    onDataChange?: () => Promise<void>;
}

export function RedesTab({ builderData, loading, studioSlug, onDataChange }: RedesTabProps) {
    const { user } = useAuth();
    
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    const faq = builderData?.faq || [];
    // En el contexto de configuración, si hay usuario autenticado, es el owner
    const ownerId = user?.id || null;

    return (
        <FaqSection
            faq={faq}
            loading={loading}
            studioSlug={studioSlug}
            ownerId={ownerId}
            data={undefined}
            viewMode="compact"
            onSuccess={onDataChange}
        />
    );
}
