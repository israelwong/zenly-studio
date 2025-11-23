'use client';

import React from 'react';
import Link from 'next/link';
import {
    ZenSidebar, ZenSidebarContent, ZenSidebarFooter, ZenSidebarMenu,
    ZenSidebarMenuItem, useZenSidebar
} from '@/components/ui/zen';
import { SidebarHeader } from '@/components/shared/sidebar';
import { ActiveLink } from './ActiveLink';
import { LogoutButton } from '@/components/auth/logout-button';
import { useStudioData } from '@/hooks/useStudioData';
import {
    Camera, CreditCard, File, Store, Package,
    Briefcase, Users, Sparkles, Mail, ImageIcon, FileText, UserCheck,
    ChevronDown, ChevronRight, UserCog, DollarSign, ShoppingCart, MessageSquare
} from 'lucide-react';

interface StudioSidebarProps {
    className?: string;
    studioSlug: string;
}

export function StudioSidebar({ className, studioSlug }: StudioSidebarProps) {
    const { isOpen, toggleSidebar } = useZenSidebar();

    // Estado para grupo expandido (solo uno a la vez) - Ninguno expandido por defecto
    const [expandedGroup, setExpandedGroup] = React.useState<string | null>(null);

    // Función para toggle de grupos (solo uno expandido)
    const toggleGroup = (groupId: string) => {
        setExpandedGroup(prev => prev === groupId ? null : groupId);
    };

    // Obtener datos del studio desde la base de datos
    const { identidadData, loading } = useStudioData({ studioSlug });

    // Preparar datos del studio para SidebarHeader
    const studio = identidadData ? {
        id: identidadData.id,
        studio_name: identidadData.studio_name,
        slug: identidadData.slug
    } : {
        id: '',
        studio_name: 'Cargando...',
        slug: studioSlug
    };

    // Configuración de navegación modular según Plan Maestro ZEN
    // Nota: Profile y Content ahora están en /profile/edit/ con su propio sidebar
    const builderNavItems = [

        // 5. COMERCIAL (Pago - Plan Pro+)
        {
            id: 'comercial',
            title: 'Commercial',
            icon: ShoppingCart,
            items: [
                { id: 'conversations', name: 'Conversations', href: `/commercial/conversations`, icon: MessageSquare },
                { id: 'promises', name: 'Promesas', href: `/commercial/promises`, icon: File },
                { id: 'catalogo', name: 'Catalog', href: `/commercial/catalogo`, icon: Store },
                { id: 'paquetes', name: 'Packages', href: `/commercial/paquetes`, icon: Package },
            ],
        },

        // 4. BUSINESS (Pago - Plan Pro+)
        {
            id: 'business',
            title: 'Business',
            icon: Briefcase,
            items: [
                { id: 'events', name: 'Events', href: `/business/events`, icon: FileText },
                { id: 'payments', name: 'Pagos', href: `/business/pagos`, icon: CreditCard },
                { id: 'finanzas', name: 'Finanzas', href: `/business/finanzas`, icon: DollarSign },
                { id: 'personal', name: 'Personal', href: `/business/personal`, icon: UserCog },
                { id: 'contratos', name: 'Contratos', href: `/business/contratos`, icon: FileText },
            ],
        },

        // 6. CLIENTS (Pago - Monetización)
        {
            id: 'clients',
            title: 'Clients',
            icon: Users,
            items: [
                { id: 'planning', name: 'Planning', href: `/business/planning`, icon: FileText },
                { id: 'invitations', name: 'Invitaciones', href: `/invitations`, icon: Mail },
                { id: 'galleries', name: 'Galerías', href: `/galleries`, icon: ImageIcon },
                { id: 'portal', name: 'Portal Cliente*', href: `/portal-cliente`, icon: UserCheck },
            ],
        },

        // 7. MAGIC (IA - Multiplicador)
        {
            id: 'magic',
            title: 'Magic',
            icon: Sparkles,
            items: [
                { id: 'magic', name: 'Asistente IA', href: `/magic`, icon: Sparkles },
            ],
        },

    ];

    // Componente para grupo colapsible con estructura de árbol
    const CollapsibleGroup = ({ group, children }: {
        group: { id: string; title: string; icon: React.ComponentType<{ className?: string }> },
        children: React.ReactNode
    }) => {
        const isExpanded = expandedGroup === group.id;

        return (
            <div className="mb-3">
                {/* Header del grupo colapsible */}
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

                {/* Contenido del grupo con estructura de árbol */}
                {isExpanded && (
                    <div className="relative">
                        {/* Línea vertical conectora */}
                        <div className="absolute left-6 top-0 w-px h-full bg-zinc-700/60"></div>

                        {/* Elementos del menú con indentación y menos espaciado */}
                        <div className="pl-8 space-y-0.5">
                            {children}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <ZenSidebar className={`${className} ${isOpen ? '' : 'hidden lg:block'}`}>
            
            <SidebarHeader studioData={studio} onToggleSidebar={toggleSidebar} />

            <ZenSidebarContent className="px-4">
                <ZenSidebarMenu>
                    {/* Link a Profile Editor */}
                    <div className="px-4 py-2 mb-3">
                        <Link
                            href={`/${studioSlug}/profile/edit`}
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/30 transition-all duration-200 rounded-md border border-zinc-700/50"
                        >
                            <Camera className="w-4 h-4 text-zinc-400" />
                            <span>Editor de Perfil Público</span>
                        </Link>
                    </div>

                    {/* Sección Studio */}
                    <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50 mb-3">Studio</div>

                    {builderNavItems.map(group => (
                        <CollapsibleGroup key={group.id} group={group}>
                            {group.items.map(item => (
                                <ZenSidebarMenuItem key={item.id}>
                                    <ActiveLink
                                        href={item.href.startsWith('/studio/')
                                            ? `/${studioSlug}${item.href}`
                                            : `/${studioSlug}/studio${item.href}`}
                                        className="flex items-center gap-3 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-all duration-200 rounded-md group"
                                    >
                                        <item.icon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                                        <span className="text-zinc-300 group-hover:text-white">{item.name}</span>
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
