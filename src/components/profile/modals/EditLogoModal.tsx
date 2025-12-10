'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { ImageIcon } from 'lucide-react';
import { AvatarManager } from '@/components/shared/avatar';
import { updateStudioLogo } from '@/lib/actions/studio/profile/identidad/identidad.actions';
import { updateFavicon } from '@/hooks/useDynamicFavicon';

interface EditLogoModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    currentLogoUrl: string | null;
    onSuccess?: () => void;
}

/**
 * Modal para editar el logo del estudio
 * Usa AvatarManager compartido con crop interactivo
 * 
 * Features (heredadas de AvatarManager):
 * - Drag & drop
 * - Crop circular con zoom
 * - Preview en tiempo real
 * - Validación de tamaño y tipo
 * - SVG sin crop
 */
export function EditLogoModal({
    isOpen,
    onClose,
    studioSlug,
    currentLogoUrl,
    onSuccess
}: EditLogoModalProps) {
    const handleLogoUpdate = async (url: string) => {
        // AvatarManager envía '' cuando elimina, convertir a null
        const logoUrl = url === '' ? null : url;

        const result = await updateStudioLogo(studioSlug, { logo_url: logoUrl });

        if (result.success) {
            // Actualizar favicon inmediatamente (antes de cerrar modal)
            updateFavicon(logoUrl);

            // Cerrar modal PRIMERO, luego refrescar
            onClose();

            // Pequeño delay para asegurar que el modal se cierra antes del refresh
            setTimeout(() => {
                onSuccess?.();
            }, 100);
        } else {
            throw new Error(result.error || 'Error al actualizar logo');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-emerald-400" />
                        Editar Logo del Estudio
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 flex justify-center">
                    <AvatarManager
                        url={currentLogoUrl}
                        onUpdate={handleLogoUpdate}
                        studioSlug={studioSlug}
                        category="identidad"
                        subcategory="logos"
                        size="lg"
                        cropTitle="Ajustar Logo"
                        cropDescription="Arrastra y redimensiona para ajustar tu logo"
                        cropInstructions={[
                            "• Arrastra para mover el área de recorte",
                            "• Usa las esquinas para redimensionar",
                            "• El área circular será tu logo",
                            "• SVG se sube sin crop"
                        ]}
                        successMessage="Logo actualizado correctamente"
                        deleteMessage="Logo eliminado"
                        showAdjustButton={true}
                    />
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-400">
                        <span className="text-emerald-400 font-medium">💡 Tip:</span> Formatos JPG, PNG y SVG. Máximo 10MB.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
