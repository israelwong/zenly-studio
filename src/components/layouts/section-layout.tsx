'use client';

import React from 'react';
import { SectionNavigation, NavigationItem } from '@/components/ui/shadcn/section-navigation';
import { LucideIcon } from 'lucide-react';

export interface SectionLayoutProps {
    title: string;
    description: string;
    navigationItems?: NavigationItem[]; // ✅ Opcional
    actionButton?: {
        label: string;
        href?: string; // ✅ Opcional para links
        onClick?: () => void; // ✅ Opcional para botones
        icon: LucideIcon | string; // ✅ Acepta componente o nombre
    };
    children: React.ReactNode;
    className?: string;
}

export function SectionLayout({
    title,
    description,
    navigationItems = [], // ✅ Array vacío por defecto
    actionButton,
    children,
    className
}: SectionLayoutProps) {
    return (
        <div className="space-y-6">
            {/* Header - se adapta automáticamente */}
            <SectionNavigation
                title={title}
                description={description}
                navigationItems={navigationItems}
                actionButton={actionButton}
            />

            {/* Contenido de la página */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                {children}
            </div>
        </div>
    );
}
