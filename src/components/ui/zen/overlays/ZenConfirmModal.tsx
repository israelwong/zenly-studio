'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogOverlay,
} from '@/components/ui/shadcn/dialog';
import { ZenButton } from '@/components/ui/zen';
import { AlertTriangle } from 'lucide-react';

interface ZenConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string | React.ReactNode;
    /** Label/descripción que va en el header (debajo del título) */
    headerDescription?: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    loading?: boolean;
    loadingText?: string;
    disabled?: boolean;
    hideConfirmButton?: boolean;
    zIndex?: number;
    /** Clase adicional para el contenido (ej. sm:max-w-xl para modal más ancho) */
    contentClassName?: string;
}

export function ZenConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    headerDescription,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'destructive',
    loading = false,
    loadingText = 'Procesando...',
    disabled = false,
    hideConfirmButton = false,
    zIndex = 10300,
    contentClassName,
}: ZenConfirmModalProps) {
    const handleConfirm = () => {
        onConfirm();
    };

    const handleOpenChange = (open: boolean) => {
        // No cerrar si está en estado de loading
        if (!open && loading) {
            return;
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className={`sm:max-w-md bg-zinc-900 border-zinc-700 ${contentClassName ?? ''}`}
                overlayZIndex={zIndex - 1}
            >
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className={`shrink-0 p-2 rounded-full ${variant === 'destructive'
                            ? 'bg-red-900/20 text-red-400'
                            : 'bg-blue-900/20 text-blue-400'
                            }`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-white text-lg font-semibold leading-none">
                                {title}
                            </DialogTitle>
                            {headerDescription != null && (
                                typeof headerDescription === 'string' ? (
                                    <DialogDescription className="text-zinc-400 text-sm mt-1.5">
                                        {headerDescription}
                                    </DialogDescription>
                                ) : (
                                    <div className="text-sm text-zinc-400 mt-1.5">
                                        {headerDescription}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                    {headerDescription == null ? (
                        typeof description === 'string' ? (
                            <DialogDescription className="text-zinc-400 text-sm">
                                {description}
                            </DialogDescription>
                        ) : (
                            <div className="text-sm text-zinc-400 pt-0">
                                {description}
                            </div>
                        )
                    ) : (
                        typeof description === 'string' ? (
                            <p className="text-sm text-zinc-400">{description}</p>
                        ) : (
                            <div className="text-sm text-zinc-400 pt-0">{description}</div>
                        )
                    )}
                </DialogHeader>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <ZenButton
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        fullWidth
                        className="sm:w-auto border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                    >
                        {cancelText}
                    </ZenButton>
                    {!hideConfirmButton && (
                        <ZenButton
                            variant={variant === 'destructive' ? 'destructive' : 'primary'}
                            onClick={handleConfirm}
                            loading={loading}
                            loadingText={loadingText}
                            fullWidth
                            className={`sm:w-auto ${variant === 'destructive'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            disabled={disabled}
                        >
                            {confirmText}
                        </ZenButton>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
