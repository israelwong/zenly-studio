'use client';

import React, { useState } from 'react';
import { PublicProfileData } from '@/types/public-profile';
import { ProfileHeader, ProfileNavTabs, ProfileCTA, ProfileAIChat, ProfileFooter, FaqSection } from '@/components/profile';
import { ProfileContentView } from './ProfileContentView';
import { isProPlan } from '@/lib/utils/profile-utils';

interface ProfilePageClientProps {
    profileData: PublicProfileData;
    studioSlug: string;
}

/**
 * ProfilePageClient - Main client component for public profile
 * Manages tab state and 3-column responsive layout
 * Mobile-first design that expands to desktop
 */
export function ProfilePageClient({ profileData, studioSlug }: ProfilePageClientProps) {
    const [activeTab, setActiveTab] = useState<string>('inicio');

    const { studio } = profileData;
    const isPro = isProPlan(studio.plan?.slug);

    // FAQ data (puede venir en studio.faq aunque no esté en el tipo)
    const faqData = (studio as unknown as { faq?: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }> }).faq;

    // Debug: Verificar datos en ProfilePageClient
    console.log('🔍 ProfilePageClient Debug:');
    console.log('  - profileData:', profileData);
    console.log('  - studio:', studio);
    console.log('  - studio.zonas_trabajo:', studio?.zonas_trabajo);
    console.log('  - studio.zonas_trabajo type:', typeof studio?.zonas_trabajo);
    console.log('  - studio.zonas_trabajo is array:', Array.isArray(studio?.zonas_trabajo));

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Mobile Layout (default) */}
            <div className="lg:hidden">
                {/* Profile Header */}
                <ProfileHeader
                    data={{
                        studio_name: studio.studio_name,
                        slogan: studio.slogan,
                        logo_url: studio.logo_url
                    }}
                    studioSlug={studioSlug}
                />

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

                {/* FAQ Section - Persistente antes del footer */}
                {faqData && Array.isArray(faqData) && faqData.length > 0 && (
                    <div className="mt-6">
                        <FaqSection
                            faq={faqData}
                            loading={false}
                        />
                    </div>
                )}

                {/* Footer */}
                <ProfileFooter
                    data={{
                        pagina_web: studio.website,
                        palabras_clave: studio.keywords,
                        redes_sociales: profileData.socialNetworks?.map(network => ({
                            plataforma: network.platform?.name || '',
                            url: network.url
                        })) || [],
                        email: null, // No hay email en PublicContactInfo
                        telefonos: profileData.contactInfo?.phones?.map(phone => ({
                            numero: phone.number,
                            tipo: phone.type === 'WHATSAPP' ? 'whatsapp' : 'llamadas',
                            is_active: true
                        })) || [],
                        direccion: profileData.contactInfo?.address,
                        google_maps_url: null // No hay google_maps_url en PublicContactInfo
                    }}
                />
            </div>

            {/* Desktop Layout (3 columns) */}
            <div className="hidden lg:grid lg:grid-cols-[400px_1fr_380px] lg:gap-6 lg:p-6">
                {/* Column 1: Profile Content */}
                <div className="space-y-6">
                    {/* Profile Header */}
                    <ProfileHeader
                        data={{
                            studio_name: studio.studio_name,
                            slogan: studio.slogan,
                            logo_url: studio.logo_url
                        }}
                        studioSlug={studioSlug}
                    />

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

                    {/* FAQ Section - Persistente antes del footer */}
                    {faqData && Array.isArray(faqData) && faqData.length > 0 && (
                        <div className="mt-6">
                            <FaqSection
                                faq={faqData}
                                loading={false}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <ProfileFooter
                        data={{
                            pagina_web: studio.website,
                            palabras_clave: studio.keywords,
                            redes_sociales: profileData.socialNetworks?.map(network => ({
                                plataforma: network.platform?.name || '',
                                url: network.url
                            })) || [],
                            email: null, // No hay email en PublicContactInfo
                            telefonos: profileData.contactInfo?.phones?.map(phone => ({
                                numero: phone.number,
                                tipo: phone.type === 'WHATSAPP' ? 'whatsapp' : 'llamadas',
                                is_active: true
                            })) || [],
                            direccion: profileData.contactInfo?.address,
                            google_maps_url: null // No hay google_maps_url en PublicContactInfo
                        }}
                    />
                </div>

                {/* Column 2: Hero CTA (sticky) */}
                <div className="lg:sticky lg:top-6 lg:h-fit">
                    <ProfileCTA />
                </div>

                {/* Column 3: AI Chat (sticky) */}
                <div className="lg:sticky lg:top-6 lg:h-fit">
                    <ProfileAIChat isProPlan={isPro} />
                </div>
            </div>
        </div>
    );
}
