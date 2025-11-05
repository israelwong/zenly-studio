'use client';

import React from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';

interface ProfileHeaderProps {
    data?: {
        studio_name?: string;
        slogan?: string | null;
        logo_url?: string | null;
    };
    loading?: boolean;
}

/**
 * ProfileHeader - Componente reutilizable para header del perfil del estudio
 * Muestra logo, nombre del estudio y slogan en formato sticky
 * 
 * Usado en:
 * - Builder preview (header sticky)
 * - Perfil público (header completo)
 */
export function ProfileHeader({ data, loading = false }: ProfileHeaderProps) {
    const studioData = data || {};

    // Solo mostrar header si hay datos reales o está cargando
    const hasData = studioData.studio_name || studioData.logo_url || loading;

    if (!hasData) {
        return null;
    }

    return (
        <div className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur-lg w-full px-4 py-8">
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

                {/* Columna 2: Icono de promoción (más delgada) */}
                <div className="flex justify-end w-12">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <Star className="h-3 w-3 text-yellow-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
