'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Home, Grid3X3, Phone } from 'lucide-react';

interface ProfileHeaderProps {
    data?: {
        studio_name?: string;
        slogan?: string | null;
        logo_url?: string | null;
    };
    loading?: boolean;
    activeSection?: string;
    // Opciones para controlar el comportamiento de scroll
    scrollContainer?: HTMLElement | null;
    scrollThreshold?: number;
    forceCompact?: boolean;
}

/**
 * ProfileHeader - Componente unificado para header del perfil
 * Maneja transición fluida entre estado inicial (centrado) y compacto (horizontal)
 * 
 * Estados:
 * - Inicial: Logo centrado, nombre y slogan debajo, navegación completa
 * - Compacto: Logo + nombre + slogan horizontal, navegación solo iconos
 */
export function ProfileHeader({
    data,
    loading = false,
    activeSection,
    scrollContainer,
    scrollThreshold = 100,
    forceCompact = false
}: ProfileHeaderProps) {
    const [isCompact, setIsCompact] = useState(forceCompact);
    const studioData = data || {};

    // Detectar scroll con throttling agresivo para evitar loops
    useEffect(() => {
        let lastScrollY = 0;
        let ticking = false;

        const handleScroll = () => {
            if (ticking) return;

            ticking = true;
            requestAnimationFrame(() => {
                let scrollY = 0;

                if (scrollContainer) {
                    scrollY = scrollContainer.scrollTop;
                } else {
                    scrollY = window.scrollY;
                }

                // Solo cambiar estado si hay diferencia significativa
                const scrollDiff = Math.abs(scrollY - lastScrollY);
                if (scrollDiff < 5) {
                    ticking = false;
                    return;
                }

                const shouldBeCompact = scrollY > scrollThreshold;

                // Actualizar estado solo si realmente cambia
                setIsCompact(prev => {
                    if (prev !== shouldBeCompact) {
                        lastScrollY = scrollY;
                        return shouldBeCompact;
                    }
                    return prev;
                });

                ticking = false;
            });
        };

        const target = scrollContainer || window;
        target.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            target.removeEventListener('scroll', handleScroll);
        };
    }, [scrollContainer, scrollThreshold]);

    // Forzar estado compacto si se especifica
    useEffect(() => {
        if (forceCompact !== undefined) {
            setIsCompact(forceCompact);
        }
    }, [forceCompact]);

    // Solo mostrar header si hay datos reales o está cargando
    const hasData = studioData.studio_name || studioData.logo_url || loading;

    if (!hasData) {
        return null;
    }

    const navItems = [
        { id: 'inicio', label: 'Inicio', icon: Home },
        { id: 'portafolio', label: 'Portafolio', icon: Grid3X3 },
        { id: 'contacto', label: 'Contacto', icon: Phone }
    ];

    return (
        <>
            {/* Header Normal - Se oculta con scroll down */}
            <div className={`bg-zinc-900/80 backdrop-blur-md w-full px-4 transition-all duration-300 ease-in-out ${isCompact ? 'transform -translate-y-full opacity-0' : 'transform translate-y-0 opacity-100'
                }`}>
                <div className="flex flex-col items-center space-y-1 pt-2">
                    {/* Logo centrado */}
                    <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {loading ? (
                            <div className="w-8 h-8 bg-zinc-600 rounded-lg animate-pulse"></div>
                        ) : studioData.logo_url ? (
                            <Image
                                src={studioData.logo_url}
                                alt="Logo"
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-zinc-500 rounded-lg"></div>
                        )}
                    </div>

                    {/* Info centrada */}
                    <div className="text-center">
                        {loading ? (
                            <>
                                <div className="h-5 bg-zinc-700 rounded animate-pulse mb-2 w-40 mx-auto"></div>
                                <div className="h-4 bg-zinc-700 rounded animate-pulse w-32 mx-auto"></div>
                            </>
                        ) : (
                            <>
                                <h1 className="text-white font-semibold text-xl mb-1">
                                    {studioData.studio_name}
                                </h1>
                                {studioData.slogan && (
                                    <p className="text-zinc-400 text-sm">
                                        {studioData.slogan}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Navegación completa */}
                    <nav className="flex w-full border-t border-zinc-800">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.id;

                            return (
                                <div key={item.id} className={`
                                    flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 text-sm font-medium
                                    transition-colors duration-200
                                    ${isActive
                                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5'
                                        : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                                    }
                                `}>
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs">{item.label}</span>
                                </div>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Header Compacto - Se revela con scroll down */}
            <div className={`sticky top-0 z-10 bg-zinc-900/60 backdrop-blur-xl w-full transition-all duration-300 ease-in-out ${isCompact ? 'transform translate-y-0 opacity-100' : 'transform -translate-y-full opacity-0'
                }`}>
                {/* Línea 1: Logo + Info */}
                <div className="flex items-center px-4 py-2">
                    {/* Columna 1: Logo */}
                    <div className="flex-shrink-0 mr-3">
                        <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden">
                            {loading ? (
                                <div className="w-5 h-5 bg-zinc-600 rounded-lg animate-pulse"></div>
                            ) : studioData.logo_url ? (
                                <Image
                                    src={studioData.logo_url}
                                    alt="Logo"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-5 h-5 bg-zinc-500 rounded-lg"></div>
                            )}
                        </div>
                    </div>

                    {/* Columna 2: Nombre + Slogan */}
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <>
                                <div className="h-4 bg-zinc-700 rounded animate-pulse mb-1 w-32"></div>
                                <div className="h-3 bg-zinc-700 rounded animate-pulse w-40"></div>
                            </>
                        ) : (
                            <>
                                <h1 className="text-white font-semibold text-sm truncate">
                                    {studioData.studio_name}
                                </h1>
                                {studioData.slogan && (
                                    <p className="text-zinc-400 text-xs truncate">
                                        {studioData.slogan}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Línea 2: Menu compacto solo iconos */}
                <div className="border-t border-zinc-800/50">
                    <nav className="flex items-center justify-center px-4 py-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.id;

                            return (
                                <button
                                    key={item.id}
                                    className={`p-3 rounded-lg transition-colors duration-200 ${isActive
                                        ? 'text-blue-400 bg-blue-400/10'
                                        : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </>
    );
}