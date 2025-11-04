'use client';

import React from 'react';
import { Home, Grid3X3, Phone, Package } from 'lucide-react';

interface ProfileNavTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

/**
 * ProfileNavTabs - Componente para navegación de tabs del perfil público
 * Homologado con ProfileNavigation para consistencia
 * 
 * Usado en:
 * - Perfil público (navegación de tabs con iconos)
 */
export function ProfileNavTabs({ activeTab, onTabChange }: ProfileNavTabsProps) {
    const tabs = [
        {
            id: 'inicio',
            label: 'Inicio',
            icon: Home,
        },
        {
            id: 'portafolio',
            label: 'Portafolio',
            icon: Grid3X3,
        },
        {
            id: 'paquetes',
            label: 'Paquetes',
            icon: Package,
        },
        {
            id: 'contacto',
            label: 'Contacto',
            icon: Phone,
        },
    ];

    return (
        <div className="border-b border-zinc-800">
            <nav className="flex">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 text-sm font-medium
                transition-colors duration-200
                ${isActive
                                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5'
                                    : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                                }
              `}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
