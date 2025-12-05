'use client';

import React from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PublicProfileEditButton } from './PublicProfileEditButton';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileHeaderProps {
    data?: {
        studio_name?: string;
        slogan?: string | null;
        logo_url?: string | null;
    };
    loading?: boolean;
    studioSlug?: string;
    showEditButton?: boolean; // Control para mostrar botón editar
}

/**
 * ProfileHeader - Componente reutilizable para header del perfil del estudio
 * Muestra logo, nombre del estudio y slogan en formato sticky
 * 
 * Usado en:
 * - Builder preview (header sticky)
 * - Perfil público (header completo)
 */
export function ProfileHeader({ data, loading = false, studioSlug, showEditButton = true }: ProfileHeaderProps) {
    const router = useRouter();
    const { user } = useAuth();
    const studioData = data || {};

    // Solo mostrar header si hay datos reales o está cargando
    const hasData = studioData.studio_name || studioData.logo_url || loading;

    if (!hasData) {
        return null;
    }

    const handleNewPost = () => {
        if (studioSlug) {
            router.push(`/${studioSlug}/profile/edit/content/posts/nuevo`);
        }
    };

    const handleNewPortfolio = () => {
        if (studioSlug) {
            router.push(`/${studioSlug}/profile/edit/content/portfolios/nuevo`);
        }
    };

    return (
        <div className="sticky top-0 z-10 bg-zinc-900/50 backdrop-blur-lg w-full">
            <div className="w-full mx-auto max-w-[920px] px-4 py-5">
                <div className="flex items-center">
                    {/* Columna 1: Logo, nombre y slogan */}
                    <div className="flex items-center space-x-3 flex-1">
                        {/* Logo/Avatar */}
                        <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {loading ? (
                                <div className="w-6 h-6 bg-zinc-600 rounded-lg animate-pulse"></div>
                            ) : studioData.logo_url ? (
                                <Image
                                    src={studioData.logo_url}
                                    alt="Logo"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-6 h-6 bg-zinc-500 rounded-lg"></div>
                            )}
                        </div>

                        {/* Información del estudio */}
                        <div className="flex-1">
                            {loading ? (
                                <>
                                    <div className="h-4 bg-zinc-700 rounded animate-pulse mb-2 w-32"></div>
                                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-24"></div>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-white font-semibold text-sm">
                                        {studioData.studio_name}
                                    </h1>
                                    {studioData.slogan && (
                                        <p className="text-zinc-400 text-xs">
                                            {studioData.slogan}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Columna 2: Quick Actions + Botón Editar */}
                    <div className="flex items-center gap-2">
                        {/* Quick Actions - Solo si está autenticado */}
                        {user && studioSlug && (
                            <>
                                {/* Desktop: Botones separados */}
                                <div className="hidden sm:flex items-center gap-2">
                                    <button
                                        onClick={handleNewPost}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                        aria-label="Crear post"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Post
                                    </button>
                                    <button
                                        onClick={handleNewPortfolio}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                                        aria-label="Crear portfolio"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Portfolio
                                    </button>
                                </div>

                                {/* Mobile: Solo FAB flotante (se mantiene en QuickActions) */}
                            </>
                        )}

                        {/* Botón Editar */}
                        {showEditButton && studioSlug && <PublicProfileEditButton studioSlug={studioSlug} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
