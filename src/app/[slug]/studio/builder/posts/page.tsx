'use client';

import React, { useEffect, useState } from 'react';
import { Suspense } from "react";
import { ZenButton } from "@/components/ui/zen";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PostsList } from "./components/PostsList";
import { SectionLayout } from "../components";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { FileText } from 'lucide-react';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { getStudioPostsBySlug } from '@/lib/actions/studio/builder/posts';
import { BuilderProfileData } from '@/types/builder-profile';
import { StudioPost } from "@/types/studio-posts";

export default function PostsPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [posts, setPosts] = useState<StudioPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('🔄 [PostsPage] Loading builder data for slug:', studioSlug);

                // Cargar datos del builder y posts en paralelo
                const [builderResult, postsResult] = await Promise.all([
                    getBuilderProfileData(studioSlug),
                    getStudioPostsBySlug(studioSlug, { is_published: true }) // Solo posts publicados para preview
                ]);

                console.log('📊 [PostsPage] Builder data result:', builderResult);
                console.log('📊 [PostsPage] Posts result:', postsResult);

                if (builderResult.success && builderResult.data) {
                    setBuilderData(builderResult.data);
                    console.log('✅ [PostsPage] Builder data loaded successfully');
                } else {
                    console.error('❌ [PostsPage] Error loading builder data:', builderResult.error);
                }

                if (postsResult.success) {
                    setPosts(postsResult.data);
                    console.log('✅ [PostsPage] Posts loaded successfully:', postsResult.data.length);
                } else {
                    console.error('❌ [PostsPage] Error loading posts:', postsResult.error);
                }
            } catch (error) {
                console.error('❌ [PostsPage] Error loading data:', error);
            } finally {
                console.log('🏁 [PostsPage] Setting loading to false');
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug]);


    // ✅ Mapear datos para preview - Header, Footer y Contenido de posts
    const previewData = builderData ? {
        // Para ProfileIdentity
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        // Para ProfileFooter
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        redes_sociales: builderData.socialNetworks.map(network => ({
            plataforma: network.platform?.name || '',
            url: network.url
        })),
        email: null,
        telefonos: builderData.contactInfo.phones.map(phone => ({
            numero: phone.number,
            tipo: phone.type === 'WHATSAPP' ? 'whatsapp' as const :
                phone.type === 'LLAMADAS' ? 'llamadas' as const : 'ambos' as const,
            etiqueta: phone.label || undefined,
            is_active: phone.is_active
        })),
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url,
        // Para ProfileContent (sección posts)
        posts: posts
    } : null;

    return (
        <SectionLayout section="posts" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Gestión de Posts</ZenCardTitle>
                                <ZenCardDescription>
                                    Crea y gestiona tus publicaciones
                                </ZenCardDescription>
                            </div>
                        </div>
                        <Link href={`/${studioSlug}/studio/builder/posts/nuevo`}>
                            <ZenButton className="gap-2">
                                <Plus className="w-4 h-4" />
                                Nuevo Post
                            </ZenButton>
                        </Link>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-6">
                            <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                            <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                            <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                        </div>
                    ) : (
                        <Suspense fallback={<div>Cargando posts...</div>}>
                            <PostsList studioSlug={studioSlug} />
                        </Suspense>
                    )}
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
