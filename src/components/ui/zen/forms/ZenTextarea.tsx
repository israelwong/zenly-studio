'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ZEN_COLORS } from '../tokens/colors';
import { ZEN_SPACING } from '../tokens/spacing';

// Hook para generar IDs estables en SSR
function useStableId(prefix: string = 'zen-textarea'): string {
  const reactId = React.useId();
  return `${prefix}-${reactId.replace(/:/g, '')}`;
}

// =============================================================================
// TYPES
// =============================================================================
export interface ZenTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label del textarea (requerido para accesibilidad) */
  label: string;
  /** Indica si el campo es requerido */
  required?: boolean;
  /** Mensaje de error a mostrar */
  error?: string;
  /** Texto de ayuda adicional */
  hint?: string;
  /** Icono a mostrar al lado del label (componente de Lucide) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Número máximo de caracteres permitidos */
  maxLength?: number;
  /** Número mínimo de filas visibles */
  minRows?: number;
  /** Número máximo de filas antes de scroll */
  maxRows?: number;
  /** Clases CSS adicionales para el textarea */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ZenTextarea - Textarea con label integrado y contador de caracteres
 * 
 * Características:
 * - Label integrado con indicador de requerido
 * - Estados de error con mensaje
 * - Hint text para ayuda adicional
 * - Contador de caracteres opcional
 * - Iconos opcionales en el label
 * - Redimensionamiento automático (opcional)
 * - Tema oscuro ZEN consistente
 * - Accesibilidad completa
 * 
 * @example
 * ```tsx
 * <ZenTextarea 
 *   label="Descripción del Estudio"
 *   required
 *   maxLength={500}
 *   minRows={3}
 *   error={errors.description}
 *   hint="Describe tu estudio, servicios y experiencia"
 *   placeholder="Escribe una descripción detallada..."
 * />
 * ```
 */
const ZenTextarea = React.forwardRef<HTMLTextAreaElement, ZenTextareaProps>(
  ({
    label,
    required = false,
    error,
    hint,
    icon: Icon,
    maxLength,
    minRows = 3,
    maxRows,
    className,
    id,
    value,
    ...props
  }, ref) => {
    // Generar ID único si no se proporciona - usando hook estable para SSR
    const generatedId = useStableId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;
    const countId = `${textareaId}-count`;

    // Calcular longitud actual del texto
    const currentLength = typeof value === 'string' ? value.length : 0;

    // Estilos base del textarea
    const baseTextareaStyles = cn(
      // Colores ZEN
      ZEN_COLORS.input.bg,
      ZEN_COLORS.input.border,
      ZEN_COLORS.input.text,
      ZEN_COLORS.input.placeholder,
      // Estructura
      'w-full rounded-md border transition-all duration-200 outline-none resize-vertical',
      // Padding
      ZEN_SPACING.padding.input.md,
      // Estados focus
      'focus:ring-[3px]',
      ZEN_COLORS.input.focusBorder,
      ZEN_COLORS.input.focusRing,
      // Estados disabled
      ZEN_COLORS.input.disabled,
    );

    // Estilos de error
    const errorStyles = error ? cn(
      ZEN_COLORS.border.error,
      'ring-2 ring-red-500/20'
    ) : '';

    // Calcular altura mínima basada en minRows
    const minHeight = `${minRows * 1.5 + 1}rem`; // Aproximadamente 1.5rem por línea + padding

    // Estilo dinámico para altura
    const heightStyle = {
      minHeight,
      ...(maxRows && {
        maxHeight: `${maxRows * 1.5 + 1}rem`
      })
    };

    return (
      <div className={cn(ZEN_SPACING.zen.formFieldGap)}>
        {/* Label con icono opcional */}
        <label
          htmlFor={textareaId}
          className={cn(
            // Tipografía ZEN para labels
            'text-sm font-medium leading-normal',
            ZEN_COLORS.text.secondary,
            'flex items-center gap-2',
            'mb-2'
          )}
          suppressHydrationWarning
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>
            {label}
            {required && (
              <span className={cn('ml-1', ZEN_COLORS.semantic.error.text)}>
                *
              </span>
            )}
          </span>
        </label>

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          style={heightStyle}
          className={cn(
            baseTextareaStyles,
            errorStyles,
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            error && errorId,
            hint && hintId,
            maxLength && countId
          )}
          suppressHydrationWarning
          {...props}
        />

        {/* Footer con contador y mensajes */}
        <div className="flex justify-between items-start mt-1">
          <div className="flex-1">
            {/* Mensaje de error */}
            {error && (
              <p
                id={errorId}
                className={cn(
                  'text-xs font-normal leading-normal',
                  ZEN_COLORS.semantic.error.text
                )}
                role="alert"
                suppressHydrationWarning
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
                  ZEN_COLORS.text.muted
                )}
                suppressHydrationWarning
              >
                {hint}
              </p>
            )}
          </div>

          {/* Contador de caracteres */}
          {maxLength && (
            <p
              id={countId}
              className={cn(
                'text-xs font-normal leading-normal ml-2 flex-shrink-0',
                // Color dinámico basado en proximidad al límite
                currentLength > maxLength * 0.9
                  ? ZEN_COLORS.semantic.warning.text
                  : currentLength === maxLength
                    ? ZEN_COLORS.semantic.error.text
                    : ZEN_COLORS.text.muted
              )}
              aria-live="polite"
              suppressHydrationWarning
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);
ZenTextarea.displayName = 'ZenTextarea';

// =============================================================================
// EXPORTS
// =============================================================================
export { ZenTextarea };
