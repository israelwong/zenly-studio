'use client';

import React from 'react';
import {
    ZenSidebar, ZenSidebarContent, ZenSidebarFooter, ZenSidebarMenu,
    ZenSidebarMenuItem, ZenButton, useZenSidebar
} from '@/components/ui/zen';
import { SidebarHeader } from '@/components/shared/sidebar';
import { ActiveLink } from '@/app/[slug]/studio/components/ActiveLink';
import { LogoutButton } from '@/components/auth/logout-button';
import {
    Camera, X, Newspaper, Grid3X3, HelpCircle, Star, Share2, Phone, Calendar,
    Navigation, MapPin, ChevronDown, ChevronRight
} from 'lucide-react';

interface ProfileEditorSidebarProps {
    className?: string;
    studioSlug: string;
}

export function ProfileEditorSidebar({ className, studioSlug }: ProfileEditorSidebarProps) {
    const { isOpen, toggleSidebar } = useZenSidebar();
    const [expandedGroup, setExpandedGroup] = React.useState<string | null>('content'); // Expandir 'content' por defecto

    const toggleGroup = (groupId: string) => {
        setExpandedGroup(prev => prev === groupId ? null : groupId);
    };

    const navItems = [
        {
            id: 'content',
            title: 'Contenido',
            icon: Camera,
            items: [
                { id: 'posts', name: 'Posts', href: `/profile/edit/content/posts`, icon: Newspaper },
                { id: 'portfolios', name: 'Portafolios', href: `/profile/edit/content/portfolios`, icon: Grid3X3 },
                { id: 'faq', name: 'FAQ', href: `/profile/edit/content/faq`, icon: HelpCircle },
            ],
        },
        {
            id: 'settings',
            title: 'Configuración',
            icon: Star,
            items: [
                { id: 'identity', name: 'Identidad', href: `/profile/edit/settings/identity`, icon: Star },
                { id: 'social', name: 'Redes Sociales', href: `/profile/edit/settings/social`, icon: Share2 },
                { id: 'contact', name: 'Contacto', href: `/profile/edit/settings/contact/telefonos`, icon: Phone },
                { id: 'zones', name: 'Zonas de Trabajo', href: `/profile/edit/settings/zones`, icon: MapPin },
            ],
        },
    ];

    const CollapsibleGroup = ({ group, children }: {
        group: { id: string; title: string; icon: React.ComponentType<{ className?: string }> },
        children: React.ReactNode
    }) => {
        const isExpanded = expandedGroup === group.id;

        return (
            <div className="mb-3">
                <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-all duration-200 rounded-md"
                >
                    <div className="flex items-center gap-3">
                        <group.icon className="w-5 h-5 text-zinc-400" />
                        <span className="text-zinc-200">{group.title}</span>
                    </div>
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                </button>

                {isExpanded && (
                    <div className="relative">
                        <div className="absolute left-6 top-0 w-px h-full bg-zinc-700/60"></div>
                        <div className="pl-8 space-y-0.5">
                            {children}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Datos mock para el studio (similar a StudioSidebar)
    const studio = {
        id: 'temp-id',
        studio_name: 'Mi Estudio',
        slug: studioSlug
    };

    return (
        <ZenSidebar className={`${className} ${isOpen ? '' : 'hidden lg:block'}`}>
            <SidebarHeader studioData={studio} onToggleSidebar={toggleSidebar} />

            <ZenSidebarContent className="px-4">
                <ZenSidebarMenu>
                    {navItems.map(group => (
                        <CollapsibleGroup key={group.id} group={group}>
                            {group.items.map(item => (
                                <ZenSidebarMenuItem key={item.id}>
                                    <ActiveLink href={`/${studioSlug}${item.href}`}>
                                        <item.icon className="w-4 h-4" />
                                        <span>{item.name}</span>
                                    </ActiveLink>
                                </ZenSidebarMenuItem>
                            ))}
                        </CollapsibleGroup>
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

