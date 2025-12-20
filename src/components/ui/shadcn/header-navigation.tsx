'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LucideIcon, UserPlus, Plus, Settings, BarChart3, Calendar, Users, Building2, Target, TrendingUp, CreditCard, FileText, Percent, Clock, Tag, RefreshCw } from 'lucide-react';

export interface HeaderNavigationProps {
    title: string;
    description: string;
    actionButton?: {
        label: string;
        href?: string;
        onClick?: () => void;
        icon: LucideIcon | string;
        variant?: 'primary' | 'secondary';
    };
    secondaryButtons?: Array<{
        label: string;
        href?: string;
        onClick?: () => void;
        icon: LucideIcon | string;
        variant?: 'outline' | 'ghost' | 'secondary';
        className?: string;
    }>;
    className?: string;
    showBorder?: boolean; // Nueva prop para controlar el borde
}

// Helper para obtener icono por nombre
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
            'CreditCard': CreditCard,
            'FileText': FileText,
            'Percent': Percent,
            'Clock': Clock,
            'Tag': Tag,
            'RefreshCw': RefreshCw,
        };
        return iconMap[icon] || Plus;
    }
    return icon;
};

// Estilos para variantes de botones
const buttonVariants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25",
    secondary: "bg-zinc-700 text-zinc-200 hover:bg-zinc-600 border border-zinc-600",
    outline: "border border-zinc-600 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-500",
    ghost: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30",
};

export function HeaderNavigation({
    title,
    description,
    actionButton,
    secondaryButtons,
    className,
    showBorder = true
}: HeaderNavigationProps) {
    return (
        <div className={cn(
            "relative overflow-hidden",
            // Fondo con gradiente sutil
            "bg-gradient-to-r from-zinc-900/40 via-zinc-900/20 to-zinc-900/40",
            // Backdrop blur para efecto moderno
            "backdrop-blur-sm",
            // Bordes y sombras
            showBorder && "border border-zinc-800/60",
            "rounded-xl shadow-2xl shadow-black/10",
            // Padding responsive
            "p-6 md:p-8",
            className
        )}>
            {/* Efecto de brillo sutil en la parte superior */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Sección de título */}
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
                        {description}
                    </p>
                </div>

                {/* Sección de botones */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Botones secundarios */}
                    {secondaryButtons && secondaryButtons.map((button, index) => {
                        const IconComponent = getIcon(button.icon);
                        const baseClasses = "inline-flex items-center px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm";
                        const variantClasses = buttonVariants[button.variant || 'outline'];

                        const buttonElement = (
                            <div className={cn(baseClasses, variantClasses, button.className)}>
                                <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="whitespace-nowrap">{button.label}</span>
                            </div>
                        );

                        return button.href ? (
                            <Link key={index} href={button.href}>
                                {buttonElement}
                            </Link>
                        ) : (
                            <button key={index} onClick={button.onClick}>
                                {buttonElement}
                            </button>
                        );
                    })}

                    {/* Botón principal */}
                    {actionButton && (
                        (() => {
                            const IconComponent = getIcon(actionButton.icon);
                            const baseClasses = "inline-flex items-center px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm transform hover:scale-[1.02] active:scale-[0.98]";
                            const variantClasses = buttonVariants[actionButton.variant || 'primary'];

                            const buttonElement = (
                                <div className={cn(baseClasses, variantClasses)}>
                                    <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="whitespace-nowrap">{actionButton.label}</span>
                                </div>
                            );

                            return actionButton.href ? (
                                <Link href={actionButton.href}>
                                    {buttonElement}
                                </Link>
                            ) : (
                                <button onClick={actionButton.onClick}>
                                    {buttonElement}
                                </button>
                            );
                        })()
                    )}
                </div>
            </div>
        </div>
    );
}