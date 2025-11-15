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
    Star, Phone, Camera, X, CreditCard, File, User, Grid3X3, Store, Package, Calendar,
    Newspaper, Briefcase, Users, Sparkles, Mail, ImageIcon, FileText, UserCheck,
    ChevronDown, ChevronRight, Share2, HelpCircle, MapPin, Shield,
    FileSignature, UserCog, DollarSign, ShoppingCart, Navigation, Layout, MessageSquare
} from 'lucide-react';

interface StudioBuilderSidebarProps {
    className?: string;
    studioSlug: string;
}

export function StudioBuilderSidebar({ className, studioSlug }: StudioBuilderSidebarProps) {
    const { isOpen, toggleSidebar } = useZenSidebar();

    // Estado para grupo expandido (solo uno a la vez) - Ninguno expandido por defecto
    const [expandedGroup, setExpandedGroup] = React.useState<string | null>(null);

    // Función para toggle de grupos (solo uno expandido)
    const toggleGroup = (groupId: string) => {
        setExpandedGroup(prev => prev === groupId ? null : groupId);
    };

    // Datos mock para el sidebar (en una implementación real, estos vendrían de props o context)
    const studio = {
        id: 'temp-id',
        studio_name: 'Mi Estudio',
        slug: studioSlug
    };

    // Configuración de navegación modular según Plan Maestro ZEN
    const builderNavItems = [
        // 1. PERFIL (Gratuito - Base)
        {
            id: 'profile',
            title: 'Profile',
            icon: User,
            items: [
                { id: 'identidad', name: 'Identidad', href: `/profile/identidad`, icon: Star },
                { id: 'redes-sociales', name: 'Redes Sociales', href: `/profile/redes-sociales`, icon: Share2 },
                { id: 'telefonos', name: 'Teléfonos', href: `/profile/telefonos`, icon: Phone },
                { id: 'horarios', name: 'Horarios', href: `/profile/horarios`, icon: Calendar },
                { id: 'ubicacion', name: 'Ubicación', href: `/profile/ubicacion`, icon: Navigation },
                { id: 'zonas-trabajo', name: 'Zonas de Trabajo', href: `/profile/zonas-trabajo`, icon: MapPin },
            ],
        },

        // 2. CUENTA
        {
            id: 'account',
            title: 'Account',
            icon: UserCog,
            items: [
                { id: 'perfil', name: 'Perfil', href: `/studio/account/perfil`, icon: UserCheck },
                { id: 'seguridad', name: 'Seguridad', href: `/studio/account/seguridad`, icon: Shield },
                { id: 'suscripcion', name: 'Suscripción', href: `/studio/account/suscripcion`, icon: CreditCard },
            ],
        },

        // 3. CONTENT (Freemium)
        {
            id: 'content',
            title: 'Content',
            icon: Camera,
            items: [
                { id: 'profile-design', name: 'Layout', href: `/content/profile-design`, icon: Layout },
                { id: 'posts', name: 'Posts', href: `/content/posts`, icon: Newspaper },
                { id: 'portfolios', name: 'Portafolios', href: `/content/portfolios`, icon: Grid3X3 },
                { id: 'faq', name: 'FAQ', href: `/content/faq`, icon: HelpCircle },
            ],
        },

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
                { id: 'payments', name: 'Pagos', href: `/pagos`, icon: CreditCard },
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
                    <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50 mb-3">Studio Builder</div>

                    {builderNavItems.map(group => (
                        <CollapsibleGroup key={group.id} group={group}>
                            {group.items.map(item => (
                                <ZenSidebarMenuItem key={item.id}>
                                    <ActiveLink
                                        href={item.href.startsWith('/studio/') 
                                            ? `/${studioSlug}${item.href}`
                                            : `/${studioSlug}/studio/builder${item.href}`}
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
