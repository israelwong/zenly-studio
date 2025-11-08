'use client';

import React from 'react';
import { X } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

export interface ZenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
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
  showCloseButton = true
}: ZenDialogProps) {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className={cn(
        'bg-zinc-900 rounded-lg shadow-xl w-full overflow-visible',
        maxWidthClasses[maxWidth]
      )}>
        {/* Header */}
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
        </ZenCardHeader>

        {/* Content */}
        <ZenCardContent className="p-6 overflow-visible">
          {children}
        </ZenCardContent>

        {/* Footer */}
        {(onSave || onCancel) && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-700">
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
        )}
      </div>
    </div>
  );
}

