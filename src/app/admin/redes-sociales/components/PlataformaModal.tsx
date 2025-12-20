'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Switch } from '@/components/ui/shadcn/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { createPlataformaRedSocial, updatePlataformaRedSocial } from '../actions';

interface PlataformaRedSocial {
    id: string;
    nombre: string;
    slug: string;
    descripcion: string | null;
    color: string | null;
    icono: string | null;
    urlBase: string | null;
    orden: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface PlataformaModalProps {
    isOpen: boolean;
    onClose: () => void;
    plataforma?: PlataformaRedSocial | null;
    onSuccess?: () => void;
}

export function PlataformaModal({ isOpen, onClose, plataforma, onSuccess }: PlataformaModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        slug: '',
        descripcion: '',
        color: '#3B82F6',
        icono: '',
        urlBase: '',
        orden: 1,
        isActive: true
    });

    // Actualizar el formulario cuando cambie la plataforma a editar
    useEffect(() => {
        if (plataforma) {
            setFormData({
                nombre: plataforma.nombre || '',
                slug: plataforma.slug || '',
                descripcion: plataforma.descripcion || '',
                color: plataforma.color || '#3B82F6',
                icono: plataforma.icono || '',
                urlBase: plataforma.urlBase || '',
                orden: plataforma.orden || 1,
                isActive: plataforma.isActive
            });
        } else {
            setFormData({
                nombre: '',
                slug: '',
                descripcion: '',
                color: '#3B82F6',
                icono: '',
                urlBase: '',
                orden: 1,
                isActive: true
            });
        }
    }, [plataforma, isOpen]);

    // Generar slug automáticamente desde el nombre
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const form = new FormData();
            form.append('nombre', formData.nombre);
            form.append('slug', formData.slug || generateSlug(formData.nombre));
            form.append('descripcion', formData.descripcion);
            form.append('color', formData.color);
            form.append('icono', formData.icono);
            form.append('urlBase', formData.urlBase);
            form.append('orden', formData.orden.toString());
            form.append('isActive', formData.isActive.toString());

            const result = plataforma
                ? await updatePlataformaRedSocial(plataforma.id, form)
                : await createPlataformaRedSocial(form);

            if (!result.success) {
                console.error('Error:', result.error);
                // TODO: Mostrar toast de error
                return;
            }

            onClose();
            setFormData({
                nombre: '',
                slug: '',
                descripcion: '',
                color: '#3B82F6',
                icono: '',
                urlBase: '',
                orden: 1,
                isActive: true
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            nombre: '',
            slug: '',
            descripcion: '',
            color: '#3B82F6',
            icono: '',
            urlBase: '',
            orden: 1,
            isActive: true
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        {plataforma ? 'Editar Plataforma' : 'Nueva Plataforma'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {plataforma
                            ? 'Modifica los datos de la plataforma de red social'
                            : 'Crea una nueva plataforma de red social para los estudios'
                        }
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <ZenInput
                            id="nombre"
                            label="Nombre"
                            required
                            value={formData.nombre}
                            onChange={(e) => {
                                const nombre = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    nombre,
                                    slug: prev.slug || generateSlug(nombre)
                                }));
                            }}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="Ej: Facebook"
                        />

                        <ZenInput
                            id="slug"
                            label="Slug"
                            required
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="facebook"
                        />

                        <div className="grid gap-2">
                            <Label htmlFor="descripcion" className="text-white">
                                Descripción
                            </Label>
                            <Textarea
                                id="descripcion"
                                value={formData.descripcion}
                                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                placeholder="Descripción de la plataforma..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="color" className="text-white">
                                    Color
                                </Label>
                                <div className="flex items-center space-x-2">
                                    <ZenInput
                                        id="color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                        className="w-16 h-10 bg-zinc-800 border-zinc-700"
                                    />
                                    <ZenInput
                                        value={formData.color}
                                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                        placeholder="#3B82F6"
                                    />
                                </div>
                            </div>

                            <ZenInput
                                id="icono"
                                label="Icono"
                                value={formData.icono}
                                onChange={(e) => setFormData(prev => ({ ...prev, icono: e.target.value }))}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                placeholder="facebook"
                            />
                        </div>

                        <ZenInput
                            id="urlBase"
                            label="URL Base"
                            value={formData.urlBase}
                            onChange={(e) => setFormData(prev => ({ ...prev, urlBase: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="https://facebook.com/"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <ZenInput
                                id="orden"
                                label="Orden"
                                type="number"
                                value={formData.orden}
                                onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 1 }))}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                min="1"
                            />

                            <div className="flex items-center space-x-2 pt-6">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                                />
                                <Label htmlFor="isActive" className="text-white">
                                    Activa
                                </Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isLoading ? 'Guardando...' : (plataforma ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
