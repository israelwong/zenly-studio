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
  description?: string;
  children: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  saveVariant?: 'primary' | 'destructive' | 'outline' | 'ghost';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl';
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  showDeleteButton?: boolean;
  zIndex?: number;
  headerActions?: React.ReactNode;
  fullScreen?: boolean;
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
  saveVariant = 'primary',
  maxWidth = '2xl',
  showCloseButton = true,
  closeOnClickOutside = false,
  onDelete,
  deleteLabel = 'Eliminar',
  showDeleteButton = false,
  zIndex = 10050,
  headerActions,
  fullScreen = false
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
      // Dar tiempo para la animación de salida
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 200); // Duración de la animación
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted || !isAnimating) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const overlayZIndex = zIndex;
  const contentZIndex = zIndex + 1;

  const modalContent = (
    <>
      {/* Overlay separado - SIEMPRE bloquea clics */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        style={{
          zIndex: overlayZIndex,
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          // Solo cerrar si closeOnClickOutside está habilitado
          if (closeOnClickOutside && e.target === e.currentTarget) {
            onClose();
          }
          // Si no, simplemente bloquear el clic (no hacer nada)
        }}
      />
      {/* Contenido del modal */}
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center transition-all duration-200",
          fullScreen ? "p-0" : "p-4",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={{
          zIndex: contentZIndex,
          pointerEvents: 'none'
        }}
      >
        <div
          className={cn(
            'shadow-xl w-full flex flex-col relative pointer-events-auto',
            fullScreen
              ? 'h-screen rounded-none'
              : 'rounded-lg max-h-[90vh]',
            title ? 'bg-zinc-900' : 'bg-zinc-950/50 backdrop-blur-md border border-zinc-800/50',
            !fullScreen && maxWidthClasses[maxWidth]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Solo mostrar si hay título */}
          {title && (
            <ZenCardHeader className="flex items-center justify-between border-b border-zinc-700">
              <div>
                <ZenCardTitle className="text-xl font-semibold text-zinc-300">
                  {title}
                </ZenCardTitle>
                {description && (
                  <p className="text-sm text-zinc-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
                {showCloseButton && (
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
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
            'overflow-y-auto flex-1 min-h-0',
            title ? 'p-6' : 'p-6',
            title ? '' : 'border-0'
          )} style={{
            maxHeight: fullScreen
              ? (title ? 'calc(100vh - 140px)' : 'calc(100vh - 80px)')
              : (title ? 'calc(90vh - 140px)' : 'calc(90vh - 80px)')
          }}>
            {children}
          </ZenCardContent>

          {/* Footer */}
          {(onSave || onCancel || showDeleteButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700">
              {/* Botón eliminar a la izquierda */}
              {showDeleteButton && onDelete && (
                <ZenButton
                  variant="ghost"
                  onClick={onDelete}
                  disabled={isLoading}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  {deleteLabel}
                </ZenButton>
              )}
              {/* Botones de acción a la derecha */}
              <div className="flex items-center gap-3 ml-auto">
                {onCancel && (
                  <ZenButton
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    {cancelLabel}
                  </ZenButton>
                )}
                {onSave && (
                  <ZenButton
                    onClick={onSave}
                    loading={isLoading}
                    variant={saveVariant}
                  >
                    {saveLabel}
                  </ZenButton>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

