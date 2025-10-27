'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ZEN_COLORS } from '../tokens/colors';
import { ZEN_SPACING } from '../tokens/spacing';

// Hook para generar IDs estables en SSR
function useStableId(prefix: string = 'zen-input'): string {
  const reactId = React.useId();
  return `${prefix}-${reactId.replace(/:/g, '')}`;
}

// =============================================================================
// TYPES
// =============================================================================
export interface ZenInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label del input (opcional para casos como búsqueda) */
  label?: string;
  /** Indica si el campo es requerido */
  required?: boolean;
  /** Mensaje de error a mostrar */
  error?: string;
  /** Texto de ayuda adicional */
  hint?: string;
  /** Icono a mostrar al lado del label (componente de Lucide) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Posición del icono (left o right) */
  iconPosition?: 'left' | 'right';
  /** Clases CSS adicionales para el icono */
  iconClassName?: string;
  /** Tamaño del input */
  size?: 'sm' | 'md' | 'lg';
  /** Clases CSS adicionales para el input */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ZenInput - Input con label integrado y estados visuales
 * 
 * Características:
 * - Label integrado con indicador de requerido
 * - Estados de error con mensaje
 * - Hint text para ayuda adicional
 * - Iconos opcionales en el label
 * - Tema oscuro ZEN consistente
 * - Accesibilidad completa
 * 
 * @example
 * ```tsx
 * <ZenInput 
 *   label="Nombre del Estudio"
 *   required
 *   error={errors.name}
 *   hint="Este nombre aparecerá en tu perfil público"
 *   placeholder="Ej: Studio Fotografía María"
 * />
 * ```
 */
const ZenInput = React.forwardRef<HTMLInputElement, ZenInputProps>(
  ({
    label,
    required = false,
    error,
    hint,
    icon: IconComponent,
    iconPosition = 'left',
    iconClassName,
    size = 'md',
    className,
    id,
    ...props
  }, ref) => {
    // Generar ID único si no se proporciona - usando hook estable para SSR
    const generatedId = useStableId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    // Estilos base del input
    const baseInputStyles = cn(
      // Colores ZEN
      ZEN_COLORS.input.bg,
      ZEN_COLORS.input.border,
      ZEN_COLORS.input.text,
      ZEN_COLORS.input.placeholder,
      // Estructura
      'w-full rounded-md border transition-all duration-200 outline-none',
      // Estados focus
      'focus:ring-[3px]',
      ZEN_COLORS.input.focusBorder,
      ZEN_COLORS.input.focusRing,
      // Estados disabled
      ZEN_COLORS.input.disabled,
      // File input específico
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'file:text-zinc-300',
    );

    // Tamaños
    const sizeStyles = {
      sm: `${ZEN_SPACING.padding.input.sm} text-sm`,
      md: `${ZEN_SPACING.padding.input.md} text-base`,
      lg: `${ZEN_SPACING.padding.input.lg} text-lg`,
    };

    // Estilos de error
    const errorStyles = error ? cn(
      ZEN_COLORS.border.error,
      'ring-2 ring-red-500/20'
    ) : '';

    // Determinar si hay un icono
    const hasIcon = !!IconComponent;
    // Estilos de padding para el icono
    const iconPadding = {
      left: hasIcon ? 'pl-10' : '',
      right: hasIcon ? 'pr-10' : '',
    };

    return (
      <div className={cn(ZEN_SPACING.zen.formFieldGap)}>
        {/* Label con icono opcional */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              // Tipografía ZEN para labels
              'text-sm font-medium leading-normal',
              ZEN_COLORS.text.secondary,
              'flex items-center gap-2',
              'mb-2'
            )}
          >
            {label}
            {required && (
              <span className={cn('ml-1', ZEN_COLORS.semantic.error.text)}>
                *
              </span>
            )}
          </label>
        )}

        {/* Input con icono */}
        <div className="relative">
          {hasIcon && (
            <div className={cn(
              'pointer-events-none absolute inset-y-0 flex items-center',
              iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'
            )}>
              <IconComponent className={cn('h-5 w-5 text-zinc-400', iconClassName)} />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseInputStyles,
              sizeStyles[size],
              errorStyles,
              iconPadding[iconPosition],
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && errorId,
              hint && hintId
            )}
            {...props}
          />
        </div>

        {/* Mensaje de error */}
        {error && (
          <p
            id={errorId}
            className={cn(
              'text-xs font-normal leading-normal',
              ZEN_COLORS.semantic.error.text,
              'mt-1'
            )}
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p
            id={hintId}
            className={cn(
              'text-xs font-normal leading-normal',
              ZEN_COLORS.text.muted,
              'mt-1'
            )}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);
ZenInput.displayName = 'ZenInput';

// =============================================================================
// EXPORTS
// =============================================================================
export { ZenInput };
