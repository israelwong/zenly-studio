'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch } from '@/components/ui/zen';
import { PaqueteFormularioAvanzado } from './PaqueteFormularioAvanzado';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';

interface PaqueteEditorProps {
    studioSlug: string;
    mode: 'create' | 'edit';
    paquete?: PaqueteFromDB | null;
    initialEventTypeId?: string;
    initialCatalogo?: SeccionData[];
    initialPreciosConfig?: ConfiguracionPrecios | null;
}

export function PaqueteEditor({ studioSlug, mode, paquete, initialEventTypeId, initialCatalogo, initialPreciosConfig }: PaqueteEditorProps) {
    const router = useRouter();
    const [isPublished, setIsPublished] = useState(paquete?.status === 'active' || false);
    const [isFeatured, setIsFeatured] = useState((paquete as { is_featured?: boolean })?.is_featured || false);

    // Sincronizar estado cuando cambia el paquete
    useEffect(() => {
        setIsPublished(paquete?.status === 'active' || false);
        setIsFeatured((paquete as { is_featured?: boolean })?.is_featured || false);
    }, [paquete?.status, paquete]);

    const getReturnUrl = () => {
        return `/${studioSlug}/studio/commercial/paquetes`;
    };

    const handleBack = () => {
        router.push(getReturnUrl());
    };

    const handleSave = (savedPaquete: PaqueteFromDB) => {
        // Redirigir a la página anterior después de guardar exitosamente
        // Si no hay historial, usar la URL de retorno como fallback
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push(getReturnUrl());
        }
    };

    const handleCancel = () => {
        router.push(getReturnUrl());
    };

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
                        <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400">Publicado</span>
                                <ZenSwitch
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
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
                        initialCatalogo={initialCatalogo}
                        initialPreciosConfig={initialPreciosConfig}
                    />
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
