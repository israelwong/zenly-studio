'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { crearTelefono, actualizarTelefono } from '@/lib/actions/studio/profile/telefonos';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';

interface PhoneData {
    id?: string;
    number: string;
    label: string | null;
    type: 'LLAMADAS' | 'WHATSAPP' | 'AMBOS';
}

interface EditPhoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    phone?: PhoneData;
    onSuccess?: () => void;
}

export function EditPhoneModal({
    isOpen,
    onClose,
    studioSlug,
    phone,
    onSuccess
}: EditPhoneModalProps) {
    const [formData, setFormData] = useState({
        number: '',
        type: 'AMBOS' as 'LLAMADAS' | 'WHATSAPP' | 'AMBOS'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (phone) {
                // Normalizar el tipo a mayúsculas para asegurar consistencia
                const normalizedType = phone.type?.toUpperCase() as 'LLAMADAS' | 'WHATSAPP' | 'AMBOS' || 'AMBOS';
                setFormData({
                    number: phone.number || '',
                    type: normalizedType
                });
            } else {
                setFormData({
                    number: '',
                    type: 'AMBOS'
                });
            }
            setSaving(false); // Reset saving state when modal opens
        }
    }, [phone, isOpen]);

    const handleTypeSelect = (type: 'LLAMADAS' | 'WHATSAPP' | 'AMBOS') => {
        setFormData(prev => ({ ...prev, type }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanNumber = formData.number.replace(/\D/g, '');
        if (cleanNumber.length !== 10) {
            toast.error('El número debe tener exactamente 10 dígitos');
            return;
        }

        setSaving(true);

        try {
            if (phone?.id) {
                await actualizarTelefono(studioSlug, phone.id, {
                    numero: cleanNumber,
                    etiqueta: null,
                    tipo: formData.type
                });
                toast.success('Teléfono actualizado');
            } else {
                await crearTelefono(studioSlug, {
                    numero: cleanNumber,
                    etiqueta: null,
                    tipo: formData.type
                });
                toast.success('Teléfono agregado');
            }

            // Ejecutar onSuccess primero para refrescar datos
            onSuccess?.();
            
            // Esperar un momento para que se refleje la actualización antes de cerrar
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Resetear estado antes de cerrar
            setSaving(false);
            
            // Cerrar modal después de que se vea la actualización
            onClose();
        } catch (error) {
            console.error('Error saving phone:', error);
            toast.error('Error al guardar teléfono');
        } finally {
            // Asegurar que siempre se resetee el estado
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (!saving) {
            setSaving(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-green-400" />
                        {phone?.id ? 'Editar Teléfono' : 'Agregar Teléfono'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <ZenInput
                        label="Número de Teléfono"
                        type="tel"
                        value={formData.number}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9\s+\-()]/g, '');
                            setFormData(prev => ({ ...prev, number: value }));
                        }}
                        placeholder="55 1234 5678"
                        required
                        hint="Ingresa 10 dígitos"
                        maxLength={20}
                        disabled={saving}
                    />

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-300">¿Para qué usarás este número?</label>
                        <div className="space-y-2">
                            {/* Ambos */}
                            <label
                                htmlFor="type-ambos"
                                className={cn(
                                    'relative flex items-start gap-3 p-4 rounded-lg border transition-all',
                                    saving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                                    formData.type === 'AMBOS'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                )}
                            >
                                <input
                                    type="radio"
                                    id="type-ambos"
                                    name="phoneType"
                                    value="AMBOS"
                                    checked={formData.type === 'AMBOS'}
                                    onChange={() => handleTypeSelect('AMBOS')}
                                    disabled={saving}
                                    className="sr-only"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <Phone className={cn(
                                                'h-4 w-4',
                                                formData.type === 'AMBOS' ? 'text-emerald-400' : 'text-zinc-400'
                                            )} />
                                            <WhatsAppIcon className={cn(
                                                'h-4 w-4',
                                                formData.type === 'AMBOS' ? 'text-emerald-400' : 'text-zinc-400'
                                            )} />
                                        </div>
                                        <span className={cn(
                                            'text-sm font-medium',
                                            formData.type === 'AMBOS' ? 'text-emerald-200' : 'text-zinc-300'
                                        )}>
                                            Llamadas y WhatsApp
                                        </span>
                                        {formData.type === 'AMBOS' && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1 ml-8">
                                        Recomendado • Usuarios pueden llamar o escribir
                                    </p>
                                </div>
                            </label>

                            {/* Solo Llamadas */}
                            <label
                                htmlFor="type-llamadas"
                                className={cn(
                                    'relative flex items-start gap-3 p-4 rounded-lg border transition-all',
                                    saving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                                    formData.type === 'LLAMADAS'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                )}
                            >
                                <input
                                    type="radio"
                                    id="type-llamadas"
                                    name="phoneType"
                                    value="LLAMADAS"
                                    checked={formData.type === 'LLAMADAS'}
                                    onChange={() => handleTypeSelect('LLAMADAS')}
                                    disabled={saving}
                                    className="sr-only"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Phone className={cn(
                                            'h-4 w-4',
                                            formData.type === 'LLAMADAS' ? 'text-emerald-400' : 'text-zinc-400'
                                        )} />
                                        <span className={cn(
                                            'text-sm font-medium',
                                            formData.type === 'LLAMADAS' ? 'text-emerald-200' : 'text-zinc-300'
                                        )}>
                                            Solo Llamadas
                                        </span>
                                        {formData.type === 'LLAMADAS' && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />
                                        )}
                                    </div>
                                </div>
                            </label>

                            {/* Solo WhatsApp */}
                            <label
                                htmlFor="type-whatsapp"
                                className={cn(
                                    'relative flex items-start gap-3 p-4 rounded-lg border transition-all',
                                    saving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                                    formData.type === 'WHATSAPP'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                )}
                            >
                                <input
                                    type="radio"
                                    id="type-whatsapp"
                                    name="phoneType"
                                    value="WHATSAPP"
                                    checked={formData.type === 'WHATSAPP'}
                                    onChange={() => handleTypeSelect('WHATSAPP')}
                                    disabled={saving}
                                    className="sr-only"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <WhatsAppIcon className={cn(
                                            'h-4 w-4',
                                            formData.type === 'WHATSAPP' ? 'text-emerald-400' : 'text-zinc-400'
                                        )} />
                                        <span className={cn(
                                            'text-sm font-medium',
                                            formData.type === 'WHATSAPP' ? 'text-emerald-200' : 'text-zinc-300'
                                        )}>
                                            Solo WhatsApp
                                        </span>
                                        {formData.type === 'WHATSAPP' && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />
                                        )}
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={handleClose}
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
                                    Actualizando...
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
