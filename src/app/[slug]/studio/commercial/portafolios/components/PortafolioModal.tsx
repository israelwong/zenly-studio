'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Portafolio, PortafolioFormData } from '../types';

interface PortafolioModalProps {
    isOpen: boolean;
    onClose: () => void;
    portfolio: Portafolio | null;
    onSave: (data: PortafolioFormData) => void;
}

export function PortafolioModal({ isOpen, onClose, portfolio, onSave }: PortafolioModalProps) {
    const [formData, setFormData] = useState<PortafolioFormData>({
        title: '',
        description: '',
        category: '',
        cover_image_url: ''
    });

    const [errors, setErrors] = useState<Partial<PortafolioFormData>>({});

    // Cargar datos del portafolio cuando se abre el modal
    useEffect(() => {
        if (portfolio) {
            setFormData({
                title: portfolio.title,
                description: portfolio.description || '',
                category: portfolio.category || '',
                cover_image_url: portfolio.cover_image_url || ''
            });
        } else {
            setFormData({
                title: '',
                description: '',
                category: '',
                cover_image_url: ''
            });
        }
        setErrors({});
    }, [portfolio, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validación básica
        const newErrors: Partial<PortafolioFormData> = {};
        if (!formData.title.trim()) {
            newErrors.title = 'El título es requerido';
        }
        if (!formData.category.trim()) {
            newErrors.category = 'La categoría es requerida';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave(formData);
    };

    const handleInputChange = (field: keyof PortafolioFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {portfolio ? 'Editar Portafolio' : 'Nuevo Portafolio'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ZenInput
                            label="Título del Portafolio"
                            name="title"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            required
                            error={errors.title}
                            placeholder="Ej: Bodas 2024"
                        />

                        <ZenInput
                            label="Categoría"
                            name="category"
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            required
                            error={errors.category}
                            placeholder="Ej: Bodas, Quinceañeras, Retratos"
                        />
                    </div>

                    <ZenTextarea
                        label="Descripción"
                        name="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe tu portafolio y qué tipo de trabajos incluye..."
                        rows={3}
                    />

                    <ZenInput
                        label="URL de Imagen de Portada"
                        name="cover_image_url"
                        value={formData.cover_image_url}
                        onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        hint="URL de la imagen que representará este portafolio"
                    />

                    {/* Preview de la imagen si existe */}
                    {formData.cover_image_url && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Vista Previa</label>
                            <div className="w-full h-32 bg-zinc-800 rounded-lg overflow-hidden">
                                <img
                                    src={formData.cover_image_url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                        >
                            {portfolio ? 'Actualizar' : 'Crear'} Portafolio
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

