'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { X, ExternalLink, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    obtenerRedesSocialesStudio,
    crearRedSocial,
    actualizarRedSocial,
    eliminarRedSocial,
} from '@/lib/actions/studio/profile/identidad';
import InstagramIcon from '@/components/ui/icons/InstagramIcon';
import FacebookIcon from '@/components/ui/icons/FacebookIcon';
import TikTokIcon from '@/components/ui/icons/TikTokIcon';
import YouTubeIcon from '@/components/ui/icons/YouTubeIcon';
import LinkedInIcon from '@/components/ui/icons/LinkedInIcon';

interface EditSocialNetworksModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void;
}

// Redes sociales permitidas (hardcoded, orden fijo)
const REDES_PRINCIPALES = [
    {
        slug: 'instagram',
        name: 'Instagram',
        icon: InstagramIcon,
        placeholder: 'usuario (sin @)',
        baseUrl: 'https://instagram.com/'
    },
    {
        slug: 'facebook',
        name: 'Facebook',
        icon: FacebookIcon,
        placeholder: 'usuario o página',
        baseUrl: 'https://facebook.com/'
    },
    {
        slug: 'tiktok',
        name: 'TikTok',
        icon: TikTokIcon,
        placeholder: 'usuario (sin @)',
        baseUrl: 'https://tiktok.com/@'
    },
    {
        slug: 'youtube',
        name: 'YouTube',
        icon: YouTubeIcon,
        placeholder: 'nombre del canal (sin @)',
        baseUrl: 'https://youtube.com/@'
    },
    {
        slug: 'linkedin',
        name: 'LinkedIn',
        icon: LinkedInIcon,
        placeholder: 'usuario',
        baseUrl: 'https://linkedin.com/in/'
    },
];

