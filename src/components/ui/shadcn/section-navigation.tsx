'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon, UserPlus, Plus, Settings, BarChart3, Calendar, Users, Building2, Target, TrendingUp, Tag } from 'lucide-react';

export interface NavigationItem {
    name: string;
    href: string;
    icon: LucideIcon;
    description: string;
}

export interface SectionNavigationProps {
    title: string;
    description: string;
    navigationItems?: NavigationItem[]; // ✅ Opcional
    actionButton?: {
        label: string;
        href?: string; // ✅ Opcional para links
        onClick?: () => void; // ✅ Opcional para botones
        icon: LucideIcon | string; // ✅ Acepta componente o nombre
    };
    className?: string;
}

// ✅ Helper para obtener icono por nombre
const getIcon = (icon: LucideIcon | string): LucideIcon => {
    if (typeof icon === 'string') {
        const iconMap: Record<string, LucideIcon> = {
            'UserPlus': UserPlus,
            'Plus': Plus,
            'Settings': Settings,
            'BarChart3': BarChart3,
            'Calendar': Calendar,
            'Users': Users,
            'Building2': Building2,
            'Target': Target,
            'TrendingUp': TrendingUp,
            'Tag': Tag,
        };
        return iconMap[icon] || Plus; // Fallback a Plus si no se encuentra
    }
    return icon;
};

export function SectionNavigation({
    title,
    description,
    navigationItems = [], // ✅ Array vacío por defecto
    actionButton,
    className
}: SectionNavigationProps) {
    const pathname = usePathname();
    const params = useParams();
    const slug = params.slug as string;

    const isActiveLink = (href: string) => {
        if (!pathname) return false;

        // Si estamos en la página principal de personal, marcar empleados como activo
        if (pathname === `/studio/${slug}/configuracion/negocio/personal` &&
            href.includes('/empleados')) {
            return true;
        }

        return pathname === href;
    };

    // ✅ Solo mostrar navegación si hay items
    const hasNavigation = navigationItems && navigationItems.length > 0;

    return (
        <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg p-6", className)}>
            <div className={cn("flex items-center justify-between", hasNavigation ? "mb-6" : "")}>
                <div>
                    <h1 className="text-2xl font-bold text-white">{title}</h1>
                    <p className="text-zinc-400 mt-1">{description}</p>
                </div>
                {actionButton && (
                    actionButton.href ? (
                        <Link
                            href={actionButton.href}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {React.createElement(getIcon(actionButton.icon), { className: "h-4 w-4 mr-2" })}
                            {actionButton.label}
                        </Link>
                    ) : (
                        <button
                            onClick={actionButton.onClick}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {React.createElement(getIcon(actionButton.icon), { className: "h-4 w-4 mr-2" })}
                            {actionButton.label}
                        </button>
                    )
                )}
            </div>

            {/* ✅ Navegación interna - solo si hay items */}
            {hasNavigation && (
                <nav className="flex space-x-1 bg-zinc-800 p-1 rounded-lg">
                    {navigationItems.map((item) => {
                        const isActive = isActiveLink(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                                )}
                            >
                                <item.icon className="h-4 w-4 mr-2" />
                                <div className="text-left">
                                    <div>{item.name}</div>
                                    <div className="text-xs opacity-75">{item.description}</div>
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
