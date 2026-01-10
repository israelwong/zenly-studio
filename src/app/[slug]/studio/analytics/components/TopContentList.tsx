'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, TrendingUp, MousePointerClick, Share2 } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

interface TopContentListProps {
    posts: Array<{
        id: string;
        slug: string;
        title: string | null;
        caption: string | null;
        analyticsViews: number;
        analyticsClicks?: number;
        analyticsShares?: number;
        coverImage?: string;
    }>;
    studioSlug: string;
}

export function TopContentList({ posts, studioSlug }: TopContentListProps) {
    const formatNumber = (num: number): string => {
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (posts.length === 0) {
        return (
            <ZenCard className="p-8">
                <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">
                        Aún no hay estadísticas de contenido
                    </p>
                </div>
            </ZenCard>
        );
    }

    return (
        <ZenCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                            Contenido Más Visto
                        </h3>
                    </div>
                    <span className="text-xs text-zinc-500">
                        {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                    </span>
                </div>
            </div>

            <div className="divide-y divide-zinc-800">
                {posts.map((post, index) => (
                    <Link
                        key={post.id}
                        href={`/${studioSlug}?post=${post.slug}`}
                        target="_blank"
                        className="flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors group"
                    >
                        {/* Ranking Badge */}
                        <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                index === 0 ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-yellow-400' :
                                index === 1 ? 'bg-gradient-to-br from-zinc-400/20 to-zinc-600/20 border border-zinc-400/30 text-zinc-300' :
                                index === 2 ? 'bg-gradient-to-br from-orange-400/20 to-orange-600/20 border border-orange-400/30 text-orange-400' :
                                'bg-zinc-800/50 border border-zinc-700 text-zinc-500'
                            }`}>
                                {index + 1}
                            </div>
                        </div>

                        {/* Cover Image */}
                        {post.coverImage && (
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700 group-hover:border-zinc-600 transition-colors">
                                <Image
                                    src={post.coverImage}
                                    alt={post.title || 'Post'}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    unoptimized
                                />
                            </div>
                        )}

                        {/* Content Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors mb-1">
                                {post.title || 'Sin título'}
                            </p>
                            {post.caption && (
                                <p className="text-xs text-zinc-500 truncate mb-2">
                                    {post.caption}
                                </p>
                            )}
                            {/* Stats Row */}
                            <div className="flex items-center gap-4 mt-2">
                                {/* Views */}
                                <div className="flex items-center gap-1.5" title="Vistas">
                                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                                    <span className="text-xs font-medium text-zinc-400">
                                        {formatNumber(post.analyticsViews)}
                                    </span>
                                </div>

                                {/* Clicks */}
                                {(post.analyticsClicks ?? 0) > 0 && (
                                    <div className="flex items-center gap-1.5" title="Clics">
                                        <MousePointerClick className="w-3.5 h-3.5 text-zinc-500" />
                                        <span className="text-xs font-medium text-zinc-400">
                                            {formatNumber(post.analyticsClicks)}
                                        </span>
                                    </div>
                                )}

                                {/* Shares */}
                                {(post.analyticsShares ?? 0) > 0 && (
                                    <div className="flex items-center gap-1.5" title="Compartidos">
                                        <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                                        <span className="text-xs font-medium text-zinc-400">
                                            {formatNumber(post.analyticsShares)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Arrow Indicator */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-2 rounded-lg bg-zinc-800/50">
                                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </ZenCard>
    );
}