export function EditSocialNetworksModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess
}: EditSocialNetworksModalProps) {
    const [redes, setRedes] = useState<Record<string, { id: string; url: string; platformId: string }>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [plataformaIds, setPlataformaIds] = useState<Record<string, string>>({});
    const [editingValues, setEditingValues] = useState<Record<string, string>>({});
    const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
    const [confirmDelete, setConfirmDelete] = useState<{ slug: string; name: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        } else {
            // Resetear estados al cerrar
            setEditingValues({});
            setOriginalValues({});
            setSaving(false);
        }
    }, [isOpen, studioSlug]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Cargar redes existentes del studio
            const redesResult = await obtenerRedesSocialesStudio(studioSlug);
            if (Array.isArray(redesResult)) {
                const redesMap: Record<string, { id: string; url: string; platformId: string }> = {};
                const platformIds: Record<string, string> = {};
                const initialValues: Record<string, string> = {};

                redesResult.forEach((red) => {
                    if (red.platform?.slug) {
                        redesMap[red.platform.slug] = {
                            id: red.id,
                            url: red.url,
                            platformId: red.platform_id || ''
                        };
                        platformIds[red.platform.slug] = red.platform.id;

                        // Extraer solo el username para el input
                        const redConfig = REDES_PRINCIPALES.find(r => r.slug === red.platform?.slug);
                        const displayValue = red.url
                            .replace(redConfig?.baseUrl || '', '')
                            .replace('www.', '');
                        initialValues[red.platform.slug] = displayValue;
                    }
                });

                setRedes(redesMap);
                setPlataformaIds(platformIds);
                setEditingValues(initialValues);
                setOriginalValues(initialValues);
            }

            // Cargar IDs de plataformas para crear nuevas
            const { obtenerPlataformasDisponibles } = await import('@/lib/actions/studio/profile/identidad');
            const plataformasResult = await obtenerPlataformasDisponibles();
            if (plataformasResult.success && plataformasResult.data) {
                const ids: Record<string, string> = {};
                plataformasResult.data.forEach((p) => {
                    ids[p.slug] = p.id;
                });
                setPlataformaIds(prev => ({ ...prev, ...ids }));
            }
        } catch (error) {
            console.error('Error loading social networks:', error);
            toast.error('Error al cargar redes sociales');
        } finally {
            setLoading(false);
        }
    };

    const buildFullUrl = (slug: string, value: string): string => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return '';

        const redConfig = REDES_PRINCIPALES.find(r => r.slug === slug);
        let fullUrl = trimmedValue;

        // Si el usuario pegó una URL completa, extraer el username
        if (trimmedValue.startsWith('http')) {
            try {
                const url = new URL(trimmedValue);
                const pathParts = url.pathname.split('/').filter(p => p);
                const username = pathParts[0] || '';

                if (username) {
                    fullUrl = `${redConfig?.baseUrl}${username}`;
                } else {
                    fullUrl = trimmedValue;
                }
            } catch {
                fullUrl = `${redConfig?.baseUrl}${trimmedValue}`;
            }
        } else {
            fullUrl = `${redConfig?.baseUrl}${trimmedValue}`;
        }

        return fullUrl;
    };

    const handleSaveAll = async () => {
        setSaving(true);

        try {
            const promises: Promise<void>[] = [];

            // Procesar cada red social
            for (const red of REDES_PRINCIPALES) {
                const currentValue = editingValues[red.slug]?.trim() || '';
                const originalValue = originalValues[red.slug]?.trim() || '';
                const existing = redes[red.slug];

                // Si no hay cambios, continuar
                if (currentValue === originalValue) continue;

                // Si está vacío y existe, eliminar
                if (!currentValue && existing) {
                    promises.push(
                        eliminarRedSocial(studioSlug, existing.id).then(result => {
                            if (result.success) {
                                const newRedes = { ...redes };
                                delete newRedes[red.slug];
                                setRedes(newRedes);
                                const newValues = { ...editingValues };
                                delete newValues[red.slug];
                                setEditingValues(newValues);
                                const newOriginal = { ...originalValues };
                                delete newOriginal[red.slug];
                                setOriginalValues(newOriginal);
                            } else {
                                throw new Error(result.error || 'Error al eliminar');
                            }
                        })
                    );
                    continue;
                }

                // Si está vacío y no existe, continuar
                if (!currentValue) continue;

                // Construir URL completa
                const fullUrl = buildFullUrl(red.slug, currentValue);

                if (existing) {
                    // Actualizar existente
                    promises.push(
                        actualizarRedSocial(studioSlug, existing.id, {
                            platform_id: existing.platformId,
                            url: fullUrl
                        }).then(result => {
                            if (result.success) {
                                setRedes(prev => ({
                                    ...prev,
                                    [red.slug]: { ...prev[red.slug], url: fullUrl }
                                }));
                                const cleanValue = currentValue.startsWith('http')
                                    ? new URL(currentValue).pathname.split('/').filter(p => p)[0] || currentValue
                                    : currentValue;
                                setEditingValues(prev => ({ ...prev, [red.slug]: cleanValue }));
                                setOriginalValues(prev => ({ ...prev, [red.slug]: cleanValue }));
                            } else {
                                throw new Error(result.error || 'Error al actualizar');
                            }
                        })
                    );
                } else {
                    // Crear nuevo
                    const platformId = plataformaIds[red.slug];
                    if (!platformId) {
                        toast.error(`Plataforma ${red.name} no encontrada`);
                        continue;
                    }

                    promises.push(
                        crearRedSocial(studioSlug, {
                            platform_id: platformId,
                            url: fullUrl
                        }).then(result => {
                            if (result.success && result.data) {
                                setRedes(prev => ({
                                    ...prev,
                                    [red.slug]: {
                                        id: result.data!.id,
                                        url: fullUrl,
                                        platformId: platformId
                                    }
                                }));
                                const cleanValue = currentValue.startsWith('http')
                                    ? new URL(currentValue).pathname.split('/').filter(p => p)[0] || currentValue
                                    : currentValue;
                                setEditingValues(prev => ({ ...prev, [red.slug]: cleanValue }));
                                setOriginalValues(prev => ({ ...prev, [red.slug]: cleanValue }));
                            } else {
                                throw new Error(result.error || 'Error al crear');
                            }
                        })
                    );
                }
            }

            // Ejecutar todas las operaciones
            await Promise.all(promises);

            if (promises.length > 0) {
                toast.success('Redes sociales actualizadas');
                onSuccess?.();
                
                // Esperar un momento para que se refleje la actualización antes de cerrar
                await new Promise(resolve => setTimeout(resolve, 300));
                
                onClose();
            } else {
                // No hay cambios
                onClose();
            }
        } catch (error) {
            console.error('Error saving social networks:', error);
            toast.error('Error al guardar redes sociales');
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Restaurar valores originales
        setEditingValues(originalValues);
        onClose();
    };

    const handleDeleteClick = (slug: string) => {
        const redConfig = REDES_PRINCIPALES.find(r => r.slug === slug);
        if (!redes[slug] || !redConfig) return;

        setConfirmDelete({ slug, name: redConfig.name });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;

        const { slug } = confirmDelete;
        setSaving(true);

        try {
            const result = await eliminarRedSocial(studioSlug, redes[slug].id);

            if (result.success) {
                // Actualizar estado de redes
                const newRedes = { ...redes };
                delete newRedes[slug];
                setRedes(newRedes);

                // Limpiar el input
                const newValues = { ...editingValues };
                delete newValues[slug];
                setEditingValues(newValues);
                
                const newOriginal = { ...originalValues };
                delete newOriginal[slug];
                setOriginalValues(newOriginal);

                toast.success('Red social eliminada');
                onSuccess?.();
                
                // Esperar un momento para que se refleje la actualización antes de cerrar
                await new Promise(resolve => setTimeout(resolve, 300));
                
                onClose();
            } else {
                toast.error('Error al eliminar');
                setSaving(false);
            }
        } catch (error) {
            console.error('Error deleting social network:', error);
            toast.error('Error al eliminar');
            setSaving(false);
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-zinc-100">
                        <Share2 className="h-5 w-5 text-emerald-400" />
                        Editar Redes Sociales
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveAll(); }} className="space-y-4 mt-4">
                    {loading ? (
                        <div className="text-center py-12 text-zinc-500 text-sm">Cargando...</div>
                    ) : (
                        <div className="space-y-3">
                            {REDES_PRINCIPALES.map((red) => {
                                const existing = redes[red.slug];
                                const displayValue = editingValues[red.slug] || '';
                                const IconComponent = red.icon;
                                const hasValue = displayValue.trim().length > 0;

                                return (
                                    <div
                                        key={red.slug}
                                        className="group relative"
                                    >
                                        <div className={`
                                            relative rounded-lg border transition-all
                                            ${saving ? 'border-zinc-700 opacity-50' : 'border-zinc-800 hover:border-zinc-700'}
                                            ${hasValue ? 'bg-zinc-900/30' : 'bg-zinc-900/50'}
                                        `}>
                                            <div className="flex items-center gap-3 p-3">
                                                <div className={`
                                                    flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors
                                                    ${hasValue ? 'bg-emerald-500/10' : 'bg-zinc-800/50'}
                                                `}>
                                                    <IconComponent className={`
                                                        w-5 h-5 transition-colors
                                                        ${hasValue ? 'text-emerald-400' : 'text-zinc-500'}
                                                    `} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                                        {red.name}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder={red.placeholder}
                                                        value={displayValue}
                                                        onChange={(e) => setEditingValues({ ...editingValues, [red.slug]: e.target.value })}
                                                        disabled={saving}
                                                        className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </div>

                                                {existing && !saving && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <a
                                                            href={existing.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                                                            title="Ver perfil"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(red.slug)}
                                                            disabled={saving}
                                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Eliminar"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <p className="text-xs text-zinc-500 text-center pt-2">
                        Escribe tu usuario o pega la URL completa
                    </p>

                    <div className="flex gap-3 pt-4 border-t border-zinc-800">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={saving}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                            disabled={saving || loading}
                            className="flex-1"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Actualizando...
                                </>
                            ) : (
                                'Guardar'
                            )}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>

            {/* Confirm Delete Modal */}
            <ZenConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar red social"
                description={
                    confirmDelete
                        ? `¿Estás seguro de eliminar ${confirmDelete.name}? Esta acción no se puede deshacer.`
                        : ''
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={saving}
                loadingText="Eliminando..."
            />
        </Dialog>
    );
}
