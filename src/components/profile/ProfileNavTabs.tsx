'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Home, Folder, Phone, HelpCircle, Search, Archive, Image, Video, Plus } from 'lucide-react';

interface ProfileNavTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onSearchClick?: () => void;
    hasActiveFAQs?: boolean; // Si hay FAQs activas para mostrar
    isOwner?: boolean; // Si el usuario es el dueño del estudio
    onCreatePost?: () => void; // Callback para crear post (solo en inicio)
}

/**
 * ProfileNavTabs - Componente para navegación de tabs del perfil público
 * Estilo pill buttons con iconos, sin líneas, bg blur
 * Scroll horizontal invisible con centrado automático del botón activo
 * 
 * Usado en:
 * - Perfil público (navegación de tabs)
 * - Preview del builder
 */
export function ProfileNavTabs({ activeTab, onTabChange, onSearchClick, hasActiveFAQs = false, isOwner = false, onCreatePost }: ProfileNavTabsProps) {
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Record<string, HTMLButtonElement>>({});
    
    // Estado para evitar mismatch de hidratación: inicializar con valores "seguros" (sin tabs condicionales)
    // y actualizar después de la hidratación
    const [mounted, setMounted] = useState(false);
    const [effectiveIsOwner, setEffectiveIsOwner] = useState(false);
    const [effectiveHasActiveFAQs, setEffectiveHasActiveFAQs] = useState(hasActiveFAQs);

    // Después de la hidratación, actualizar los valores reales
    useEffect(() => {
        setMounted(true);
        setEffectiveIsOwner(isOwner);
        setEffectiveHasActiveFAQs(hasActiveFAQs);
    }, [isOwner, hasActiveFAQs]);

    // Construir tabs de manera determinística (sin mutaciones)
    const isInicioSection = activeTab === 'inicio' || activeTab === 'inicio-fotos' || activeTab === 'inicio-videos';
    
    const tabs = useMemo(() => {
        const tabsList: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
            { id: 'inicio', label: 'Inicio', icon: Home },
        ];

        // Agregar tabs de filtro solo cuando estamos en "inicio"
        if (isInicioSection) {
            tabsList.push(
                { id: 'inicio-fotos', label: 'Fotos', icon: Image },
                { id: 'inicio-videos', label: 'Videos', icon: Video }
            );
        }

        tabsList.push(
            { id: 'portafolio', label: 'Portafolio', icon: Folder },
            { id: 'contacto', label: 'Contacto', icon: Phone }
        );

        // Agregar tab FAQ solo después de la hidratación para evitar mismatch
        // - Si es owner: siempre mostrar (puede gestionar FAQs)
        // - Si es público: solo mostrar si hay FAQs activas
        if (mounted && (effectiveIsOwner || effectiveHasActiveFAQs)) {
            tabsList.push({ id: 'faq', label: 'FAQ', icon: HelpCircle });
        }

        // Agregar tab "Archivados" solo si el usuario es el owner (después de hidratación)
        if (mounted && effectiveIsOwner) {
            tabsList.push({ id: 'archivados', label: 'Archivados', icon: Archive });
        }

        return tabsList;
    }, [isInicioSection, mounted, effectiveIsOwner, effectiveHasActiveFAQs]);


    // Centrar botón activo cuando cambia el tab
    useEffect(() => {
        if (activeTab && buttonRefs.current[activeTab] && tabsContainerRef.current) {
            const button = buttonRefs.current[activeTab];
            const container = tabsContainerRef.current;

            // Calcular posición para centrar
            const buttonRect = button.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scrollLeft = container.scrollLeft;
            const buttonLeft = button.offsetLeft;
            const buttonWidth = button.offsetWidth;
            const containerWidth = container.offsetWidth;

            // Centrar el botón en el contenedor
            const targetScroll = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);

            container.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    }, [activeTab]);

    const handleTabClick = (tabId: string) => {
        onTabChange(tabId);
    };

    return (
        <div className="p-2">
            <nav className="flex items-center justify-between gap-2 relative">
                {/* Contenedor de tabs con gradiente */}
                <div className="flex-1 relative min-w-0">
                    {/* Tabs con scroll horizontal invisible */}
                    <div
                        ref={tabsContainerRef}
                        className="flex gap-2.5 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        suppressHydrationWarning
                    >
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    ref={(el) => {
                                        if (el) {
                                            buttonRefs.current[tab.id] = el;
                                        } else {
                                            delete buttonRefs.current[tab.id];
                                        }
                                    }}
                                    onClick={() => handleTabClick(tab.id)}
                                    className={`
                                        flex items-center gap-2 rounded-full text-xs font-medium
                                        transition-all duration-200 shrink-0 whitespace-nowrap
                                        ${isActive
                                            ? 'bg-zinc-800/80 text-zinc-300 backdrop-blur-lg px-4 py-2 lg:py-2.5'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 px-3 py-2 lg:px-3.5 lg:py-2.5'
                                        }
                                    `}
                                >
                                    <Icon className="h-4 w-4" />
                                    {isActive ? <span>{tab.label}</span> : null}
                                </button>
                            );
                        })}
                    </div>

                    {/* Gradiente antes del botón de búsqueda - permite ver el fondo del menú */}
                    {onSearchClick && (
                        <div className="absolute right-0 top-0 bottom-0 w-6 bg-linear-to-l from-zinc-800/40 to-transparent pointer-events-none z-10" style={{ background: 'linear-gradient(to left, rgb(24 24 27 / 0.5) 0%, transparent 100%)' }} />
                    )}
                </div>

                {/* Search Button */}
                {onSearchClick && (
                    <button
                        onClick={onSearchClick}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all duration-200 shrink-0 relative z-20"
                        aria-label="Buscar"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline text-[10px] text-zinc-600">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[10px]">⌘K</kbd>
                        </span>
                    </button>
                )}

                {/* Create Post Button - Solo si es owner y está en inicio */}
                {mounted && effectiveIsOwner && onCreatePost && (activeTab === 'inicio' || activeTab === 'inicio-fotos' || activeTab === 'inicio-videos') && (
                    <button
                        onClick={onCreatePost}
                        className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-full text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 hover:border-emerald-600/50 transition-all duration-200 shrink-0 relative z-20"
                        aria-label="Crear post"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Crear</span>
                    </button>
                )}
            </nav>
        </div>
    );
}
