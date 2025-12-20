'use client';

import React, { useState, useEffect } from 'react';
import { Telefono } from '../../types';
import { ZenButton, ZenInput, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Phone, X } from 'lucide-react';

interface TelefonoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (telefono: Telefono) => void;
    telefono?: Telefono;
}

export function TelefonoModal({ isOpen, onClose, onSave, telefono }: TelefonoModalProps) {
    const [formData, setFormData] = useState({
        numero: '',
        etiqueta: '',
        tipo: 'ambos' as 'llamadas' | 'whatsapp' | 'ambos'
    });

    useEffect(() => {
        if (telefono) {
            setFormData({
                numero: telefono.numero,
                etiqueta: telefono.etiqueta || '',
                tipo: telefono.tipo
            });
        } else {
            setFormData({
                numero: '',
                etiqueta: '',
                tipo: 'ambos'
            });
        }
    }, [telefono, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.numero.trim()) return;

        // Validar que el número tenga al menos 7 dígitos (número mínimo válido)
        const digitos = formData.numero.replace(/\D/g, '');
        if (digitos.length < 7) {
            alert('El número de teléfono debe tener al menos 7 dígitos');
            return;
        }

        const telefonoData: Telefono = {
            id: telefono?.id,
            numero: formData.numero.trim(),
            etiqueta: formData.etiqueta.trim() || undefined,
            tipo: formData.tipo
        };

        onSave(telefonoData);
        onClose();
    };

    const handleTipoChange = (tipo: 'llamadas' | 'whatsapp') => {
        const currentTipo = formData.tipo;

        if (currentTipo === 'ambos') {
            // Si estaba en ambos, quitar el tipo seleccionado
            setFormData(prev => ({ ...prev, tipo: tipo === 'llamadas' ? 'whatsapp' : 'llamadas' }));
        } else if (currentTipo === tipo) {
            // Si era el mismo tipo, cambiar a ambos
            setFormData(prev => ({ ...prev, tipo: 'ambos' }));
        } else {
            // Si era el otro tipo, cambiar a ambos
            setFormData(prev => ({ ...prev, tipo: 'ambos' }));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-green-400" />
                        {telefono ? 'Editar Teléfono' : 'Agregar Teléfono'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <ZenInput
                        label="Etiqueta (opcional)"
                        name="etiqueta"
                        type="text"
                        value={formData.etiqueta}
                        onChange={(e) => setFormData(prev => ({ ...prev, etiqueta: e.target.value }))}
                        placeholder="Recepción, Ventas, Personal..."
                        hint="Ejemplo: Recepción, Ventas, WhatsApp Atención"
                    />

                    <ZenInput
                        label="Número de Teléfono"
                        name="numero"
                        type="tel"
                        value={formData.numero}
                        onChange={(e) => {
                            // Solo permitir números, espacios, +, -, (, )
                            const value = e.target.value.replace(/[^0-9\s+\-()]/g, '');
                            setFormData(prev => ({ ...prev, numero: value }));
                        }}
                        placeholder="+52 55 1234 5678"
                        required
                    />


                    <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-300 mb-5">Funcionalidad</label>
                        <div className="space-y-2">
                            <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-700/50">
                                <span>Llamadas</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.tipo === 'llamadas' || formData.tipo === 'ambos'}
                                        onChange={() => handleTipoChange('llamadas')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </label>

                            <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-700/50">
                                <span>WhatsApp</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.tipo === 'whatsapp' || formData.tipo === 'ambos'}
                                        onChange={() => handleTipoChange('whatsapp')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </label>
                        </div>
                    </div>

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
                            {telefono ? 'Actualizar' : 'Agregar'}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
