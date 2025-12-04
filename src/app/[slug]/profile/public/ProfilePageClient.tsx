'use client';

import React, { useState } from 'react';
import { PublicProfileData } from '@/types/public-profile';
import {
    ProfileHeader,
    ProfileNavTabs,
    ProfileFooter,
    ZenCreditsCard,
    BusinessPresentationCard,
    PromotionsCard,
    MobilePromotionsSection
} from '@/components/profile';
import { ProfileContentView } from './ProfileContentView';

interface ProfilePageClientProps {
    profileData: PublicProfileData;
    studioSlug: string;
}

/**
 * ProfilePageClient - Main client component for public profile
 * Nueva estructura unificada responsive: mobile-first con 2 columnas en desktop
 */
export function ProfilePageClient({ profileData, studioSlug }: ProfilePageClientProps) {
    const [activeTab, setActiveTab] = useState<string>('inicio');

    const { studio, paquetes } = profileData;

    const handleViewAllPackages = () => {
        setActiveTab('paquetes');
    };

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header - Compartido sticky */}
            <header className="sticky top-0 z-50">
                <ProfileHeader
                    data={{
                        studio_name: studio.studio_name,
                        slogan: studio.slogan,
                        logo_url: studio.logo_url
                    }}
                    studioSlug={studioSlug}
                    showEditButton={true}
                />
            </header>

            {/* Main Content - Responsive Grid con max-width centrado en desktop */}
            {/* Columnas con ancho mobile-friendly: ~430px cada una */}
            <main className="w-full mx-auto max-w-[920px]">
                <div className="grid grid-cols-1 lg:grid-cols-[430px_430px] gap-4 p-4 lg:p-6 lg:justify-center">
                    {/* Col 1: Main content */}
                    <div className="space-y-4 bg-zinc-900/50 rounded-lg border border-zinc-800/20 overflow-hidden">
                        {/* Navigation Tabs */}
                        <ProfileNavTabs
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />

                        {/* Content View */}
                        <ProfileContentView
                            activeTab={activeTab}
                            profileData={profileData}
                        />

                        {/* Mobile-only: Promociones inline */}
                        <div className="lg:hidden">
                            <MobilePromotionsSection
                                paquetes={paquetes}
                                activeTab={activeTab}
                            />
                        </div>
                    </div>

                    {/* Col 2: Sidebar (solo desktop) */}
                    <aside className="hidden lg:block space-y-4 lg:sticky lg:top-24 lg:h-fit">
                        {/* Card Promociones */}
                        <PromotionsCard
                            paquetes={paquetes}
                            onViewAll={handleViewAllPackages}
                        />

                        {/* Card Presentación del Negocio */}
                        <BusinessPresentationCard
                            presentation={studio.presentation || undefined}
                            studioName={studio.studio_name}
                        />

                        {/* Card Créditos ZEN */}
                        <ZenCreditsCard />
                    </aside>
                </div>
            </main>

            {/* Mobile-only: Footer */}
            <footer className="lg:hidden">
                <ProfileFooter />
            </footer>
        </div>
    );
}
