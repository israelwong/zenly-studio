'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenInput } from '@/components/ui/zen';
import { crearTarjetaCredito } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';

export interface CrearTarjetaCreditoModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    /** Recibe el id de la tarjeta creada (opcional cuando se usa desde el gestor) */
    onSuccess?: (newCardId: string) => void;
    /** Z-index para uso anidado sobre otro modal (ej. 10070) */
    zIndex?: number;
}

export function CrearTarjetaCreditoModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess,
    zIndex,
}: CrearTarjetaCreditoModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError('El nombre es requerido');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await crearTarjetaCredito(studioSlug, { name: trimmed });
            if (result.success && result.data?.id) {
                toast.success('Tarjeta creada');
                onSuccess?.(result.data.id);
                onClose();
            } else {
                setError(result.error || 'Error al crear tarjeta');
            }
        } catch (err) {
            setError('Error al crear tarjeta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Añadir nueva tarjeta"
            description="Nombre de la tarjeta (ej. Nu, Banamex Platinum)"
            onSave={handleSubmit}
            saveLabel="Crear"
            saveVariant="primary"
            isLoading={loading}
            onCancel={onClose}
            cancelLabel="Cancelar"
            maxWidth="sm"
            zIndex={zIndex}
        >
            <ZenInput
                label="Nombre de la tarjeta"
                hint="Se usará internamente para fines contables"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Nu, Banamex Platinum"
                required
                error={error ?? undefined}
                autoFocus
            />
        </ZenDialog>
    );
}
