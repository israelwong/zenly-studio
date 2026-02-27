'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { PaqueteFormularioAvanzado } from './PaqueteFormularioAvanzado';
import { eliminarPaquete } from '@/lib/actions/studio/paquetes/paquetes.actions';
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
    const [visibility, setVisibility] = useState<'public' | 'private'>((paquete as { visibility?: string })?.visibility === 'private' ? 'private' : 'public');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setIsPublished(paquete?.status === 'active' || false);
        setIsFeatured((paquete as { is_featured?: boolean })?.is_featured || false);
        setVisibility((paquete as { visibility?: string })?.visibility === 'private' ? 'private' : 'public');
    }, [paquete?.status, paquete]);

    const getReturnUrl = () => `/${studioSlug}/studio/commercial/paquetes`;

    const handleBack = () => {
        router.push(getReturnUrl());
    };

    const handleSave = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push(getReturnUrl());
        }
    };

    const handleCancel = () => {
        router.push(getReturnUrl());
    };

    const handleDelete = async () => {
        if (!paquete?.id) return;
        setIsDeleting(true);
        try {
            const result = await eliminarPaquete(studioSlug, paquete.id);
            if (result.success) {
                toast.success('Paquete eliminado');
                router.push(getReturnUrl());
            } else {
                toast.error(result.error || 'Error al eliminar');
            }
        } catch {
            toast.error('Error al eliminar el paquete');
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    return (
        <div className="space-y-6">
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

            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <ZenCardTitle>
                            {mode === 'create' ? 'Crear Nuevo Paquete' : 'Editar Paquete'}
                        </ZenCardTitle>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400">
                                    {visibility === 'public' ? 'Público' : 'Privado'}
                                </span>
                                <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        <button type="button" className="text-zinc-500 hover:text-zinc-400 transition-colors p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500">
                                            <Info className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[280px] p-3 text-xs leading-relaxed text-zinc-100 bg-zinc-900 border-zinc-700">
                                        {visibility === 'public'
                                            ? 'Este paquete es visible en el catálogo público y puede ser visto por clientes y prospectos.'
                                            : 'Este paquete solo es visible internamente para el equipo. No aparecerá en el catálogo público ni podrá ser visto por clientes o prospectos.'}
                                    </TooltipContent>
                                </Tooltip>
                                <ZenSwitch
                                    checked={visibility === 'public'}
                                    onCheckedChange={(checked) => setVisibility(checked ? 'public' : 'private')}
                                    variant="emerald"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400">Publicado</span>
                                <ZenSwitch
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
                            </div>
                            {mode === 'edit' && (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="p-2 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Eliminar paquete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
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
                        externalVisibility={visibility}
                        onVisibilityChange={setVisibility}
                    />
                </ZenCardContent>
            </ZenCard>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Trash2 className="w-5 h-5 text-red-400" />
                            Eliminar paquete
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Esta acción es irreversible. Se eliminará el paquete <strong className="text-zinc-200">&ldquo;{paquete?.name}&rdquo;</strong> y todos sus ítems asociados.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            variant="secondary"
                            onClick={() => setShowDeleteDialog(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="destructive"
                            onClick={handleDelete}
                            loading={isDeleting}
                            className="flex-1"
                        >
                            Eliminar
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
