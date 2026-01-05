'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PortfolioEditor } from "../components/editors/PortfolioEditor";
import { PortfolioEditorSkeleton } from "../components/editors/PortfolioEditorSkeleton";
import { getStudioPortfolioById } from "@/lib/actions/studio/portfolios/portfolios.actions";
import { PortfolioFormData } from "@/lib/actions/schemas/portfolio-schemas";
import { ContentBlock } from "@/types/content-blocks";
import { toast } from 'sonner';

// Tipo extendido que incluye published_at para determinar estado
type PortfolioWithStatus = PortfolioFormData & {
    published_at?: Date | null;
};

// Función para convertir portfolio de BD a PortfolioFormData
function convertDatabasePortfolioToFormData(dbPortfolio: NonNullable<Awaited<ReturnType<typeof getStudioPortfolioById>>['data']>): PortfolioWithStatus {
    // Mapear media items
    const media = dbPortfolio.media?.map(item => ({
        id: item.id,
        file_url: item.file_url,
        file_type: item.file_type as "image" | "video",
        filename: item.filename,
        storage_bytes: Number(item.storage_bytes),
        mime_type: item.mime_type,
        dimensions: item.dimensions as { width: number; height: number } | undefined,
        duration_seconds: item.duration_seconds || undefined,
        display_order: item.display_order,
        alt_text: item.alt_text || undefined,
        thumbnail_url: item.thumbnail_url || undefined,
        storage_path: item.storage_path,
    })) || [];

    // Mapear content blocks
    const contentBlocks = dbPortfolio.content_blocks?.map(block => ({
        id: block.id,
        type: block.type as ContentBlock['type'],
        title: block.title || undefined,
        description: block.description || undefined,
        presentation: block.presentation as ContentBlock['presentation'],
        order: block.order,
        config: (block.config as Record<string, unknown>) || undefined,
        media: block.block_media?.map(bm => ({
            id: bm.media.id,
            file_url: bm.media.file_url,
            file_type: bm.media.file_type as "image" | "video",
            filename: bm.media.filename,
            storage_bytes: Number(bm.media.storage_bytes),
            thumbnail_url: bm.media.thumbnail_url || undefined,
            storage_path: bm.media.storage_path,
        })) || [],
    })) || [];

    const formData = {
        id: dbPortfolio.id,
        title: dbPortfolio.title,
        slug: dbPortfolio.slug,
        description: dbPortfolio.description || "",
        caption: dbPortfolio.caption || "",
        cover_image_url: dbPortfolio.cover_image_url || null,
        cover_storage_bytes: dbPortfolio.cover_storage_bytes ? Number(dbPortfolio.cover_storage_bytes) : null,
        media,
        cover_index: dbPortfolio.cover_index,
        category: dbPortfolio.category as "portfolio" | "blog" | "promo" | null,
        event_type_id: dbPortfolio.event_type_id || "",
        tags: dbPortfolio.tags,
        is_featured: dbPortfolio.is_featured,
        is_published: dbPortfolio.is_published,
        content_blocks: contentBlocks,
        order: dbPortfolio.order,
        published_at: dbPortfolio.published_at ?? null,
    };

    return formData as PortfolioWithStatus;
}

export default function EditarPortfolioPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const portfolioId = params.id as string;

    const [portfolio, setPortfolio] = useState<PortfolioWithStatus | null>(null);
    const [loading, setLoading] = useState(true);

    // Actualizar título cuando cambie el portfolio
    useEffect(() => {
        const updateTitle = () => {
            if (portfolio) {
                document.title = `ZEN Studio - ${portfolio.title || 'Portafolio'}`;
            } else {
                document.title = 'ZEN Studio - Portafolio';
            }
        };

        updateTitle();
        const timeoutId = setTimeout(updateTitle, 100);
        return () => clearTimeout(timeoutId);
    }, [portfolio]);

    useEffect(() => {
        const loadPortfolio = async () => {
            try {
                const result = await getStudioPortfolioById(portfolioId);

                if (result.success && result.data) {
                    setPortfolio(convertDatabasePortfolioToFormData(result.data));
                } else {
                    toast.error(result.error || 'Error al cargar el portafolio');
                }
            } catch (error) {
                console.error('[EditarPortfolioPage] Error:', error);
                toast.error('Error al cargar el portafolio');
            } finally {
                setLoading(false);
            }
        };

        if (portfolioId) {
            loadPortfolio();
        }
    }, [portfolioId]);

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto">
                <PortfolioEditorSkeleton />
            </div>
        );
    }

    if (!portfolio) {
        return (
            <div className="w-full max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <p className="text-zinc-400">Portafolio no encontrado</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            <PortfolioEditor
                studioSlug={studioSlug}
                mode="edit"
                portfolio={portfolio}
            />
        </div>
    );
}

