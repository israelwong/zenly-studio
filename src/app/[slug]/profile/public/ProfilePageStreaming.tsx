'use client';

import { use } from 'react';
import { ProfilePageInteractive } from './ProfilePageInteractive';
import type { PublicPost, PublicPortfolio, PublicProfileData, PublicStudioProfile } from '@/types/public-profile';
import type { PublicSocialNetwork, PublicContactInfo } from '@/types/public-profile';

interface ProfilePageStreamingProps {
    basicData: {
        studio: {
            id: string;
            owner_id: string | null;
            studio_name: string;
            presentation: string | null;
            keywords: string | null;
            logo_url: string | null;
            slogan: string | null;
            website: string | null;
            address: string | null;
            plan_id: string | null;
            plan: { name: string; slug: string } | null;
            zonas_trabajo: Array<{ id: string; nombre: string; orden: number }>;
            faq: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }>;
        };
        socialNetworks: PublicSocialNetwork[];
        contactInfo: PublicContactInfo;
        items: Array<{ id: string; name: string; type: 'SERVICIO'; cost: number; order: number }>;
        paquetes: Array<{
            id: string;
            nombre: string;
            descripcion?: string;
            precio: number;
            tipo_evento?: string;
            tipo_evento_order?: number;
            cover_url?: string;
            is_featured?: boolean;
            status?: string;
            order: number;
        }>;
    };
    postsPromise: Promise<{ success: boolean; data?: PublicPost[]; error?: string }>;
    portfoliosPromise: Promise<{ success: boolean; data?: PublicPortfolio[]; error?: string }>;
    offersPromise: Promise<{ success: boolean; data?: any[]; error?: string }>;
    studioSlug: string;
    initialIsDesktop?: boolean;
}

/**
 * ⚠️ STREAMING: Componente streaming (usa use() de React 19)
 * Resuelve promesas de posts y portfolios y renderiza el componente interactivo
 */
export function ProfilePageStreaming({
    basicData,
    postsPromise,
    portfoliosPromise,
    offersPromise,
    studioSlug,
    initialIsDesktop = false,
}: ProfilePageStreamingProps) {
    // ⚠️ React 19: use() resuelve las promesas y suspende si no están listas
    const postsResult = use(postsPromise);
    const portfoliosResult = use(portfoliosPromise);
    const offersResult = use(offersPromise);

    const posts = postsResult.success && postsResult.data ? postsResult.data : [];
    const portfolios = portfoliosResult.success && portfoliosResult.data ? portfoliosResult.data : [];
    const offers = offersResult.success && offersResult.data ? offersResult.data : [];

    // Construir PublicProfileData completo
    const profileData: PublicProfileData = {
        studio: {
            ...basicData.studio,
            faq: basicData.studio.faq,
        } as PublicStudioProfile,
        socialNetworks: basicData.socialNetworks,
        contactInfo: basicData.contactInfo,
        items: basicData.items.map(item => ({
            id: item.id,
            name: item.name,
            type: 'SERVICIO' as const,
            cost: item.cost,
            order: item.order
        })),
        portfolios,
        paquetes: basicData.paquetes,
        posts,
    };

    return (
        <ProfilePageInteractive
            profileData={profileData}
            studioSlug={studioSlug}
            offers={offers}
            initialIsDesktop={initialIsDesktop}
        />
    );
}
