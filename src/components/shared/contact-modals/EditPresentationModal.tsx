'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenTextarea } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditPresentationModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    currentValue: string | null;
    onSuccess?: () => void;
}

export function EditPresentationModal({
    isOpen,
    onClose,
    studioSlug,
    currentValue,
    onSuccess
}: EditPresentationModalProps) {
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(currentValue || '');
    }, [currentValue, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Llamar directamente a prisma update via Server Action
            const { updateStudioPresentation } = await import('@/lib/actions/studio/profile/identidad');
            const result = await updateStudioPresentation(studioSlug, value.trim() || null);

            if (result.success) {
                toast.success('Presentación actualizada');
                
                // Ejecutar onSuccess primero para refrescar datos
                onSuccess?.();
                
                // Esperar un momento para que se refleje la actualización antes de cerrar
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Cerrar modal después de que se vea la actualización
                onClose();
            } else {
                toast.error(result.error || 'Error al actualizar');
                setSaving(false);
            }
        } catch (error) {
            console.error('Error updating presentation:', error);
            toast.error('Error al actualizar');
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-400" />
                        Editar Presentación
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <ZenTextarea
                        label="Descripción de tu negocio"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Describe brevemente tu estudio fotográfico..."
                        rows={4}
                        maxLength={500}
                        disabled={saving}
                    />

                    <div className="flex gap-3 pt-4">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                            disabled={saving}
                            className="flex-1"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Actualizando...
                                </>
                            ) : (
                                'Guardar'
                            )}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
