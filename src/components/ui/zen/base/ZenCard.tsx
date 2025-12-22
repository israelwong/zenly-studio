'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ZEN_COLORS } from '../tokens/colors';
import { ZEN_SPACING } from '../tokens/spacing';

// =============================================================================
// TYPES
// =============================================================================
export interface ZenCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Variante visual del card */
    variant?: 'default' | 'outlined' | 'elevated';
    /** Tamaño del padding interno */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Contenido del card */
    children: React.ReactNode;
    /** Clases CSS adicionales */
    className?: string;
}

export interface ZenCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export interface ZenCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export interface ZenCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    children: React.ReactNode;
    className?: string;
}

export interface ZenCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
    children: React.ReactNode;
    className?: string;
}

export interface ZenCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * ZenCard - Contenedor principal con tema ZEN
 * 
 * @example
 * ```tsx
 * <ZenCard variant="default" padding="md">
 *   <ZenCardHeader>
 *     <ZenCardTitle>Título</ZenCardTitle>
 *     <ZenCardDescription>Descripción</ZenCardDescription>
 *   </ZenCardHeader>
 *   <ZenCardContent>
 *     Contenido del card
 *   </ZenCardContent>
 * </ZenCard>
 * ```
 */
const ZenCard = React.forwardRef<HTMLDivElement, ZenCardProps>(
    ({ variant = 'default', padding = 'none', children, className, ...props }, ref) => {
        // Estilos base del card
        const baseStyles = cn(
            // Colores base ZEN
            ZEN_COLORS.card.bg,
            ZEN_COLORS.card.border,
            ZEN_COLORS.card.shadow,
            // Estructura
            'rounded-lg border',
            // Transiciones
            'transition-colors duration-200',
        );

        // Variantes visuales
        const variantStyles = {
            default: '',
            outlined: cn(
                'border-2',
                ZEN_COLORS.border.default
            ),
            elevated: cn(
                ZEN_COLORS.card.hover,
                'shadow-xl shadow-black/30'
            ),
        };

        // Padding interno
        const paddingStyles = {
            none: '',
            sm: ZEN_SPACING.padding.card.sm,
            md: ZEN_SPACING.padding.card.md,
            lg: ZEN_SPACING.padding.card.lg,
        };

        return (
            <div
                ref={ref}
                className={cn(
                    baseStyles,
                    variantStyles[variant],
                    paddingStyles[padding],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ZenCard.displayName = 'ZenCard';

/**
 * ZenCardHeader - Header del card con espaciado consistente
 */
const ZenCardHeader = React.forwardRef<HTMLDivElement, ZenCardHeaderProps>(
    ({ children, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    ZEN_SPACING.padding.card.md,
                    'pb-4', // Menos padding bottom para separar del content
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ZenCardHeader.displayName = 'ZenCardHeader';

/**
 * ZenCardContent - Contenido principal del card
 */
const ZenCardContent = React.forwardRef<HTMLDivElement, ZenCardContentProps>(
    ({ children, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    ZEN_SPACING.padding.card.md,
                    'pt-0', // Sin padding top para conectar con header
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ZenCardContent.displayName = 'ZenCardContent';

/**
 * ZenCardTitle - Título del card con tipografía ZEN
 */
const ZenCardTitle = React.forwardRef<HTMLHeadingElement, ZenCardTitleProps>(
    ({ children, className, ...props }, ref) => {
        return (
            <h3
                ref={ref}
                className={cn(
                    // Tipografía ZEN para títulos de card
                    'text-lg font-semibold leading-tight',
                    ZEN_COLORS.text.primary,
                    'mb-2',
                    className
                )}
                {...props}
            >
                {children}
            </h3>
        );
    }
);
ZenCardTitle.displayName = 'ZenCardTitle';

/**
 * ZenCardDescription - Descripción del card con tipografía ZEN
 */
const ZenCardDescription = React.forwardRef<HTMLParagraphElement, ZenCardDescriptionProps>(
    ({ children, className, ...props }, ref) => {
        return (
            <p
                ref={ref}
                className={cn(
                    // Tipografía ZEN para descripciones
                    'text-sm font-normal leading-normal',
                    ZEN_COLORS.text.secondary,
                    className
                )}
                {...props}
            >
                {children}
            </p>
        );
    }
);
ZenCardDescription.displayName = 'ZenCardDescription';

/**
 * ZenCardFooter - Footer del card con espaciado consistente
 */
const ZenCardFooter = React.forwardRef<HTMLDivElement, ZenCardFooterProps>(
    ({ children, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    ZEN_SPACING.padding.card.md,
                    'pt-4', // Padding top para separar del content
                    'border-t',
                    ZEN_COLORS.border.default,
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ZenCardFooter.displayName = 'ZenCardFooter';

// =============================================================================
// EXPORTS
// =============================================================================
export {
    ZenCard,
    ZenCardHeader,
    ZenCardContent,
    ZenCardTitle,
    ZenCardDescription,
    ZenCardFooter
};
