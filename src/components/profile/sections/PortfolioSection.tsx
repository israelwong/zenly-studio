import React from 'react';
import Image from 'next/image';
import { PublicPortfolio } from '@/types/public-profile';
import { ZenCard, ZenCardContent, ZenCardTitle } from '@/components/ui/zen';
import { Image as ImageIcon } from 'lucide-react';

interface PortfolioSectionProps {
    portfolios: PublicPortfolio[];
}

/**
 * PortfolioSection - Sección específica de portafolio
 * Muestra los portafolios del estudio de forma organizada
 * Hardcodeado simple para demostración
 */
export function PortfolioSection({ portfolios }: PortfolioSectionProps) {
    if (portfolios.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Portafolio vacío
                </h3>
                <p className="text-sm text-zinc-500">
                    Aún no hay portafolios disponibles
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Portfolios Fullwidth */}
            <div className="space-y-6">
                {portfolios.map((portfolio) => (
                    <ZenCard key={portfolio.id} className="overflow-hidden">
                        <div className="flex flex-col">
                            {/* Cover Image */}
                            <div className="relative w-full aspect-video bg-zinc-800 overflow-hidden">
                                {portfolio.cover_image_url ? (
                                    <Image
                                        src={portfolio.cover_image_url}
                                        alt={portfolio.title}
                                        fill
                                        className="object-cover"
                                        sizes="100vw"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-12 w-12 text-zinc-500" />
                                    </div>
                                )}
                            </div>

                            {/* Content: Title and Tags */}
                            <ZenCardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Title */}
                                    <ZenCardTitle className="text-xl font-semibold text-white">
                                        {portfolio.title}
                                    </ZenCardTitle>

                                    {/* Tags/Palabras Clave */}
                                    {portfolio.tags && portfolio.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {portfolio.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="text-xs text-zinc-300 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </ZenCardContent>
                        </div>
                    </ZenCard>
                ))}
            </div>
        </div>
    );
}
