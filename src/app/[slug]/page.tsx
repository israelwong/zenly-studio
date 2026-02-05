import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
    getStudioProfileBasicData,
    getStudioProfileDeferredPosts,
    getStudioProfileDeferredPortfolios,
} from '@/lib/actions/public/profile.actions';
import { getPublicActiveOffers } from '@/lib/actions/studio/offers/offers.actions';
import { ProfilePageHeader } from './profile/public/ProfilePageHeader';
import { ProfilePageStreaming } from './profile/public/ProfilePageStreaming';
import { Toaster } from '@/components/ui/shadcn/sonner';
import { getCurrentUser } from '@/lib/auth/user-utils';
import { ProfilePageSkeleton } from './profile/public/ProfilePageSkeleton';
import { detectDeviceType } from '@/lib/utils/analytics-helpers';

/** Slugs que no son estudios: rutas de app o reservadas (evita "Studio not found") */
const RESERVED_SLUGS = new Set([
    's',           // short URLs
    'auth', 'login', 'signup', 'sign-up', 'forgot-password', 'update-password', 'confirm', 'error', 'redirect',
    'admin', 'agente', 'api', 'onboarding', 'protected', 'unauthorized',
    'about', 'contact', 'pricing',
    'favicon.ico', 'robots.txt', '_next', 'studio', 'config', 'cliente', 'offer', 'promise', 'profile', 'aviso-privacidad',
]);

interface PublicProfilePageProps {
    params: Promise<{ slug: string }>;
}

/**
 * ⚠️ STREAMING: Public Studio Profile Page
 * Fragmentación: Basic (instantáneo) + Deferred (posts/portfolios)
 */
export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
    const { slug } = await params;

    if (RESERVED_SLUGS.has(slug?.toLowerCase?.() ?? '')) {
        redirect('/');
    }

    try {
        // Detectar dispositivo desde servidor usando User-Agent
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || null;
        const deviceType = detectDeviceType(userAgent);
        const initialIsDesktop = deviceType === 'desktop';

        // ⚠️ STREAMING: Cargar datos básicos inmediatamente (instantáneo)
        const basicResult = await getStudioProfileBasicData({ slug });

        if (!basicResult.success || !basicResult.data) {
            console.error('❌ [PublicProfilePage] Failed to fetch basic profile:', basicResult.error);
            redirect('/');
        }

        const basicData = basicResult.data;

        // Verificar ownership para posts/portfolios
        let userId: string | null = null;
        try {
            const currentUser = await getCurrentUser();
            userId = currentUser?.id || null;
        } catch (userError) {
            // Silencioso
        }
        const isOwner = userId === basicData.studio.owner_id;

        // ⚠️ STREAMING: Crear promesas para datos pesados (NO await - deferred)
        const postsPromise = getStudioProfileDeferredPosts(basicData.studio.id, isOwner);
        const portfoliosPromise = getStudioProfileDeferredPortfolios(basicData.studio.id, isOwner);
        const offersPromise = getPublicActiveOffers(slug).then(result => ({
            success: result.success,
            data: result.success && result.data ? result.data : [],
            error: result.error
        }));

        return (
            <>
                {/* ⚠️ STREAMING: Parte A - Instantánea (header básico) */}
                <ProfilePageHeader
                    studio={basicData.studio}
                    studioSlug={slug}
                    isOwner={isOwner}
                />

                {/* ⚠️ STREAMING: Parte B - Streaming (contenido pesado con Suspense) */}
                <Suspense fallback={<ProfilePageSkeleton />}>
                    <ProfilePageStreaming
                        basicData={basicData}
                        postsPromise={postsPromise}
                        portfoliosPromise={portfoliosPromise}
                        offersPromise={offersPromise}
                        studioSlug={slug}
                        initialIsDesktop={initialIsDesktop}
                    />
                </Suspense>

                <Toaster position="top-right" richColors />
            </>
        );
    } catch (error) {
        console.error('❌ [PublicProfilePage] Error:', error);
        redirect('/');
    }
}

import { getStudioProfileMetadata, getPortfolioMetadataForOg } from '@/lib/actions/public/profile.actions';
import { Metadata } from 'next';

type GenerateMetadataProps = PublicProfilePageProps & { searchParams: Promise<{ portfolio?: string }> };

/**
 * ⚠️ METADATA LIGERA: Solo 5 campos esenciales para SEO
 * Si searchParams.portfolio está presente, metadata del portafolio para openGraph (preview WhatsApp).
 */
export async function generateMetadata({ params, searchParams }: GenerateMetadataProps): Promise<Metadata> {
    const { slug } = await params;
    const { portfolio: portfolioSlug } = await searchParams;

    // Excluir rutas reservadas como /s (short URLs)
    if (slug === 's') {
        return {
            title: 'Studio no encontrado',
            description: 'El estudio solicitado no está disponible',
        };
    }

    try {
        if (portfolioSlug?.trim()) {
            const portfolioMeta = await getPortfolioMetadataForOg(slug, portfolioSlug.trim());
            if (portfolioMeta.success && portfolioMeta.data) {
                const { title: portfolioTitle, cover_image_url, studio_name } = portfolioMeta.data;
                const title = portfolioTitle;
                const description = `Mira nuestro trabajo en ${studio_name}`;
                return {
                    title,
                    description,
                    openGraph: {
                        title,
                        description,
                        images: cover_image_url ? [cover_image_url] : undefined,
                        type: 'website',
                    },
                    twitter: {
                        card: 'summary_large_image',
                        title,
                        description,
                        images: cover_image_url ? [cover_image_url] : undefined,
                    },
                };
            }
        }

        const result = await getStudioProfileMetadata(slug);

        if (!result.success || !result.data) {
            return {
                title: 'Studio no encontrado',
                description: 'El estudio solicitado no está disponible',
            };
        }

        const { studio_name, slogan, presentation, logo_url, keywords } = result.data;
        const title = `${studio_name}${slogan ? ` - ${slogan}` : ''}`;
        const description = presentation || `Perfil profesional de ${studio_name}`;

        const icons = logo_url ? {
            icon: [
                { url: logo_url, type: 'image/png' },
                { url: logo_url, sizes: '32x32', type: 'image/png' },
                { url: logo_url, sizes: '16x16', type: 'image/png' },
            ],
            apple: [
                { url: logo_url, sizes: '180x180', type: 'image/png' },
            ],
            shortcut: logo_url,
        } : undefined;

        return {
            title,
            description,
            keywords: keywords || undefined,
            icons,
            openGraph: {
                title,
                description,
                images: logo_url ? [logo_url] : undefined,
                type: 'profile',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: logo_url ? [logo_url] : undefined,
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
