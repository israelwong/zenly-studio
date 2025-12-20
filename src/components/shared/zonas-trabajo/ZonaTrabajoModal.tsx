'use client';

import React, { useState, useEffect } from 'react';
import { ZonaTrabajo } from '../../types';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { MapPin } from 'lucide-react';

interface ZonaTrabajoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (zona: ZonaTrabajo) => void;
    zona?: ZonaTrabajo;
}


export function ZonaTrabajoModal({ isOpen, onClose, onSave, zona }: ZonaTrabajoModalProps) {
    const [formData, setFormData] = useState({
        nombre: ''
    });

    useEffect(() => {
        if (zona) {
            setFormData({
                nombre: zona.nombre
            });
        } else {
            setFormData({
                nombre: ''
            });
        }
    }, [zona, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre.trim()) return;

        const zonaData: ZonaTrabajo = {
            id: zona?.id,
            nombre: formData.nombre.trim()
        };

        onSave(zonaData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-purple-400" />
                        {zona ? 'Editar Zona de Trabajo' : 'Agregar Zona de Trabajo'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <ZenInput
                        label="Nombre de la Zona"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Ingresa el nombre de la zona"
                        required
                    />


                    <div className="flex gap-3 pt-4">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                            className="flex-1"
                        >
                            {zona ? 'Actualizar' : 'Agregar'}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
