'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ZenDialog } from '@/components/ui/zen';
import { ZenInput } from '@/components/ui/zen';
import { ZenButton } from '@/components/ui/zen';
import { actualizarEventoInfo } from '@/lib/actions/cliente/eventos.actions';
import type { ClientEventDetail } from '@/types/client';

interface EventInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    clientId: string;
    initialName: string | null;
    initialLocation: string | null;
    onUpdate?: () => void;
}

export function EventInfoModal({
    isOpen,
    onClose,
    eventId,
    clientId,
    initialName,
    initialLocation,
    onUpdate,
}: EventInfoModalProps) {
    const [name, setName] = useState(initialName || '');
    const [location, setLocation] = useState(initialLocation || '');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; location?: string }>({});

    useEffect(() => {
        if (isOpen) {
            setName(initialName || '');
            setLocation(initialLocation || '');
            setErrors({});
        }
    }, [isOpen, initialName, initialLocation]);

    const handleSave = async () => {
        setErrors({});

        // Validaciones
        if (name.trim().length > 200) {
            setErrors({ name: 'El nombre no puede exceder 200 caracteres' });
            return;
        }

        if (location.trim().length > 500) {
            setErrors({ location: 'La sede no puede exceder 500 caracteres' });
            return;
        }

        // Normalizar valores para comparación
        const normalizeValue = (value: string | null | undefined): string | null => {
            if (value === null || value === undefined) return null;
            const trimmed = value.trim();
            return trimmed === '' ? null : trimmed;
        };

        const normalizedName = normalizeValue(name);
        const normalizedLocation = normalizeValue(location);
        const normalizedInitialName = normalizeValue(initialName);
        const normalizedInitialLocation = normalizeValue(initialLocation);

        // Solo enviar campos que realmente cambiaron
        const updateData: { name?: string | null; event_location?: string | null } = {};
        
        if (normalizedName !== normalizedInitialName) {
            updateData.name = normalizedName;
        }
        
        if (normalizedLocation !== normalizedInitialLocation) {
            updateData.event_location = normalizedLocation;
        }

        // Si no hay cambios, no hacer nada
        if (Object.keys(updateData).length === 0) {
            toast.info('No hay cambios para guardar');
            onClose();
            return;
        }

        setIsSaving(true);
        const loadingToast = toast.loading('Actualizando información del evento...');

        try {
            const result = await actualizarEventoInfo(eventId, clientId, updateData);

            toast.dismiss(loadingToast);

            if (result.success) {
                toast.success('Información del evento actualizada exitosamente');
                if (onUpdate) {
                    onUpdate();
                }
                onClose();
            } else {
                toast.error(result.message || 'Error al actualizar la información del evento');
                setErrors({ name: result.message });
            }
        } catch (error) {
            console.error('Error al actualizar evento:', error);
            toast.dismiss(loadingToast);
            toast.error('Error al actualizar la información del evento. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Editar Información del Evento"
            description="Actualiza los datos básicos de tu evento"
            maxWidth="md"
            onCancel={onClose}
            cancelLabel="Cancelar"
            onSave={handleSave}
            saveLabel="Guardar"
            isLoading={isSaving}
        >
            <div className="space-y-4">
                <ZenInput
                    label="Nombre del evento"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Boda de Juan y María"
                    disabled={isSaving}
                    error={errors.name}
                    maxLength={200}
                />

                <ZenInput
                    label="Sede del evento"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Hotel Grand, Salón Principal"
                    disabled={isSaving}
                    error={errors.location}
                    maxLength={500}
                />
            </div>
        </ZenDialog>
    );
}

