'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SeparadorZenProps {
    /**
     * Orientación del separador
     * @default "horizontal"
     */
    orientation?: 'horizontal' | 'vertical';

    /**
     * Clases CSS adicionales
     */
    className?: string;

    /**
     * Espaciado del separador
     * @default "md"
     */
    spacing?: 'sm' | 'md' | 'lg' | 'xl' | 'none';

    /**
     * Variante del separador
     * @default "default"
     */
    variant?: 'default' | 'subtle' | 'strong';
}

/**
 * SeparadorZen - Separador unificado para ZEN Design System
 * 
 * Características:
 * - ✅ Consistente con tema zinc
 * - ✅ Múltiples variantes de intensidad
 * - ✅ Espaciado configurable
 * - ✅ Orientación horizontal/vertical
 * - ✅ Responsive y accesible
 */
export function SeparadorZen({
    orientation = 'horizontal',
    className,
    spacing = 'md',
    variant = 'default'
}: SeparadorZenProps) {
    const baseClasses = 'shrink-0 bg-zinc-700';

    const orientationClasses = {
        horizontal: 'h-px w-full',
        vertical: 'w-px h-full'
    };

    const spacingClasses = {
        none: '',
        sm: orientation === 'horizontal' ? 'my-3' : 'mx-3',
        md: orientation === 'horizontal' ? 'my-4' : 'mx-4',
        lg: orientation === 'horizontal' ? 'my-6' : 'mx-6',
        xl: orientation === 'horizontal' ? 'my-8' : 'mx-8'
    };

    const variantClasses = {
        default: 'bg-zinc-700',
        subtle: 'bg-zinc-800',
        strong: 'bg-zinc-600'
    };

    return (
        <div
            role="separator"
            aria-orientation={orientation}
            className={cn(
                baseClasses,
                orientationClasses[orientation],
                spacingClasses[spacing],
                variantClasses[variant],
                className
            )}
        />
    );
}
