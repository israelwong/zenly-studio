import React from 'react';
import { PublicProfileData } from '@/types/public-profile';
import { ProfileContent } from '@/components/profile';
// PostGridView, ShopView, and InfoView are now handled by ProfileContent component

interface ProfileContentViewProps {
    activeTab: string;
    profileData: PublicProfileData;
}

/**
 * ProfileContentView - Container that switches between different views
 * Renders the appropriate view based on active tab
 * Handles tab switching logic
 */
export function ProfileContentView({ activeTab, profileData }: ProfileContentViewProps) {
    const { studio, contactInfo, portfolios, posts, paquetes } = profileData;

    switch (activeTab) {
        case 'inicio':
            return (
                <ProfileContent
                    variant="inicio"
                    data={{ posts: posts || [] }}
                />
            );

        case 'portafolio':
            return (
                <ProfileContent
                    variant="portfolio"
                    data={{ portfolios }}
                />
            );

        case 'paquetes':
            return (
                <ProfileContent
                    variant="paquetes"
                    data={{ paquetes: paquetes || [] }}
                />
            );

        case 'faq':
            return (
                <ProfileContent
                    variant="faq"
                    data={{ faq: (studio as unknown as { faq?: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }> }).faq || [] }}
                />
            );

        case 'contacto':
            return (
                <ProfileContent
                    variant="info"
                    data={{
                        studio,
                        contactInfo
                    }}
                />
            );

        default:
            return (
                <ProfileContent
                    variant="posts"
                    data={{ portfolios }}
                />
            );
    }
}
