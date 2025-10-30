import { PortfolioEditor } from "../../components/PortfolioEditor";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";
import { getStudioPortfolioById } from "@/lib/actions/studio/builder/portfolios/portfolios.actions";
import { notFound } from "next/navigation";
import { PortfolioFormData } from "@/lib/actions/schemas/portfolio-schemas";
import { ContentBlock } from "@/types/content-blocks";

// Tipo para el portfolio de la BD
type DatabasePortfolio = NonNullable<Awaited<ReturnType<typeof getStudioPortfolioById>>['data']>;

// Función para convertir portfolio de BD a PortfolioFormData
function convertDatabasePortfolioToFormData(dbPortfolio: DatabasePortfolio): PortfolioFormData {
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

    return {
        id: dbPortfolio.id,
        title: dbPortfolio.title,
        slug: dbPortfolio.slug,
        description: dbPortfolio.description || "",
        caption: dbPortfolio.caption || "",
        cover_image_url: dbPortfolio.cover_image_url || null,
        media,
        cover_index: dbPortfolio.cover_index,
        category: dbPortfolio.category as "portfolio" | "blog" | "promo" | null,
        event_type_id: dbPortfolio.event_type_id || "",
        tags: dbPortfolio.tags,
        cta_enabled: dbPortfolio.cta_enabled,
        cta_text: dbPortfolio.cta_text,
        cta_action: dbPortfolio.cta_action as "whatsapp" | "lead_form" | "calendar",
        cta_link: dbPortfolio.cta_link || "",
        is_featured: dbPortfolio.is_featured,
        is_published: dbPortfolio.is_published,
        content_blocks: contentBlocks,
        order: dbPortfolio.order,
    };
}

interface EditarPortfolioPageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

export default async function EditarPortfolioPage({ params }: EditarPortfolioPageProps) {
    const { slug, id } = await params;

    // Obtener el portfolio existente
    const portfolioResult = await getStudioPortfolioById(id);
    if (!portfolioResult.success || !portfolioResult.data) {
        notFound();
    }

    // Obtener tipos de evento para el select
    const eventTypesResult = await obtenerTiposEvento(slug);
    const eventTypes = eventTypesResult.success
        ? (eventTypesResult.data || []).map(et => ({ id: et.id, name: et.nombre }))
        : [];

    return (
        <PortfolioEditor
            studioSlug={slug}
            eventTypes={eventTypes}
            mode="edit"
            portfolio={convertDatabasePortfolioToFormData(portfolioResult.data)}
        />
    );
}

