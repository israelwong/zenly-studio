import React from 'react';
import { notFound } from 'next/navigation';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { ProfilePageClient } from './public-profile/ProfilePageClient';
import { Metadata } from 'next';

interface PublicProfilePageProps {
    params: Promise<{ slug: string }>;
}

/**
 * Public Studio Profile Page
 * Server component that fetches profile data and renders client component
 * No authentication required - completely public
 */
export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
    const { slug } = await params;

    try {
        // Fetch complete profile data
        const result = await getStudioProfileBySlug({ slug });

        if (!result.success || !result.data) {
            console.error('❌ [PublicProfilePage] Failed to fetch profile:', result.error);
            notFound();
        }

        const profileData = result.data;


        // Map items to include required properties
        const mappedProfileData = {
            ...profileData,
            items: profileData.items.map(item => ({
                id: item.id,
                name: item.name,
                type: 'SERVICIO' as const, // Default to SERVICIO since type field seems to be missing
                cost: (item as { price?: number }).price || 0, // Use price field if cost doesn't exist
                order: item.order
            })),
            // Ensure contactInfo has all required properties
            contactInfo: {
                ...profileData.contactInfo,
                google_maps_url: null,
                horarios: (profileData as { contactInfo?: { horarios?: import('@/types/public-profile').PublicHorario[] } }).contactInfo?.horarios || []
            }
        };

        return (
            <ProfilePageClient profileData={mappedProfileData} studioSlug={slug} />
        );
    } catch (error) {
        console.error('❌ [PublicProfilePage] Error:', error);
        notFound();
    }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
    const { slug } = await params;

    try {
        const result = await getStudioProfileBySlug({ slug });

        if (!result.success || !result.data) {
            return {
                title: 'Studio no encontrado',
                description: 'El estudio solicitado no está disponible',
            };
        }

        const { studio } = result.data;
        const title = `${studio.studio_name}${studio.slogan ? ` - ${studio.slogan}` : ''}`;
        const description = studio.presentation || `Perfil profesional de ${studio.studio_name}`;

        return {
            title,
            description,
            keywords: studio.keywords || undefined,
            openGraph: {
                title,
                description,
                images: studio.logo_url ? [studio.logo_url] : undefined,
                type: 'profile',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: studio.logo_url ? [studio.logo_url] : undefined,
            },
        };
    } catch (error) {
        console.error('❌ [generateMetadata] Error:', error);
        return {
            title: 'Studio no encontrado',
            description: 'El estudio solicitado no está disponible',
        };
    }
}
