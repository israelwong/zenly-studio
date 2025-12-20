'use client';

import React from 'react';
import { X } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave?: () => void;
    onCancel?: () => void;
    saveLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
}

export function BaseModal({
    isOpen,
    onClose,
    title,
    children,
    onSave,
    onCancel,
    saveLabel = 'Guardar',
    cancelLabel = 'Cancelar',
    isLoading = false
}: BaseModalProps) {
    if (!isOpen) return null;

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <ZenCardHeader className="flex items-center justify-between border-b border-zinc-700">
                    <ZenCardTitle className="text-xl font-semibold text-zinc-300">
                        {title}
                    </ZenCardTitle>
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-300"
                    >
                        <X className="h-5 w-5" />
                    </ZenButton>
                </ZenCardHeader>

                {/* Content */}
                <ZenCardContent className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {children}
                </ZenCardContent>

                {/* Footer */}
                {(onSave || onCancel) && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700">
                        <ZenButton
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            {cancelLabel}
                        </ZenButton>
                        {onSave && (
                            <ZenButton
                                onClick={onSave}
                                disabled={isLoading}
                                loading={isLoading}
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
