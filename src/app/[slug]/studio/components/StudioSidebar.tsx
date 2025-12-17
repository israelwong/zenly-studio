'use client';

import React from 'react';
import {
    ZenSidebar, ZenSidebarContent, ZenSidebarFooter, ZenSidebarMenu,
    ZenSidebarMenuItem, useZenSidebar
} from '@/components/ui/zen';
import { ActiveLink } from './ActiveLink';
import { LogoutButton } from '@/components/auth/logout-button';
import {
    File,
    Briefcase, Users, Sparkles, Mail, FileText,
    UserCog, DollarSign, Megaphone, ShoppingBagIcon, Plug, Settings,
    Home,
    CreditCard,
    Bell,
    BarChart3,
    User,
} from 'lucide-react';

interface StudioSidebarProps {
    className?: string;
    studioSlug: string;
}

export function StudioSidebar({ className, studioSlug }: StudioSidebarProps) {
    const { isOpen, toggleSidebar } = useZenSidebar();

    // Configuración de navegación modular según Plan Maestro ZEN
    // Nota: Profile y Content ahora están en /profile/edit/ con su propio sidebar
    const builderNavItems = [

        // Comercial
        {
            id: 'commercial',
            title: 'Comercial',
            icon: ShoppingBagIcon,
            items: [
                { id: 'dashboard', name: 'Dashboard', href: `/commercial/dashboard`, icon: Home },
                { id: 'ofertas', name: 'Ofertas', href: `/commercial/ofertas`, icon: Megaphone },
                { id: 'promises', name: 'Promesas', href: `/commercial/promises`, icon: File },
                { id: 'catalogo', name: 'Catálogo', href: `/commercial/catalogo`, icon: ShoppingBagIcon },
            ],
        },

        {
            id: 'business',
            title: 'Negocio',
            icon: Briefcase,
            items: [
                { id: 'events', name: 'Eventos', href: `/business/events`, icon: FileText },
                { id: 'finanzas', name: 'Finanzas', href: `/business/finanzas`, icon: DollarSign },
                // { id: 'reportes', name: 'Reportes', href: `/business/reportes`, icon: BarChart3 },
            ],
        },

        // Configuración
        {
            id: 'settings',
            title: 'Configuración',
            icon: Settings,
            items: [
                // { id: 'tipo_evento', name: 'Tipo de Evento', href: `/commercial/tipo-evento`, icon: ShoppingBagIcon },
                { id: 'contracts', name: 'Contratos', href: `/commercial/contracts`, icon: FileText },
                { id: 'recordatorios', name: 'Recordatorios', href: `/commercial/recordatorios`, icon: Bell },
                // { id: 'integraciones', name: 'Integraciones', href: `/business/integraciones/tracking`, icon: Plug },
                // { id: 'magic', name: 'ZEN Magic', href: `/magic`, icon: Sparkles },
            ],
        },

        // Account
        {
            id: 'account',
            title: 'Cuenta',
            icon: User,
            items: [
                { id: 'subscriptions', name: 'Suscripción', href: `/account/suscripcion`, icon: CreditCard },
            ],
        },

    ];

    // Componente para grupo de menú sin colapsable
    const MenuGroup = ({ group, children }: {
        group: { id: string; title: string; icon: React.ComponentType<{ className?: string }> },
        children: React.ReactNode
    }) => {
        return (
            <div className="mb-6">
                {/* Header del grupo - sin icono */}
                <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    {group.title}
                </div>

                {/* Elementos del menú */}
                <div className="space-y-1">
                    {children}
                </div>
            </div>
        );
    };

    return (
        <ZenSidebar className={`${className} ${isOpen ? '' : 'hidden lg:block'} w-60 lg:w-60 sm:w-60`}>
            <ZenSidebarContent className="px-4">
                <ZenSidebarMenu className="pt-4">
                    {/* Sección Studio */}
                    {builderNavItems.map(group => (
                        <MenuGroup key={group.id} group={group}>
                            {group.items.map(item => (
                                <ZenSidebarMenuItem key={item.id}>
                                    <ActiveLink
                                        href={item.href.startsWith('/studio/')
                                            ? `/${studioSlug}${item.href}`
                                            : `/${studioSlug}/studio${item.href}`}
                                        className="flex items-center gap-2.5 px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-all duration-200 rounded-md group"
                                    >
                                        <item.icon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                                        <span className="text-zinc-300 group-hover:text-white">{item.name}</span>
                                    </ActiveLink>
                                </ZenSidebarMenuItem>
                            ))}
                        </MenuGroup>
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
