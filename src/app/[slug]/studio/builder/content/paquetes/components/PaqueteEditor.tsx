'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { PaqueteFormularioAvanzado } from '../tabs/PaquetesTab/PaqueteFormularioAvanzado';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaqueteEditorProps {
    studioSlug: string;
    mode: 'create' | 'edit';
    paquete?: PaqueteFromDB | null;
}

export function PaqueteEditor({ studioSlug, mode, paquete }: PaqueteEditorProps) {
    const router = useRouter();

    const handleBack = () => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes`);
    };

    const handleSave = (savedPaquete: PaqueteFromDB) => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes`);
    };

    const handleCancel = () => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes`);
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
                    <ZenCardTitle>
                        {mode === 'create' ? 'Crear Nuevo Paquete' : 'Editar Paquete'}
                    </ZenCardTitle>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <PaqueteFormularioAvanzado
                        studioSlug={studioSlug}
                        paquete={paquete}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
