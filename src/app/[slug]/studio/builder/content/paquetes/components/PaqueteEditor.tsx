'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch, ZenConfirmModal } from '@/components/ui/zen';
import { PaqueteFormularioAvanzado } from '../tabs/PaquetesTab/PaqueteFormularioAvanzado';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaqueteEditorProps {
    studioSlug: string;
    mode: 'create' | 'edit';
    paquete?: PaqueteFromDB | null;
    initialEventTypeId?: string;
}

export function PaqueteEditor({ studioSlug, mode, paquete, initialEventTypeId }: PaqueteEditorProps) {
    const router = useRouter();
    const [isPublished, setIsPublished] = useState(paquete?.status === 'active' || false);
    const [isFeatured, setIsFeatured] = useState((paquete as { is_featured?: boolean })?.is_featured || false);
    const [showFeaturedModal, setShowFeaturedModal] = useState(false);

    // Sincronizar estado cuando cambia el paquete
    useEffect(() => {
        setIsPublished(paquete?.status === 'active' || false);
        setIsFeatured((paquete as { is_featured?: boolean })?.is_featured || false);
    }, [paquete?.status, paquete]);

    const handleBack = () => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes`);
    };

    const handleSave = (savedPaquete: PaqueteFromDB) => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes`);
    };

    const handleCancel = () => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes`);
    };

    const handleFeaturedClick = () => {
        if (isFeatured) {
            // Si ya está activo, desactivar directamente
            setIsFeatured(false);
        } else {
            // Si no está activo, mostrar modal de confirmación
            setShowFeaturedModal(true);
        }
    };

    const handleConfirmFeatured = () => {
        setIsFeatured(true);
        setShowFeaturedModal(false);
    };

    // Obtener nombre del tipo de evento
    const tipoEvento = paquete?.event_types?.name || 'este tipo de evento';

    return (
        <div className="space-y-6">
            {/* Header con botón de regresar */}
            <div className="flex items-center gap-4">
                <ZenButton variant="ghost" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Regresar
                </ZenButton>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">
                        {mode === 'create' ? 'Nuevo Paquete' : 'Editar Paquete'}
                    </h1>
                    <p className="text-zinc-400">
                        {mode === 'create'
                            ? 'Crea un nuevo paquete de servicios para tu estudio'
                            : 'Modifica los detalles de tu paquete'}
                    </p>
                </div>
            </div>

            {/* Contenedor del formulario */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <ZenCardTitle>
                            {mode === 'create' ? 'Crear Nuevo Paquete' : 'Editar Paquete'}
                        </ZenCardTitle>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400">Publicado</span>
                                <ZenSwitch
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
                            </div>
                            <ZenButton
                                variant="outline"
                                size="sm"
                                onClick={handleFeaturedClick}
                                className={`rounded-full px-3 py-2 ${isFeatured
                                    ? "bg-amber-900 hover:bg-amber-900 text-amber-300 border-amber-700"
                                    : "border-amber-600/50 text-amber-400 hover:bg-amber-600/10"
                                    }`}
                                title={isFeatured ? 'Quitar recomendado' : 'Marcar como recomendado'}
                            >
                                <span className="text-sm font-medium">
                                    {isFeatured ? 'Quitar recomendación' : 'Marcar como recomendado'}
                                </span>
                                <Star className={`h-4 w-4 ${isFeatured ? "fill-current" : ""}`} />
                            </ZenButton>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <PaqueteFormularioAvanzado
                        studioSlug={studioSlug}
                        paquete={paquete}
                        isPublished={isPublished}
                        onPublishedChange={setIsPublished}
                        isFeatured={isFeatured}
                        onFeaturedChange={setIsFeatured}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        initialEventTypeId={initialEventTypeId}
                    />
                </ZenCardContent>
            </ZenCard>

            {/* Modal de confirmación para marcar como recomendado */}
            <ZenConfirmModal
                isOpen={showFeaturedModal}
                onClose={() => setShowFeaturedModal(false)}
                onConfirm={handleConfirmFeatured}
                title="Marcar como recomendado"
                description={`Este paquete se convertirá en recomendado en la categoría de eventos "${tipoEvento}" y reemplazará a cualquier otro paquete recomendado dentro de su tipo.`}
                confirmText="Confirmar"
                cancelText="Cancelar"
                variant="default"
            />
        </div>
    );
}
