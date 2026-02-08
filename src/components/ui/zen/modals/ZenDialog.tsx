'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

export interface ZenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  children: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  /** Si true, el botón Guardar/Actualizar se deshabilita (ej. sin cambios en el formulario) */
  saveDisabled?: boolean;
  saveVariant?: 'primary' | 'destructive' | 'outline' | 'ghost';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl';
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  showDeleteButton?: boolean;
  /** Si true, Eliminar se muestra a la derecha (antes de Guardar) en lugar de a la izquierda */
  deleteOnRight?: boolean;
  zIndex?: number;
  headerActions?: React.ReactNode;
  fullScreen?: boolean;
  footerLeftContent?: React.ReactNode;
  /** Contenido a la derecha, después del botón Guardar (ej. "Solo Enviar") */
  footerRightContent?: React.ReactNode;
  /** Si true, permite que los dropdowns y elementos absolutos se muestren fuera del contenedor */
  allowOverflow?: boolean;
  /** Si true y solo hay botón Cancelar (sin Guardar), alinea Cancelar a la derecha */
  cancelAlignRight?: boolean;
  /** Variante del botón Cancelar (default: ghost) */
  cancelVariant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl'
};

export function ZenDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSave,
  onCancel,
  saveLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  saveDisabled = false,
  saveVariant = 'primary',
  maxWidth = '2xl',
  showCloseButton = true,
  closeOnClickOutside = false,
  onDelete,
  deleteLabel = 'Eliminar',
  showDeleteButton = false,
  deleteOnRight = false,
  zIndex = 10050,
  headerActions,
  fullScreen = false,
  footerLeftContent,
  footerRightContent,
  allowOverflow = false,
  cancelAlignRight = false,
  cancelVariant = 'ghost',
}: ZenDialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!mounted || !isAnimating) return null;

  const isVisible = isOpen;

  // Asegurar que el overlay esté debajo del contenido
  const overlayZIndex = zIndex;
  const contentZIndex = zIndex + 1;

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center transition-all duration-200",
        fullScreen ? "p-0" : "p-4",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        zIndex: contentZIndex,
        pointerEvents: 'auto'
      }}
    >
      {/* Overlay - dentro del contenedor para mejor posicionamiento */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{
          zIndex: 0
        }}
        onClick={(e) => {
          if (closeOnClickOutside && e.target === e.currentTarget) {
            onClose();
          }
        }}
      />
      {/* Contenido del modal - encima del overlay */}
      <div
        className={cn(
          'shadow-xl w-full flex flex-col relative min-h-0',
          fullScreen
            ? 'h-screen rounded-none'
            : 'rounded-lg max-h-[90vh] overflow-hidden',
          title ? 'bg-zinc-900' : 'bg-zinc-950/50 backdrop-blur-md border border-zinc-800/50',
          !fullScreen && maxWidthClasses[maxWidth]
        )}
        style={{
          pointerEvents: 'auto',
          zIndex: 1,
          position: 'relative'
        }}
          onClick={(e) => {
            // No bloquear eventos de dropdowns dentro del modal
            const target = e.target as HTMLElement;
            if (!target.closest('[role="menu"]') && !target.closest('[data-radix-dropdown-menu-trigger]')) {
              e.stopPropagation();
            }
          }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[role="menu"]') && !target.closest('[data-radix-dropdown-menu-trigger]')) {
              e.stopPropagation();
            }
          }}
          onPointerDown={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[role="menu"]') && !target.closest('[data-radix-dropdown-menu-trigger]')) {
              e.stopPropagation();
            }
          }}
        >
          {/* Header - Solo mostrar si hay título */}
          {title && (
            <ZenCardHeader className="flex items-center justify-between border-b border-zinc-700">
              <div>
                <ZenCardTitle className="text-xl font-semibold text-zinc-300">
                  {title}
                </ZenCardTitle>
                {description && (
                  <div className="text-sm text-zinc-400 mt-1">
                    {description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
                {showCloseButton && (
                  <ZenButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="text-zinc-400 hover:text-zinc-300"
                  >
                    <X className="h-5 w-5" />
                  </ZenButton>
                )}
              </div>
            </ZenCardHeader>
          )}

          {/* Content */}
          <ZenCardContent className={cn(
            allowOverflow ? 'overflow-visible' : 'overflow-y-auto',
            'flex-1 min-h-0',
            title ? 'px-6 py-4' : 'px-6 py-4',
            title ? '' : 'border-0'
          )} style={{
            maxHeight: fullScreen
              ? (title ? 'calc(100vh - 140px)' : 'calc(100vh - 80px)')
              : (title ? 'calc(90vh - 140px)' : 'calc(90vh - 80px)'),
            pointerEvents: 'auto'
          }}>
            {children}
          </ZenCardContent>

          {/* Footer */}
          {(onSave || onCancel || showDeleteButton || footerLeftContent || footerRightContent) && (
            footerLeftContent && !onSave && !(showDeleteButton && onDelete && deleteOnRight) && !footerRightContent && (!onCancel || !cancelAlignRight) ? (
              <div className="w-full px-6 py-4 border-t border-zinc-700">
                {footerLeftContent}
              </div>
            ) : (
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-zinc-700">
              {/* Izquierda: footerLeftContent o Cancelar (salvo cancelAlignRight) */}
              <div className={cn("flex items-center gap-4", (footerLeftContent || (onCancel && !cancelAlignRight)) && "flex-1 min-w-0")}>
                {footerLeftContent}
                {!footerLeftContent && onCancel && !cancelAlignRight && (
                  <ZenButton
                    variant={cancelVariant}
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelLabel}
                  </ZenButton>
                )}
                {showDeleteButton && onDelete && !deleteOnRight && (
                  <ZenButton
                    variant="ghost"
                    onClick={onDelete}
                    disabled={isLoading}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    {deleteLabel}
                  </ZenButton>
                )}
              </div>
              {/* Derecha: Cancelar (si cancelAlignRight) + Eliminar (si deleteOnRight) + Guardar + footerRightContent */}
              <div className="flex items-center gap-2 ml-auto">
                {onCancel && cancelAlignRight && (
                  <ZenButton
                    variant={cancelVariant}
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelLabel}
                  </ZenButton>
                )}
                {showDeleteButton && onDelete && deleteOnRight && (
                  <ZenButton
                    variant="ghost"
                    onClick={onDelete}
                    disabled={isLoading}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    {deleteLabel}
                  </ZenButton>
                )}
                {onSave && (
                  <ZenButton
                    onClick={onSave}
                    loading={isLoading}
                    disabled={saveDisabled}
                    variant={saveVariant}
                  >
                    {saveLabel}
                  </ZenButton>
                )}
                {footerRightContent}
              </div>
            </div>
            )
          )}
        </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

