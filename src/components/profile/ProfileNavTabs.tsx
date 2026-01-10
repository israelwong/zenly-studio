'use client';

import React, { useRef, useEffect } from 'react';
import { Home, Folder, Phone, HelpCircle, Search, Archive, Image, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileNavTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onSearchClick?: () => void;
    hasActiveFAQs?: boolean; // Si hay FAQs activas para mostrar
    isOwner?: boolean; // Si el usuario es el dueño del estudio
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
export function ProfileNavTabs({ activeTab, onTabChange, onSearchClick, hasActiveFAQs = false, isOwner = false }: ProfileNavTabsProps) {
    const { user } = useAuth();
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Record<string, HTMLButtonElement>>({});

    const baseTabs = [
        { id: 'inicio', label: 'Inicio', icon: Home },
        { id: 'portafolio', label: 'Portafolio', icon: Folder },
        { id: 'contacto', label: 'Contacto', icon: Phone },
    ];

    // Agregar tabs de filtro solo cuando estamos en "inicio"
    const isInicioSection = activeTab === 'inicio' || activeTab === 'inicio-fotos' || activeTab === 'inicio-videos';
    if (isInicioSection) {
        baseTabs.splice(1, 0, 
            { id: 'inicio-fotos', label: 'Fotos', icon: Image },
            { id: 'inicio-videos', label: 'Videos', icon: Video }
        );
    }

    // Agregar tab FAQ si hay FAQs activas o si hay usuario autenticado
    if (hasActiveFAQs || user) {
        baseTabs.push({ id: 'faq', label: 'FAQ', icon: HelpCircle });
    }

    // Agregar tab "Archivados" solo si el usuario es el owner (no solo autenticado)
    const tabs = isOwner
        ? [...baseTabs, { id: 'archivados', label: 'Archivados', icon: Archive }]
        : baseTabs;

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
            <nav className="flex items-center justify-between gap-2">
                {/* Tabs con scroll horizontal invisible */}
                <div
                    ref={tabsContainerRef}
                    className="flex gap-2 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1"
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
                                    }
                                }}
                                onClick={() => handleTabClick(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium
                                    transition-all duration-200 shrink-0 whitespace-nowrap
                                    ${isActive
                                        ? 'bg-zinc-800/80 text-zinc-300 backdrop-blur-lg'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                    }
                                `}
                            >
                                <Icon className="h-4 w-4" />
                                {isActive && <span>{tab.label}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Search Button */}
                {onSearchClick && (
                    <button
                        onClick={onSearchClick}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all duration-200 shrink-0"
                        aria-label="Buscar"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline text-[10px] text-zinc-600">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[10px]">⌘K</kbd>
                        </span>
                    </button>
                )}
            </nav>
        </div>
    );
}
