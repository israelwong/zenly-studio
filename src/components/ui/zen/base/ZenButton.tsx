'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZEN_COLORS } from '../tokens/colors';
import { ZEN_SPACING } from '../tokens/spacing';

// =============================================================================
// VARIANTS
// =============================================================================
const zenButtonVariants = cva(
  // Estilos base
  cn(
    // Estructura
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200',
    // Estados disabled
    'disabled:pointer-events-none disabled:opacity-50',
    // Focus
    'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    // Iconos
    '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0'
  ),
  {
    variants: {
      variant: {
        // Botón principal - tema Studio (azul)
        primary: cn(
          ZEN_COLORS.button.primary.bg,
          ZEN_COLORS.button.primary.hover,
          ZEN_COLORS.button.primary.text,
          'focus-visible:ring-blue-500/50'
        ),
        // Botón secundario - tema zinc
        secondary: cn(
          ZEN_COLORS.button.secondary.bg,
          ZEN_COLORS.button.secondary.hover,
          ZEN_COLORS.button.secondary.text,
          'focus-visible:ring-zinc-500/50'
        ),
        // Botón destructivo - tema rojo
        destructive: cn(
          ZEN_COLORS.semantic.error.bg,
          ZEN_COLORS.semantic.error.hover,
          ZEN_COLORS.button.primary.text,
          'focus-visible:ring-red-500/50'
        ),
        // Botón outline - borde con fondo transparente
        outline: cn(
          ZEN_COLORS.button.outline.bg,
          ZEN_COLORS.button.outline.hover,
          ZEN_COLORS.button.outline.text,
          'border',
          ZEN_COLORS.button.outline.border,
          'focus-visible:ring-zinc-500/50'
        ),
        // Botón ghost - completamente transparente
        ghost: cn(
          ZEN_COLORS.button.ghost.bg,
          ZEN_COLORS.button.ghost.hover,
          ZEN_COLORS.button.ghost.text,
          'focus-visible:ring-zinc-500/50'
        ),
        // Botón link - estilo de enlace
        link: cn(
          'text-blue-400 underline-offset-4 hover:underline hover:text-blue-300',
          'focus-visible:ring-blue-500/50'
        ),
      },
      size: {
        sm: cn(
          ZEN_SPACING.padding.button.sm,
          'text-sm gap-1.5 h-8 rounded-md'
        ),
        md: cn(
          ZEN_SPACING.padding.button.md,
          'text-base gap-2 h-9 rounded-md'
        ),
        lg: cn(
          ZEN_SPACING.padding.button.lg,
          'text-lg gap-2 h-10 rounded-md'
        ),
        icon: cn(
          'size-9 p-0'
        ),
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

// =============================================================================
// TYPES
// =============================================================================
export interface ZenButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof zenButtonVariants> {
  /** Renderizar como un elemento hijo (para usar con Link, etc.) */
  asChild?: boolean;
  /** Mostrar spinner de carga */
  loading?: boolean;
  /** Texto a mostrar durante la carga */
  loadingText?: string;
  /** Icono a mostrar antes del texto */
  icon?: React.ComponentType<{ className?: string }>;
  /** Posición del icono */
  iconPosition?: 'left' | 'right';
  /** Hacer el botón de ancho completo */
  fullWidth?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ZenButton - Botón unificado con variantes y estados de carga
 * 
 * Características:
 * - Variantes semánticas (primary, secondary, destructive, outline, ghost, link)
 * - Tamaños consistentes (sm, md, lg, icon)
 * - Estado de loading integrado
 * - Soporte para iconos
 * - Tema oscuro ZEN
 * - Accesibilidad completa
 * - Compatible con asChild para usar con Next.js Link
 * 
 * @example
 * ```tsx
 * <ZenButton variant="primary" size="md" loading={saving}>
 *   Guardar Cambios
 * </ZenButton>
 * 
 * <ZenButton variant="outline" icon={Settings} iconPosition="left">
 *   Configuración
 * </ZenButton>
 * ```
 */
const ZenButton = React.forwardRef<HTMLButtonElement, ZenButtonProps>(
  ({
    className,
    variant,
    size,
    fullWidth,
    asChild = false,
    loading = false,
    loadingText,
    icon: Icon,
    iconPosition = 'left',
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : 'button';

    // Determinar si el botón está deshabilitado
    const isDisabled = disabled || loading;

    // Contenido del botón
    const buttonContent = React.useMemo(() => {
      // Si está cargando, mostrar spinner
      if (loading) {
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        );
      }

      // Si hay icono, posicionarlo correctamente
      if (Icon) {
        const iconElement = <Icon className="h-4 w-4" />;

        if (iconPosition === 'right') {
          return (
            <>
              {children}
              {iconElement}
            </>
          );
        }

        return (
          <>
            {iconElement}
            {children}
          </>
        );
      }

      // Solo texto
      return children;
    }, [loading, loadingText, children, Icon, iconPosition]);

    return (
      <Comp
        className={cn(zenButtonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </Comp>
    );
  }
);
ZenButton.displayName = 'ZenButton';

// =============================================================================
// EXPORTS
// =============================================================================
export { ZenButton, zenButtonVariants };
