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
    const { studio, socialNetworks, contactInfo, items, portfolios } = profileData;

    // Debug: Verificar datos en ProfileContentView
    console.log('🔍 ProfileContentView Debug:');
    console.log('  - activeTab:', activeTab);
    console.log('  - profileData:', profileData);
    console.log('  - studio:', studio);
    console.log('  - studio.zonas_trabajo:', studio?.zonas_trabajo);
    console.log('  - studio.zonas_trabajo type:', typeof studio?.zonas_trabajo);
    console.log('  - studio.zonas_trabajo is array:', Array.isArray(studio?.zonas_trabajo));

    switch (activeTab) {
        case 'inicio':
            return (
                <ProfileContent
                    variant="inicio"
                    data={{ posts: profileData.posts || [] }}
                />
            );

        case 'portafolio':
            return (
                <ProfileContent
                    variant="portfolio"
                    data={{ portfolios }}
                />
            );

        case 'catalogo':
            return (
                <ProfileContent
                    variant="shop"
                    data={{ items }}
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
