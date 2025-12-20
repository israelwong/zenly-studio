'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, ChevronRight, FolderOpen } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import { PortfolioDetailModal } from '@/components/profile/sections/PortfolioDetailModal';
import { getStudioPortfolioBySlug } from '@/lib/actions/studio/portfolios/portfolios.actions';
import type { PublicPortfolio } from '@/types/public-profile';

interface PortafoliosCardProps {
  portafolios: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    event_type?: {
      id: string;
      name: string;
    } | null;
  }>;
  studioSlug: string;
  studioId?: string;
}

export function PortafoliosCard({ portafolios, studioSlug, studioId }: PortafoliosCardProps) {
  const [selectedPortfolioSlug, setSelectedPortfolioSlug] = useState<string | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PublicPortfolio | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const handlePortfolioClick = async (slug: string) => {
    setSelectedPortfolioSlug(slug);
    setLoadingPortfolio(true);

    try {
      const result = await getStudioPortfolioBySlug(studioSlug, slug);
      if (result.success && result.data) {
        // Mapear el resultado a PublicPortfolio
        const portfolio: PublicPortfolio = {
          id: result.data.id,
          title: result.data.title,
          slug: result.data.slug,
          description: result.data.description,
          caption: result.data.caption || null,
          cover_image_url: result.data.cover_image_url,
          category: result.data.category,
          tags: result.data.tags || [],
          order: result.data.order || 0,
          is_featured: result.data.is_featured || false,
          is_published: result.data.is_published || false,
          published_at: result.data.published_at,
          view_count: result.data.view_count || 0,
          cover_index: result.data.cover_index || 0,
          items: (result.data.items || []).map((item: any) => ({
            id: item.id,
            title: item.title || null,
            description: item.description || null,
            image_url: item.image_url,
            video_url: item.video_url || null,
            item_type: item.item_type,
            order: item.order || 0,
          })),
          media: (result.data.media || []).map((m: any) => ({
            id: m.id,
            file_url: m.file_url || '',
            file_type: (m.file_type || 'image') as 'image' | 'video',
            filename: m.filename || '',
            thumbnail_url: m.thumbnail_url || null,
            display_order: m.display_order || 0,
          })),
          content_blocks: (result.data.content_blocks || []).map((block: any) => ({
            id: block.id,
            type: block.type as any,
            title: block.title || undefined,
            description: block.description || undefined,
            presentation: (block.presentation || 'block') as 'block' | 'fullwidth',
            order: block.order || 0,
            config: block.config || undefined,
            media: (block.block_media || []).map((bm: any) => ({
              id: bm.media?.id || bm.media_id,
              file_url: bm.media?.file_url || '',
              file_type: (bm.media?.file_type || 'image') as 'image' | 'video',
              filename: bm.media?.filename || '',
              thumbnail_url: bm.media?.thumbnail_url || null,
              storage_path: bm.media?.storage_path || '',
              storage_bytes: bm.media?.storage_bytes ? Number(bm.media.storage_bytes) : undefined,
              display_order: bm.order || 0,
            })),
          })),
          event_type: result.data.event_type ? {
            id: result.data.event_type.id,
            nombre: result.data.event_type.name,
          } : null,
        };
        setSelectedPortfolio(portfolio);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedPortfolioSlug(null);
    setSelectedPortfolio(null);
  };

  if (portafolios.length === 0) {
    return null;
  }

  return (
    <>
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl md:text-3xl font-bold text-white">
                Portafolios Disponibles
              </h2>
            </div>
            <p className="text-zinc-400 text-sm md:text-base">
              Explora nuestro trabajo y conoce la calidad de nuestros servicios
            </p>
          </div>

          {/* Grid de portafolios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portafolios.map((portafolio) => (
              <ZenCard
                key={portafolio.id}
                className="bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group h-full overflow-hidden"
                onClick={() => handlePortfolioClick(portafolio.slug)}
              >
                {/* Imagen de portada */}
                <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                  {portafolio.cover_image_url ? (
                    <>
                      <img
                        src={portafolio.cover_image_url}
                        alt={portafolio.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {/* Overlay al hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-zinc-700" />
                    </div>
                  )}
                  {/* Badge de tipo de evento */}
                  {portafolio.event_type && (
                    <div className="absolute top-3 left-3">
                      <ZenBadge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-2 py-0.5">
                        {portafolio.event_type.name}
                      </ZenBadge>
                    </div>
                  )}
                  {/* Indicador de hover */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="p-2 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-500/30">
                      <ChevronRight className="w-4 h-4 text-purple-300" />
                    </div>
                  </div>
                </div>

                {/* Contenido del card */}
                <ZenCardContent className="p-4">
                  <ZenCardHeader className="p-0 mb-2">
                    <ZenCardTitle className="text-white group-hover:text-purple-300 transition-colors text-base font-semibold line-clamp-1">
                      {portafolio.title}
                    </ZenCardTitle>
                  </ZenCardHeader>
                  {portafolio.description && (
                    <p className="text-sm text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                      {portafolio.description}
                    </p>
                  )}
                  {/* Footer con acción */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500 font-medium">
                      Ver portafolio
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </ZenCardContent>
              </ZenCard>
            ))}
          </div>
        </div>
      </section>

      {/* Modal de portafolio */}
      {selectedPortfolio && (
        <PortfolioDetailModal
          portfolio={selectedPortfolio}
          studioSlug={studioSlug}
          studioId={studioId}
          isOpen={!!selectedPortfolioSlug}
          onClose={handleCloseModal}
          hideShareButton={true}
        />
      )}
    </>
  );
}

export default PortafoliosCard;
