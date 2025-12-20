'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    Building2,
    BarChart3,
    Settings,
    Columns3,
    ChevronDown,
    ChevronRight,
    Target,
    UserCheck,
    TrendingUp,
    Calendar,
    FileText
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/agente', icon: LayoutDashboard },
    {
        name: 'CRM',
        icon: Target,
        children: [
            { name: 'Kanban', href: '/agente/crm/kanban', icon: Columns3 },
            { name: 'Leads', href: '/agente/leads', icon: UserCheck },
        ]
    },
    {
        name: 'Gestión',
        icon: Users,
        children: [
            { name: 'Estudios', href: '/agente/studios', icon: Building2 },
            { name: 'Actividades', href: '/agente/actividades', icon: Calendar },
        ]
    },
    {
        name: 'Reportes',
        icon: BarChart3,
        children: [
            { name: 'Analytics', href: '/agente/analytics', icon: TrendingUp },
            { name: 'Reportes', href: '/agente/reportes', icon: FileText },
        ]
    },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    expandedMenus: string[];
    onToggleMenu: (menuName: string) => void;
}

export function Sidebar({ isOpen, onClose, expandedMenus, onToggleMenu }: SidebarProps) {
    const pathname = usePathname();

    const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName);

    const isActiveLink = (href: string) => {
        if (!pathname) return false;
        if (href === '/agente') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Mobile sidebar overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r-2 border-zinc-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <nav className="mt-6 px-3">
                    <div className="space-y-1">
                        {navigation.map((item) => {
                            // Si tiene children, es un menú expandible
                            if (item.children) {
                                const isExpanded = isMenuExpanded(item.name);
                                const hasActiveChild = item.children.some(child => isActiveLink(child.href));

                                return (
                                    <div key={item.name}>
                                        <button
                                            onClick={() => onToggleMenu(item.name)}
                                            className={cn(
                                                "group flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                                hasActiveChild
                                                    ? "bg-blue-600 text-white"
                                                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                            )}
                                        >
                                            <div className="flex items-center">
                                                <item.icon
                                                    className={cn(
                                                        "mr-3 h-5 w-5 flex-shrink-0",
                                                        hasActiveChild ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                                                    )}
                                                />
                                                {item.name}
                                            </div>
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="ml-6 mt-1 space-y-1">
                                                {item.children.map((child) => {
                                                    const isChildActive = isActiveLink(child.href);
                                                    return (
                                                        <Link
                                                            key={child.name}
                                                            href={child.href}
                                                            className={cn(
                                                                "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                                                                isChildActive
                                                                    ? "bg-blue-600 text-white"
                                                                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                            )}
                                                        >
                                                            <child.icon
                                                                className={cn(
                                                                    "mr-3 h-4 w-4 flex-shrink-0",
                                                                    isChildActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                                                                )}
                                                            />
                                                            {child.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Si no tiene children, es un enlace normal
                            const isActive = isActiveLink(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                        isActive
                                            ? "bg-blue-600 text-white"
                                            : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            "mr-3 h-5 w-5 flex-shrink-0",
                                            isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer del sidebar con información del agente */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                Agente
                            </p>
                            <p className="text-xs text-zinc-400 truncate">
                                Gestión de Leads
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
