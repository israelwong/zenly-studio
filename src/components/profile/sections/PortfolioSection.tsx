import React from 'react';
import Image from 'next/image';
import { PublicPortfolio } from '@/types/public-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Image as ImageIcon, Video, Eye } from 'lucide-react';

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
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Nuestro Portafolio
                </h2>
                <p className="text-zinc-400">
                    Descubre nuestro trabajo y proyectos
                </p>
            </div>

            {/* Portfolios Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {portfolios.map((portfolio) => (
                    <ZenCard key={portfolio.id} className="overflow-hidden">
                        <ZenCardHeader>
                            <div className="flex items-center justify-between">
                                <ZenCardTitle className="text-lg">
                                    {portfolio.title}
                                </ZenCardTitle>
                                <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                                    {portfolio.category || 'General'}
                                </span>
                            </div>
                            {portfolio.description && (
                                <p className="text-sm text-zinc-400 mt-2">
                                    {portfolio.description}
                                </p>
                            )}
                        </ZenCardHeader>

                        <ZenCardContent>
                            {/* Cover Image */}
                            {portfolio.cover_image_url ? (
                                <div className="aspect-video bg-zinc-800 rounded-lg mb-4 overflow-hidden relative">
                                    <Image
                                        src={portfolio.cover_image_url}
                                        alt={portfolio.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-video bg-zinc-800 rounded-lg mb-4 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-zinc-500" />
                                </div>
                            )}

                            {/* Items Preview */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-300">
                                        {portfolio.items.length} elementos
                                    </span>
                                    <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        Ver todo
                                    </button>
                                </div>

                                {/* Items Grid Preview */}
                                <div className="grid grid-cols-3 gap-2">
                                    {portfolio.items.slice(0, 3).map((item) => (
                                        <div key={item.id} className="aspect-square bg-zinc-800 rounded overflow-hidden relative">
                                            {item.image_url ? (
                                                <Image
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 768px) 33vw, 16vw"
                                                />
                                            ) : item.video_url ? (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                                                    <Video className="h-4 w-4 text-zinc-400" />
                                                </div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                                                    <ImageIcon className="h-4 w-4 text-zinc-500" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {portfolio.items.length > 3 && (
                                        <div className="aspect-square bg-zinc-800 rounded flex items-center justify-center">
                                            <span className="text-xs text-zinc-400">
                                                +{portfolio.items.length - 3}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                ))}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {portfolios.length}
                    </div>
                    <div className="text-sm text-zinc-400">Portafolios</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {portfolios.reduce((total, portfolio) => total + portfolio.items.length, 0)}
                    </div>
                    <div className="text-sm text-zinc-400">Elementos</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {portfolios.filter(p => p.category).length}
                    </div>
                    <div className="text-sm text-zinc-400">Categorías</div>
                </div>
            </div>
        </div>
    );
}
