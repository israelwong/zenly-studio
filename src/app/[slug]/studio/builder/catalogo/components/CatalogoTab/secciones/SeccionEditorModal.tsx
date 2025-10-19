"use client";

import React, { useState, useEffect } from "react";
import { ZenButton, ZenInput, ZenCard, ZenTextarea } from "@/components/ui/zen";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { X } from "lucide-react";
import { toast } from "sonner";

interface SeccionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SeccionFormData) => Promise<void>;
    seccion?: {
        id: string;
        name: string;
        description?: string | null;
        order: number;
    } | null;
}

export interface SeccionFormData {
    id?: string;
    name: string;
    description?: string;
}

/**
 * Modal para crear o editar una sección del catálogo
 * Modo CREATE: seccion = null
 * Modo EDIT: seccion = { id, name, ... }
 */
export function SeccionEditorModal({
    isOpen,
    onClose,
    onSave,
    seccion,
}: SeccionEditorModalProps) {
    const [formData, setFormData] = useState<SeccionFormData>({
        name: "",
        description: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditMode = !!seccion;

    // Cargar datos si es modo edición
    useEffect(() => {
        if (seccion) {
            setFormData({
                id: seccion.id,
                name: seccion.name,
                description: seccion.description || "",
            });
        } else {
            setFormData({
                name: "",
                description: "",
            });
        }
        setErrors({});
    }, [seccion, isOpen]);

    const handleChange = (field: keyof SeccionFormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Limpiar error del campo
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "El nombre es requerido";
        } else if (formData.name.length > 100) {
            newErrors.name = "Máximo 100 caracteres";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Por favor corrige los errores del formulario");
            return;
        }

        setIsSaving(true);

        try {
            await onSave(formData);
            toast.success(
                isEditMode ? "Sección actualizada correctamente" : "Sección creada correctamente"
            );
            onClose();
        } catch (error) {
            console.error("Error guardando sección:", error);
            toast.error(
                error instanceof Error ? error.message : "Error al guardar la sección"
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (!isSaving) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center justify-between">
                        {isEditMode ? "Editar Sección" : "Nueva Sección"}
                        <button
                            onClick={handleClose}
                            disabled={isSaving}
                            className="text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Nombre */}
                    <div>
                        <ZenInput
                            label="Nombre de la sección"
                            name="name"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="Ej: Fotografía Profesional"
                            required
                            error={errors.name}
                            disabled={isSaving}
                            maxLength={100}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            {formData.name.length}/100 caracteres
                        </p>
                    </div>

                    {/* Descripción */}
                    <div>
                        <ZenTextarea
                            label="Descripción"
                            name="description"
                            value={formData.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("description", e.target.value)}
                            placeholder="Describe esta sección del catálogo..."
                            minRows={3}
                            maxLength={500}
                            disabled={isSaving}
                            hint="Describe brevemente el propósito de esta sección"
                            error={errors.description}
                        />
                    </div>

                    {/* Información adicional */}
                    <ZenCard className="p-3 bg-zinc-800/50 border-zinc-700">
                        <p className="text-xs text-zinc-400">
                            💡 <strong>Tip:</strong> Las secciones te ayudan a organizar tu catálogo en
                            grupos principales como Fotografía, Álbumes, Videos, etc.
                        </p>
                    </ZenCard>

                    {/* Botones de acción */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                        <ZenButton
                            type="submit"
                            variant="primary"
                            loading={isSaving}
                            loadingText={isEditMode ? "Actualizando..." : "Creando..."}
                        >
                            {isEditMode ? "Actualizar" : "Crear Sección"}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

