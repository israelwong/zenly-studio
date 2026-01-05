'use client';

import React from 'react';
import {
    ZenSidebar, ZenSidebarContent, ZenSidebarFooter, ZenSidebarMenu,
    ZenSidebarMenuItem, useZenSidebar
} from '@/components/ui/zen';
import { ZenButton } from '@/components/ui/zen';
import { ActiveLink } from './ActiveLink';
import { LogoutButton } from '@/components/auth/logout-button';
import { cn } from '@/lib/utils';
import {
    File,
    Briefcase, Users, Sparkles, Mail, FileText,
    UserCog, DollarSign, Megaphone, ShoppingBagIcon, Plug, Settings,
    Home,
    CreditCard,
    Bell,
    BarChart3,
    User,
    X,
    Calendar,
    FolderOpen,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Shield,
} from 'lucide-react';

interface StudioSidebarProps {
    className?: string;
    studioSlug: string;
    onCommandOpen?: () => void;
}

// Componente para grupo de menú con soporte para modo colapsado
const MenuGroup = ({
    group,
    children,
    isCollapsed
}: {
    group: { id: string; title: string; icon: React.ComponentType<{ className?: string }> },
    children: React.ReactNode,
    isCollapsed: boolean
}) => {
    if (isCollapsed) {
        return (
            <div className="mb-4">
                <div className="space-y-1">
                    {children}
                </div>
            </div>
        );
    }

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

export function StudioSidebar({ className, studioSlug, onCommandOpen }: StudioSidebarProps) {
    const { isOpen, toggleSidebar, isCollapsed, toggleCollapse, isMobile } = useZenSidebar();
    const [isHovered, setIsHovered] = React.useState(false);
    const [isMac, setIsMac] = React.useState(false);

    // En desktop, si está colapsado y se hace hover, expandir temporalmente
    const isExpandedOnHover = !isMobile && isCollapsed && isHovered;

    // Detectar si es Mac
    React.useEffect(() => {
        setIsMac(typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
    }, []);

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
                { id: 'catalogo', name: 'Catálogo', href: `/commercial/catalogo`, icon: ShoppingBagIcon },
                { id: 'ofertas', name: 'Ofertas', href: `/commercial/ofertas`, icon: Megaphone },
                { id: 'portafolios', name: 'Portafolios', href: `/commercial/portafolios`, icon: FolderOpen },
                { id: 'promises', name: 'Promesas', href: `/commercial/promises`, icon: File },
            ],
        },

        {
            id: 'business',
            title: 'Negocio',
            icon: Briefcase,
            items: [
                { id: 'events', name: 'Eventos', href: `/business/events`, icon: FileText },
                { id: 'scheduler', name: 'Cronograma', href: `/business/scheduler`, icon: Calendar },
                { id: 'personal', name: 'Personal', href: `/business/personel`, icon: Users },
                { id: 'finanzas', name: 'Finanzas', href: `/business/finanzas`, icon: DollarSign },
            ],
        },

        // Configuración
        {
            id: 'settings',
            title: 'Configuración',
            icon: Settings,
            items: [
                { id: 'contracts', name: 'Contratos', href: `/config/contratos`, icon: FileText },
                { id: 'privacidad', name: 'Aviso de Privacidad', href: `/config/privacidad`, icon: Shield },
                { id: 'subscriptions', name: 'Suscripción', href: `/config/account/suscripcion`, icon: CreditCard },
                { id: 'integraciones', name: 'Integraciones', href: `/config/integraciones`, icon: Plug },
                // { id: 'magic', name: 'ZEN Magic', href: `/magic`, icon: Sparkles },
            ],
        },

    ];

    return (
        <ZenSidebar
            className={`${className} ${isOpen ? '' : 'hidden lg:block'}`}
            isHovered={isExpandedOnHover}
            onMouseEnter={() => !isMobile && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <ZenSidebarContent className={isCollapsed && !isExpandedOnHover ? "px-1.5" : "px-4"}>
                {/* Botón toggle collapse - Solo visible en desktop */}
                <div className={cn(
                    "flex items-center justify-between pt-4",
                    isCollapsed ? "pb-2 px-1.5 lg:px-1.5" : "pb-6 px-3 lg:px-3"
                )}>
                    {/* Botón de cerrar - Solo visible en mobile */}
                    <div className="flex justify-end lg:hidden">
                        <ZenButton
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="text-zinc-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </ZenButton>
                    </div>
                    {/* Botón toggle collapse - Solo visible en desktop */}
                    <div className="hidden lg:block">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleCollapse();
                            }}
                            className={cn(
                                "w-full flex items-center p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md transition-colors",
                                isCollapsed ? "justify-center" : "justify-start gap-2"
                            )}
                            title={isCollapsed ? "Expandir sidebar" : "Contraer sidebar"}
                        >
                            {isCollapsed ? (
                                <PanelLeftOpen className="h-4 w-4" />
                            ) : (
                                <>
                                    <PanelLeftClose className="h-4 w-4" />
                                    <span className="text-sm">Contraer</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Divisor debajo del botón toggle - solo cuando está colapsado */}
                {isCollapsed && !isExpandedOnHover && (
                    <div className="hidden lg:block">
                        <div className="h-[0.5px] bg-zinc-900 mx-3 my-2" />
                    </div>
                )}

                {/* Botón de búsqueda - arriba de la sección Comercial */}
                {onCommandOpen && (
                    <div className={cn(
                        "hidden lg:block mb-1",
                        isCollapsed && !isExpandedOnHover ? "px-1.5" : "px-4"
                    )}>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onCommandOpen();
                            }}
                            className={cn(
                                "w-full flex items-center transition-all duration-200 rounded-full group",
                                isCollapsed && !isExpandedOnHover
                                    ? "justify-center px-0 py-2 mx-0"
                                    : "gap-2.5 px-3 py-2 border border-zinc-700/50",
                                "text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                            )}
                            title={isCollapsed && !isExpandedOnHover ? "Buscar" : undefined}
                        >
                            <Search className={cn(
                                "shrink-0 text-zinc-500 group-hover:text-zinc-300",
                                isCollapsed && !isExpandedOnHover ? "w-5 h-5" : "w-4 h-4"
                            )} />
                            {(!isCollapsed || isExpandedOnHover) && (
                                <>
                                    <span className="text-zinc-300 group-hover:text-white">Buscar...</span>
                                    <span className="text-xs text-zinc-600 ml-auto">{isMac ? '⌘' : 'Ctrl'}+K</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                <ZenSidebarMenu className={isCollapsed && !isExpandedOnHover ? "pt-2" : "pt-4"}>
                    {builderNavItems.map((group, groupIndex) => (
                        <React.Fragment key={group.id}>
                            {/* Separador antes de cada grupo (excepto el primero) cuando está colapsado */}
                            {isCollapsed && !isExpandedOnHover && groupIndex > 0 && (
                                <div className="h-px bg-zinc-800 mx-1.5 my-3" />
                            )}
                            <MenuGroup group={group} isCollapsed={isCollapsed && !isExpandedOnHover}>
                                {group.items.map(item => (
                                    <ZenSidebarMenuItem key={item.id}>
                                        <ActiveLink
                                            href={item.href.startsWith('/studio/')
                                                ? `/${studioSlug}${item.href}`
                                                : `/${studioSlug}/studio${item.href}`}
                                            className={cn(
                                                "flex items-center transition-all duration-200 rounded-md group",
                                                isCollapsed && !isExpandedOnHover
                                                    ? "justify-center px-0 py-1.5 mx-0"
                                                    : "gap-2 px-2.5 py-0.5",
                                                "text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                                            )}
                                            data-tooltip-id="my-tooltip"
                                            data-tooltip-content={item.name}
                                            data-tooltip-place="right"
                                        >
                                            <item.icon className={cn(
                                                "shrink-0 text-zinc-500 group-hover:text-zinc-300",
                                                isCollapsed && !isExpandedOnHover ? "w-5 h-5" : "w-4 h-4"
                                            )} />
                                            {(!isCollapsed || isExpandedOnHover) && (
                                                <span className="text-zinc-300 group-hover:text-white">{item.name}</span>
                                            )}
                                        </ActiveLink>
                                    </ZenSidebarMenuItem>
                                ))}
                            </MenuGroup>
                        </React.Fragment>
                    ))}
                </ZenSidebarMenu>
            </ZenSidebarContent>

            <ZenSidebarFooter className={isCollapsed && !isExpandedOnHover ? "px-1.5" : "px-4"}>
                {/* Separador antes del footer cuando está colapsado */}
                {isCollapsed && !isExpandedOnHover && (
                    <div className="h-px bg-zinc-800 mx-1.5 mb-3" />
                )}
                <ZenSidebarMenu>
                    <ZenSidebarMenuItem>
                        <div className={isCollapsed && !isExpandedOnHover ? "flex justify-center px-0" : ""}>
                            <LogoutButton isCollapsed={isCollapsed && !isExpandedOnHover} />
                        </div>
                    </ZenSidebarMenuItem>
                </ZenSidebarMenu>
            </ZenSidebarFooter>
        </ZenSidebar>
    );
}
