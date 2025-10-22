import React from 'react';
import {
    Kanban, Settings, BarChart3, Bot, LayoutTemplate, Rocket, Sparkles
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getActiveModules } from '@/lib/modules';
import {
    ZenSidebar, ZenSidebarContent, ZenSidebarHeader, ZenSidebarFooter, ZenSidebarMenu,
    ZenSidebarMenuItem
} from '@/components/ui/zen';
import { StudioHeaderModal } from '../../components/StudioHeaderModal';
import { ActiveLink } from '../../components/ActiveLink'; // Componente cliente para manejar el estado activo
import { LogoutButton } from '@/components/auth/logout-button';

// Definición de la apariencia de cada módulo
const moduleConfig = {
    manager: { icon: Kanban, title: 'ZEN Manager', href: '/dashboard' },
    pages: { icon: LayoutTemplate, title: 'ZEN Pages', href: '/pages' },
    marketing: { icon: Sparkles, title: 'ZEN Marketing', href: '/marketing' },
    magic: { icon: Bot, title: 'ZEN Magic', href: '/magic' },
    // ... otros módulos pueden ser añadidos aquí
};

interface DashboardSidebarZenProps {
    className?: string;
    studioSlug: string;
}

export async function DashboardSidebarZen({ className, studioSlug }: DashboardSidebarZenProps) {
    // console.log('🔍 DashboardSidebarZen - studioSlug recibido:', studioSlug);
    // console.log('🔍 DashboardSidebarZen - tipo de studioSlug:', typeof studioSlug);

    let studio: { id: string; studio_name: string; slug: string } | null = null;
    let allStudios: { id: string; studio_name: string; slug: string }[] = [];

    try {
        // Primero verificar si hay studios en la base de datos
        allStudios = await prisma.studios.findMany({
            select: { id: true, studio_name: true, slug: true }
        });
        // console.log('🔍 DashboardSidebarZen - todos los studios:', allStudios);
        // console.log('🔍 DashboardSidebarZen - cantidad de studios:', allStudios.length);

        // Buscar el studio específico
        studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true, studio_name: true, slug: true }
        });

        // console.log('🔍 DashboardSidebarZen - studio encontrado:', studio);
        // console.log('🔍 DashboardSidebarZen - búsqueda por slug:', studioSlug);

        // También intentar buscar por ID si el slug no funciona
        if (!studio && allStudios.length > 0) {
            // console.log('🔍 DashboardSidebarZen - Intentando buscar por otros criterios...');
            const firstStudio = allStudios[0];
            // console.log('🔍 DashboardSidebarZen - Primer studio disponible:', firstStudio);

            // TEMPORAL: Usar el primer studio disponible si no se encuentra el slug específico
            //      console.log('⚠️ DashboardSidebarZen - USANDO PRIMER STUDIO DISPONIBLE COMO FALLBACK');
            studio = firstStudio;
        }

    } catch (error) {
        console.error('❌ DashboardSidebarZen - Error en consulta a BD:', error);
        return (
            <ZenSidebar className={className}>
                <div className="p-4 text-red-400">
                    <p>Error de conexión a base de datos</p>
                    <p className="text-xs text-zinc-500">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
                </div>
            </ZenSidebar>
        );
    }

    if (!studio) {
        // Manejar el caso donde el studio no se encuentra
        //      console.error('❌ DashboardSidebarZen - Studio no encontrado para slug:', studioSlug);
        //      console.error('❌ DashboardSidebarZen - Studios disponibles:', allStudios.map(s => s.slug));
        return (
            <ZenSidebar className={className}>
                <div className="p-4 text-red-400">
                    <p>Studio no encontrado</p>
                    <p className="text-xs text-zinc-500">Slug buscado: {studioSlug}</p>
                    <p className="text-xs text-zinc-500">Studios disponibles: {allStudios.map(s => s.slug).join(', ')}</p>
                </div>
            </ZenSidebar>
        );
    }

    const activeModules = await getActiveModules(studio.id);

    const mainNavItems = [
        { href: `/${studioSlug}/studio/dashboard`, icon: BarChart3, label: 'Dashboard' },
    ];

    return (
        <ZenSidebar className={className}>
            <ZenSidebarHeader>
                <StudioHeaderModal studioData={studio} />
            </ZenSidebarHeader>

            <ZenSidebarContent className="px-4">
                <ZenSidebarMenu>
                    {/* Sección Principal Siempre Visible */}
                    <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Principal</div>
                    {mainNavItems.map(item => (
                        <ZenSidebarMenuItem key={item.href}>
                            <ActiveLink href={item.href}>
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </ActiveLink>
                        </ZenSidebarMenuItem>
                    ))}

                    {/* Separador */}
                    <div className="px-3 py-2"><div className="h-px bg-zinc-800"></div></div>

                    {/* Módulos Activos */}
                    <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Módulos</div>
                    {activeModules.map(module => {
                        const config = moduleConfig[module.slug as keyof typeof moduleConfig];
                        if (!config) return null;
                        const href = `/${studioSlug}/studio${config.href}`;

                        return (
                            <ZenSidebarMenuItem key={module.id}>
                                <ActiveLink href={href}>
                                    <config.icon className="w-4 h-4" />
                                    <span>{config.title}</span>
                                </ActiveLink>
                            </ZenSidebarMenuItem>
                        );
                    })}
                </ZenSidebarMenu>

                {/* Navegación Fija */}
                <ZenSidebarMenu>
                    <ZenSidebarMenuItem>
                        <ActiveLink href={`/${studioSlug}/studio/builder`}>
                            <Rocket className="w-4 h-4" />
                            <span>Studio Builder</span>
                        </ActiveLink>
                    </ZenSidebarMenuItem>
                    <ZenSidebarMenuItem>
                        <ActiveLink href={`/${studioSlug}/studio/configuracion`}>
                            <Settings className="w-4 h-4" />
                            <span>Configuración</span>
                        </ActiveLink>
                    </ZenSidebarMenuItem>
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
