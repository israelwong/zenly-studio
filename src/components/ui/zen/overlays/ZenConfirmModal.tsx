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

    const iconBg = variant === 'destructive'
        ? 'bg-red-500/10 border-red-500/30 text-red-400'
        : 'bg-blue-500/10 border-blue-500/30 text-blue-400';

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className={`sm:max-w-md bg-zinc-900 border border-zinc-700/80 shadow-xl shadow-black/30 overflow-hidden ${contentClassName ?? ''}`}
                overlayZIndex={zIndex - 1}
            >
                <DialogHeader className="space-y-0">
                    <div className={`flex items-start gap-4 p-4 border-l-4 ${variant === 'destructive' ? 'border-red-500/60 bg-red-950/20' : 'border-blue-500/60 bg-blue-950/20'}`}>
                        <div className={`shrink-0 p-2.5 border ${iconBg}`}>
                            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <DialogTitle className="text-white text-base font-semibold tracking-tight">
                                {title}
                            </DialogTitle>
                            {headerDescription != null && (
                                typeof headerDescription === 'string' ? (
                                    <DialogDescription className="text-zinc-400 text-sm mt-1 leading-relaxed">
                                        {headerDescription}
                                    </DialogDescription>
                                ) : (
                                    <div className="text-sm text-zinc-400 mt-1 leading-relaxed">
                                        {headerDescription}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                    <div className="px-4 pb-4 pt-3">
                        {headerDescription == null ? (
                            typeof description === 'string' ? (
                                <DialogDescription className="text-zinc-300 text-sm leading-relaxed">
                                    {description}
                                </DialogDescription>
                            ) : (
                                <div className="text-sm text-zinc-300 leading-relaxed">
                                    {description}
                                </div>
                            )
                        ) : (
                            typeof description === 'string' ? (
                                <p className="text-sm text-zinc-300 leading-relaxed">{description}</p>
                            ) : (
                                <div className="text-sm text-zinc-300 leading-relaxed">{description}</div>
                            )
                        )}
                    </div>
                </DialogHeader>

                <DialogFooter className="flex w-full flex-col-reverse sm:flex-row sm:justify-stretch gap-2 px-4 pb-4 pt-0 border-t border-zinc-700/50 pt-4">
                    <ZenButton
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        fullWidth
                        className="sm:flex-1 sm:min-w-0 border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-500"
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
                            className={`sm:flex-1 sm:min-w-0 min-w-0 overflow-hidden text-ellipsis ${variant === 'destructive'
                                ? 'bg-red-600 hover:bg-red-500 text-white border-0'
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-0'
                                }`}
                            disabled={disabled}
                        >
                            <span className="truncate block min-w-0">{confirmText}</span>
                        </ZenButton>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
