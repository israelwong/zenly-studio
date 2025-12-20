"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/shadcn/button";
import { ZenInput } from "@/components/ui/zen";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { Switch } from "@/components/ui/shadcn/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/shadcn/dialog";
import {
    Save,
    X,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Service, ServiceCategory } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    service?: Service | null;
    onSave: (service: Service) => void;
    existingServices?: Service[];
    categories?: ServiceCategory[];
}

export function ServiceModal({ isOpen, onClose, service, onSave, existingServices = [], categories = [] }: ServiceModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        categoryId: '',
        active: true
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (service) {
                setFormData({
                    name: service.name,
                    slug: service.slug,
                    description: service.description || '',
                    categoryId: service.categoryId || '',
                    active: service.active
                });
            } else {
                setFormData({
                    name: '',
                    slug: '',
                    description: '',
                    categoryId: '',
                    active: true
                });
            }
        }
    }, [isOpen, service]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Auto-generar slug desde el nombre
        if (field === 'name' && typeof value === 'string') {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .trim();
            setFormData(prev => ({
                ...prev,
                slug
            }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error('El nombre es requerido');
            return;
        }

        if (!formData.slug.trim()) {
            toast.error('El slug es requerido');
            return;
        }

        if (categories.length === 0) {
            toast.error('No hay categorías disponibles. Crea una categoría primero.');
            return;
        }

        // Validar slug único
        const isSlugDuplicate = existingServices.some(s =>
            s.slug === formData.slug && s.id !== service?.id
        );

        if (isSlugDuplicate) {
            toast.error('Ya existe un servicio con ese slug');
            return;
        }

        setIsLoading(true);

        try {
            const url = service ? `/api/services/${service.id}` : '/api/services';
            const method = service ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al guardar servicio');
            }

            const savedService = await response.json();

            // Actualización local inmediata
            onSave(savedService);

        } catch (error) {
            console.error('Error saving service:', error);
            toast.error(error instanceof Error ? error.message : 'Error al guardar servicio');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {service ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Información */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-medium mb-1">Información del Servicio</p>
                                <p>Los servicios definen las funcionalidades que pueden tener límites en los planes de suscripción.</p>
                            </div>
                        </div>
                    </div>

                    {/* Formulario */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <ZenInput
                                id="name"
                                label="Nombre del Servicio"
                                placeholder="ej: Catálogos, Proyectos Aprobados"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                            />
                            <div>
                                <ZenInput
                                    id="slug"
                                    label="Slug (identificador único)"
                                    placeholder="ej: catalogos, proyectos_aprobados"
                                    value={formData.slug}
                                    onChange={(e) => handleInputChange('slug', e.target.value)}
                                />
                                {formData.slug && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {existingServices.some(s =>
                                            s.slug === formData.slug && s.id !== service?.id
                                        ) ? (
                                            <span className="text-red-500">⚠️ Este slug ya está en uso</span>
                                        ) : (
                                            <span className="text-green-500">✅ Slug disponible</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description" className="mb-2 block">Descripción</Label>
                            <Textarea
                                id="description"
                                placeholder="Descripción del servicio y su propósito"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="categoryId" className="mb-2 block">Categoría</Label>
                            <Select
                                value={formData.categoryId}
                                onValueChange={(value) => handleInputChange('categoryId', value === 'no-category' ? '' : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-category">
                                        Sin categoría
                                    </SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="active"
                                checked={formData.active}
                                onCheckedChange={(checked) => handleInputChange('active', checked)}
                            />
                            <Label htmlFor="active" className="mb-0">Servicio activo</Label>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                {service ? 'Actualizar' : 'Crear'} Servicio
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
