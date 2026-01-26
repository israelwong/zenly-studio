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

interface PublicProfilePageProps {
    params: Promise<{ slug: string }>;
}

/**
 * ⚠️ STREAMING: Public Studio Profile Page
 * Fragmentación: Basic (instantáneo) + Deferred (posts/portfolios)
 */
export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
    const { slug } = await params;

    // Excluir rutas reservadas como /s (short URLs)
    if (slug === 's') {
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

import { getStudioProfileMetadata } from '@/lib/actions/public/profile.actions';
import { Metadata } from 'next';

/**
 * ⚠️ METADATA LIGERA: Solo 5 campos esenciales para SEO
 * Elimina la doble carga en generateMetadata
 */
export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
    const { slug } = await params;

    // Excluir rutas reservadas como /s (short URLs)
    if (slug === 's') {
        return {
            title: 'Studio no encontrado',
            description: 'El estudio solicitado no está disponible',
        };
    }

    try {
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

        // Configurar favicon dinámico usando el logo del studio
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
            icons, // ← Favicon dinámico
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
