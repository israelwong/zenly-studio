'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateStudioSlogan } from '@/lib/actions/studio/profile/identidad/identidad.actions';

interface EditSloganModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    currentValue: string | null;
    onSuccess?: () => void;
}

/**
 * Modal para editar el slogan del estudio
 * Patrón: Edición inline simple con campo opcional
 */
export function EditSloganModal({
    isOpen,
    onClose,
    studioSlug,
    currentValue,
    onSuccess
}: EditSloganModalProps) {
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValue(currentValue || '');
            setError('');
        }
    }, [currentValue, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedValue = value.trim();

        // Validación local
        if (trimmedValue.length > 200) {
            setError('El slogan es muy largo (máximo 200 caracteres)');
            return;
        }

        // Si no cambió, cerrar
        if (trimmedValue === (currentValue || '')) {
            onClose();
            return;
        }

        setSaving(true);
        setError('');

        try {
            const result = await updateStudioSlogan(studioSlug, {
                slogan: trimmedValue || null
            });

            if (result.success) {
                toast.success(trimmedValue ? 'Slogan actualizado' : 'Slogan eliminado');
                onSuccess?.();
                onClose();
            } else {
                setError(result.error || 'Error al actualizar');
                toast.error(result.error || 'Error al actualizar');
            }
        } catch (err) {
            console.error('[EditSloganModal] Error:', err);
            const errorMsg = 'Error al actualizar el slogan';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-emerald-400" />
                        Editar Slogan
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <ZenInput
                        label="Slogan"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError('');
                        }}
                        placeholder="Ej: Capturamos tus mejores momentos"
                        maxLength={200}
                        error={error}
                        disabled={saving}
                        hint="Frase corta que describe tu estudio (opcional)"
                    />

                    <div className="flex gap-3 pt-2">
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
                                    Guardando...
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
