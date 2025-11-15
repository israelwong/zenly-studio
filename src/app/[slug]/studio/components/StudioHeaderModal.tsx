'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ChevronDown, User, CreditCard, Plus, Calendar, BarChart3, Users, Zap } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { ZenSidebarMenuButton } from '@/components/ui/zen';
import { useStudioData } from '@/hooks/useStudioData';
import { useLogoRefreshListener } from '@/hooks/useLogoRefresh';

interface StudioHeaderModalProps {
    className?: string;
    studioData?: {
        id: string;
        studio_name: string;
        slug: string;
    };
}

export function StudioHeaderModal({ className, studioData }: StudioHeaderModalProps) {
    // className is available for future styling if needed
    void className; // Suppress unused parameter warning
    const params = useParams();
    const slug = params.slug as string;

    // Usar datos del studio pasados como prop o hook como fallback
    const {
        identidadData,
        loading,
        error,
        refetch
    } = useStudioData({
        studioSlug: studioData?.slug || slug
    });

    // Escuchar cambios de logo para actualizar en tiempo real
    const logoRefresh = useLogoRefreshListener();

    // Recargar datos cuando cambia el logo
    useEffect(() => {
        if (logoRefresh > 0) {
            refetch();
        }
    }, [logoRefresh, refetch]);

    // Variables de detección de ruta (mantenidas para futuras funcionalidades)
    // const isDashboard = pathname.includes('/studio/dashboard');
    // const isConfiguracion = pathname.includes('/studio/configuracion');
    // const isBuilder = pathname.includes('/studio/builder');

    // Usar datos del studio pasados como prop si están disponibles
    const studioName = studioData?.studio_name || identidadData?.studio_name || 'Studio';


    // Función para renderizar el logo
    const renderLogo = () => {
        if (loading) {
            return (
                <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center animate-pulse">
                    <span className="text-zinc-400 text-xs">...</span>
                </div>
            );
        }

        // Si hay logo, mostrarlo
        if (identidadData?.logo_url) {
            return (
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                    <Image
                        src={identidadData.logo_url}
                        alt="Logo"
                        width={32}
                        height={32}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            // Fallback si falla la carga de imagen
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) {
                                fallback.classList.remove('hidden');
                                fallback.classList.add('flex');
                            }
                        }}
                    />
                    <div className="w-8 h-8 bg-blue-600 rounded-lg items-center justify-center hidden">
                        <span className="text-white font-bold text-sm">
                            {identidadData.studio_name?.charAt(0)?.toUpperCase() || 'S'}
                        </span>
                    </div>
                </div>
            );
        }

        // Fallback: usar la primera letra del nombre
        return (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                    {identidadData?.studio_name?.charAt(0).toUpperCase() || 'S'}
                </span>
            </div>
        );
    };

    // Función para renderizar el nombre del studio
    const renderStudioName = () => {
        if (loading) {
            return (
                <div className="space-y-1">
                    <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse"></div>
                    <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse"></div>
                </div>
            );
        }

        return (
            <div className="text-left">
                <div className="text-sm font-semibold text-white">
                    {studioName}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Personal</span>
                    <div
                        className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : error ? 'bg-red-500' : 'bg-green-500'
                            }`}
                        title={
                            loading
                                ? 'Cargando datos...'
                                : error
                                    ? 'Error al cargar datos'
                                    : 'Datos cargados correctamente'
                        }
                    />
                </div>
            </div>
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <ZenSidebarMenuButton className="w-full justify-start gap-3 p-3 hover:bg-zinc-800">
                    {renderLogo()}
                    {renderStudioName()}
                    <ChevronDown className="ml-auto h-4 w-4 text-zinc-400" />
                </ZenSidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 bg-zinc-800 border-zinc-700"
                align="start"
                side="right"
                sideOffset={5}
                alignOffset={-10}
                avoidCollisions={true}
                collisionPadding={16}
            >
                {/* Gestionar */}
                <div className="px-2 py-1.5">
                    <div className="text-xs font-medium text-zinc-400">Gestionar</div>
                </div>
                <DropdownMenuSeparator className="bg-zinc-700" />

                <DropdownMenuItem asChild>
                    <Link
                        href="../configuracion/cuenta/perfil"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                        <User className="h-4 w-4" />
                        Perfil
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href="../configuracion/cuenta/suscripcion"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                        <CreditCard className="h-4 w-4" />
                        Suscripción
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-zinc-700" />

                {/* Acciones Rápidas */}
                <div className="px-2 py-1.5">
                    <div className="text-xs font-medium text-zinc-400">Acciones Rápidas</div>
                </div>
                <DropdownMenuSeparator className="bg-zinc-700" />

                <DropdownMenuItem asChild>
                    <Link
                        href="../dashboard/kanban"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Proyecto
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href="../dashboard/agenda"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                        <Calendar className="h-4 w-4" />
                        Ver Agenda
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href="../dashboard/contactos"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                        <Users className="h-4 w-4" />
                        Contactos
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href="../dashboard/finanzas"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Finanzas
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href="./builder/identidad"
                        className="flex items-center gap-3 px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                        <Zap className="h-4 w-4" />
                        Identidad Visual
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
