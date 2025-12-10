import React from 'react';
import { notFound } from 'next/navigation';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { getPublicActiveOffers } from '@/lib/actions/studio/offers/offers.actions';
import { ProfilePageClient } from './profile/public/ProfilePageClient';
import { Metadata } from 'next';
import type { PublicProfileData } from '@/types/public-profile';

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

        // Fetch public active offers
        const offersResult = await getPublicActiveOffers(slug);
        const offers = offersResult.success && offersResult.data ? offersResult.data : [];

        // Map items para incluir propiedades requeridas
        const mappedProfileData: PublicProfileData = {
            ...profileData,
            items: profileData.items.map(item => ({
                id: item.id,
                name: item.name,
                type: 'SERVICIO' as const,
                cost: item.price || 0,
                order: item.order
            }))
        } as PublicProfileData;

        return (
            <ProfilePageClient
                profileData={mappedProfileData}
                studioSlug={slug}
                offers={offers}
            />
        );
    } catch (error) {
        console.error('❌ [PublicProfilePage] Error:', error);
        notFound();
    }
}

/**
 * Generate metadata for SEO and favicon dinámico
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

        // Configurar favicon dinámico usando el logo del studio
        const icons = studio.logo_url ? {
            icon: [
                { url: studio.logo_url, type: 'image/png' },
                { url: studio.logo_url, sizes: '32x32', type: 'image/png' },
                { url: studio.logo_url, sizes: '16x16', type: 'image/png' },
            ],
            apple: [
                { url: studio.logo_url, sizes: '180x180', type: 'image/png' },
            ],
            shortcut: studio.logo_url,
        } : undefined;

        return {
            title,
            description,
            keywords: studio.keywords || undefined,
            icons, // ← Favicon dinámico
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
