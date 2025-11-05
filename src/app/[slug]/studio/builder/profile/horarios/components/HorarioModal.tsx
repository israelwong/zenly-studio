'use client';

import React, { useState, useEffect } from 'react';
import { Horario } from '../../types';
import { ZenButton } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Clock } from 'lucide-react';

interface HorarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (horario: Horario) => void;
    horario?: Horario;
}

const DIAS_SEMANA = [
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
];

export function HorarioModal({ isOpen, onClose, onSave, horario }: HorarioModalProps) {
    const [formData, setFormData] = useState({
        day_of_week: '',
        start_time: '',
        end_time: '',
        is_active: true
    });

    useEffect(() => {
        if (horario) {
            setFormData({
                day_of_week: horario.dia || '',
                start_time: horario?.apertura ?? '',
                end_time: horario?.cierre ?? '',
                is_active: !horario.cerrado
            });
        } else {
            setFormData({
                day_of_week: '',
                start_time: '',
                end_time: '',
                is_active: true
            });
        }
    }, [horario, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.day_of_week.trim()) return;

        const horarioData: Horario = {
            id: horario?.id,
            dia: formData.day_of_week as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
            ...(formData.is_active && formData.start_time && { apertura: formData.start_time }),
            ...(formData.is_active && formData.end_time && { cierre: formData.end_time }),
            cerrado: !formData.is_active
        };

        onSave(horarioData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-400" />
                        {horario ? 'Editar Horario' : 'Agregar Horario'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-300">Día de la Semana</label>
                        <select
                            value={formData.day_of_week}
                            onChange={(e) => setFormData(prev => ({ ...prev, day_of_week: e.target.value }))}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Selecciona un día</option>
                            {DIAS_SEMANA.map(dia => (
                                <option key={dia.value} value={dia.value}>{dia.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-zinc-300">Horario activo</span>
                        </label>
                    </div>

                    {formData.is_active && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Hora de Apertura</label>
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Hora de Cierre</label>
                                <input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

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
                            {horario ? 'Actualizar' : 'Agregar'}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
