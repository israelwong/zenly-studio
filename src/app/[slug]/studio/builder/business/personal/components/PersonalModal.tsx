'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { Switch } from '@/components/ui/shadcn/switch';
import { Badge } from '@/components/ui/shadcn/badge';
import { toast } from 'sonner';
import {
    PERSONNEL_TYPE_LABELS,
    type PersonnelType,
    type PersonalCreateForm,
    type PersonalUpdateForm,
} from '@/lib/actions/schemas/personal-schemas';
import { obtenerPerfilesPersonal } from '@/lib/actions/studio/config/personal.actions';
import type { Personal } from '../types';

interface PersonalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: PersonalCreateForm | PersonalUpdateForm) => Promise<void>;
    personal?: Personal | null;
    loading: boolean;
    defaultType?: PersonnelType;
    studioSlug: string;
}

export function PersonalModal({
    isOpen,
    onClose,
    onSave,
    personal,
    loading,
    defaultType,
    studioSlug
}: PersonalModalProps) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        type: defaultType || 'EMPLEADO' as PersonnelType,
        isActive: true,
        profileIds: [] as string[],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form cuando cambia el personal o se abre/cierra
    useEffect(() => {
        if (isOpen) {
            if (personal) {
                // Modo edición
                setFormData({
                    fullName: personal.fullName || '',
                    email: personal.email,
                    phone: personal.phone || '',
                    type: personal.type || 'EMPLEADO',
                    isActive: personal.isActive,
                    profileIds: personal.professional_profiles.filter(p => p.profile).map(p => p.profile!.id),
                });
            } else {
                // Modo creación
                setFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    type: defaultType || 'EMPLEADO',
                    isActive: true,
                    profileIds: [],
                });
            }
            setErrors({});
        }
    }, [isOpen, personal, defaultType]);

    const handleInputChange = (field: string, value: string | boolean | PersonnelType) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Limpiar error del campo cuando el usuario empiece a escribir
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleProfileToggle = (profileId: string) => {
        setFormData(prev => {
            const isSelected = prev.profileIds.includes(profileId);
            const newProfileIds = isSelected
                ? prev.profileIds.filter(id => id !== profileId)
                : [...prev.profileIds, profileId];

            return {
                ...prev,
                profileIds: newProfileIds,
            };
        });
    };


    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'El nombre completo es requerido';
        }

        const emailTrimmed = formData.email.trim();
        if (!emailTrimmed) {
            newErrors.email = 'El email es requerido';
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailTrimmed)) {
            newErrors.email = 'El formato del email no es válido';
        }

        if (formData.profileIds.length === 0) {
            newErrors.profiles = 'Debe seleccionar al menos un perfil profesional';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast.error('Por favor corrige los errores en el formulario');
            return;
        }

        try {
            const saveData = {
                ...formData,
                fullName: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim() || undefined,
                profileDescriptions: {}, // Agregar profileDescriptions vacío
                ...(personal && { id: personal.id }),
            };

            await onSave(saveData);
            onClose();
        } catch (error) {
            console.error('Error saving personal:', error);
            // El error ya se maneja en el componente padre
        }
    };

    // TODO: Obtener perfiles dinámicos desde Server Action
    const [allProfiles, setAllProfiles] = useState<Array<{ id: string; name: string; slug: string; color?: string; icon?: string }>>([]);
    const [profilesLoading, setProfilesLoading] = useState(false);

    // Cargar perfiles profesionales cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            loadProfiles();
        }
    }, [isOpen]);

    const loadProfiles = async () => {
        try {
            setProfilesLoading(true);
            const result = await obtenerPerfilesPersonal(studioSlug);
            const perfiles = result.data || [];

            // Transformar los datos para el formato esperado
            const perfilesFormateados = perfiles.map(perfil => ({
                id: perfil.id,
                name: perfil.name,
                slug: perfil.slug,
                color: perfil.color || undefined,
                icon: perfil.icon || undefined,
            }));

            setAllProfiles(perfilesFormateados);
        } catch (error) {
            console.error('Error loading profiles:', error);
            toast.error('Error al cargar perfiles profesionales');
        } finally {
            setProfilesLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        {personal ? 'Editar' : 'Crear'} {PERSONNEL_TYPE_LABELS[formData.type]}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Información básica */}
                    <div className="space-y-4">
                        {/* Nombre completo - fila completa */}
                        <ZenInput
                            id="fullName"
                            label="Nombre completo"
                            required
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            placeholder="Nombre completo"
                            disabled={loading}
                            error={errors.fullName}
                        />

                        {/* Teléfono y Email - misma fila */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ZenInput
                                id="phone"
                                label="Teléfono"
                                value={formData.phone}
                                onChange={(e) => {
                                    // Solo permitir números y máximo 10 dígitos
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    handleInputChange('phone', value);
                                }}
                                placeholder="10 dígitos"
                                maxLength={10}
                                disabled={loading}
                            />

                            <ZenInput
                                id="email"
                                label="Email"
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="email@ejemplo.com"
                                disabled={loading}
                                error={errors.email}
                            />
                        </div>

                        {/* Solo mostrar tipo en modo creación sin defaultType */}
                        {!personal && !defaultType && (
                            <div>
                                <Label htmlFor="type" className="text-white mb-2">
                                    Tipo *
                                </Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: PersonnelType) => handleInputChange('type', value)}
                                    disabled={loading}
                                >
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                        {Object.entries(PERSONNEL_TYPE_LABELS).map(([value, label]) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                                className="text-white hover:bg-zinc-700"
                                            >
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Estado activo */}
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                            disabled={loading}
                        />
                        <Label htmlFor="isActive" className="text-white">
                            Activo
                        </Label>
                    </div>

                    {/* Perfiles profesionales */}
                    <div>
                        <Label className="text-white text-base font-medium">
                            Perfiles Profesionales *
                        </Label>
                        <p className="text-sm text-zinc-400 mb-4">
                            Selecciona uno o más perfiles que describan las habilidades de esta persona
                        </p>

                        {errors.profiles && (
                            <p className="text-sm text-red-400 mb-3">{errors.profiles}</p>
                        )}

                        <div className="space-y-3">
                            {profilesLoading ? (
                                <div className="text-center py-8 text-zinc-400">
                                    <p>Cargando perfiles profesionales...</p>
                                </div>
                            ) : allProfiles.length === 0 ? (
                                <div className="text-center py-8 text-zinc-400">
                                    <p>No hay perfiles profesionales disponibles.</p>
                                    <p className="text-sm mt-1">Contacta al administrador para configurar perfiles.</p>
                                </div>
                            ) : (
                                allProfiles.map((profile) => {
                                    const isSelected = formData.profileIds.includes(profile.id);
                                    return (
                                        <div key={profile.id} className="border border-zinc-700 rounded-lg p-3">
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id={`profile-${profile.id}`}
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleProfileToggle(profile.id)}
                                                    disabled={loading}
                                                />
                                                <Label
                                                    htmlFor={`profile-${profile.id}`}
                                                    className="text-white font-medium cursor-pointer flex-1"
                                                >
                                                    {profile.name}
                                                </Label>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {loading ? 'Guardando...' : (personal ? 'Actualizar' : 'Crear')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
