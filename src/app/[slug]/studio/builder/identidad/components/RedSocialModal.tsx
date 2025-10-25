'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton } from '@/components/ui/zen';
import { ZenInput } from '@/components/ui/zen';
import { ZenLabel } from '@/components/ui/zen';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Plus, Edit, CheckCircle, ExternalLink } from 'lucide-react';
import { Plataforma, RedSocial } from '../types/redes-sociales';

interface RedSocialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { plataformaId: string; url: string }) => Promise<void>;
    plataformas: Plataforma[];
    editingRed?: RedSocial | null;
    loading?: boolean;
}

export function RedSocialModal({
    isOpen,
    onClose,
    onSave,
    plataformas,
    editingRed,
    loading = false
}: RedSocialModalProps) {
    const [formData, setFormData] = useState({
        plataformaId: '',
        url: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditing = editingRed !== null;
    const modalTitle = isEditing ? 'Editar Red Social' : 'Agregar Nueva Red Social';
    const modalDescription = isEditing
        ? 'Modifica los datos de tu red social'
        : 'Añade una nueva red social a tu perfil';

    // Resetear formulario cuando se abre/cierra el modal o cambia la red social
    useEffect(() => {
        if (isOpen) {
            if (isEditing && editingRed) {
                setFormData({
                    plataformaId: editingRed.plataformaId || '',
                    url: editingRed.url || '',
                });
            } else {
                setFormData({
                    plataformaId: '',
                    url: '',
                });
            }
            setErrors({});
        }
    }, [isOpen, isEditing, editingRed]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.plataformaId) {
            newErrors.plataformaId = 'Debes seleccionar una plataforma';
        }

        if (!formData.url.trim()) {
            newErrors.url = 'La URL es obligatoria';
        } else {
            try {
                new URL(formData.url);
            } catch {
                newErrors.url = 'La URL no tiene un formato válido';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await onSave({
                plataformaId: formData.plataformaId,
                url: formData.url.trim(),
            });
        } catch (error) {
            console.error('Error saving red social:', error);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const selectedPlataforma = plataformas.find(p => p.id === formData.plataformaId);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center">
                            {isEditing ? (
                                <Edit className="h-4 w-4 text-blue-400" />
                            ) : (
                                <Plus className="h-4 w-4 text-blue-400" />
                            )}
                        </div>
                        {modalTitle}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {modalDescription}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* Selección de plataforma */}
                        <div className="space-y-2">
                            <ZenLabel htmlFor="plataforma" variant="required">
                                Plataforma
                            </ZenLabel>
                            <Select
                                value={formData.plataformaId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, plataformaId: value }))}
                                disabled={loading}
                            >
                                <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                                    <SelectValue placeholder="Selecciona una plataforma" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    {plataformas
                                        .filter(p => p.isActive)
                                        .sort((a, b) => a.order - b.order)
                                        .map((plataforma) => (
                                            <SelectItem
                                                key={plataforma.id}
                                                value={plataforma.id}
                                                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                                            >
                                                <div className="flex items-center gap-3 w-full">
                                                    <div
                                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: plataforma.color || '#6B7280' }}
                                                    ></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-white truncate">
                                                            {plataforma.name}
                                                        </div>
                                                        {plataforma.description && (
                                                            <div className="text-xs text-zinc-400 truncate">
                                                                {plataforma.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {errors.plataformaId && (
                                <p className="text-sm text-red-400">{errors.plataformaId}</p>
                            )}
                            {selectedPlataforma && (
                                <p className="text-xs text-zinc-500">
                                    {selectedPlataforma.description}
                                </p>
                            )}
                            <p className="text-xs text-zinc-600">
                                {plataformas.filter(p => p.isActive).length} plataformas disponibles
                            </p>
                        </div>

                        {/* URL */}
                        <div className="space-y-2">
                            <ZenLabel htmlFor="url" variant="required">
                                URL
                            </ZenLabel>
                            <ZenInput
                                id="url"
                                label=""
                                value={formData.url}
                                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                placeholder={selectedPlataforma?.baseUrl || "https://ejemplo.com"}
                                disabled={loading}
                                className="w-full"
                            />
                            {errors.url && (
                                <p className="text-sm text-red-400">{errors.url}</p>
                            )}
                            {selectedPlataforma?.baseUrl && (
                                <p className="text-xs text-zinc-500">
                                    Ejemplo: {selectedPlataforma.baseUrl}
                                </p>
                            )}
                        </div>

                        {/* Preview del enlace */}
                        {formData.url && selectedPlataforma && (
                            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                <div className="flex items-center gap-2 text-sm">
                                    <ExternalLink className="h-4 w-4 text-blue-400" />
                                    <span className="text-zinc-300">Vista previa:</span>
                                </div>
                                <p className="text-blue-400 text-sm mt-1 truncate">
                                    {formData.url}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                            className="hover:bg-zinc-700"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                            loading={loading}
                            disabled={!formData.plataformaId || !formData.url.trim() || loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {!loading && (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {isEditing ? 'Actualizar' : 'Agregar'}
                                </>
                            )}
                        </ZenButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
