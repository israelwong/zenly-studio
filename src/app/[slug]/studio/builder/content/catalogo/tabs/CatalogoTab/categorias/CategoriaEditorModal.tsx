"use client";

import React, { useState, useEffect } from "react";
import { ZenButton, ZenInput, ZenCard } from "@/components/ui/zen";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { toast } from "sonner";

interface CategoriaEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CategoriaFormData) => Promise<void>;
    studioSlug?: string;
    categoria?: {
        id: string;
        name: string;
    } | null;
}

export interface CategoriaFormData {
    id?: string;
    name: string;
}

/**
 * Modal para crear o editar una categoría del catálogo
 * Modo CREATE: categoria = null
 * Modo EDIT: categoria = { id, name }
 */
export function CategoriaEditorModal({
    isOpen,
    onClose,
    onSave,
    studioSlug = "default",
    categoria,
}: CategoriaEditorModalProps) {
    const [formData, setFormData] = useState<CategoriaFormData>({
        name: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditMode = !!categoria;

    // Cargar datos si es modo edición
    useEffect(() => {
        if (categoria) {
            setFormData({
                id: categoria.id,
                name: categoria.name,
            });
        } else {
            setFormData({
                name: "",
            });
        }
        setErrors({});
    }, [categoria, isOpen]);

    const handleChange = (field: keyof CategoriaFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
                isEditMode ? "Categoría actualizada correctamente" : "Categoría creada correctamente"
            );
            onClose();
        } catch (error) {
            console.error("Error guardando categoría:", error);
            toast.error(
                error instanceof Error ? error.message : "Error al guardar la categoría"
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
                    <DialogTitle className="text-xl font-bold text-zinc-100">
                        {isEditMode ? "Editar Categoría" : "Nueva Categoría"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Nombre */}
                    <div>
                        <ZenInput
                            label="Nombre de la categoría"
                            name="name"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="Ej: Retratos"
                            required
                            error={errors.name}
                            disabled={isSaving}
                            maxLength={100}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            {formData.name.length}/100 caracteres
                        </p>
                    </div>

                    {/* Información adicional */}
                    <ZenCard className="p-3 bg-zinc-800/50 border-zinc-700">
                        <p className="text-xs text-zinc-400">
                            💡 <strong>Tip:</strong> Las categorías te permiten agrupar servicios dentro de una sección
                        </p>
                    </ZenCard>

                    {/* Botones de acción */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                        <ZenButton
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            disabled={isSaving}
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                            loading={isSaving}
                            loadingText={isEditMode ? "Actualizando..." : "Creando..."}
                        >
                            {isEditMode ? "Actualizar" : "Crear Categoría"}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
