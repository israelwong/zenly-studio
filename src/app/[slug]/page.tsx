import React from 'react';
import { notFound } from 'next/navigation';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { getPublicActiveOffers } from '@/lib/actions/studio/offers/offers.actions';
import { ProfilePageClient } from './profile/public/ProfilePageClient';
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

        // Fetch public active offers
        const offersResult = await getPublicActiveOffers(slug);
        const offers = offersResult.success && offersResult.data ? offersResult.data : [];

        // Map items to include required properties
        const mappedProfileData = {
            ...profileData,
            items: profileData.items.map(item => ({
                id: item.id,
                name: item.name,
                type: 'SERVICIO' as const,
                cost: (item as { price?: number }).price || 0,
                order: item.order
            })),
            portfolios: profileData.portfolios.map(portfolio => {
                console.log('[page.tsx] Mapping portfolio:', portfolio.title, 'is_published:', portfolio.is_published, 'type:', typeof portfolio.is_published);
                return {
                    ...portfolio,
                    is_published: portfolio.is_published,
                    is_featured: portfolio.is_featured,
                    view_count: portfolio.view_count ?? 0,
                };
            }),
            paquetes: profileData.paquetes.map(paquete => ({
                id: paquete.id,
                nombre: paquete.nombre,
                precio: paquete.precio,
                order: paquete.order,
                descripcion: paquete.descripcion ?? undefined,
                tipo_evento: paquete.tipo_evento ?? undefined,
                tipo_evento_order: paquete.tipo_evento_order ?? undefined,
                cover_url: paquete.cover_url ?? undefined,
                duracion_horas: paquete.duracion_horas ?? undefined,
                incluye: paquete.incluye ?? undefined,
                no_incluye: paquete.no_incluye ?? undefined,
                condiciones: paquete.condiciones ?? undefined
            })),
            contactInfo: {
                ...profileData.contactInfo,
                email: null,
                google_maps_url: null,
                horarios: (profileData as { contactInfo?: { horarios?: import('@/types/public-profile').PublicHorario[] } }).contactInfo?.horarios || []
            }
        };

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
