'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, TrendingUp } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

interface TopContentListProps {
    posts: Array<{
        id: string;
        slug: string;
        title: string | null;
        caption: string | null;
        analyticsViews: number;
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
        <ZenCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">
                    Contenido Más Visto
                </h3>
            </div>

            <div className="space-y-3">
                {posts.map((post, index) => (
                    <Link
                        key={post.id}
                        href={`/${studioSlug}?post=${post.slug}`}
                        target="_blank"
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                    >
                        {/* Ranking */}
                        <div className="flex-shrink-0 w-6 text-center">
                            <span className={`text-sm font-bold ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-zinc-300' :
                                index === 2 ? 'text-orange-400' :
                                'text-zinc-500'
                            }`}>
                                #{index + 1}
                            </span>
                        </div>

                        {/* Cover Image */}
                        {post.coverImage && (
                            <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800">
                                <Image
                                    src={post.coverImage}
                                    alt={post.title || 'Post'}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                        )}

                        {/* Content Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                                {post.title || 'Sin título'}
                            </p>
                            {post.caption && (
                                <p className="text-xs text-zinc-500 truncate mt-0.5">
                                    {post.caption}
                                </p>
                            )}
                        </div>

                        {/* Views */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Eye className="w-4 h-4 text-zinc-500" />
                            <span className="text-sm font-medium text-zinc-300">
                                {formatNumber(post.analyticsViews)}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </ZenCard>
    );
}
