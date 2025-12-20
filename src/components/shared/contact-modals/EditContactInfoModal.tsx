'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Mail, Globe, MapPin, Loader2 } from 'lucide-react';
import { actualizarEmailStudio } from '@/lib/actions/studio/profile/email';
import { actualizarWebsite } from '@/lib/actions/studio/profile/website';
import { actualizarUbicacion } from '@/lib/actions/studio/profile/ubicacion';
import { toast } from 'sonner';

type EditType = 'email' | 'website' | 'address';

interface EditContactInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    type: EditType;
    currentValue: string | null;
    googleMapsUrl?: string | null;
    onSuccess?: () => void;
}

export function EditContactInfoModal({
    isOpen,
    onClose,
    studioSlug,
    type,
    currentValue,
    googleMapsUrl,
    onSuccess
}: EditContactInfoModalProps) {
    const [value, setValue] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(currentValue || '');
        setMapsUrl(googleMapsUrl || '');
    }, [currentValue, googleMapsUrl, isOpen]);

    const getConfig = () => {
        switch (type) {
            case 'email':
                return {
                    icon: <Mail className="h-5 w-5 text-blue-400" />,
                    title: 'Editar Email',
                    placeholder: 'correo@ejemplo.com',
                    inputType: 'email' as const
                };
            case 'website':
                return {
                    icon: <Globe className="h-5 w-5 text-purple-400" />,
                    title: 'Editar Sitio Web',
                    placeholder: 'https://tuwebsite.com',
                    inputType: 'url' as const
                };
            case 'address':
                return {
                    icon: <MapPin className="h-5 w-5 text-red-400" />,
                    title: 'Editar Dirección',
                    placeholder: 'Calle, Número, Colonia, Ciudad',
                    inputType: 'text' as const
                };
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let result;

            switch (type) {
                case 'email':
                    result = await actualizarEmailStudio(studioSlug, value.trim());
                    break;
                case 'website':
                    result = await actualizarWebsite(studioSlug, value.trim() || null);
                    break;
                case 'address':
                    result = await actualizarUbicacion(studioSlug, {
                        direccion: value.trim() || '',
                        google_maps_url: mapsUrl.trim() || null
                    });
                    break;
            }

            if (result?.success) {
                toast.success(
                    type === 'email' ? 'Email actualizado' :
                        type === 'website' ? 'Sitio web actualizado' :
                            'Dirección actualizada'
                );
                onSuccess?.();
                onClose();
            } else {
                toast.error(result?.error || 'Error al actualizar');
            }
        } catch (error) {
            console.error('Error updating contact info:', error);
            toast.error('Error al actualizar');
        } finally {
            setSaving(false);
        }
    };

    const config = getConfig();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {config.icon}
                        {config.title}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <ZenInput
                        label={
                            type === 'email' ? 'Correo electrónico' :
                                type === 'website' ? 'URL del sitio web' :
                                    'Dirección completa'
                        }
                        type={config.inputType}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={config.placeholder}
                    />

                    {type === 'address' && (
                        <ZenInput
                            label="URL de Google Maps (opcional)"
                            type="url"
                            value={mapsUrl}
                            onChange={(e) => setMapsUrl(e.target.value)}
                            placeholder="https://maps.google.com/..."
                            hint="Link directo a tu ubicación en Google Maps"
                        />
                    )}

                    <div className="flex gap-3 pt-4">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            variant="primary"
                            disabled={saving}
                            className="flex-1"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar'
                            )}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
