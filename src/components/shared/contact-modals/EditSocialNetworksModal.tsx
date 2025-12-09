'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { X, ExternalLink } from 'lucide-react';
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
    const [saving, setSaving] = useState<string | null>(null);
    const [plataformaIds, setPlataformaIds] = useState<Record<string, string>>({});
    const [editingValues, setEditingValues] = useState<Record<string, string>>({});
    const [confirmDelete, setConfirmDelete] = useState<{ slug: string; name: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
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

    const handleSave = async (slug: string, value: string) => {
        const trimmedValue = value.trim();

        // Si está vacío y existe, eliminar
        if (!trimmedValue && redes[slug]) {
            setSaving(slug);
            const result = await eliminarRedSocial(studioSlug, redes[slug].id);
            if (result.success) {
                const newRedes = { ...redes };
                delete newRedes[slug];
                setRedes(newRedes);
                toast.success('Red social eliminada');
                onSuccess?.();
            } else {
                toast.error('Error al eliminar');
            }
            setSaving(null);
            return;
        }

        // Si está vacío y no existe, no hacer nada
        if (!trimmedValue) return;

        // Construir URL completa
        const redConfig = REDES_PRINCIPALES.find(r => r.slug === slug);
        let fullUrl = trimmedValue;

        // Si el usuario pegó una URL completa, extraer el username
        if (trimmedValue.startsWith('http')) {
            try {
                const url = new URL(trimmedValue);
                // Extraer el username de la URL
                // Ejemplo: https://www.facebook.com/prosocialmx → prosocialmx
                // Ejemplo: https://instagram.com/usuario → usuario
                const pathParts = url.pathname.split('/').filter(p => p);
                const username = pathParts[0] || '';

                // Si encontramos username, construir URL limpia
                if (username) {
                    fullUrl = `${redConfig?.baseUrl}${username}`;
                } else {
                    fullUrl = trimmedValue; // Usar URL original si no encontramos username
                }
            } catch {
                // Si falla el parsing, asumir que es username
                fullUrl = `${redConfig?.baseUrl}${trimmedValue}`;
            }
        } else {
            // Es solo username, construir URL completa
            fullUrl = `${redConfig?.baseUrl}${trimmedValue}`;
        }

        setSaving(slug);

        try {
            if (redes[slug]) {
                // Actualizar existente
                const result = await actualizarRedSocial(studioSlug, redes[slug].id, {
                    platform_id: redes[slug].platformId,
                    url: fullUrl
                });
                if (result.success) {
                    setRedes({
                        ...redes,
                        [slug]: { ...redes[slug], url: fullUrl }
                    });
                    // Actualizar valor de edición con el username limpio
                    setEditingValues({
                        ...editingValues,
                        [slug]: trimmedValue.startsWith('http')
                            ? new URL(trimmedValue).pathname.split('/').filter(p => p)[0] || trimmedValue
                            : trimmedValue
                    });
                    toast.success('Actualizado');
                    onSuccess?.();
                } else {
                    toast.error(result.error || 'Error al actualizar');
                }
            } else {
                // Crear nuevo
                const platformId = plataformaIds[slug];
                if (!platformId) {
                    toast.error('Plataforma no encontrada');
                    setSaving(null);
                    return;
                }

                const result = await crearRedSocial(studioSlug, {
                    platform_id: platformId,
                    url: fullUrl
                });

                if (result.success && result.data) {
                    setRedes({
                        ...redes,
                        [slug]: {
                            id: result.data.id,
                            url: fullUrl,
                            platformId: platformId
                        }
                    });
                    // Actualizar valor de edición con el username limpio
                    setEditingValues({
                        ...editingValues,
                        [slug]: trimmedValue.startsWith('http')
                            ? new URL(trimmedValue).pathname.split('/').filter(p => p)[0] || trimmedValue
                            : trimmedValue
                    });
                    toast.success('Red social agregada');
                    onSuccess?.();
                } else {
                    toast.error(result.error || 'Error al crear');
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Error al guardar');
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteClick = (slug: string) => {
        const redConfig = REDES_PRINCIPALES.find(r => r.slug === slug);
        if (!redes[slug] || !redConfig) return;

        setConfirmDelete({ slug, name: redConfig.name });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;

        const { slug } = confirmDelete;

        // Marcar como guardando ANTES de cerrar el modal
        setSaving(slug);

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

                toast.success('Red social eliminada');
                onSuccess?.();
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            console.error('Error deleting social network:', error);
            toast.error('Error al eliminar');
        } finally {
            // Cerrar modal y limpiar estados al final
            setSaving(null);
            setConfirmDelete(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg">Redes sociales</DialogTitle>
                </DialogHeader>

                <div className="space-y-2 mt-6">
                    {loading ? (
                        <div className="text-center py-12 text-zinc-500 text-sm">Cargando...</div>
                    ) : (
                        REDES_PRINCIPALES.map((red) => {
                            const existing = redes[red.slug];
                            const isSaving = saving === red.slug;
                            const displayValue = editingValues[red.slug] || '';
                            const IconComponent = red.icon;

                            return (
                                <div
                                    key={red.slug}
                                    className="group relative"
                                >
                                    <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                                        <IconComponent className="w-4 h-4 shrink-0 text-zinc-500" />

                                        <input
                                            type="text"
                                            placeholder={red.name}
                                            value={displayValue}
                                            onChange={(e) => setEditingValues({ ...editingValues, [red.slug]: e.target.value })}
                                            onBlur={(e) => handleSave(red.slug, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            disabled={isSaving}
                                            className="flex-1 min-w-0 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
                                        />

                                        {isSaving ? (
                                            <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                                        ) : existing ? (
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={existing.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Ver perfil"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteClick(red.slug)}
                                                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <p className="mt-6 text-xs text-zinc-500 text-center">
                    Escribe tu usuario o pega la URL completa
                </p>
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
                loading={saving === confirmDelete?.slug}
                loadingText="Eliminando..."
            />
        </Dialog>
    );
}
