'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateStudioName } from '@/lib/actions/studio/profile/identidad/identidad.actions';

interface EditStudioNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    currentValue: string;
    onSuccess?: () => void;
}

/**
 * Modal para editar el nombre del estudio (studio_name)
 * Patrón: Edición inline simple con validación
 * 
 * IMPORTANTE: 
 * - Edita studio_name (nombre del negocio)
 * - NO edita slug (identificador URL)
 * - slug permanece estable para SEO
 */
export function EditStudioNameModal({
    isOpen,
    onClose,
    studioSlug,
    currentValue,
    onSuccess
}: EditStudioNameModalProps) {
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
        if (!trimmedValue) {
            setError('El nombre es requerido');
            return;
        }

        if (trimmedValue.length < 3) {
            setError('El nombre debe tener al menos 3 caracteres');
            return;
        }

        if (trimmedValue === currentValue) {
            onClose();
            return;
        }

        setSaving(true);
        setError('');

        try {
            const result = await updateStudioName(studioSlug, {
                studio_name: trimmedValue
            });

            if (result.success) {
                toast.success('Nombre actualizado correctamente');
                onSuccess?.();
                onClose();
            } else {
                setError(result.error || 'Error al actualizar');
                toast.error(result.error || 'Error al actualizar');
            }
        } catch (err) {
            console.error('[EditStudioNameModal] Error:', err);
            const errorMsg = 'Error al actualizar el nombre';
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
                        <Building2 className="h-5 w-5 text-emerald-400" />
                        Editar Nombre del Estudio
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <ZenInput
                        label="Nombre del Estudio"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError('');
                        }}
                        placeholder="Ej: Estudio Fotográfico Luz"
                        maxLength={100}
                        error={error}
                        disabled={saving}
                        hint="Este nombre se mostrará en tu perfil público"
                    />

                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                        <p className="text-xs text-zinc-400">
                            <span className="text-emerald-400 font-medium">💡 Nota:</span> Tu URL pública ({studioSlug}) no cambiará. Solo se actualiza el nombre visible.
                        </p>
                    </div>

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
                            disabled={saving || !value.trim()}
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
