'use client';

import React from 'react';
import { Home, Folder, Phone, HelpCircle, Search, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileNavTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onSearchClick?: () => void;
}

/**
 * ProfileNavTabs - Componente para navegación de tabs del perfil público
 * Estilo pill buttons con iconos, sin líneas, bg blur
 * 
 * Usado en:
 * - Perfil público (navegación de tabs)
 * - Preview del builder
 */
export function ProfileNavTabs({ activeTab, onTabChange, onSearchClick }: ProfileNavTabsProps) {
    const { user } = useAuth();

    const baseTabs = [
        { id: 'inicio', label: 'Inicio', icon: Home },
        { id: 'portafolio', label: 'Portafolio', icon: Folder },
        { id: 'contacto', label: 'Contacto', icon: Phone },
        { id: 'faq', label: 'FAQ', icon: HelpCircle },
    ];

    // Agregar tab "Archivados" solo si usuario autenticado
    const tabs = user
        ? [...baseTabs, { id: 'archivados', label: 'Archivados', icon: Archive }]
        : baseTabs;

    return (
        <div className="p-2">
            <nav className="flex items-center justify-between gap-2">
                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium
                                    transition-all duration-200
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all duration-200"
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
