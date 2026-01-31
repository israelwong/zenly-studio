'use server';

import { prisma } from '@/lib/prisma';
import type { PublicPortfolio } from '@/types/public-profile';
import type { PortfoliosResult } from './whatsapp-resources.types';

const OTHERS_GROUP = 'Otros';

/** Portafolios publicados agrupados por event_type_name para el modal WhatsApp */
export async function getPortfoliosForWhatsApp(studioSlug: string): Promise<PortfoliosResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    const rows = await prisma.studio_portfolios.findMany({
      where: { studio_id: studio.id, is_published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        event_type: { select: { name: true } },
      },
      orderBy: [{ order: 'asc' }],
    });

    const byGroup = new Map<string, { id: string; title: string; slug: string; event_type_name: string | null }[]>();
    for (const r of rows) {
      const eventTypeName = r.event_type?.name ?? OTHERS_GROUP;
      const list = byGroup.get(eventTypeName) ?? [];
      list.push({
        id: r.id,
        title: r.title,
        slug: r.slug,
        event_type_name: r.event_type?.name ?? null,
      });
      byGroup.set(eventTypeName, list);
    }

    const ordered = Array.from(byGroup.entries()).sort(([a], [b]) => {
      if (a === OTHERS_GROUP) return 1;
      if (b === OTHERS_GROUP) return -1;
      return a.localeCompare(b);
    });
    const data = ordered.map(([eventTypeName, portfolios]) => ({ eventTypeName, portfolios }));
    return { success: true, data };
  } catch (e) {
    console.error('[whatsapp-resources] getPortfoliosForWhatsApp:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Error al listar portafolios' };
  }
}

/** Detalle completo de un portafolio para previsualización (misma forma que perfil público) */
export async function getPortfolioFullDetail(
  studioSlug: string,
  portfolioSlug: string
): Promise<{ success: true; data: PublicPortfolio } | { success: false; error: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    const portfolio = await prisma.studio_portfolios.findFirst({
      where: { studio_id: studio.id, slug: portfolioSlug, is_published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        caption: true,
        cover_image_url: true,
        category: true,
        order: true,
        is_featured: true,
        is_published: true,
        published_at: true,
        view_count: true,
        cover_index: true,
        tags: true,
        event_type: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            title: true,
            description: true,
            image_url: true,
            video_url: true,
            item_type: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        media: {
          select: {
            id: true,
            file_url: true,
            file_type: true,
            filename: true,
            thumbnail_url: true,
            display_order: true,
          },
          orderBy: { display_order: 'asc' },
        },
      },
    });
    if (!portfolio) return { success: false, error: 'Portafolio no encontrado' };

    const contentBlocks = await prisma.studio_portfolio_content_blocks.findMany({
      where: { portfolio_id: portfolio.id },
      select: {
        id: true,
        portfolio_id: true,
        type: true,
        title: true,
        description: true,
        presentation: true,
        config: true,
        order: true,
      },
      orderBy: { order: 'asc' },
    });
    const blockIds = contentBlocks.map((b) => b.id);
    const blockMedia =
      blockIds.length > 0
        ? await prisma.studio_portfolio_content_block_media.findMany({
            where: { content_block_id: { in: blockIds } },
            select: { id: true, content_block_id: true, order: true, media_id: true },
            orderBy: { order: 'asc' },
          })
        : [];
    const mediaIds = blockMedia.map((bm) => bm.media_id).filter(Boolean);
    const mediaFiles =
      mediaIds.length > 0
        ? await prisma.studio_portfolio_media.findMany({
            where: { id: { in: mediaIds } },
            select: { id: true, file_url: true, file_type: true, filename: true, thumbnail_url: true },
          })
        : [];
    const mediaMap = new Map(mediaFiles.map((m) => [m.id, m]));
    const blockMediaByBlock = new Map<string, typeof blockMedia>();
    blockMedia.forEach((bm) => {
      const list = blockMediaByBlock.get(bm.content_block_id) ?? [];
      list.push(bm);
      blockMediaByBlock.set(bm.content_block_id, list);
    });

    const contentBlocksMapped = contentBlocks.map((block) => {
      const blockMediaList = blockMediaByBlock.get(block.id) ?? [];
      return {
        id: block.id,
        type: block.type as 'image' | 'gallery' | 'video' | 'text' | 'grid' | 'slider' | 'hero-contact' | 'hero-image' | 'hero-video' | 'hero-text' | 'hero' | 'separator' | 'media-gallery' | 'hero-portfolio' | 'hero-offer',
        title: block.title ?? undefined,
        description: block.description ?? undefined,
        presentation: block.presentation as 'block' | 'fullwidth',
        config:
          typeof block.config === 'object' && block.config !== null && !Array.isArray(block.config)
            ? (block.config as Record<string, unknown>)
            : undefined,
        order: block.order,
        media: blockMediaList
          .map((bm) => {
            const media = mediaMap.get(bm.media_id);
            return media
              ? {
                  id: media.id,
                  file_url: media.file_url,
                  file_type: media.file_type as 'image' | 'video',
                  filename: media.filename,
                  storage_path: '',
                  thumbnail_url: media.thumbnail_url ?? undefined,
                  display_order: bm.order,
                }
              : null;
          })
          .filter((m): m is NonNullable<typeof m> => m !== null),
      };
    });

    const items = portfolio.items.map((item) => ({
      id: item.id,
      title: item.title ?? 'Sin título',
      description: item.description,
      image_url: item.image_url,
      video_url: item.video_url,
      item_type: item.item_type as 'PHOTO' | 'VIDEO',
      order: item.order,
    }));

    const data: PublicPortfolio = {
      id: portfolio.id,
      title: portfolio.title,
      slug: portfolio.slug,
      description: portfolio.description,
      caption: portfolio.caption,
      cover_image_url: portfolio.cover_image_url,
      category: portfolio.category,
      order: portfolio.order,
      is_featured: portfolio.is_featured,
      is_published: portfolio.is_published,
      published_at: portfolio.published_at,
      view_count: portfolio.view_count,
      cover_index: portfolio.cover_index,
      tags: portfolio.tags ?? [],
      items,
      media: portfolio.media.map((m) => ({
        id: m.id,
        file_url: m.file_url,
        file_type: m.file_type as 'image' | 'video',
        filename: m.filename,
        thumbnail_url: m.thumbnail_url ?? undefined,
        display_order: m.display_order,
      })),
      content_blocks: contentBlocksMapped,
      event_type: portfolio.event_type ? { id: portfolio.event_type.id, nombre: portfolio.event_type.name } : null,
    };
    return { success: true, data };
  } catch (e) {
    console.error('[whatsapp-resources] getPortfolioFullDetail:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Error al cargar portafolio' };
  }
}
