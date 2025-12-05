'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Image as ImageIcon, Tag, FileText, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface SearchResult {
    id: string;
    type: 'post' | 'portfolio' | 'offer';
    title: string;
    description?: string | null;
    slug: string;
    thumbnail?: string | null;
    tags?: string[];
}

interface SearchCommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    posts: Array<{
        id: string;
        slug: string;
        title?: string | null;
        caption: string | null;
        tags?: string[];
        media: Array<{
            file_url: string;
            thumbnail_url?: string;
        }>;
    }>;
    portfolios: Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        cover_image_url: string | null;
        category?: string | null;
        tags?: string[];
    }>;
    offers?: Array<{
        id: string;
        name: string;
        description: string | null;
        slug: string;
        cover_media_url: string | null;
    }>;
    onSelectPost: (slug: string) => void;
    onSelectPortfolio: (slug: string) => void;
    onSelectOffer: (slug: string) => void;
}

export function SearchCommandPalette({
    isOpen,
    onClose,
    posts,
    portfolios,
    offers,
    onSelectPost,
    onSelectPortfolio,
    onSelectOffer
}: SearchCommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Indexar todo el contenido
    const allResults = useMemo(() => {
        const results: SearchResult[] = [];

        // Indexar posts
        posts.forEach(post => {
            results.push({
                id: post.id,
                type: 'post',
                title: post.title || 'Post sin título',
                description: post.caption,
                slug: post.slug,
                thumbnail: post.media[0]?.thumbnail_url || post.media[0]?.file_url,
                tags: post.tags,
                action: 'navigate'
            });
        });

        // Indexar portfolios
        portfolios.forEach(portfolio => {
            results.push({
                id: portfolio.id,
                type: 'portfolio',
                title: portfolio.title,
                description: portfolio.description,
                slug: portfolio.slug,
                thumbnail: portfolio.cover_image_url,
                tags: portfolio.tags,
                action: 'navigate'
            });
        });

        // Indexar ofertas
        if (offers) {
            offers.forEach(offer => {
                results.push({
                    id: offer.id,
                    type: 'offer',
                    title: offer.name,
                    description: offer.description,
                    slug: offer.slug,
                    thumbnail: offer.cover_media_url
                });
            });
        }

        return results;
    }, [posts, portfolios, offers]);

    // Filtrar resultados según query
    const filteredResults = useMemo(() => {
        if (!query.trim()) return [];

        const searchLower = query.toLowerCase();

        return allResults.filter(result => {
            const titleMatch = result.title.toLowerCase().includes(searchLower);
            const descMatch = result.description?.toLowerCase().includes(searchLower);
            const tagsMatch = result.tags?.some(tag => tag.toLowerCase().includes(searchLower));

            return titleMatch || descMatch || tagsMatch;
        });
    }, [query, allResults]);

    // Agrupar por tipo
    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {
            post: [],
            portfolio: [],
            offer: []
        };

        filteredResults.forEach(result => {
            if (groups[result.type]) {
                groups[result.type].push(result);
            }
        });

        return groups;
    }, [filteredResults]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredResults.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = filteredResults[selectedIndex];
                if (selected) {
                    handleSelect(selected);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredResults, selectedIndex]);

    // Reset al cerrar
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleSelect = (result: SearchResult) => {
        if (result.type === 'post') {
            onSelectPost(result.slug);
        } else if (result.type === 'portfolio') {
            onSelectPortfolio(result.slug);
        } else if (result.type === 'offer') {
            onSelectOffer(result.slug);
        }
        onClose();
    };

    const getResultIcon = (type: string) => {
        switch (type) {
            case 'post': return <FileText className="w-4 h-4" />;
            case 'portfolio': return <ImageIcon className="w-4 h-4" />;
            case 'offer': return <Tag className="w-4 h-4" />;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'post': return 'Post';
            case 'portfolio': return 'Portfolio';
            case 'offer': return 'Oferta';
            default: return '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                    <Search className="w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar posts, portfolios, ofertas..."
                        className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none text-sm"
                        autoFocus
                    />
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {query.trim() === '' ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            Escribe para buscar en posts, portfolios y ofertas
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            No se encontraron resultados para &quot;{query}&quot;
                        </div>
                    ) : (
                        <div className="py-2">
                            {/* Posts */}
                            {groupedResults.post.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase">
                                        Posts ({groupedResults.post.length})
                                    </div>
                                    {groupedResults.post.map((result, idx) => (
                                        <button
                                            key={result.id}
                                            onClick={() => handleSelect(result)}
                                            className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors ${selectedIndex === filteredResults.indexOf(result)
                                                ? 'bg-zinc-800'
                                                : ''
                                                }`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden shrink-0">
                                                {result.thumbnail ? (
                                                    <Image
                                                        src={result.thumbnail}
                                                        alt={result.title}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {getResultIcon(result.type)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm text-zinc-100 truncate">
                                                    {result.title}
                                                </div>
                                                {result.description && (
                                                    <div className="text-xs text-zinc-500 truncate">
                                                        {result.description}
                                                    </div>
                                                )}
                                            </div>

                                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Portfolios */}
                            {groupedResults.portfolio.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase">
                                        Portfolios ({groupedResults.portfolio.length})
                                    </div>
                                    {groupedResults.portfolio.map((result, idx) => (
                                        <button
                                            key={result.id}
                                            onClick={() => handleSelect(result)}
                                            className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors ${selectedIndex === filteredResults.indexOf(result)
                                                ? 'bg-zinc-800'
                                                : ''
                                                }`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden shrink-0">
                                                {result.thumbnail ? (
                                                    <Image
                                                        src={result.thumbnail}
                                                        alt={result.title}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {getResultIcon(result.type)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm text-zinc-100 truncate">
                                                    {result.title}
                                                </div>
                                                {result.description && (
                                                    <div className="text-xs text-zinc-500 truncate">
                                                        {result.description}
                                                    </div>
                                                )}
                                            </div>

                                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Ofertas */}
                            {groupedResults.offer.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase">
                                        Ofertas ({groupedResults.offer.length})
                                    </div>
                                    {groupedResults.offer.map((result, idx) => (
                                        <button
                                            key={result.id}
                                            onClick={() => handleSelect(result)}
                                            className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors ${selectedIndex === filteredResults.indexOf(result)
                                                ? 'bg-zinc-800'
                                                : ''
                                                }`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden shrink-0">
                                                {result.thumbnail ? (
                                                    <Image
                                                        src={result.thumbnail}
                                                        alt={result.title}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {getResultIcon(result.type)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm text-zinc-100 truncate">
                                                    {result.title}
                                                </div>
                                                {result.description && (
                                                    <div className="text-xs text-zinc-500 truncate">
                                                        {result.description}
                                                    </div>
                                                )}
                                            </div>

                                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Contacto */}
                            {groupedResults.contact.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase">
                                        Contacto ({groupedResults.contact.length})
                                    </div>
                                    {groupedResults.contact.map((result, idx) => (
                                        <button
                                            key={result.id}
                                            onClick={() => handleSelect(result)}
                                            className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors ${selectedIndex === filteredResults.indexOf(result)
                                                ? 'bg-zinc-800'
                                                : ''
                                                }`}
                                        >
                                            {/* Icon */}
                                            <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden shrink-0 flex items-center justify-center">
                                                {getResultIcon(result.type)}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm text-zinc-100 truncate">
                                                    {result.title}
                                                </div>
                                                {result.description && (
                                                    <div className="text-xs text-zinc-500 truncate">
                                                        {result.description}
                                                    </div>
                                                )}
                                            </div>

                                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">↓</kbd>
                            navegar
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">Enter</kbd>
                            seleccionar
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">Esc</kbd>
                        cerrar
                    </span>
                </div>
            </div>
        </div>
    );
}
