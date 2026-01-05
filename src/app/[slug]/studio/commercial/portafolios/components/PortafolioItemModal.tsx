'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { PortafolioItem, PortafolioItemFormData, Portafolio } from '../types';
import { Image, Video } from 'lucide-react';

interface PortafolioItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: PortafolioItem | null;
    portfolio: Portafolio;
    onSave: (data: PortafolioItemFormData) => void;
}

export function PortafolioItemModal({ isOpen, onClose, item, portfolio, onSave }: PortafolioItemModalProps) {
    const [formData, setFormData] = useState<PortafolioItemFormData>({
        title: '',
        description: '',
        image_url: '',
        video_url: '',
        item_type: 'PHOTO'
    });

    const [errors, setErrors] = useState<Partial<PortafolioItemFormData>>({});

    // Cargar datos del item cuando se abre el modal
    useEffect(() => {
        if (item) {
            setFormData({
                title: item.title,
                description: item.description || '',
                image_url: item.image_url || '',
                video_url: item.video_url || '',
                item_type: item.item_type
            });
        } else {
            setFormData({
                title: '',
                description: '',
                image_url: '',
                video_url: '',
                item_type: 'PHOTO'
            });
        }
        setErrors({});
    }, [item, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validación básica
        const newErrors: Partial<PortafolioItemFormData> = {};
        if (!formData.title.trim()) {
            newErrors.title = 'El título es requerido';
        }
        if (formData.item_type === 'PHOTO' && !formData.image_url.trim()) {
            newErrors.image_url = 'La URL de imagen es requerida para fotos';
        }
        if (formData.item_type === 'VIDEO' && !formData.video_url.trim()) {
            newErrors.video_url = 'La URL de video es requerida para videos';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave(formData);
    };

    const handleInputChange = (field: keyof PortafolioItemFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleTypeChange = (type: 'PHOTO' | 'VIDEO') => {
        setFormData(prev => ({
            ...prev,
            item_type: type,
            // Limpiar URLs cuando cambie el tipo
            image_url: type === 'PHOTO' ? prev.image_url : '',
            video_url: type === 'VIDEO' ? prev.video_url : ''
        }));
        setErrors(prev => ({ ...prev, image_url: undefined, video_url: undefined }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {item ? 'Editar Item' : 'Nuevo Item'} - {portfolio.title}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <ZenInput
                        label="Título del Item"
                        name="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        required
                        error={errors.title}
                        placeholder="Ej: Ceremonia en la iglesia"
                    />

                    <ZenTextarea
                        label="Descripción"
                        name="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe este item del portafolio..."
                        rows={3}
                    />

                    {/* Selector de tipo */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Tipo de Contenido</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('PHOTO')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${formData.item_type === 'PHOTO'
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                        : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                                    }`}
                            >
                                <Image className="h-4 w-4" />
                                Foto
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('VIDEO')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${formData.item_type === 'VIDEO'
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                        : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                                    }`}
                            >
                                <Video className="h-4 w-4" />
                                Video
                            </button>
                        </div>
                    </div>

                    {/* Campos específicos según el tipo */}
                    {formData.item_type === 'PHOTO' ? (
                        <ZenInput
                            label="URL de Imagen"
                            name="image_url"
                            value={formData.image_url}
                            onChange={(e) => handleInputChange('image_url', e.target.value)}
                            required
                            error={errors.image_url}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            hint="URL de la imagen que quieres mostrar"
                        />
                    ) : (
                        <ZenInput
                            label="URL de Video"
                            name="video_url"
                            value={formData.video_url}
                            onChange={(e) => handleInputChange('video_url', e.target.value)}
                            required
                            error={errors.video_url}
                            placeholder="https://ejemplo.com/video.mp4"
                            hint="URL del video que quieres mostrar"
                        />
                    )}

                    {/* Preview del contenido si existe */}
                    {(formData.image_url || formData.video_url) && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Vista Previa</label>
                            <div className="w-full h-32 bg-zinc-800 rounded-lg overflow-hidden">
                                {formData.item_type === 'PHOTO' && formData.image_url ? (
                                    <img
                                        src={formData.image_url}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : formData.item_type === 'VIDEO' && formData.video_url ? (
                                    <video
                                        src={formData.video_url}
                                        className="w-full h-full object-cover"
                                        controls
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : null}
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
                            {item ? 'Actualizar' : 'Crear'} Item
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

