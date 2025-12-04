'use client';

import React from 'react';
import { Home, Folder, Phone, HelpCircle } from 'lucide-react';

interface ProfileNavTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

/**
 * ProfileNavTabs - Componente para navegación de tabs del perfil público
 * Estilo pill buttons con iconos, sin líneas, bg blur
 * 
 * Usado en:
 * - Perfil público (navegación de tabs)
 * - Preview del builder
 */
export function ProfileNavTabs({ activeTab, onTabChange }: ProfileNavTabsProps) {
    const tabs = [
        { id: 'inicio', label: 'Inicio', icon: Home },
        { id: 'portafolio', label: 'Portafolio', icon: Folder },
        { id: 'contacto', label: 'Contacto', icon: Phone },
        { id: 'faq', label: 'FAQ', icon: HelpCircle },
    ];

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg p-2">
            <nav className="flex gap-2">
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
            </nav>
        </div>
    );
}
