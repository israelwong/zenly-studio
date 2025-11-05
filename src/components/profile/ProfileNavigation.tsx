'use client';

import React from 'react';
import { Home, Grid3X3, Phone, Package, HelpCircle } from 'lucide-react';

interface ProfileNavigationProps {
    activeSection?: string;
}

/**
 * ProfileNavigation - Componente para navegación de preview del builder
 * Homologado con ProfileNavTabs para consistencia
 * 
 * Usado en:
 * - Builder preview (navegación de secciones)
 */
export function ProfileNavigation({ activeSection }: ProfileNavigationProps) {
    const navItems = [
        { id: 'inicio', label: 'Inicio', icon: Home },
        { id: 'portafolio', label: 'Portafolio', icon: Grid3X3 },
        { id: 'paquetes', label: 'Paquetes', icon: Package },
        { id: 'contacto', label: 'Contacto', icon: Phone },
        { id: 'faq', label: 'FAQ', icon: HelpCircle }
    ];

    return (
        <div className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-lg">
            <nav className="flex">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    return (
                        <div key={item.id} className={`
                            flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 text-sm font-medium
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
    );
}
