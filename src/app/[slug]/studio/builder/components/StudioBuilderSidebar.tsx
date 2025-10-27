'use client';

import React from 'react';
import {
    ZenSidebar, ZenSidebarContent, ZenSidebarHeader, ZenSidebarFooter, ZenSidebarMenu,
    ZenSidebarMenuItem, ZenButton, useZenSidebar
} from '@/components/ui/zen';
import { StudioHeaderModal } from '../../components/StudioHeaderModal';
import { ActiveLink } from '../../components/ActiveLink';
import { LogoutButton } from '@/components/auth/logout-button';
import {
    Star, Phone, Zap, Camera, X, Home, CreditCard, File, User, Grid3X3, Store, Package, Calendar,
    Newspaper,
} from 'lucide-react';

interface StudioBuilderSidebarProps {
    className?: string;
    studioSlug: string;
}

export function StudioBuilderSidebar({ className, studioSlug }: StudioBuilderSidebarProps) {
    console.log('🔍 StudioBuilderSidebar - studioSlug recibido:', studioSlug);
    const { isOpen, toggleSidebar } = useZenSidebar();

    // Datos mock para el sidebar (en una implementación real, estos vendrían de props o context)
    const studio = {
        id: 'temp-id',
        studio_name: 'Mi Estudio',
        slug: studioSlug
    };

    // Configuración de navegación específica para Studio Builder con títulos de sección
    const builderNavItems = [
        {
            id: 'identidad',
            title: 'Brand',
            icon: Star,
            items: [
                { id: 'identidad', name: 'Identidad', href: `/identidad`, icon: Star },
            ],
        },
        {
            id: 'tabs',
            title: 'Navegación Pública',
            icon: Camera,
            items: [
                { id: 'inicio', name: 'Inicio*', href: `/inicio`, icon: Home },
                { id: 'portafolio', name: 'Portafolio*', href: `/portafolio`, icon: Grid3X3 },
                { id: 'posts', name: 'Publicaciones', href: `/posts`, icon: Newspaper },
                { id: 'catalogo', name: 'Catálogo', href: `/catalogo`, icon: Store },
                { id: 'paquetes', name: 'Paquetes', href: `/paquetes`, icon: Package },
                { id: 'contacto', name: 'Contacto', href: `/contacto`, icon: Phone },
            ],
        },
        {
            id: 'addons',
            title: 'Navegación Privada',
            icon: Zap,
            items: [
                { id: 'agendamiento', name: 'Agendamiento*', href: `/agendamiento`, icon: Calendar },
                { id: 'pagos', name: 'Pagos*', href: `/pagos`, icon: CreditCard },
                { id: 'cotizaciones', name: 'Cotizaciones*', href: `/cotizaciones`, icon: File },
                { id: 'portal-cliente', name: 'Portal cliente*', href: `/portal-cliente`, icon: User },
            ],
        },
    ];

    return (
        <ZenSidebar className={`${className} ${isOpen ? '' : 'hidden lg:block'}`}>
            <ZenSidebarHeader>
                <div className="flex items-center justify-between">
                    <StudioHeaderModal studioData={studio} />
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 text-zinc-400 hover:text-zinc-200"
                    >
                        <X className="h-4 w-4" />
                    </ZenButton>
                </div>
            </ZenSidebarHeader>

            <ZenSidebarContent className="px-4">
                <ZenSidebarMenu>
                    {/* Sección Studio Builder */}
                    <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Studio Builder</div>

                    {builderNavItems.map(group => (
                        <div key={group.id}>
                            {/* Título de sección como separador */}
                            <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 mb-2">
                                {group.title}
                            </div>

                            {group.items.map(item => (
                                <ZenSidebarMenuItem key={item.id}>
                                    <ActiveLink href={`/${studioSlug}/studio/builder${item.href}`}>
                                        <item.icon className="w-4 h-4" />
                                        <span>{item.name}</span>
                                    </ActiveLink>
                                </ZenSidebarMenuItem>
                            ))}
                        </div>
                    ))}
                </ZenSidebarMenu>
            </ZenSidebarContent>

            <ZenSidebarFooter>
                <ZenSidebarMenu>
                    <ZenSidebarMenuItem>
                        <LogoutButton />
                    </ZenSidebarMenuItem>
                </ZenSidebarMenu>
            </ZenSidebarFooter>
        </ZenSidebar>
    );
}
