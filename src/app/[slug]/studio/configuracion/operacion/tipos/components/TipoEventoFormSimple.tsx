'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { Switch } from '@/components/ui/shadcn/switch';
import { crearTipoEvento, actualizarTipoEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';

interface TipoEventoFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (tipo: TipoEventoData) => void;
    studioSlug: string;
    tipoEvento?: TipoEventoData | null;
}

export function TipoEventoForm({
    isOpen,
    onClose,
    studioSlug,
    onSuccess,
    tipoEvento,
}: TipoEventoFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        status: 'active' as 'active' | 'inactive',
    });

    // Cargar datos del tipo de evento si está editando, o resetear cuando se cierra/abre
    useEffect(() => {
        if (isOpen) {
            if (tipoEvento) {
                setFormData({
                    nombre: tipoEvento.nombre,
                    status: tipoEvento.status as 'active' | 'inactive',
                });
            } else {
                // Resetear formulario cuando se abre para crear nuevo
                setFormData({
                    nombre: '',
                    status: 'active',
                });
            }
        }
        // No resetear cuando se cierra para evitar parpadeos
        // El reset se hará cuando se abra de nuevo
    }, [tipoEvento, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre.trim()) {
            toast.error('El nombre es requerido');
            return;
        }

        setLoading(true);
        try {
            let result;
            if (tipoEvento) {
                result = await actualizarTipoEvento(tipoEvento.id, {
                    nombre: formData.nombre.trim(),
                    status: formData.status,
                });
            } else {
                result = await crearTipoEvento(studioSlug, {
                    nombre: formData.nombre.trim(),
                    status: formData.status,
                });
            }

            if (result.success && result.data) {
                // Solo mostrar toast y cerrar, el padre manejará el éxito
                onSuccess(result.data);
                // El padre cerrará el modal, no llamar onClose aquí para evitar conflictos
            } else {
                toast.error(result.error || 'Error al procesar la solicitud');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error inesperado. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Solo cerrar si se está cerrando (no cuando se abre)
            if (!open) {
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-[500px] bg-zinc-900 text-white border-zinc-700">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                        {tipoEvento ? 'Editar Tipo de Evento' : 'Nuevo Tipo de Evento'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {tipoEvento
                            ? 'Modifica los datos del tipo de evento'
                            : 'Crea un nuevo tipo de evento para organizar tus paquetes'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">
                            Nombre del Tipo de Evento *
                        </label>
                        <ZenInput
                            value={formData.nombre}
                            onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                            placeholder="Ej: Bodas, XV Años, Bautizos..."
                            required
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>

                    {/* Estado */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-300">
                                Estado
                            </label>
                            <p className="text-xs text-zinc-400">
                                {formData.status === 'active' ? 'El tipo de evento está activo' : 'El tipo de evento está inactivo'}
                            </p>
                        </div>
                        <Switch
                            checked={formData.status === 'active'}
                            onCheckedChange={(checked) =>
                                setFormData(prev => ({
                                    ...prev,
                                    status: checked ? 'active' : 'inactive'
                                }))
                            }
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            loading={loading}
                            disabled={!formData.nombre.trim()}
                        >
                            {tipoEvento ? 'Actualizar' : 'Crear'} Tipo de Evento
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
